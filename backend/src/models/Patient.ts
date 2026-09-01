import mongoose, { Schema, Document } from 'mongoose';

export interface IPatient extends Document {
  name: string;
  nationalId?: string;
  phone: string;
  email?: string;
  address?: string;
  birthDate: Date;
  gender: 'Male' | 'Female' | 'Other';
  bloodType?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  insurance?: {
    provider: string;
    policyNumber: string;
  };
  medicalHistory: string[];
  allergies: string[];
  currentMedications: string[];
  notes?: string;
  profilePictureUrl?: string;
  isArchived: boolean;
  isFavorite: boolean;
  recentlyViewedAt?: Date;
  deleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema: Schema = new Schema(
  {
    name: { type: String, required: true, index: true },
    nationalId: { type: String, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String },
    birthDate: { type: Date, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    bloodType: { type: String, trim: true },
    emergencyContact: {
      name: { type: String },
      phone: { type: String },
      relationship: { type: String },
    },
    insurance: {
      provider: { type: String },
      policyNumber: { type: String },
    },
    medicalHistory: [{ type: String }],
    allergies: [{ type: String }],
    currentMedications: [{ type: String }],
    notes: { type: String },
    profilePictureUrl: { type: String },
    isArchived: { type: Boolean, default: false },
    isFavorite: { type: Boolean, default: false },
    recentlyViewedAt: { type: Date },
    deleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model<IPatient>('Patient', PatientSchema);
