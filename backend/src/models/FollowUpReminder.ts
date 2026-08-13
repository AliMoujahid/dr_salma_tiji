import mongoose, { Schema, Document } from 'mongoose';

export interface IFollowUpReminder extends Document {
  patientId: mongoose.Types.ObjectId;
  procedureType: 'Scaling' | 'Implant' | 'Orthodontics' | 'Surgery' | 'Custom';
  title: string;
  intervalMonths: number;
  dueDate: Date;
  status: 'Pending' | 'Sent' | 'Cancelled' | 'Completed';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FollowUpReminderSchema: Schema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    procedureType: {
      type: String,
      enum: ['Scaling', 'Implant', 'Orthodontics', 'Surgery', 'Custom'],
      required: true,
    },
    title: { type: String, required: true },
    intervalMonths: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Sent', 'Cancelled', 'Completed'],
      default: 'Pending',
    },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IFollowUpReminder>('FollowUpReminder', FollowUpReminderSchema);
