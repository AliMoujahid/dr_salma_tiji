import mongoose, { Schema, Document } from 'mongoose';

export interface INotificationSettings extends Document {
  // Master Switches
  enableWhatsApp: boolean;
  enableSMS: boolean;
  enableEmail: boolean;
  enableInApp: boolean;
  enableScheduler: boolean;
  testMode: boolean;
  testPhoneNumber?: string;
  testEmail?: string;

  // Reminders Configuration Toggle
  remindersConfig: {
    immediateOnCreation: boolean;
    days7Before: boolean;
    days3Before: boolean;
    hours24Before: boolean;
    hours2Before: boolean;
    afterCompletion: boolean;
    missedAppointment: boolean;
    followUpClinical: boolean;
  };

  // WhatsApp Configuration
  whatsAppProvider: 'MetaCloud' | 'TwilioWhatsApp';
  metaCloud: {
    appId: string;
    accessToken: string;
    phoneNumberId: string;
    webhookVerifyToken: string;
  };
  twilioWhatsApp: {
    accountSid: string;
    authToken: string;
    fromPhoneNumber: string;
  };

  // SMS Configuration
  smsProvider: 'Twilio' | 'Vonage' | 'MessageBird' | 'AWSSNS';
  twilioSMS: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
  };
  vonageSMS: {
    apiKey: string;
    apiSecret: string;
    fromSender: string;
  };

  // SMTP Email Configuration
  smtp: {
    host: string;
    port: number;
    username: string;
    password: string;
    secure: boolean; // SSL/TLS
    fromEmail: string;
    fromName: string;
  };

  // Clinic Operations Schedule
  businessHours: {
    start: string; // e.g. "08:30"
    end: string;   // e.g. "19:00"
  };
  quietHours: {
    enabled: boolean;
    start: string; // e.g. "22:00"
    end: string;   // e.g. "07:00"
  };
  timezone: string;
  language: 'fr' | 'ar' | 'en';

  createdAt: Date;
  updatedAt: Date;
}

const NotificationSettingsSchema: Schema = new Schema(
  {
    enableWhatsApp: { type: Boolean, default: true },
    enableSMS: { type: Boolean, default: true },
    enableEmail: { type: Boolean, default: true },
    enableInApp: { type: Boolean, default: true },
    enableScheduler: { type: Boolean, default: true },
    testMode: { type: Boolean, default: false },
    testPhoneNumber: { type: String, default: '+212613117131' },
    testEmail: { type: String, default: '' },

    remindersConfig: {
      immediateOnCreation: { type: Boolean, default: true },
      days7Before: { type: Boolean, default: true },
      days3Before: { type: Boolean, default: true },
      hours24Before: { type: Boolean, default: true },
      hours2Before: { type: Boolean, default: true },
      afterCompletion: { type: Boolean, default: true },
      missedAppointment: { type: Boolean, default: true },
      followUpClinical: { type: Boolean, default: true },
    },

    whatsAppProvider: { type: String, enum: ['WhatsAppWebJS', 'MetaCloud', 'TwilioWhatsApp'], default: 'WhatsAppWebJS' },
    metaCloud: {
      appId: { type: String, default: '' },
      accessToken: { type: String, default: '' },
      phoneNumberId: { type: String, default: '' },
      webhookVerifyToken: { type: String, default: '' },
    },
    twilioWhatsApp: {
      accountSid: { type: String, default: '' },
      authToken: { type: String, default: '' },
      fromPhoneNumber: { type: String, default: '' },
    },

    smsProvider: { type: String, enum: ['Twilio', 'Vonage', 'MessageBird', 'AWSSNS'], default: 'Twilio' },
    twilioSMS: {
      accountSid: { type: String, default: '' },
      authToken: { type: String, default: '' },
      fromNumber: { type: String, default: '' },
    },
    vonageSMS: {
      apiKey: { type: String, default: '' },
      apiSecret: { type: String, default: '' },
      fromSender: { type: String, default: '' },
    },

    smtp: {
      host: { type: String, default: 'smtp.gmail.com' },
      port: { type: Number, default: 587 },
      username: { type: String, default: '' },
      password: { type: String, default: '' },
      secure: { type: Boolean, default: false },
      fromEmail: { type: String, default: 'cabinet.tijini@gmail.com' },
      fromName: { type: String, default: 'Cabinet Dentaire Dr. Salma Tijini' },
    },

    businessHours: {
      start: { type: String, default: '08:30' },
      end: { type: String, default: '19:00' },
    },
    quietHours: {
      enabled: { type: Boolean, default: true },
      start: { type: String, default: '22:00' },
      end: { type: String, default: '07:00' },
    },
    timezone: { type: String, default: 'Africa/Casablanca' },
    language: { type: String, enum: ['fr', 'ar', 'en'], default: 'fr' },
  },
  { timestamps: true }
);

export default mongoose.model<INotificationSettings>('NotificationSettings', NotificationSettingsSchema);
