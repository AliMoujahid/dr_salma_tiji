import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  username?: string;
  passwordHash: string;
  name: string;
  role: 'ADMIN' | 'DOCTOR' | 'ASSISTANT' | 'RECEPTIONIST';
  active: boolean;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, lowercase: true, trim: true, sparse: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: {
      type: String,
      enum: ['ADMIN', 'DOCTOR', 'ASSISTANT', 'RECEPTIONIST'],
      default: 'RECEPTIONIST',
    },
    active: { type: Boolean, default: true },
    avatarUrl: { type: String },
  },
  { timestamps: true }
);


export default mongoose.model<IUser>('User', UserSchema);
