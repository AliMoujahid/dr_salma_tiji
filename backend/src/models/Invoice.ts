import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceItem {
  date: string; // JJ/MM format or DD/MM/YYYY
  tooth?: string; // tooth number or empty
  description: string;
  amount: number;
}

export interface IInvoice extends Document {
  invoiceNumber: string; // unique, e.g. 1025/2026
  patientId: mongoose.Types.ObjectId;
  date: Date;
  items: IInvoiceItem[];
  totalAmount: number;
  discount: number; // remise
  netAmount: number; // total - discount
  paymentMode: 'espèces' | 'chèque' | 'carte' | 'virement' | 'traites';
  paymentStatus: 'Paid' | 'Partially Paid' | 'Unpaid' | 'Refunded';
  paidAmount: number;
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
        amount: { type: Number, required: true },
      },
    ],
    totalAmount: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    netAmount: { type: Number, required: true },
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
