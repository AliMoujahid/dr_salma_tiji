import mongoose, { Schema, Document } from 'mongoose';

export interface ITreatment extends Document {
  patientId: mongoose.Types.ObjectId;
  date: Date;
  tooth?: string;
  actName: string;
  category?: string;
  cost: number;
  status: 'Terminé' | 'En cours' | 'Planifié';
  notes?: string;
  invoiceId?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TreatmentSchema: Schema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    date: { type: Date, required: true, default: Date.now },
    tooth: { type: String, trim: true },
    actName: { type: String, required: true, trim: true },
    category: { type: String, default: 'Soins' },
    cost: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ['Terminé', 'En cours', 'Planifié'],
      default: 'Terminé',
    },
    notes: { type: String },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model<ITreatment>('Treatment', TreatmentSchema);
