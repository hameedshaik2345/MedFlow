import mongoose, { Schema, Document } from "mongoose";

export interface IBill extends Document {
  prescriptionId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  amount: number;
  status: "unpaid" | "paid";
}

const billSchema: Schema<IBill> = new Schema(
  {
    prescriptionId: { type: Schema.Types.ObjectId, ref: "Prescription", required: true },
    patientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
  },
  { timestamps: true }
);

export default mongoose.model<IBill>("Bill", billSchema);
