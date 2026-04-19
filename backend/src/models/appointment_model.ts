import mongoose, { Schema, Document } from "mongoose";

export interface IAppointment extends Document {
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  doctorName: string;
  doctorSpecialty: string;
  appointmentDate: Date;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "billed" | "paid";
  reason: string;
  tokenNumber?: number;
  isPaid: boolean;
  totalBill?: number;
  prescription?: { medicine: string; dosage: string }[];
  billing?: {
    amount: number;
    billedDate: Date;
    items?: { name: string; price: number; quantity: number }[];
    status: "unpaid" | "paid";
  };
}

const appointmentSchema: Schema<IAppointment> = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    doctorName: { type: String, required: true },
    doctorSpecialty: { type: String, required: true },
    appointmentDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled", "billed", "paid"],
      default: "pending",
    },
    reason: { type: String, required: true },
    tokenNumber: { type: Number },
    isPaid: { type: Boolean, default: false },
    totalBill: { type: Number, default: 0 },
    prescription: [{
      medicine: { type: String, required: true },
      dosage: { type: String, required: true }
    }],
    billing: {
      amount: { type: Number },
      billedDate: { type: Date },
      items: [{
        name: { type: String },
        price: { type: Number },
        quantity: { type: Number }
      }],
      status: { type: String, enum: ["unpaid", "paid"] }
    }
  },
  { timestamps: true }
);

export default mongoose.model<IAppointment>("Appointment", appointmentSchema);
