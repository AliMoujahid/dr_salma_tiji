import mongoose, { Schema, Document } from 'mongoose';

export interface IDocument extends Document {
  patientId: mongoose.Types.ObjectId;
  fileName: string;
  fileType: 'Photo' | 'XRay' | 'Document' | 'Video' | 'Audio';
  category:
    | 'Before'
    | 'After'
    | 'Smile'
    | 'Treatment'
    | 'Face'
    | 'Panoramic'
    | 'Periapical'
    | 'CBCT'
    | '3D Scan'
    | 'PDF'
    | 'Others';
  filePath: string; // Relative path inside uploads/Patients/[Patient Name]/...
  fileSize: number; // in bytes
  uploadedAt: Date;
}

const DocumentSchema: Schema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    fileName: { type: String, required: true },
    fileType: {
      type: String,
      enum: ['Photo', 'XRay', 'Document', 'Video', 'Audio'],
      required: true,
      default: 'Document',
    },
    category: {
      type: String,
      required: true,
      default: 'Documents',
    },
    filePath: { type: String, required: true },
    fileSize: { type: Number, required: true },
    uploadedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<IDocument>('Document', DocumentSchema);
