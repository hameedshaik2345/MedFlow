import express, { Request, Response } from "express";
import Appointment from "../models/appointment_model";
import { authenticateJWT, authorizeRole, authorizeRoles } from "../middleware/authMiddleware";

const router = express.Router();

// Get all appointments (Admin/Pharmacist)
router.get("/all", authenticateJWT, authorizeRoles("admin", "pharmacist"), async (req: Request, res: Response) => {
  try {
    const appointments = await Appointment.find()
      .populate("patientId", "name email")
      .populate("doctorId", "name email specialty");
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching appointments", error });
  }
});

// Get appointments for the logged-in patient
router.get("/my-appointments", authenticateJWT, authorizeRoles("patient", "user", "admin"), async (req: Request, res: Response) => {
  try {
    if (!req.user) return;
    const appointments = await Appointment.find({ patientId: req.user.id })
      .populate("doctorId", "name email specialty department currentToken liveStatus");
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching your appointments", error });
  }
});

// Get appointments for the logged-in doctor
router.get("/doctor-appointments", authenticateJWT, authorizeRole("doctor"), async (req: Request, res: Response) => {
  try {
    if (!req.user) return;
    const appointments = await Appointment.find({ doctorId: req.user.id })
      .populate("patientId", "name email gender dateOfBirth");
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching doctor appointments", error });
  }
});

// Get booked tokens for a doctor on a specific date
router.get("/booked-tokens/:doctorId/:date", async (req: Request, res: Response) => {
  try {
    const { doctorId, date } = req.params;
    const appointmentDate = new Date(date as string);
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await Appointment.find({
      doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay }
    }).select("tokenNumber");

    const bookedTokens = appointments.map(app => app.tokenNumber).filter(Boolean);
    res.json(bookedTokens);
  } catch (error) {
    res.status(500).json({ message: "Error fetching booked tokens", error });
  }
});

// Create a new appointment
router.post("/", authenticateJWT, authorizeRoles("patient", "user", "admin"), async (req: Request, res: Response) => {
  try {
    if (!req.user) return;
    const { doctorId, doctorName, doctorSpecialty, appointmentDate, reason, tokenNumber } = req.body;
    
    // Check if token is multiple of 10 (reserved for walk-ins)
    if (tokenNumber && Number(tokenNumber) % 10 === 0) {
       res.status(400).json({ message: "Tokens 10, 20, 30... are reserved for hospital walk-ins and cannot be booked online." });
       return;
    }

    // Calculate token number for the day if not provided
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const existingCount = await Appointment.countDocuments({
      doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay }
    });

    // Create new appointment
    const newAppointment = new Appointment({
      patientId: req.user.id,
      doctorId,
      doctorName,
      doctorSpecialty,
      appointmentDate,
      reason,
      status: "pending",
      isPaid: false,
      tokenNumber: req.body.tokenNumber || (existingCount + 1)
    });
    
    await newAppointment.save();
    res.status(201).json({ message: "Appointment booked successfully", appointment: newAppointment });
  } catch (error) {
    res.status(500).json({ message: "Failed to book appointment", error });
  }
});

// Admin Walk-in Booking
router.post("/walk-in", authenticateJWT, authorizeRole("admin"), async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientName, patientPhone, doctorId, doctorName, doctorSpecialty, appointmentDate, tokenNumber } = req.body;
    
    // For walk-in, we just create a shell user if patient doesn't exist or just map it loosely.
    
    // Calculate token for walk in if not explicitly provided
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    let finalToken = tokenNumber;
    if (!finalToken) {
        const existingCount = await Appointment.countDocuments({
          doctorId,
          appointmentDate: { $gte: startOfDay, $lte: endOfDay }
        });
        finalToken = existingCount + 1;
    }

    // Create new appointment
    const newAppointment = new Appointment({
      patientId: req.user!.id, // Placeholder, ideally should be the resolved patient ID
      doctorId,
      doctorName,
      doctorSpecialty,
      appointmentDate,
      reason: `Walk-in: ${patientName} (${patientPhone})`,
      status: "confirmed", // Walk-ins are usually confirmed immediately
      isPaid: false,
      tokenNumber: finalToken
    });
    
    await newAppointment.save();
    res.status(201).json({ message: "Walk-in booked successfully", appointment: newAppointment });
  } catch (error) {
    res.status(500).json({ message: "Failed to book walk-in", error });
  }
});

