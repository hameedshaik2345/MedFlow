import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import session from 'express-session';
import passport from 'passport';
import userRoutes from "./routes/user_routes";
import authRoutes from "./routes/auth_routes";

dotenv.config();
const app = express();

// Configure CORS to allow requests from the frontend
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://localhost:5173',
  'https://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://localhost:3000',
  'https://127.0.0.1:3000'
];

app.use(cors({
  origin: true, // Allow all origins (simplifies deployment for now)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Session configuration (required for OAuth)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport and session
app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());

const DEFAULT_MONGO_URI = "mongodb+srv://vishalsaigodavari:hicAAlzK1T9Y8Tff@cluster0.wpsivyj.mongodb.net/MedFlow?retryWrites=true&w=majority&appName=Cluster0";
const MONGO_URI = process.env.MONGO_URI || DEFAULT_MONGO_URI;

// Ensure database connection middleware for serverless invocations
let isConnected = false;
app.use(async (_req, _res, next) => {
  if (mongoose.connection.readyState >= 1) {
    return next();
  }
  try {
    await mongoose.connect(MONGO_URI);
    isConnected = true;
    next();
  } catch (err) {
    console.error("MongoDB connection error in middleware:", err);
    next();
  }
});

// Routes
import appointmentRoutes from "./routes/appointment_routes";
import doctorRoutes from "./routes/doctor_routes";
import paymentRoutes from "./routes/payment_routes";
import symptomRoutes from "./routes/symptom_routes";

app.use("/api/auth", authRoutes); // Auth routes (Google OAuth)
app.use("/api/users", userRoutes);
// Medical routes
app.use("/api/medical-appointments", appointmentRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/symptoms", symptomRoutes);

const PORT = process.env.PORT || 3000;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    // Only listen if not running on Vercel (Vercel handles the serverless connection)
    if (process.env.VERCEL !== '1') {
      app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    }
  })
  .catch((err) => console.error("Initial MongoDB connection error:", err));

export default app;
