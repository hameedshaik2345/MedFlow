import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcrypt";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  googleId?: string;
  isGoogleAuth: boolean;
  role: "admin" | "patient" | "doctor" | "pharmacist";
  isApproved: boolean; // For mentors mainly
  isEmailVerified: boolean;
  emailOtp?: string;
  emailOtpExpiry?: Date;
  resetPasswordOtp?: string;
  resetPasswordOtpExpiry?: Date;
  specialization?: string; // For mentors mainly
  phone?: string;
  
  // Medical Fields
  dateOfBirth?: Date;
  gender?: string;
  address?: string;
  specialty?: string;
  department?: string;
  experienceYears?: number;
  rating?: number;
  licenseNumber?: string;
  currentToken?: number;
  liveStatus?: string;

  comparePassword: (candidatePassword: string) => Promise<boolean>;
}

const userSchema: Schema<IUser> = new Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  password: { type: String },
  googleId: { type: String },
  isGoogleAuth: { type: Boolean, default: false },
  role: { type: String, enum: ["admin", "patient", "doctor", "pharmacist"], default: "patient" },
  isApproved: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  emailOtp: { type: String },
  emailOtpExpiry: { type: Date },
  resetPasswordOtp: { type: String },
  resetPasswordOtpExpiry: { type: Date },
  specialization: { type: String },
  phone: { type: String },

  // Medical Fields
  dateOfBirth: { type: Date },
  gender: { type: String },
  address: { type: String },
  specialty: { type: String },
  department: { type: String },
  experienceYears: { type: Number },
  rating: { type: Number, default: 0 },
  licenseNumber: { type: String },
  currentToken: { type: Number, default: 0 },
  liveStatus: { type: String, default: "Available" },
}, { timestamps: true });

// Only hash the password if it's modified or new (not for Google OAuth users)
userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password for login
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false; // For Google OAuth users without password
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>("User", userSchema);
