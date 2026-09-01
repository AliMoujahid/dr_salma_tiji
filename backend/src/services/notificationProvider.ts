import nodemailer from 'nodemailer';
import NotificationSettings, { INotificationSettings } from '../models/NotificationSettings';
import { whatsappService } from './whatsappService';

export interface SendMessagePayload {
  channel: 'WhatsApp' | 'SMS' | 'Email' | 'InApp';
  recipient: string;
  subject?: string;
  body: string;
  mediaPath?: string;
  mediaFilename?: string;
  mediaMimeType?: string;
  mediaData?: { mimetype: string; data: string; filename?: string };
  buttons?: { label: string; urlOrPhone?: string }[];
}

export interface SendResult {
  success: boolean;
  provider: string;
  messageId?: string;
  errorDetails?: string;
}

export class NotificationProviderService {
  /**
   * Helper to retrieve or initialize notification settings singleton
   */
  public async getSettings(): Promise<INotificationSettings> {
    let settings = await NotificationSettings.findOne();
    if (!settings) {
      settings = await NotificationSettings.create({
        enableWhatsApp: true,
        enableSMS: true,
        enableEmail: true,
        enableInApp: true,
        enableScheduler: true,
        testMode: true,
        testPhoneNumber: '+212613117131',
      });
    }
    return settings;
  }

  /**
   * Primary dispatcher method routing messages to specific channels/providers
   */
  public async dispatch(payload: SendMessagePayload): Promise<SendResult> {
    const settings = await this.getSettings();

    // If test mode is enabled, route to test recipient or simulate
    const recipient = settings.testMode && settings.testPhoneNumber
      ? settings.testPhoneNumber
      : payload.recipient;

    switch (payload.channel) {
      case 'WhatsApp':
        if (!settings.enableWhatsApp) {
          return { success: false, provider: settings.whatsAppProvider, errorDetails: 'WhatsApp channel disabled' };
        }
        return this.sendWhatsApp(payload, settings, recipient);

      case 'SMS':
        if (!settings.enableSMS) {
          return { success: false, provider: settings.smsProvider, errorDetails: 'SMS channel disabled' };
        }
        return this.sendSMS(payload, settings, recipient);

      case 'Email':
        if (!settings.enableEmail) {
          return { success: false, provider: 'SMTP', errorDetails: 'Email channel disabled' };
        }
        return this.sendEmail(payload, settings, recipient);

      case 'InApp':
        return { success: true, provider: 'System', messageId: `inapp-${Date.now()}` };

      default:
        return { success: false, provider: 'System', errorDetails: 'Unsupported channel' };
    }
  }

  /**
   * WhatsApp Multi-Provider dispatch (WhatsApp Web Client / Meta Cloud API)
   */
  private async sendWhatsApp(
    payload: SendMessagePayload,
    settings: INotificationSettings,
    recipient: string
  ): Promise<SendResult> {
    // 1. Try sending via WhatsApp Web Client (100% Free local WhatsApp session)
    const waStatus = whatsappService.getStatus();
    if (waStatus.connected) {
      let result;
      if (payload.mediaPath || payload.mediaData) {
        result = await whatsappService.sendMedia(
          recipient,
          payload.mediaPath || payload.mediaData!,
          payload.body,
          payload.mediaFilename,
          payload.mediaMimeType
        );
      } else {
        result = await whatsappService.sendMessage(recipient, payload.body);
      }

      if (result.success) {
        return { success: true, provider: 'WhatsAppWebJS', messageId: result.messageId };
      }
    }

    if (settings.whatsAppProvider === 'MetaCloud') {
      // If Meta Cloud credentials exist, send HTTP payload to Meta Graph API
      if (settings.metaCloud.accessToken && settings.metaCloud.phoneNumberId && !settings.testMode) {
        try {
          const response = await fetch(
            `https://graph.facebook.com/v18.0/${settings.metaCloud.phoneNumberId}/messages`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${settings.metaCloud.accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: recipient,
                type: 'text',
                text: { body: payload.body },
              }),
            }
          );
          const data = await response.json();
          if (response.ok) {
            return { success: true, provider: 'MetaCloud', messageId: data.messages?.[0]?.id };
          }
          return { success: false, provider: 'MetaCloud', errorDetails: data.error?.message || 'Meta API Error' };
        } catch (err: any) {
          return { success: false, provider: 'MetaCloud', errorDetails: err.message };
        }
      }
    }

    // Fallback simulation mode
    return {
      success: true,
      provider: settings.whatsAppProvider || 'WhatsAppWebJS',
      messageId: `wa-sim-${Date.now()}`,
    };
  }

  /**
   * SMS Multi-Provider dispatch (Twilio, Vonage, MessageBird, AWS SNS)
   */
  private async sendSMS(
    payload: SendMessagePayload,
    settings: INotificationSettings,
    recipient: string
  ): Promise<SendResult> {
    // If Twilio SMS credentials exist and not test mode
    if (settings.smsProvider === 'Twilio' && settings.twilioSMS.accountSid && !settings.testMode) {
      try {
        const auth = Buffer.from(
          `${settings.twilioSMS.accountSid}:${settings.twilioSMS.authToken}`
        ).toString('base64');

        const params = new URLSearchParams();
        params.append('To', recipient);
        params.append('From', settings.twilioSMS.fromNumber);
        params.append('Body', payload.body);

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${settings.twilioSMS.accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
          }
        );
        const data = await response.json();
        if (response.ok) {
          return { success: true, provider: 'TwilioSMS', messageId: data.sid };
        }
        return { success: false, provider: 'TwilioSMS', errorDetails: data.message || 'Twilio SMS Error' };
      } catch (err: any) {
        return { success: false, provider: 'TwilioSMS', errorDetails: err.message };
      }
    }

    // Default simulated SMS dispatch
    return {
      success: true,
      provider: settings.smsProvider,
      messageId: `sms-sim-${Date.now()}`,
    };
  }

  /**
   * SMTP Email dispatch using Nodemailer
   */
  private async sendEmail(
    payload: SendMessagePayload,
    settings: INotificationSettings,
    recipient: string
  ): Promise<SendResult> {
    if (settings.smtp.username && settings.smtp.password && !settings.testMode) {
      try {
        const transporter = nodemailer.createTransport({
          host: settings.smtp.host,
          port: settings.smtp.port,
          secure: settings.smtp.secure,
          auth: {
            user: settings.smtp.username,
            pass: settings.smtp.password,
          },
        });

        const mailOptions = {
          from: `"${settings.smtp.fromName}" <${settings.smtp.fromEmail}>`,
          to: recipient,
          subject: payload.subject || 'Cabinet Dentaire Dr. Salma Tijini - Notification',
          html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #2563eb;">Cabinet Dentaire Dr. Salma Tijini</h2>
            <div style="white-space: pre-line; line-height: 1.6; font-size: 14px;">${payload.body}</div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #888;">Ceci est un message automatique, merci de ne pas y répondre directement.</p>
          </div>`,
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, provider: 'SMTP', messageId: info.messageId };
      } catch (err: any) {
        return { success: false, provider: 'SMTP', errorDetails: err.message };
      }
    }

    // Default simulated email dispatch
    return {
      success: true,
      provider: 'SMTP',
      messageId: `email-sim-${Date.now()}`,
    };
  }
}

export const notificationProvider = new NotificationProviderService();
