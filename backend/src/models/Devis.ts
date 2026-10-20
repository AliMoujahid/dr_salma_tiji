import mongoose, { Schema, Document } from 'mongoose';

export interface IDevisItem {
  date: string;
  tooth?: string;
  description: string;
  amount: number;
}

export interface IDevis extends Document {
  devisNumber: string; // e.g. DEV-1026/2026
  patientId: mongoose.Types.ObjectId;
  date: Date;
  validUntil?: Date;
  items: IDevisItem[];
  totalAmount: number;
  discount: number;
  netAmount: number;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Invoiced';
  notes?: string;
  convertedInvoiceId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DevisSchema: Schema = new Schema(
  {
    devisNumber: { type: String, required: true, unique: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    date: { type: Date, required: true, default: Date.now },
    validUntil: { type: Date },
    items: [
      {
        date: { type: String, required: true },
        tooth: { type: String, default: '' },
        description: { type: String, required: true },
        amount: { type: Number, required: true, default: 0 },
      },
    ],
    totalAmount: { type: Number, required: true, default: 0 },
    discount: { type: Number, default: 0 },
    netAmount: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ['Draft', 'Sent', 'Accepted', 'Rejected', 'Invoiced'],
      default: 'Draft',
      index: true,
    },
    notes: { type: String, default: '' },
    convertedInvoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IDevis>('Devis', DevisSchema);
