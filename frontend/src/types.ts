export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'DOCTOR' | 'ASSISTANT' | 'RECEPTIONIST';
  avatarUrl?: string;
}

export interface Patient {
  _id: string;
  name: string;
  nationalId?: string;
  phone: string;
  email?: string;
  address?: string;
  birthDate: string;
  gender: 'Male' | 'Female' | 'Other';
  bloodType?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  insurance?: {
    provider: string;
    policyNumber: string;
  };
  medicalHistory: string[];
  allergies: string[];
  currentMedications: string[];
  notes?: string;
  profilePictureUrl?: string;
  isArchived: boolean;
  isFavorite: boolean;
  recentlyViewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  _id: string;
  patientId: Patient | string; // populated or ID
  doctorId: User | string;
  dateTime: string;
  duration: number;
  status: 'Scheduled' | 'Confirmed' | 'In Treatment' | 'Completed' | 'Cancelled' | 'No Show';
  chair: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ToothStatusType =
  | 'Healthy'
  | 'Missing'
  | 'Extracted'
  | 'Implant'
  | 'Bridge'
  | 'Temporary Crown'
  | 'Permanent Crown'
  | 'Crown'
  | 'Root Canal'
  | 'Composite Filling'
  | 'Amalgam Filling'
  | 'Filling'
  | 'Inlay'
  | 'Onlay'
  | 'Veneer'
  | 'Sealant'
  | 'Orthodontic Bracket'
  | 'Wisdom Tooth'
  | 'Mobile Grade I'
  | 'Mobile Grade II'
  | 'Mobile Grade III'
  | 'Mobile'
  | 'Periodontitis'
  | 'Bone Loss'
  | 'Fracture'
  | 'Crack'
  | 'Caries'
  | 'Pulpitis'
  | 'Abscess'
  | 'Resorption'
  | 'Eruption'
  | 'Impacted'
  | 'Retained Root';

export interface AIDiagnosisData {
  cariesProbability?: number; // 0 to 1
  boneLossMm?: number;
  periapicalLesionDetected?: boolean;
  fractureDetected?: boolean;
  aiNotes?: string;
  lastAnalyzedAt?: string;
}

export interface ToothMetadata {
  fdiNumber: number;
  universalNumber: string | number;
  nameEn: string;
  nameFr: string;
  type: 'Incisor' | 'Canine' | 'Premolar' | 'Molar';
  side: 'Left' | 'Right';
  jaw: 'Maxillary' | 'Mandibular';
  archType: 'Adult' | 'Child';
  rootCount: number;
}

export interface XRayMeasurement {
  id: string;
  type: 'Distance' | 'Angle' | 'ImplantLength' | 'RootLength' | 'BoneLevel';
  label: string;
  value: string; // e.g. "12.4 mm" or "35.2°"
  points: { x: number; y: number }[];
  color?: string;
}

export interface ToothHistory {
  _id: string;
  patientId: string;
  toothNumber: number;
  procedureName?: string;
  status: ToothStatusType;
  notes?: string;
  photosBefore?: string[];
  photosAfter?: string[];
  xrays?: string[];
  cost: number;
  invoiceId?: any;
  date: string;
  createdAt: string;
  aiDiagnosis?: AIDiagnosisData;
  measurements?: XRayMeasurement[];
}

export interface InvoiceItem {
  date: string;
  tooth?: string;
  description: string;
  amount: number; // A payer
  advance?: number; // Avance
  remaining?: number; // Reste à payer (amount - advance)
  _id?: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  patientId: Patient;
  date: string;
  items: InvoiceItem[];
  totalAmount: number;
  discount: number;
  netAmount: number;
  paymentMode: 'espèces' | 'chèque' | 'carte' | 'virement' | 'traites';
  paymentStatus: 'Paid' | 'Partially Paid' | 'Unpaid' | 'Refunded';
  paidAmount: number;
  remainingAmount?: number;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTransaction {
  _id: string;
  invoiceId: any;
  patientId: string;
  date: string;
  amount: number;
  paymentMethod: 'espèces' | 'chèque' | 'carte' | 'virement' | 'traites';
  notes?: string;
  createdAt: string;
}

export interface Document {
  _id: string;
  patientId: string;
  fileName: string;
  fileType: 'Photo' | 'XRay' | 'Document' | 'Video' | 'Audio';
  category: string;
  filePath: string;
  fileSize: number;
  uploadedAt: string;
}

export interface ClinicConfig {
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

export interface NotificationLog {
  _id: string;
  patientId?: any;
  appointmentId?: any;
  channel: 'WhatsApp' | 'SMS' | 'Email' | 'InApp';
  provider: string;
  recipient: string;
  messageType: string;
  subject?: string;
  body: string;
  status: 'Queued' | 'Sent' | 'Delivered' | 'Read' | 'Failed';
  errorDetails?: string;
  retryCount: number;
  createdAt: string;
}

export interface MessageTemplate {
  _id: string;
  name: string;
  channel: 'WhatsApp' | 'SMS' | 'Email' | 'InApp';
  messageType: string;
  language: 'fr' | 'ar' | 'en';
  subject?: string;
  body: string;
  buttons?: { type: string; label: string; urlOrPhone?: string }[];
  isDefault: boolean;
}

export interface NotificationSettings {
  enableWhatsApp: boolean;
  enableSMS: boolean;
  enableEmail: boolean;
  enableInApp: boolean;
  enableScheduler: boolean;
  testMode: boolean;
  testPhoneNumber?: string;
  testEmail?: string;
  whatsAppProvider: 'WhatsAppWebJS' | 'MetaCloud' | 'TwilioWhatsApp';
  smsProvider: 'Twilio' | 'Vonage' | 'MessageBird' | 'AWSSNS';
  metaCloud?: {
    appId: string;
    accessToken: string;
    phoneNumberId: string;
  };
  smtp?: {
    host: string;
    port: number;
    username: string;
    password: string;
    fromEmail: string;
    fromName: string;
  };
}

export interface DentalAct {
  _id: string;
  code?: string;
  name: string;
  category: string;
  defaultPrice: number;
  description?: string;
  isFavorite: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
