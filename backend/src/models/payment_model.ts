import mongoose, { Schema, Document } from "mongoose";

export interface IPayment extends Document {
  appointmentId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  amount: number;
  status: "PENDING" | "COMPLETED" | "FAILED";
  method: "SIMULATED" | "UPI" | "CARD";
  transactionId?: string;
}

const paymentSchema: Schema<IPayment> = new Schema(
  {
    appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment", required: true },
    patientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["PENDING", "COMPLETED", "FAILED"], default: "PENDING" },
    method: { type: String, enum: ["SIMULATED", "UPI", "CARD"], default: "SIMULATED" },
    transactionId: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IPayment>("Payment", paymentSchema);