// Pharmacist searches for appointment by token and doctor name
router.get("/pharmacist-search", authenticateJWT, authorizeRole("pharmacist"), async (req: Request, res: Response): Promise<void> => {
  try {
    const { tokenNumber, doctorName } = req.query;
    
    // We expect the pharmacist's user.address to potentially map to the hospital to ensure they only query their own
    // but for simplicity, we query by tokenNumber and doctorName regex.
    const appointment = await Appointment.findOne({
       tokenNumber: Number(tokenNumber),
       doctorName: { $regex: new RegExp(doctorName as string, "i") },
       status: "completed" // Usually they only get prescription after completion, or it could be any status
    }).populate("patientId", "name phone gender");

    if (!appointment) {
      res.status(404).json({ message: "No such completed appointment found with this token and doctor" });
      return;
    }

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: "Search error", error });
  }
});

// Update appointment status (Doctor/Admin can update anything, Patient can only cancel)
router.patch("/:id", authenticateJWT, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) return;
    const { status, totalBill } = req.body;
    const userRole = req.user.role;
    const userId = req.user.id;

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      res.status(404).json({ message: "Appointment not found" });
      return;
    }

    if (userRole === "patient") {
      if (appointment.patientId.toString() !== userId) {
        res.status(403).json({ message: "Unauthorized" });
        return;
      }
      if (status !== "cancelled" && status !== "paid") {
        res.status(403).json({ message: "Invalid status update for patient" });
        return;
      }
    } else if (userRole === "pharmacist") {
      if (status !== "billed") {
        res.status(403).json({ message: "Pharmacists can only mark appointments as billed" });
        return;
      }
    } else if (userRole === "doctor") {
      if (appointment.doctorId.toString() !== userId) {
        res.status(403).json({ message: "Unauthorized" });
        return;
      }
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      req.params.id, 
      { status, totalBill }, 

      { new: true }
    );
    res.json({ message: "Appointment updated", appointment: updatedAppointment });
  } catch (error) {
    res.status(500).json({ message: "Failed to update appointment", error });
  }
});

// Doctor writes/updates prescription
router.patch("/:id/prescription", authenticateJWT, authorizeRole("doctor"), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) return;
    const { prescription } = req.body; // Array of { medicine, dosage }
    
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      res.status(404).json({ message: "Appointment not found" });
      return;
    }

    if (appointment.doctorId.toString() !== req.user.id) {
       res.status(403).json({ message: "Unauthorized" });
       return;
    }

    appointment.prescription = prescription;
    appointment.status = "completed"; // Usually saving prescription marks the end of visit
    await appointment.save();

    res.json({ message: "Prescription saved and appointment completed", appointment });
  } catch (error) {
    res.status(500).json({ message: "Failed to save prescription", error });
  }
});

// Pharmacist generates/updates bill for an appointment
router.patch("/:id/bill", authenticateJWT, authorizeRole("pharmacist"), async (req: Request, res: Response): Promise<void> => {
  try {
    const { items, totalAmount } = req.body; // Array of { name, price, quantity }
    
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      res.status(404).json({ message: "Appointment not found" });
      return;
    }

    appointment.billing = {
       amount: totalAmount,
       billedDate: new Date(),
       items: items,
       status: "unpaid"
    };
    appointment.status = "billed";
    appointment.totalBill = totalAmount;

    await appointment.save();
    res.json({ message: "Bill generated successfully", appointment });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate bill", error });
  }
});

export default router;
