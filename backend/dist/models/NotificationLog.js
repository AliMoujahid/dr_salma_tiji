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
const NotificationLogSchema = new mongoose_1.Schema({
    patientId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Patient', required: true },
    appointmentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Appointment' },
    channel: { type: String, enum: ['WhatsApp', 'SMS', 'Email', 'InApp'], required: true },
    provider: {
        type: String,
        enum: ['MetaCloud', 'TwilioWhatsApp', 'TwilioSMS', 'Vonage', 'MessageBird', 'AWSSNS', 'SMTP', 'System'],
        default: 'System',
    },
    recipient: { type: String, required: true },
    templateId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'MessageTemplate' },
    messageType: {
        type: String,
        enum: ['Immediate', '7Days', '3Days', '24Hours', '2Hours', 'Completion', 'Missed', 'FollowUp', 'Manual', 'Bulk'],
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
}, { timestamps: true });
exports.default = mongoose_1.default.model('NotificationLog', NotificationLogSchema);
