import mongoose, { Schema, Document } from "mongoose";

export interface IPendingUser extends Document {
  email: string;
  userData: any;
  emailOtp: string;
  createdAt: Date;
}

const pendingUserSchema: Schema<IPendingUser> = new Schema({
  email: { type: String, required: true },
  userData: { type: Schema.Types.Mixed, required: true },
  emailOtp: { type: String, required: true },
  // Document expires automatically after 5 minutes (300 seconds)
  createdAt: { type: Date, default: Date.now, expires: 300 },
});

export default mongoose.model<IPendingUser>("PendingUser", pendingUserSchema);
