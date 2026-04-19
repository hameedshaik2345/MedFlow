import express, { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import User, { IUser } from "../models/user_models";
import PendingUser from "../models/pending_user_model";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authenticateJWT, authorizeRole } from "../middleware/authMiddleware";
import otpGenerator from "otp-generator";
import { sendEmail } from "../utils/sendEmail";

// Note: Express Request type is extended in src/types/express/index.d.ts

dotenv.config();

const router = express.Router();
const secretKey = process.env.JWT_SECRET || "vishalsaigodavari";

// ====================== REGISTER ======================
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, specialization } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (!existingUser.isEmailVerified) {
         // Existing unverified user in the main collection (from legacy code).
         // Delete them so we can replace them using the pending user flow, allowing them to 
         // update their name/password/role if they are trying to register again.
         await User.deleteOne({ email });
      } else {
         return res.status(409).json({ message: "Email already exists." });
      }
    }

    const isApproved = role === 'admin' || role === 'user' || role === 'student';
    const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });

    // Store in PendingUser first
    const userData = {
      name,
      email,
      password,
      role,
      isApproved,
      isEmailVerified: false,
      specialization: (role === 'mentor' || role === 'guide') ? specialization : undefined,
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

    return res.status(201).json({
      message: "User registered successfully, OTP sent to email",
      requireOtp: true,
      email,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Registration failed", error });
  }
});

// ====================== LOGIN ======================
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Handle Google OAuth users trying to log in with password
    if (user.isGoogleAuth) {
      res.status(400).json({ 
        message: "Please sign in with Google",
        googleAuthRequired: true 
      });
      return;
    }

    // ✅ Compare hashed password
    if (!user.password) {
      res.status(400).json({ message: "Password not set for this account" });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    if (!user.isEmailVerified) {
       // If user tries to login but not verified, ask for OTP
       const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });
       user.emailOtp = otp;
       user.emailOtpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
       await user.save();
       await sendEmail(email, otp);
       res.status(403).json({ message: 'Account not verified. A new OTP has been sent to your email.', requireOtp: true, email: user.email });
       return;
    }

    // ✅ Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email, name: user.name },
      secretKey,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: `Welcome ${user.name}`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        currentToken: user.currentToken,
        liveStatus: user.liveStatus
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed", error });
  }
});

// ====================== FORGOT PASSWORD ======================
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await user.save();

    await sendEmail(email, otp, "ParaNode Password Reset OTP", "Reset Your Password");

    res.json({ message: "OTP sent to your email" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Error sending reset OTP", error });
  }
});

// ====================== VERIFY RESET OTP ======================
router.post("/verify-reset-otp", async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.resetPasswordOtp !== otp || !user.resetPasswordOtpExpiry || user.resetPasswordOtpExpiry < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    res.json({ message: "OTP verified correctly" });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ message: "Error verifying OTP", error });
  }
});

// ====================== RESET PASSWORD ======================
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.resetPasswordOtp !== otp || !user.resetPasswordOtpExpiry || user.resetPasswordOtpExpiry < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Hash is handled by pre-save hook in user_models.ts
    user.password = newPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpiry = undefined;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Error resetting password", error });
  }
});

// ====================== GET ALL USERS / MENTORS ======================
// Admins receive the whole list; others receive only approved mentors/guides
router.get(
  "/",
  authenticateJWT,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (req.user?.role === "admin") {
        const users = await User.find();
        res.json(users);
      } else if (req.user?.role === "mentor" || req.user?.role === "guide") {
        // Mentors can see all students and regular users
        const students = await User.find({ role: { $in: ["student", "user"] } }).select("-password");
        res.json(students);
      } else {
        const mentors = await User.find({ 
          role: { $in: ["mentor", "guide"] }, 
          isApproved: true 
        }).select("-password");
        res.json(mentors);
      }
    } catch (error) {
      res.status(500).json({ message: "Error fetching users", error });
    }
  }
);

// ====================== USER: GET SELF ======================
router.get("/profile", authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }
    const userId = req.user.id;
    const user = await User.findById(userId).select("-password -googleId");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isGoogleAuth: user.isGoogleAuth,
      phone: user.phone,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      address: user.address,
      currentToken: user.currentToken,
      liveStatus: user.liveStatus
    });
  } catch (error) {
    console.error("Error in profile route:", error);
    res.status(500).json({ message: "Error fetching user profile", error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// ====================== USER: UPDATE PROFILE ======================
router.put("/profile", authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }
    const { name, phone, gender, dateOfBirth, address } = req.body;
    
    // Whitelist fields that can be updated this way
    const updateData: any = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (gender) updateData.gender = gender;
    if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;
    if (address) updateData.address = address;

    const user = await User.findByIdAndUpdate(req.user.id, { $set: updateData }, { new: true });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({ message: "Profile updated successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Error updating user profile", error });
  }
});

// ====================== ADMIN: APPROVE USER ======================
router.patch(
  "/:id/approve",
  authenticateJWT,
  authorizeRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { isApproved } = req.body;

      const user = await User.findByIdAndUpdate(
        id,
        { isApproved },
        { new: true }
      );

      if (!user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: `User ${isApproved ? "approved" : "rejected"} successfully`,
        data: user,
      });
    } catch (error: any) {
      console.error("Approve user error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating user approval status",
        error: error.message || "Unknown error",
      });
    }
  }
);

// ====================== ADMIN: DELETE USER ======================
router.delete(
  "/:id",
  authenticateJWT,
  authorizeRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, message: "User not authenticated" });
        return;
      }
      const { id } = req.params;
      const loggedInUserId = req.user.id;

      console.log("Delete request received for user ID:", id);

      // 1️⃣ Validate ObjectId (req.params.id is guaranteed to be a string by Express params routing, but TypeScript types it as string)
      if (!mongoose.Types.ObjectId.isValid(id as string)) {
        res.status(400).json({ success: false, message: "Invalid user ID format" });
        return;
      }

      // 2️⃣ Prevent admin from deleting themselves
      if (id === loggedInUserId) {
        res.status(403).json({ success: false, message: "Admins cannot delete their own account." });
        return;
      }

      // 3️⃣ Find user first
      const userToDelete = await User.findById(id);
      if (!userToDelete) {
        console.log("User not found with ID:", id);
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }

      // 4️⃣ Delete user
      await userToDelete.deleteOne();

      console.log("User deleted successfully:", userToDelete.email);
      res.status(200).json({
        success: true,
        message: "User deleted successfully",
        data: {
          id: userToDelete._id,
          name: userToDelete.name,
          email: userToDelete.email,
        },
      });
    } catch (error: any) {
      console.error("Delete user error:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting user",
        error: error.message || "Unknown error",
      });
    }
  }
);


export default router;
