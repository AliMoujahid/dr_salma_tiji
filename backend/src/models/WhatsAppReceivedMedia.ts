import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppReceivedMedia extends Document {
  senderPhone: string;
  senderName: string;
  patientId?: mongoose.Types.ObjectId;
  documentId?: mongoose.Types.ObjectId;
  fileName: string;
  fileType: 'Photo' | 'XRay' | 'Document' | 'Video' | 'Audio';
  category: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  caption?: string;
  isAutoAssigned: boolean;
  status: 'AutoAssigned' | 'Pending' | 'Ignored';
  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppReceivedMediaSchema: Schema = new Schema(
  {
    senderPhone: { type: String, required: true, index: true },
    senderName: { type: String, default: 'Inconnu' },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', index: true },
    documentId: { type: Schema.Types.ObjectId, ref: 'Document' },
    fileName: { type: String, required: true },
    fileType: {
      type: String,
      enum: ['Photo', 'XRay', 'Document', 'Video', 'Audio'],
      default: 'Document',
    },
    category: { type: String, default: 'Documents' },
    filePath: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
    mimeType: { type: String },
    caption: { type: String },
    isAutoAssigned: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['AutoAssigned', 'Pending', 'Ignored'],
      default: 'Pending',
      index: true,
    },
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IWhatsAppReceivedMedia>('WhatsAppReceivedMedia', WhatsAppReceivedMediaSchema);
