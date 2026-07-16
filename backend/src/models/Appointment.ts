import mongoose, { Schema, Document } from 'mongoose';

export interface IAppointment extends Document {
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  dateTime: Date;
  duration: number; // in minutes
  status: 'Scheduled' | 'Confirmed' | 'In Treatment' | 'Completed' | 'Cancelled' | 'No Show';
  chair: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema: Schema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dateTime: { type: Date, required: true, index: true },
    duration: { type: Number, default: 30 },
    status: {
      type: String,
      enum: ['Scheduled', 'Confirmed', 'In Treatment', 'Completed', 'Cancelled', 'No Show'],
      default: 'Scheduled',
      index: true
    },
    chair: { type: String, required: true, default: 'Chair 1' },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IAppointment>('Appointment', AppointmentSchema);
