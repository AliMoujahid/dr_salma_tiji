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

export interface ToothHistory {
  _id: string;
  patientId: string;
  toothNumber: number;
  status:
    | 'Healthy'
    | 'Missing'
    | 'Extracted'
    | 'Implant'
    | 'Bridge'
    | 'Crown'
    | 'Root Canal'
    | 'Filling'
    | 'Fracture'
    | 'Mobile'
    | 'Wisdom Tooth';
  notes?: string;
  photosBefore: string[];
  photosAfter: string[];
  xrays: string[];
  cost: number;
  invoiceId?: any;
  date: string;
  createdAt: string;
}

export interface InvoiceItem {
  date: string;
  tooth?: string;
  description: string;
  amount: number;
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
  category:
    | 'Before'
    | 'After'
    | 'Smile'
    | 'Treatment'
    | 'Face'
    | 'Panoramic'
    | 'Periapical'
    | 'CBCT'
    | '3D Scan'
    | 'PDF'
    | 'Others';
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
