import express, { Request, Response } from "express";
import Payment from "../models/payment_model";
import Appointment from "../models/appointment_model";
import { authenticateJWT } from "../middleware/authMiddleware";

const router = express.Router();

// Simulate payment and update appointment
router.post("/simulate", authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) return;
    const { appointmentId, amount, method } = req.body;
    
    // Check if appointment exists
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      res.status(404).json({ message: "Appointment not found" });
      return;
    }
    
    // Simulate payment success 80% of the time as per user suggestion
    const isSuccess = Math.random() > 0.2;
    const paymentStatus = isSuccess ? "COMPLETED" : "FAILED";
    
    // Create payment record
    const payment = new Payment({
      appointmentId,
      patientId: req.user.id,
      amount,
      status: paymentStatus,
      method: method || "SIMULATED",
      transactionId: `TXN_SIM_${Date.now()}`
    });
    
    await payment.save();
    
    // Update appointment if successful
    if (isSuccess) {
      appointment.isPaid = true;
      // Provide a confirmed status immediately upon payment if it was pending
      if (appointment.status === "pending") {
         appointment.status = "confirmed";
      }
      await appointment.save();
    }
    
    res.json({
      success: isSuccess,
      message: isSuccess ? "Payment successful" : "Payment failed",
      payment
    });

  } catch (error) {
    res.status(500).json({ message: "Error simulating payment", error });
  }
});

export default router;
