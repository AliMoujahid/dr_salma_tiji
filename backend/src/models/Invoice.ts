import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceItem {
  date: string; // JJ/MM format or DD/MM/YYYY
  tooth?: string; // tooth number or empty
  description: string;
  amount: number; // A payer
  advance?: number; // Avance
  remaining?: number; // Reste à payer (amount - advance)
}

export interface IInvoice extends Document {
  invoiceNumber: string; // unique, e.g. 1025/2026
  patientId: mongoose.Types.ObjectId;
  date: Date;
  items: IInvoiceItem[];
  totalAmount: number; // Total A payer
  discount: number; // Remise
  netAmount: number; // Net total (total - discount)
  paymentMode: 'espèces' | 'chèque' | 'carte' | 'virement' | 'traites';
  paymentStatus: 'Paid' | 'Partially Paid' | 'Unpaid' | 'Refunded';
  paidAmount: number; // Total Avance payée
  remainingAmount?: number; // Total Reste dû (netAmount - paidAmount)
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema: Schema = new Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    date: { type: Date, required: true, default: Date.now },
    items: [
      {
        date: { type: String, required: true },
        tooth: { type: String },
        description: { type: String, required: true },
        amount: { type: Number, required: true, default: 0 },
        advance: { type: Number, default: 0 },
        remaining: { type: Number, default: 0 },
      },
    ],
    totalAmount: { type: Number, required: true, default: 0 },
    discount: { type: Number, default: 0 },
    netAmount: { type: Number, required: true, default: 0 },
    paymentMode: {
      type: String,
      enum: ['espèces', 'chèque', 'carte', 'virement', 'traites'],
      default: 'espèces',
    },
    paymentStatus: {
      type: String,
      enum: ['Paid', 'Partially Paid', 'Unpaid', 'Refunded'],
      default: 'Unpaid',
      index: true
    },
    paidAmount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IInvoice>('Invoice', InvoiceSchema);
