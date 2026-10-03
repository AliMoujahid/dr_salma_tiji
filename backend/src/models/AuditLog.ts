import mongoose, { Schema, Document } from 'mongoose';

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'PASSWORD_CHANGE'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'CREATE_PATIENT'
  | 'UPDATE_PATIENT'
  | 'DELETE_PATIENT'
  | 'RESTORE_PATIENT'
  | 'UPDATE_TOOTH_HISTORY'
  | 'CREATE_INVOICE'
  | 'UPDATE_INVOICE'
  | 'DELETE_INVOICE'
  | 'ADD_PAYMENT'
  | 'DELETE_PAYMENT'
  | 'UPLOAD_DOCUMENT'
  | 'RENAME_DOCUMENT'
  | 'DELETE_DOCUMENT'
  | 'TRIGGER_BACKUP'
  | 'RESTORE_BACKUP'
  | 'UPDATE_CLINIC_CONFIG'
  | 'SECURITY_ALERT'
  | 'OTHER';

export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface IAuditLog extends Document {
  userId?: mongoose.Types.ObjectId;
  userName: string;
  action: AuditAction;
  severity: AuditSeverity;
  targetId?: mongoose.Types.ObjectId | string;
  targetName?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  backupData?: any;
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String, required: true, default: 'Système / Anonyme' },
    action: {
      type: String,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['INFO', 'WARNING', 'CRITICAL'],
      default: 'INFO',
      index: true,
    },
    targetId: { type: Schema.Types.Mixed },
    targetName: { type: String },
    details: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    backupData: { type: Schema.Types.Mixed }, // Snapshots for undo / restoration
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ createdAt: -1 });

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
