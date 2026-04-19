import { Types } from 'mongoose';

export interface ExpressUser {
  id: string;
  email: string;
  name?: string;
  role: "student" | "mentor" | "admin" | "guest" | "guide" | "user" | "patient" | "doctor" | "pharmacist" | string;
  _id?: Types.ObjectId;
}

declare global {
  namespace Express {
    interface User extends ExpressUser {}
    interface Request {
      user?: User;
    }
  }
}

export {};
