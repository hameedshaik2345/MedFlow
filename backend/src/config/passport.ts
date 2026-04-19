import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/user_models';
import dotenv from 'dotenv';

dotenv.config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: "/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      let user = await User.findOne({ email: profile.emails?.[0].value });
      
      if (!user) {
        // Create new user if doesn't exist
        user = new User({
          name: profile.displayName,
          email: profile.emails?.[0].value,
          googleId: profile.id,
          isGoogleAuth: true
        });
        await user.save();
      } else if (!user.googleId) {
        // Link Google account to existing email
        user.googleId = profile.id;
        user.isGoogleAuth = true;
        await user.save();
      }
      
      // Cast to any to satisfy Passport's User typing (we use a Mongoose document here)
      return done(null, user as any);
    } catch (error) {
      return done(error as Error, undefined);
    }
  }
));

export default passport;
