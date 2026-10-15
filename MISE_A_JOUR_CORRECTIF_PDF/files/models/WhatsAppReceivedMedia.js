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
const WhatsAppReceivedMediaSchema = new mongoose_1.Schema({
    senderPhone: { type: String, required: true, index: true },
    senderName: { type: String, default: 'Inconnu' },
    patientId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Patient', index: true },
    documentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Document' },
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
}, { timestamps: true });
exports.default = mongoose_1.default.model('WhatsAppReceivedMedia', WhatsAppReceivedMediaSchema);
