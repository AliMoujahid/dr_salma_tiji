import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId;
  userName: string;
  action: 'DELETE_PATIENT' | 'RESTORE_PATIENT' | 'OTHER';
  targetId: mongoose.Types.ObjectId;
  targetName: string;
  details?: string;
  backupData?: any;
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    action: {
      type: String,
      enum: ['DELETE_PATIENT', 'RESTORE_PATIENT', 'OTHER'],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: true },
    targetName: { type: String, required: true },
    details: { type: String },
    backupData: { type: Schema.Types.Mixed }, // to hold the full resource snapshot for restoration
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
