import mongoose, { Schema, Document } from 'mongoose';

export interface IClinicConfig extends Document {
  cabinetFr: string;
  cabinetAr: string;
  drFr: string;
  drAr: string;
  specsFr: string;
  specsAr: string;
  address: string;
  phones: string;
  email: string;
  ice?: string;
  inbe?: string;
  ifVal?: string;
  logoUrl?: string;
  stampUrl?: string;
  signatureUrl?: string;
  autoBackupEnabled: boolean;
  autoBackupIntervalDays: number;
}

const ClinicConfigSchema: Schema = new Schema(
  {
    cabinetFr: { type: String, default: 'Cabinet Tijini' },
    cabinetAr: { type: String, default: 'عيادة التيجيني' },
    drFr: { type: String, default: 'Dr. Salma Tijini' },
    drAr: { type: String, default: 'طبيبة جراحة للأسنان' },
    specsFr: {
      type: String,
      default:
        'Implantologie - Esthétique dentaire\nChirurgie buccale - Orthodontie - Soins\nProthèse - Blanchiment - Radio Panoramique',
    },
    specsAr: {
      type: String,
      default:
        'علاج الاسنان - تركيب الأسنان - تبييض الأسنان\nراديو بانوراميك - زراعة الأسنان - تجميل الاسنان\nجراحة الفم - تقويم الأسنان',
    },
    address: {
      type: String,
      default:
        'Av Hassan II, lot AIN AL HAYAT 1 ,N° 235 ,APPT N° 3, 1er Etage - SKHIRAT TEMARA',
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
  },
  { timestamps: true }
);

export default mongoose.model<IClinicConfig>('ClinicConfig', ClinicConfigSchema);
