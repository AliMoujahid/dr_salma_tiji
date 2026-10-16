import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentTransaction extends Document {
  invoiceId?: mongoose.Types.ObjectId;
  treatmentId?: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  date: Date;
  amount: number;
  paymentMethod: 'espèces' | 'chèque' | 'carte' | 'virement' | 'traites';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentTransactionSchema: Schema = new Schema(
  {
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: false, index: true },
    treatmentId: { type: Schema.Types.ObjectId, ref: 'Treatment', required: false, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    date: { type: Date, required: true, default: Date.now },
    amount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      default: 'espèces',
    },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IPaymentTransaction>('PaymentTransaction', PaymentTransactionSchema);
