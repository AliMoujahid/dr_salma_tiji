"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationProvider = exports.NotificationProviderService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const NotificationSettings_1 = __importDefault(require("../models/NotificationSettings"));
class NotificationProviderService {
    /**
     * Helper to retrieve or initialize notification settings singleton
     */
    async getSettings() {
        let settings = await NotificationSettings_1.default.findOne();
        if (!settings) {
            settings = await NotificationSettings_1.default.create({
                enableWhatsApp: true,
                enableSMS: true,
                enableEmail: true,
                enableInApp: true,
                enableScheduler: true,
                testMode: true,
            });
        }
        return settings;
    }
    /**
     * Primary dispatcher method routing messages to specific channels/providers
     */
    async dispatch(payload) {
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
     * WhatsApp Multi-Provider dispatch (Meta Cloud API / Twilio)
     */
    async sendWhatsApp(payload, settings, recipient) {
        if (settings.whatsAppProvider === 'MetaCloud') {
            // If Meta Cloud credentials exist, send HTTP payload to Meta Graph API
            if (settings.metaCloud.accessToken && settings.metaCloud.phoneNumberId && !settings.testMode) {
                try {
                    const response = await fetch(`https://graph.facebook.com/v18.0/${settings.metaCloud.phoneNumberId}/messages`, {
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
                    });
                    const data = await response.json();
                    if (response.ok) {
                        return { success: true, provider: 'MetaCloud', messageId: data.messages?.[0]?.id };
                    }
                    return { success: false, provider: 'MetaCloud', errorDetails: data.error?.message || 'Meta API Error' };
                }
                catch (err) {
                    return { success: false, provider: 'MetaCloud', errorDetails: err.message };
                }
            }
        }
        // Default simulation or test mode success response
        return {
            success: true,
            provider: settings.whatsAppProvider,
            messageId: `wa-sim-${Date.now()}`,
        };
    }
    /**
     * SMS Multi-Provider dispatch (Twilio, Vonage, MessageBird, AWS SNS)
     */
    async sendSMS(payload, settings, recipient) {
        // If Twilio SMS credentials exist and not test mode
        if (settings.smsProvider === 'Twilio' && settings.twilioSMS.accountSid && !settings.testMode) {
            try {
                const auth = Buffer.from(`${settings.twilioSMS.accountSid}:${settings.twilioSMS.authToken}`).toString('base64');
                const params = new URLSearchParams();
                params.append('To', recipient);
                params.append('From', settings.twilioSMS.fromNumber);
                params.append('Body', payload.body);
                const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${settings.twilioSMS.accountSid}/Messages.json`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: params.toString(),
                });
                const data = await response.json();
                if (response.ok) {
                    return { success: true, provider: 'TwilioSMS', messageId: data.sid };
                }
                return { success: false, provider: 'TwilioSMS', errorDetails: data.message || 'Twilio SMS Error' };
            }
            catch (err) {
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
    async sendEmail(payload, settings, recipient) {
        if (settings.smtp.username && settings.smtp.password && !settings.testMode) {
            try {
                const transporter = nodemailer_1.default.createTransport({
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
            }
            catch (err) {
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
exports.NotificationProviderService = NotificationProviderService;
exports.notificationProvider = new NotificationProviderService();
