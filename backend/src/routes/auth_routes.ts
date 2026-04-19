import express, { Request, Response } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/user_models';
import PendingUser from '../models/pending_user_model';
import otpGenerator from 'otp-generator';
import { sendEmail } from '../utils/sendEmail';
import { authenticateJWT } from '../middleware/authMiddleware';

dotenv.config();

const router = express.Router();
const secretKey = process.env.JWT_SECRET || 'vishalsaigodavari';
const googleClientId = process.env.GOOGLE_CLIENT_ID;

if (!googleClientId) {
  console.warn('Warning: GOOGLE_CLIENT_ID is not set in environment variables');
}

const client = googleClientId ? new OAuth2Client(googleClientId) : null;

// Google OAuth Routes
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/login',
    session: false 
  }),
  (req: Request & { user?: any }, res: Response) => {
    // Successful authentication, generate JWT
    if (!req.user) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=authentication_failed`);
    }
    const user = req.user as any;
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role 
      }, 
      secretKey,
      { expiresIn: '1d' }
    );

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/success?token=${token}`);
  }
);

// Login with Google ID token from frontend (Google Identity Services)
router.post('/google/verify', async (req: Request, res: Response) => {
  try {
    if (!client || !googleClientId) {
      return res.status(500).json({ message: 'Google OAuth is not configured on the server' });
    }

    const { credential, phone } = req.body;
    
    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(400).json({ message: 'Invalid Google token' });
    }

    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ message: 'Email not provided by Google' });
    }

    // Check if user already exists
    let user = await User.findOne({ email });

    if (!user) {
      // If no phone number is provided, return requirePhone to prompt the user
      if (!phone) {
        return res.status(202).json({
          requirePhone: true,
          message: 'Phone number is required to complete registration.',
          credential
        });
      }

      // Create new user
      user = new User({
        name: name || 'User',
        email: email,
        googleId: googleId,
        isGoogleAuth: true,
        role: 'patient', // Default role for Google Auth
        isEmailVerified: true, // Auto-verified since it comes from Google
        phone: phone,
      });
      await user.save();
    } else {
      // Update existing user with Google ID if not set
      if (!user.googleId) {
        user.googleId = googleId;
        user.isGoogleAuth = true;
        await user.save();
      }
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      secretKey,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      message: `Welcome ${user.name}`,
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        specialization: user.specialization,
        currentToken: user.currentToken,
        liveStatus: user.liveStatus
      },
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ message: 'Server error during Google authentication' });
  }
});

// Login with Google token from frontend (legacy endpoint)
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const user = await User.findOne({ googleId: token });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const jwtToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      secretKey,
      { expiresIn: '1d' }
    );

    res.json({
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        specialization: user.specialization,
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ message: 'Server error during Google authentication' });
  }
});
// Local Registration
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, code, specialization, phone } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Role verification
    if (role === 'admin' && code !== process.env.admin_code) {
      return res.status(403).json({ message: 'Invalid Admin code' });
    }
    if (role === 'mentor' && code !== process.env.mentor_code) {
      return res.status(403).json({ message: 'Invalid Mentor code' });
    }
    if (role === 'guide' && code !== process.env.guide_code) {
      return res.status(403).json({ message: 'Invalid Guide code' });
    }
    
    // Course specialization is required for mentors and guides
    if ((role === 'mentor' || role === 'guide') && !specialization) {
      return res.status(400).json({ message: 'Course specialization is required for mentors and guides' });
    }

    let user = await User.findOne({ email });
    if (user) {
      if (!user.isEmailVerified) {
         // Existing unverified user from legacy signups, delete them so they go 
         // into PendingUser collection with their new signup credentials
         await User.deleteOne({ email });
      } else {
         return res.status(400).json({ message: 'User already exists' });
      }
    }

    // Determine initial approval status based on role
    // Admins and regular patients might be auto-approved, while doctors/pharmacists might not be.
    const isApproved = role === 'admin' || role === 'patient';

    const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });

    const userData = {
      name,
      email,
      password,
      role,
      isApproved,
      isEmailVerified: false,
      specialization: (role === 'mentor' || role === 'guide') ? specialization : undefined,
      phone,
    };

    let pendingUser = await PendingUser.findOne({ email });
    if (pendingUser) {
      pendingUser.userData = userData;
      pendingUser.emailOtp = otp;
      pendingUser.createdAt = new Date(); // reset expiration
      await pendingUser.save();
    } else {
      pendingUser = new PendingUser({
        email,
        userData,
        emailOtp: otp,
      });
      await pendingUser.save();
    }

    await sendEmail(email, otp);

    res.status(201).json({
      message: 'OTP sent to email. Please verify.',
      requireOtp: true,
      email,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Verify OTP
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email });
    
    if (user) {
      if (user.isEmailVerified) {
        return res.status(400).json({ message: 'User is already verified' });
      }

      if (user.emailOtp !== otp) {
        return res.status(400).json({ message: 'Invalid OTP' });
      }

      if (!user.emailOtpExpiry || new Date(user.emailOtpExpiry).getTime() < Date.now()) {
        return res.status(400).json({ message: 'OTP has expired' });
      }

      // OTP is valid
      user.isEmailVerified = true;
      user.emailOtp = undefined;
      user.emailOtpExpiry = undefined;
      await user.save();

      const jwtToken = jwt.sign(
        { id: user._id, role: user.role, email: user.email, specialization: user.specialization },
        secretKey,
        { expiresIn: '1d' }
      );

      return res.status(200).json({
        message: 'Email verified and registration successful',
        token: jwtToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isApproved: user.isApproved,
          specialization: user.specialization,
          currentToken: user.currentToken,
          liveStatus: user.liveStatus
        },
      });
    }

    // Check in PendingUser for new registrations
    const pendingUser = await PendingUser.findOne({ email });
    if (!pendingUser) {
      return res.status(404).json({ message: 'User not found or OTP expired' });
    }

    if (pendingUser.emailOtp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // OTP is valid, create real user
    const newUser = new User({
      ...pendingUser.userData,
      isEmailVerified: true
    });
    
    await newUser.save();
    await PendingUser.deleteOne({ _id: pendingUser._id });

    const jwtToken = jwt.sign(
      { id: newUser._id, role: newUser.role, email: newUser.email, specialization: newUser.specialization },
      secretKey,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      message: 'Email verified and registration successful',
      token: jwtToken,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isApproved: newUser.isApproved,
        specialization: newUser.specialization,
        currentToken: newUser.currentToken,
        liveStatus: newUser.liveStatus
      },
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'Server error during OTP verification' });
  }
});

// Local Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.password) {
      return res.status(400).json({ message: 'Account registered via Google. Please login with Google.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    if (!user.isEmailVerified) {
       // If user tries to login but not verified, ask for OTP
       const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });
       user.emailOtp = otp;
       user.emailOtpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
       await user.save();
       await sendEmail(email, otp);
       return res.status(403).json({ message: 'Account not verified. A new OTP has been sent to your email.', requireOtp: true, email: user.email });
    }

    const jwtToken = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      secretKey,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        specialization: user.specialization,
        currentToken: user.currentToken,
        liveStatus: user.liveStatus
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Logout
router.post('/logout', authenticateJWT, async (req: Request, res: Response) => {
  try {
    // Current token and status now persist across logout as requested
    res.status(200).json({ message: 'Logout processes completed' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
});

export default router;
