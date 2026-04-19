import express, { Request, Response } from "express";
import User from "../models/user_models";
import { authenticateJWT, authorizeRole } from "../middleware/authMiddleware";

const router = express.Router();

// Get list of all doctors (public or patient-only)
router.get("/list", async (req: Request, res: Response) => {
  try {
    const doctors = await User.find({ role: "doctor" })
      .select("name email specialty department experienceYears rating currentToken liveStatus address");
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: "Error fetching doctors", error });
  }
});

// Increment current token
router.post("/live_status/increment", authenticateJWT, authorizeRole("doctor"), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) return;
    const doctor = await User.findById(req.user.id);
    if (!doctor) { res.status(404).json({ message: "Doctor not found" }); return; }
    
    doctor.currentToken = (doctor.currentToken || 0) + 1;
    await doctor.save();
    
    res.json({ success: true, current_token: doctor.currentToken });
  } catch (error) {
    res.status(500).json({ message: "Failed to increment token", error });
  }
});

// Update live status
router.post("/live_status/update", authenticateJWT, authorizeRole("doctor"), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) return;
    const { status } = req.body;
    
    const doctor = await User.findById(req.user.id);
    if (!doctor) { res.status(404).json({ message: "Doctor not found" }); return; }
    
    doctor.liveStatus = status;
    await doctor.save();
    
    res.json({ success: true, liveStatus: doctor.liveStatus });
  } catch (error) {
    res.status(500).json({ message: "Failed to update status", error });
  }
});

export default router;
