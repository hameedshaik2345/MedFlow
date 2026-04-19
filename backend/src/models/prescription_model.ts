import mongoose, { Schema, Document } from "mongoose";

export interface IPrescription extends Document {
  appointmentId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  medicines: string;
  notes?: string;
  status: "pending" | "billed";
}

const prescriptionSchema: Schema<IPrescription> = new Schema(
  {
    appointmentId: { type: Schema.Types.ObjectId, ref: "Appointment", required: true },
    patientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    medicines: { type: String, required: true },
    notes: { type: String },
    status: { type: String, enum: ["pending", "billed"], default: "pending" },
  },
  { timestamps: true }
);

export default mongoose.model<IPrescription>("Prescription", prescriptionSchema);
