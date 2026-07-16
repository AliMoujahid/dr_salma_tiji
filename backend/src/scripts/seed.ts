import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Patient from '../models/Patient';
import Appointment from '../models/Appointment';
import ToothHistory from '../models/ToothHistory';
import Invoice from '../models/Invoice';
import ClinicConfig from '../models/ClinicConfig';
import PaymentTransaction from '../models/Payment';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dr-tijini';

async function seed() {
  try {
    console.log('Connecting to MongoDB at:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('Database connected successfully.');

    // Clear existing collections
    await User.deleteMany({});
    await Patient.deleteMany({});
    await Appointment.deleteMany({});
    await ToothHistory.deleteMany({});
    await Invoice.deleteMany({});
    await PaymentTransaction.deleteMany({});
    await ClinicConfig.deleteMany({});

    console.log('Cleared existing collections.');

    // Create staff users
    const salt = await bcrypt.genSalt(10);
    const commonPasswordHash = await bcrypt.hash('password123', salt);

    const admin = await User.create({
      email: 'admin@tijini.com',
      passwordHash: commonPasswordHash,
      name: 'Dr. Salma Tijini (Admin)',
      role: 'ADMIN',
      avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150',
    });

    const doctor = await User.create({
      email: 'doctor@tijini.com',
      passwordHash: commonPasswordHash,
      name: 'Dr. Salma Tijini',
      role: 'DOCTOR',
      avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150',
    });

    const assistant = await User.create({
      email: 'assistant@tijini.com',
      passwordHash: commonPasswordHash,
      name: 'Yasmina Benjelloun',
      role: 'ASSISTANT',
      avatarUrl: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?w=150',
    });

    const receptionist = await User.create({
      email: 'receptionist@tijini.com',
      passwordHash: commonPasswordHash,
      name: 'Samira Alami',
      role: 'RECEPTIONIST',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    });

    console.log('Seeded users.');

    // Create Clinic Config
    const config = await ClinicConfig.create({
      cabinetFr: 'Cabinet Tijini',
      cabinetAr: 'عيادة التيجيني',
      drFr: 'Dr. Salma Tijini',
      drAr: 'طبيبة جراحة للأسنان',
      specsFr: 'Implantologie - Esthétique dentaire\nChirurgie buccale - Orthodontie - Soins\nProthèse - Blanchiment - Radio Panoramique',
      specsAr: 'علاج الاسنان - تركيب الأسنان - تبييض الأسنان\nراديو بانوراميك - زراعة الأسنان - تجميل الاسنان\nجراحة الفم - تقويم الأسنان',
      address: 'Av Hassan II, lot AIN AL HAYAT 1 ,N° 235 ,APPT N° 3, 1er Etage - SKHIRAT TEMARA',
      phones: '+212 7 19 55 66 37 / +212 6 54 23 10 76',
      email: 'dr.salmatijini@gmail.com',
      ice: '28103818',
      inbe: '044215820',
      ifVal: '28103818',
      autoBackupEnabled: true,
      autoBackupIntervalDays: 7,
    });

    console.log('Seeded clinic config.');

    // Create Patients
    const patients = await Patient.create([
      {
        name: 'Amine El Amrani',
        nationalId: 'AB123456',
        phone: '+212 6 54 23 10 76',
        email: 'amine.amrani@gmail.com',
        address: 'Appt 4, Immeuble B, Hay Riad, Rabat',
        birthDate: new Date('1990-05-15'),
        gender: 'Male',
        bloodType: 'O+',
        emergencyContact: {
          name: 'Khadija El Amrani',
          phone: '+212 6 12 34 56 78',
          relationship: 'Spouse',
        },
        insurance: {
          provider: 'CNOPS',
          policyNumber: 'CP-9928172',
        },
        medicalHistory: ['Hypertension'],
        allergies: ['Penicillin'],
        currentMedications: ['Amlodipine 5mg'],
        notes: 'Patient requires extra local anesthesia.',
        profilePictureUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        isFavorite: true,
        recentlyViewedAt: new Date(),
      },
      {
        name: 'Nadia Bensouda',
        nationalId: 'CD789012',
        phone: '+212 7 19 55 66 37',
        email: 'nadia.bens@outlook.com',
        address: 'Villa 12, Lotissement Al Wafa, Temara',
        birthDate: new Date('1985-11-22'),
        gender: 'Female',
        bloodType: 'A-',
        emergencyContact: {
          name: 'Mohamed Bensouda',
          phone: '+212 6 77 88 99 00',
          relationship: 'Father',
        },
        insurance: {
          provider: 'AXA Assurances',
          policyNumber: 'AX-8716252',
        },
        medicalHistory: [],
        allergies: [],
        currentMedications: [],
        notes: 'Regular checkup and cosmetic dentistry enthusiast.',
        profilePictureUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        isFavorite: false,
        recentlyViewedAt: new Date(Date.now() - 3600000),
      },
      {
        name: 'Youssef Taghi',
        nationalId: 'EF345678',
        phone: '+212 6 88 12 34 56',
        email: 'y.taghi@gmail.com',
        address: 'Avenue de la Gare, Skhirat',
        birthDate: new Date('2015-08-04'), // Primary teeth patient
        gender: 'Male',
        bloodType: 'B+',
        emergencyContact: {
          name: 'Fatima Taghi',
          phone: '+212 6 88 12 34 00',
          relationship: 'Mother',
        },
        insurance: {
          provider: 'SAHAM Assurances',
          policyNumber: 'SH-3849102',
        },
        medicalHistory: ['Asthma'],
        allergies: ['Dust'],
        currentMedications: ['Ventolin inhaler'],
        notes: 'First dental checkup. Dental anxiety present.',
        profilePictureUrl: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=150',
        isFavorite: false,
        recentlyViewedAt: new Date(Date.now() - 7200000),
      },
    ]);

    console.log('Seeded patients.');

    // Seed Dental Chart state and history for Patient 0 (Amine El Amrani)
    const amine = patients[0];
    await ToothHistory.create([
      {
        patientId: amine._id,
        toothNumber: 14,
        status: 'Crown',
        notes: 'Couronne en Zircone céramique posée le 12/01/2026.',
        cost: 2500,
        photosBefore: [],
        photosAfter: [],
        xrays: [],
        date: new Date('2026-01-12'),
      },
      {
        patientId: amine._id,
        toothNumber: 46,
        status: 'Implant',
        notes: 'Pose d\'implant titane (Straumann) + pilier implantaire.',
        cost: 7200,
        photosBefore: [],
        photosAfter: [],
        xrays: [],
        date: new Date('2026-05-15'),
      },
      {
        patientId: amine._id,
        toothNumber: 36,
        status: 'Root Canal',
        notes: 'Traitement endodontique de canal effectué.',
        cost: 600,
        photosBefore: [],
        photosAfter: [],
        xrays: [],
        date: new Date('2026-05-20'),
      },
    ]);

    console.log('Seeded tooth history.');

    // Create Invoices & Payments for Amine El Amrani
    const invoice1 = await Invoice.create({
      invoiceNumber: '1025/2026',
      patientId: amine._id,
      date: new Date('2026-01-12'),
      items: [
        { date: '12/01', tooth: '14', description: 'Couronne en Zircone céramique', amount: 2500 },
        { date: '12/01', tooth: '', description: 'Consultation bucco-dentaire', amount: 200 },
      ],
      totalAmount: 2700,
      discount: 200,
      netAmount: 2500,
      paymentMode: 'espèces',
      paymentStatus: 'Paid',
      paidAmount: 2500,
      createdBy: doctor._id,
    });

    await PaymentTransaction.create({
      invoiceId: invoice1._id,
      patientId: amine._id,
      date: new Date('2026-01-12'),
      amount: 2500,
      paymentMethod: 'espèces',
      notes: 'Règlement total en espèces.',
    });

    const invoice2 = await Invoice.create({
      invoiceNumber: '1038/2026',
      patientId: amine._id,
      date: new Date('2026-05-15'),
      items: [
        { date: '15/05', tooth: '46', description: 'Pose d\'implant titane (Straumann)', amount: 6000 },
        { date: '15/05', tooth: '46', description: 'Pilier implantaire personnalisé', amount: 1200 },
      ],
      totalAmount: 7200,
      discount: 0,
      netAmount: 7200,
      paymentMode: 'traites',
      paymentStatus: 'Partially Paid',
      paidAmount: 4000,
      createdBy: doctor._id,
    });

    await PaymentTransaction.create({
      invoiceId: invoice2._id,
      patientId: amine._id,
      date: new Date('2026-05-15'),
      amount: 4000,
      paymentMethod: 'carte',
      notes: 'Premier versement par carte bancaire.',
    });

    console.log('Seeded invoices and payments.');

    // Seed Appointments
    const today = new Date();
    const appts = await Appointment.create([
      {
        patientId: patients[0]._id,
        doctorId: doctor._id,
        dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 30),
        duration: 45,
        status: 'Scheduled',
        chair: 'Chair 1',
        notes: 'Checkup for implant crown fitting.',
      },
      {
        patientId: patients[1]._id,
        doctorId: doctor._id,
        dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0),
        duration: 30,
        status: 'Confirmed',
        chair: 'Chair 2',
        notes: 'Teeth whitening procedure.',
      },
      {
        patientId: patients[2]._id,
        doctorId: doctor._id,
        dateTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0),
        duration: 30,
        status: 'Scheduled',
        chair: 'Chair 1',
        notes: 'Pedodontics consultation.',
      },
    ]);

    console.log('Seeded appointments.');
    console.log('Database Seeding Completed Successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
