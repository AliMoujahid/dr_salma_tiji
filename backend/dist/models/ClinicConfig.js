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
const ClinicConfigSchema = new mongoose_1.Schema({
    cabinetFr: { type: String, default: 'Cabinet Tijini' },
    cabinetAr: { type: String, default: 'عيادة التيجيني' },
    drFr: { type: String, default: 'Dr. Salma Tijini' },
    drAr: { type: String, default: 'طبيبة جراحة للأسنان' },
    specsFr: {
        type: String,
        default: 'Implantologie - Esthétique dentaire\nChirurgie buccale - Orthodontie - Soins\nProthèse - Blanchiment - Radio Panoramique',
    },
    specsAr: {
        type: String,
        default: 'علاج الاسنان - تركيب الأسنان - تبييض الأسنان\nراديو بانوراميك - زراعة الأسنان - تجميل الاسنان\nجراحة الفم - تقويم الأسنان',
    },
    address: {
        type: String,
        default: 'Av Hassan II, lot AIN AL HAYAT 1 ,N° 235 ,APPT N° 3, 1er Etage - SKHIRAT TEMARA',
    },
    phones: { type: String, default: '+212 7 19 55 66 37 / +212 6 54 23 10 76' },
    email: { type: String, default: 'dr.salmatijini@gmail.com' },
    ice: { type: String, default: '28103818' },
    inbe: { type: String, default: '044215820' },
    ifVal: { type: String, default: '28103818' },
    logoUrl: { type: String },
    stampUrl: { type: String },
    signatureUrl: { type: String },
    autoBackupEnabled: { type: Boolean, default: true },
    autoBackupIntervalDays: { type: Number, default: 7 },
}, { timestamps: true });
exports.default = mongoose_1.default.model('ClinicConfig', ClinicConfigSchema);
