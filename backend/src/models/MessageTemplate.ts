import mongoose, { Schema, Document } from 'mongoose';

export interface IMessageTemplate extends Document {
  name: string;
  channel: 'WhatsApp' | 'SMS' | 'Email' | 'InApp';
  messageType: 'Immediate' | '7Days' | '3Days' | '24Hours' | '2Hours' | 'Completion' | 'Missed' | 'FollowUp' | 'Custom';
  language: 'fr' | 'ar' | 'en';
  subject?: string;
  body: string;
  buttons?: {
    type: 'Confirm' | 'Cancel' | 'Reschedule' | 'Maps' | 'Call';
    label: string;
    urlOrPhone?: string;
  }[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MessageTemplateSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    channel: { type: String, enum: ['WhatsApp', 'SMS', 'Email', 'InApp'], required: true },
    messageType: {
      type: String,
      enum: ['Immediate', '7Days', '3Days', '24Hours', '2Hours', 'Completion', 'Missed', 'FollowUp', 'Custom'],
      default: 'Custom',
    },
    language: { type: String, enum: ['fr', 'ar', 'en'], default: 'fr' },
    subject: { type: String },
    body: { type: String, required: true },
    buttons: [
      {
        type: { type: String, enum: ['Confirm', 'Cancel', 'Reschedule', 'Maps', 'Call'] },
        label: { type: String },
        urlOrPhone: { type: String },
      },
    ],
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IMessageTemplate>('MessageTemplate', MessageTemplateSchema);
