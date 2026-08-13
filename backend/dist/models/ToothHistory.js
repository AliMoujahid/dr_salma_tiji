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
const ToothHistorySchema = new mongoose_1.Schema({
    patientId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    toothNumber: { type: Number, required: true },
    status: {
        type: String,
        enum: [
            'Healthy',
            'Missing',
            'Extracted',
            'Implant',
            'Bridge',
            'Crown',
            'Root Canal',
            'Filling',
            'Fracture',
            'Mobile',
            'Wisdom Tooth',
        ],
        required: true,
        default: 'Healthy',
    },
    notes: { type: String },
    photosBefore: [{ type: String }],
    photosAfter: [{ type: String }],
    xrays: [{ type: String }],
    cost: { type: Number, default: 0 },
    invoiceId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Invoice' },
    date: { type: Date, required: true, default: Date.now },
}, { timestamps: true });
// Compound index to quickly fetch history for a specific tooth of a patient
ToothHistorySchema.index({ patientId: 1, toothNumber: 1 });
exports.default = mongoose_1.default.model('ToothHistory', ToothHistorySchema);
