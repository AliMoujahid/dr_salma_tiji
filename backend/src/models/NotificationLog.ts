import mongoose, { Schema, Document } from 'mongoose';

export interface INotificationLog extends Document {
  patientId: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  channel: 'WhatsApp' | 'SMS' | 'Email' | 'InApp';
  provider: 'WhatsAppWebJS' | 'MetaCloud' | 'TwilioWhatsApp' | 'TwilioSMS' | 'Vonage' | 'MessageBird' | 'AWSSNS' | 'SMTP' | 'System';
  recipient: string; // phone number or email address
  templateId?: mongoose.Types.ObjectId;
  messageType: 'Immediate' | '7Days' | '3Days' | '24Hours' | '2Hours' | 'Completion' | 'Missed' | 'FollowUp' | 'Manual' | 'Bulk' | 'Invoice' | 'Document';
  subject?: string;
  body: string;
  status: 'Queued' | 'Sent' | 'Delivered' | 'Read' | 'Failed';
  errorDetails?: string;
  retryCount: number;
  interactiveAction?: 'Confirmed' | 'Cancelled' | 'Rescheduled' | 'None';
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationLogSchema: Schema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    channel: { type: String, enum: ['WhatsApp', 'SMS', 'Email', 'InApp'], required: true },
    provider: {
      type: String,
      enum: ['WhatsAppWebJS', 'MetaCloud', 'TwilioWhatsApp', 'TwilioSMS', 'Vonage', 'MessageBird', 'AWSSNS', 'SMTP', 'System'],
      default: 'System',
    },
    recipient: { type: String, required: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'MessageTemplate' },
    messageType: {
      type: String,
      enum: ['Immediate', '7Days', '3Days', '24Hours', '2Hours', 'Completion', 'Missed', 'FollowUp', 'Manual', 'Bulk', 'Invoice', 'Document'],
      required: true,
    },
    subject: { type: String },
    body: { type: String, required: true },
    status: {
      type: String,
      enum: ['Queued', 'Sent', 'Delivered', 'Read', 'Failed'],
      default: 'Queued',
    },
    errorDetails: { type: String },
    retryCount: { type: Number, default: 0 },
    interactiveAction: {
      type: String,
      enum: ['Confirmed', 'Cancelled', 'Rescheduled', 'None'],
      default: 'None',
    },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    readAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<INotificationLog>('NotificationLog', NotificationLogSchema);
