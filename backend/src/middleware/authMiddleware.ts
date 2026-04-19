import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { ExpressUser } from "../types/express";

dotenv.config();

const secretKey = process.env.JWT_SECRET || "vishalsaigodavari"; // fallback

// ✅ Middleware: Verify JWT token
export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) {
    res.status(401).json({ message: "Unauthorized: Token missing" });
    return;
  }

  try {
    const decoded = jwt.verify(token, secretKey) as ExpressUser;
    req.user = decoded;
    next();
  } catch (error: any) {
    const message = error?.name === 'TokenExpiredError' ? 'Unauthorized: Token expired' : 'Unauthorized: Invalid token';
    res.status(401).json({ message });
  }
}

// ✅ Middleware: Role-based Authorization
export function authorizeRoles(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role as any;

    if (!userRole || !allowedRoles.includes(userRole)) {
      res.status(403).json({ message: "Access Denied: Insufficient permissions" });
      return;
    }

    next();
  };
}

export function authorizeRole(requiredRole: string) {
  return authorizeRoles(requiredRole);
}
