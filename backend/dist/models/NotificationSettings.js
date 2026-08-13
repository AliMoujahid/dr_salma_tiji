"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const NotificationSettingsSchema = new mongoose_1.Schema({
    enableWhatsApp: { type: Boolean, default: true },
    enableSMS: { type: Boolean, default: true },
    enableEmail: { type: Boolean, default: true },
    enableInApp: { type: Boolean, default: true },
    enableScheduler: { type: Boolean, default: true },
    testMode: { type: Boolean, default: false },
    testPhoneNumber: { type: String, default: '' },
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
    whatsAppProvider: { type: String, enum: ['MetaCloud', 'TwilioWhatsApp'], default: 'MetaCloud' },
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
}, { timestamps: true });
exports.default = mongoose_1.default.model('NotificationSettings', NotificationSettingsSchema);
