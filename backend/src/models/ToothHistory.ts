import mongoose, { Schema, Document } from 'mongoose';

export interface IToothHistory extends Document {
  patientId: mongoose.Types.ObjectId;
  toothNumber: number; // 11-48 for permanent, 51-85 for primary
  status:
    | 'Healthy'
    | 'Missing'
    | 'Extracted'
    | 'Implant'
    | 'Bridge'
    | 'Crown'
    | 'Root Canal'
    | 'Filling'
    | 'Fracture'
    | 'Mobile'
    | 'Wisdom Tooth';
  notes?: string;
  photosBefore: string[];
  photosAfter: string[];
  xrays: string[];
  cost?: number;
  invoiceId?: mongoose.Types.ObjectId;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ToothHistorySchema: Schema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    toothNumber: { type: Number, required: true },
    status: {
      type: String,
      enum: [
        'Healthy',
        'Missing',
        'Extracted',
        'Implant',
        'Bridge',
        'Crown',
        'Root Canal',
        'Filling',
        'Fracture',
        'Mobile',
        'Wisdom Tooth',
      ],
      required: true,
      default: 'Healthy',
    },
    notes: { type: String },
    photosBefore: [{ type: String }],
    photosAfter: [{ type: String }],
    xrays: [{ type: String }],
    cost: { type: Number, default: 0 },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    date: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

// Compound index to quickly fetch history for a specific tooth of a patient
ToothHistorySchema.index({ patientId: 1, toothNumber: 1 });

export default mongoose.model<IToothHistory>('ToothHistory', ToothHistorySchema);
