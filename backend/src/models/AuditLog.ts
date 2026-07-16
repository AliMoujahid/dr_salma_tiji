import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  userId?: mongoose.Types.ObjectId;
  action: string;
  details?: string;
  timestamp: Date;
}

const AuditLogSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  action: { type: String, required: true },
  details: { type: String },
  timestamp: { type: Date, default: Date.now, index: true },
});

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
