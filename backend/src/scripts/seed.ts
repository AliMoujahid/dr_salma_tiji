import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Patient from '../models/Patient';
import Appointment from '../models/Appointment';
import ToothHistory from '../models/ToothHistory';
import Invoice from '../models/Invoice';
import ClinicConfig from '../models/ClinicConfig';
import PaymentTransaction from '../models/Payment';
import NotificationLog from '../models/NotificationLog';
import MessageTemplate from '../models/MessageTemplate';
import NotificationSettings from '../models/NotificationSettings';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dr-tijini';

async function seed() {
  try {
    console.log('Connecting to MongoDB at:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('Database connected successfully.');

    // Clear existing collections
    await Promise.all([
      User.deleteMany({}),
      Patient.deleteMany({}),
      Appointment.deleteMany({}),
      ToothHistory.deleteMany({}),
      Invoice.deleteMany({}),
      PaymentTransaction.deleteMany({}),
      ClinicConfig.deleteMany({}),
      NotificationLog.deleteMany({}),
      MessageTemplate.deleteMany({}),
      NotificationSettings.deleteMany({}),
    ]);

    console.log('Cleared existing collections.');

    // 1. Create staff users
    const salt = await bcrypt.genSalt(10);
    const commonPasswordHash = await bcrypt.hash('Moujahid@97', salt);

    const admin = await User.create({
      username: 'admin',
      email: 'admin@tijini.com',
      passwordHash: commonPasswordHash,
      name: 'Moujahid Ali',
      role: 'ADMIN',
      avatarUrl: '/uploads/avatars/avatar-1787945011413-961832010.jpg',
    });

    const doctor = await User.create({
      username: 'doctor',
      email: 'doctor@tijini.com',
      passwordHash: commonPasswordHash,
      name: 'Dr. Salma Tijini',
      role: 'DOCTOR',
      avatarUrl: '/uploads/avatars/avatar-1787945011413-961832010.jpg',
    });

    const receptionist = await User.create({
      username: 'receptionist',
      email: 'receptionist@tijini.com',
      passwordHash: commonPasswordHash,
      name: 'Asmae El Hilali',
      role: 'RECEPTIONIST',
      avatarUrl: '/uploads/avatars/avatar-1787945081420-898414264.jpg',
    });

    console.log('Seeded staff users.');



    // 2. Create Clinic Configuration
    await ClinicConfig.create({
      cabinetFr: 'Cabinet Dentaire Dr. Salma Tijini',
      cabinetAr: 'عيادة الدكتورة سلمى التيجيني لطب وجراحة الأسنان',
      drFr: 'Dr. Salma Tijini',
      drAr: 'الدكتورة سلمى التيجيني',
      specsFr: 'Implantologie - Esthétique dentaire - Chirurgie buccale\nOrthodontie - Soins & Prothèses - Radio Panoramique 3D',
      specsAr: 'علاج وتجميل الأسنان - زراعة الأسنان - تقويم الأسنان\nجراحة الفم والأسنان - تركيبات الزيركون - راديو بانوراميك',
      address: 'Avenue Hassan II, Lot Ain Al Hayat 1, Imm. 235, Appt 3, 1er Étage - Skhirat',
      phones: '+212 6 13 11 71 31 / +212 5 37 74 12 34',
      email: 'contact@cabinet-tijini.ma',
      ice: '002810381800092',
      inbe: '044215820',
      ifVal: '28103818',
      autoBackupEnabled: true,
      autoBackupIntervalDays: 7,
    });

    // 3. Create Notification Settings
    await NotificationSettings.create({
      enableWhatsApp: true,
      enableSMS: true,
      enableEmail: true,
      enableInApp: true,
      enableScheduler: true,
      whatsAppProvider: 'MetaCloud',
      smsProvider: 'Twilio',
      testMode: true,
      testPhoneNumber: '+212613117131',
    });

    // 4. Create Message Templates
    await MessageTemplate.create([
      {
        name: 'Rappel WhatsApp 24h avec Confirmation',
        channel: 'WhatsApp',
        messageType: '24Hours',
        language: 'fr',
        body: 'Bonjour {{patient_name}},\n\nNous vous rappelons votre rendez-vous au Cabinet Dentaire Dr. Salma Tijini.\n\n📅 Date : {{appointment_date}}\n🕒 Heure : {{appointment_time}}\n🦷 Soin prévu : {{treatment_type}}\n📍 Adresse : Av. Hassan II, Skhirat\n\nMerci de confirmer ou modifier votre présence.',
        isDefault: true,
        buttons: [
          { type: 'Confirm', label: '✅ Je confirme', urlOrPhone: 'confirm' },
          { type: 'Cancel', label: '❌ Empêchement', urlOrPhone: 'cancel' },
        ],
      },
      {
        name: 'Conseils Post-Opératoires Extraction & Implant',
        channel: 'WhatsApp',
        messageType: 'FollowUp',
        language: 'fr',
        body: 'Bonjour {{patient_name}},\n\nSuite à votre intervention chez le Dr. Salma Tijini, voici vos consignes post-opératoires :\n\n• Maintenir la compresse 30 min.\n• Éviter de fumer et de cracher aujourd\'hui.\n• Privilégier les aliments tièdes/mous.\n• Prendre vos antalgiques prescrits.\n\nEn cas de question urgente : +212 6 13 11 71 31. Bon rétablissement ! 🦷✨',
        isDefault: true,
      },
      {
        name: 'Envoi Facture & Détail Règlement',
        channel: 'WhatsApp',
        messageType: 'Custom',
        language: 'fr',
        body: 'Bonjour {{patient_name}},\n\nVeuillez trouver ci-joint votre facture détaillée du Cabinet Dentaire Dr. Salma Tijini. Nous restons à votre entière disposition pour tout renseignement.',
        isDefault: true,
      },
      {
        name: 'Rappel SMS Express',
        channel: 'SMS',
        messageType: '24Hours',
        language: 'fr',
        body: 'Cabinet Dr Salma Tijini: Rappel RDV le {{appointment_date}} a {{appointment_time}}. Contact: 0613117131',
        isDefault: true,
      },
    ]);

    // 5. Create 15 Diverse Moroccan Patients
    const patientRawData = [
      {
        name: 'Ali Moujahid',
        nationalId: 'AA109283',
        phone: '+212 6 13 11 71 31',
        email: 'ali.moujahid@gmail.com',
        address: 'Résidence Les Orangers, Skhirat',
        birthDate: new Date('1992-04-18'),
        gender: 'Male',
        bloodType: 'O+',
        emergencyContact: { name: 'Sara Moujahid', phone: '+212 6 61 22 33 44', relationship: 'Épouse' },
        insurance: { provider: 'CNOPS', policyNumber: 'CN-889102' },
        medicalHistory: ['Hypertension légère'],
        allergies: [],
        currentMedications: ['Amlodipine 5mg'],
        notes: 'Traitement implantaire en cours (Dent 16 & 46).',
        isFavorite: true,
      },
      {
        name: 'Khadija El Idrissi',
        nationalId: 'AB482910',
        phone: '+212 6 61 45 89 20',
        email: 'khadija.idrissi@yahoo.fr',
        address: 'Hay Riad, Secteur 14, Rabat',
        birthDate: new Date('1980-09-12'),
        gender: 'Female',
        bloodType: 'A+',
        emergencyContact: { name: 'Mohamed El Idrissi', phone: '+212 6 62 10 20 30', relationship: 'Frère' },
        insurance: { provider: 'Saham / Sanlam Assurance', policyNumber: 'SAN-401928' },
        medicalHistory: ['Diabète Type 2'],
        allergies: ['Pénicilline'],
        currentMedications: ['Metformine 850mg'],
        notes: 'Surveillance parodontale trimestrielle.',
        isFavorite: true,
      },
      {
        name: 'Omar Bensouda',
        nationalId: 'CD901234',
        phone: '+212 6 70 88 12 45',
        email: 'o.bensouda@outlook.com',
        address: 'Boulevard Mohammed VI, Temara',
        birthDate: new Date('1975-02-28'),
        gender: 'Male',
        bloodType: 'B+',
        emergencyContact: { name: 'Mouna Bensouda', phone: '+212 6 61 77 88 99', relationship: 'Épouse' },
        insurance: { provider: 'AXA Assurances Maroc', policyNumber: 'AX-902811' },
        medicalHistory: [],
        allergies: [],
        currentMedications: [],
        notes: 'Pose de facettes esthétiques E-Max supérieures.',
        isFavorite: false,
      },
      {
        name: 'Yassine Tazi',
        nationalId: 'AE556789',
        phone: '+212 6 63 90 12 34',
        email: 'yassine.tazi@gmail.com',
        address: 'Résidence Al Manar, Harhoura',
        birthDate: new Date('1998-11-05'),
        gender: 'Male',
        bloodType: 'AB+',
        emergencyContact: { name: 'Fatima Tazi', phone: '+212 6 61 00 11 22', relationship: 'Mère' },
        insurance: { provider: 'CNSS', policyNumber: 'CNSS-7712903' },
        medicalHistory: [],
        allergies: ['Latex'],
        currentMedications: [],
        notes: 'Traitement orthodontique multi-attaches.',
        isFavorite: true,
      },
      {
        name: 'Zineb Alami',
        nationalId: 'EE334455',
        phone: '+212 6 68 22 44 66',
        email: 'zineb.alami@hotmail.com',
        address: 'Agdal, Avenue de France, Rabat',
        birthDate: new Date('1988-06-20'),
        gender: 'Female',
        bloodType: 'O-',
        emergencyContact: { name: 'Karim Alami', phone: '+212 6 62 33 44 55', relationship: 'Conjoint' },
        insurance: { provider: 'Wafa Assurance', policyNumber: 'WA-665544' },
        medicalHistory: ['Grossesse 2ème trimestre'],
        allergies: [],
        currentMedications: ['Vitamines prénatales'],
        notes: 'Détartrage doux sans anesthésie lourde.',
        isFavorite: false,
      },
      {
        name: 'Mehdi Chraibi',
        nationalId: 'BK998877',
        phone: '+212 6 61 99 88 77',
        email: 'mehdi.chraibi@menara.ma',
        address: 'Ain Sebaa, Casablanca',
        birthDate: new Date('1965-03-15'),
        gender: 'Male',
        bloodType: 'A-',
        emergencyContact: { name: 'Laila Chraibi', phone: '+212 6 63 44 55 66', relationship: 'Fille' },
        insurance: { provider: 'RMA Watanya', policyNumber: 'RMA-112233' },
        medicalHistory: ['Cardiopathie', 'Porteur de Stent'],
        allergies: ['Aspirine'],
        currentMedications: ['Plavix 75mg', 'Tahor 20mg'],
        notes: 'Arrêt antiagrégant discuté avec cardiologue avant extraction.',
        isFavorite: true,
      },
      {
        name: 'Aya Benali',
        nationalId: 'X987654',
        phone: '+212 6 77 11 22 33',
        email: 'aya.benali95@gmail.com',
        address: 'Quartier Hassan, Rabat',
        birthDate: new Date('2001-12-08'),
        gender: 'Female',
        bloodType: 'O+',
        emergencyContact: { name: 'Hassan Benali', phone: '+212 6 61 99 00 11', relationship: 'Père' },
        insurance: { provider: 'Sans Mutuelle', policyNumber: 'N/A' },
        medicalHistory: [],
        allergies: [],
        currentMedications: [],
        notes: 'Blanchiment au fauteuil + gouttières ambulatoires.',
        isFavorite: false,
      },
      {
        name: 'Amine Berrada',
        nationalId: 'F123987',
        phone: '+212 6 60 55 44 33',
        email: 'amine.berrada@tech.ma',
        address: 'Centre Ville, Skhirat Plage',
        birthDate: new Date('1994-07-25'),
        gender: 'Male',
        bloodType: 'B-',
        emergencyContact: { name: 'Nadia Berrada', phone: '+212 6 64 55 66 77', relationship: 'Mère' },
        insurance: { provider: 'CNOPS', policyNumber: 'CN-123456' },
        medicalHistory: [],
        allergies: [],
        currentMedications: [],
        notes: 'Avulsion des 4 dents de sagesse incluses.',
        isFavorite: false,
      },
      {
        name: 'Rania Naciri',
        nationalId: 'CD554433',
        phone: '+212 6 72 34 56 78',
        email: 'rania.naciri@gmail.com',
        address: 'Les Princesses, Casablanca',
        birthDate: new Date('1990-01-30'),
        gender: 'Female',
        bloodType: 'A+',
        emergencyContact: { name: 'Tariq Naciri', phone: '+212 6 61 88 99 00', relationship: 'Conjoint' },
        insurance: { provider: 'Saham / Sanlam Assurance', policyNumber: 'SAN-998877' },
        medicalHistory: ['Asthme'],
        allergies: ['Iode'],
        currentMedications: ['Ventoline si besoin'],
        notes: 'Couronnes zircone sur molaires 26 et 27.',
        isFavorite: true,
      },
      {
        name: 'Hamza El Fassi',
        nationalId: 'L889900',
        phone: '+212 6 64 12 34 56',
        email: 'hamza.elfassi@gmail.com',
        address: 'Secteur 22, Hay Riad, Rabat',
        birthDate: new Date('1983-05-14'),
        gender: 'Male',
        bloodType: 'AB-',
        emergencyContact: { name: 'Soukaina El Fassi', phone: '+212 6 65 22 33 44', relationship: 'Épouse' },
        insurance: { provider: 'AtlantaSanad', policyNumber: 'ATL-778899' },
        medicalHistory: [],
        allergies: [],
        currentMedications: [],
        notes: 'Pose bridge céramique 3 éléments.',
        isFavorite: false,
      },
      {
        name: 'Fatima Zahra Mansouri',
        nationalId: 'GK123456',
        phone: '+212 6 65 78 90 12',
        email: 'fz.mansouri@yahoo.com',
        address: 'Lotissement Al Firdaous, Temara',
        birthDate: new Date('1978-08-19'),
        gender: 'Female',
        bloodType: 'O+',
        emergencyContact: { name: 'Adil Mansouri', phone: '+212 6 66 11 22 33', relationship: 'Époux' },
        insurance: { provider: 'CNSS', policyNumber: 'CNSS-5544332' },
        medicalHistory: ['Ostéoporose'],
        allergies: [],
        currentMedications: ['Calcium D3'],
        notes: 'Prothèse adjointe complète maxillaire.',
        isFavorite: true,
      },
      {
        name: 'Sami Filali (Enfant)',
        nationalId: 'PED-9081',
        phone: '+212 6 61 77 88 99',
        email: 'parents.filali@gmail.com',
        address: 'Avenue Mohammed V, Skhirat',
        birthDate: new Date('2018-03-10'),
        gender: 'Male',
        bloodType: 'A+',
        emergencyContact: { name: 'Driss Filali', phone: '+212 6 61 77 88 99', relationship: 'Père' },
        insurance: { provider: 'CNOPS', policyNumber: 'CN-556677' },
        medicalHistory: [],
        allergies: [],
        currentMedications: [],
        notes: 'Pédodontie : Soins caries molaires de lait 54 et 64 + fluor.',
        isFavorite: false,
      },
    ];

    const patients = await Patient.create(patientRawData);
    console.log(`Seeded ${patients.length} patients.`);

    // 6. Generate 60+ Realistic Appointments across Past Months, Today, and Upcoming Weeks
    const treatments = [
      { desc: 'Consultation & Bilan Dentaire', duration: 30, price: 250, tooth: '' },
      { desc: 'Détartrage ultrasonique & Polissage', duration: 45, price: 400, tooth: '' },
      { desc: 'Traitement carie composite A2', duration: 45, price: 600, tooth: '16' },
      { desc: 'Dévitalisation et Traitement canalaire', duration: 60, price: 1200, tooth: '36' },
      { desc: 'Couronne Zircone monolithique', duration: 60, price: 2800, tooth: '26' },
      { desc: 'Pose Implant Dentaire Straumann', duration: 90, price: 7500, tooth: '46' },
      { desc: 'Blanchiment dentaire au fauteuil', duration: 60, price: 3000, tooth: '' },
      { desc: 'Extraction dent de sagesse', duration: 45, price: 900, tooth: '48' },
      { desc: 'Contrôle & Ajustement Orthodontie', duration: 30, price: 350, tooth: '' },
    ];

    const now = new Date();
    const appointmentsToInsert: any[] = [];
    const invoicesToInsert: any[] = [];
    const paymentsToInsert: any[] = [];
    const toothHistoriesToInsert: any[] = [];
    const notificationLogsToInsert: any[] = [];

    let invoiceCounter = 1001;

    // A. Historical Appointments (Past 5 Months) -> Completed with paid Invoices
    for (let monthOffset = 5; monthOffset >= 1; monthOffset--) {
      for (let i = 0; i < 8; i++) {
        const patient = patients[(monthOffset * 3 + i) % patients.length];
        const treatment = treatments[(i + monthOffset) % treatments.length];
        
        const apptDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 2 + i * 3, 9 + (i % 6), (i % 2) * 30);
        const dateStrFormatted = `${String(apptDate.getDate()).padStart(2, '0')}/${String(apptDate.getMonth() + 1).padStart(2, '0')}/${apptDate.getFullYear()}`;

        appointmentsToInsert.push({
          patientId: patient._id,
          doctorId: doctor._id,
          dateTime: apptDate,
          duration: treatment.duration,
          status: 'Completed',
          chair: i % 2 === 0 ? 'Fauteuil 1' : 'Fauteuil 2',
          notes: `Séance terminée : ${treatment.desc}.`,
        });

        // Generate Invoice
        const invNum = `${invoiceCounter++}/${apptDate.getFullYear()}`;
        const total = treatment.price;
        const discount = (i % 4 === 0) ? 50 : 0;
        const net = total - discount;
        const pModes: ('espèces' | 'chèque' | 'carte' | 'virement')[] = ['espèces', 'carte', 'virement', 'chèque'];
        const paymentMode = pModes[i % 4];

        const invId = new mongoose.Types.ObjectId();
        invoicesToInsert.push({
          _id: invId,
          invoiceNumber: invNum,
          patientId: patient._id,
          date: apptDate,
          items: [
            {
              date: dateStrFormatted,
              tooth: treatment.tooth || undefined,
              description: treatment.desc,
              amount: total,
            },
          ],
          totalAmount: total,
          discount,
          netAmount: net,
          paymentMode,
          paymentStatus: 'Paid',
          paidAmount: net,
          createdBy: doctor._id,
        });

        // Generate matching payment transaction
        paymentsToInsert.push({
          invoiceId: invId,
          patientId: patient._id,
          date: apptDate,
          amount: net,
          paymentMethod: paymentMode,
          notes: `Règlement facture ${invNum} au cabinet.`,
        });

        // Add Notification Log
        notificationLogsToInsert.push({
          patientId: patient._id,
          channel: 'WhatsApp',
          provider: 'WhatsAppWebJS',
          recipient: patient.phone,
          messageType: '24Hours',
          subject: 'Rappel Rendez-vous',
          body: `Rappel : Rendez-vous au Cabinet Dr. Salma Tijini le ${dateStrFormatted}.`,
          status: 'Delivered',
          interactiveAction: 'Confirmed',
          sentAt: new Date(apptDate.getTime() - 86400000),
        });
      }
    }

    // B. Today's Appointments (Live Waiting Room, In Room, Confirmed)
    const todaySlots = [
      { timeHour: 9, timeMin: 0, duration: 45, status: 'Completed', pIdx: 0, tIdx: 0 },
      { timeHour: 10, timeMin: 0, duration: 60, status: 'Completed', pIdx: 1, tIdx: 3 },
      { timeHour: 11, timeMin: 15, duration: 45, status: 'In Treatment', pIdx: 2, tIdx: 4 },
      { timeHour: 12, timeMin: 0, duration: 30, status: 'Confirmed', pIdx: 3, tIdx: 1 },
      { timeHour: 14, timeMin: 30, duration: 60, status: 'Confirmed', pIdx: 4, tIdx: 5 },
      { timeHour: 15, timeMin: 45, duration: 45, status: 'Confirmed', pIdx: 5, tIdx: 2 },
      { timeHour: 16, timeMin: 45, duration: 30, status: 'Scheduled', pIdx: 6, tIdx: 8 },
    ];

    for (let slot of todaySlots) {
      const patient = patients[slot.pIdx];
      const treatment = treatments[slot.tIdx];
      const apptDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), slot.timeHour, slot.timeMin);
      const dateStrFormatted = `${String(apptDate.getDate()).padStart(2, '0')}/${String(apptDate.getMonth() + 1).padStart(2, '0')}/${apptDate.getFullYear()}`;

      appointmentsToInsert.push({
        patientId: patient._id,
        doctorId: doctor._id,
        dateTime: apptDate,
        duration: slot.duration,
        status: slot.status as any,
        chair: slot.status === 'In Treatment' ? 'Fauteuil 1' : 'Fauteuil 2',
        notes: `Rendez-vous du jour : ${treatment.desc}.`,
      });

      // If completed today, add today invoice
      if (slot.status === 'Completed') {
        const invNum = `${invoiceCounter++}/${apptDate.getFullYear()}`;
        const total = treatment.price;
        const invId = new mongoose.Types.ObjectId();
        invoicesToInsert.push({
          _id: invId,
          invoiceNumber: invNum,
          patientId: patient._id,
          date: apptDate,
          items: [{ date: dateStrFormatted, tooth: treatment.tooth || undefined, description: treatment.desc, amount: total }],
          totalAmount: total,
          discount: 0,
          netAmount: total,
          paymentMode: 'carte',
          paymentStatus: 'Paid',
          paidAmount: total,
          createdBy: receptionist._id,
        });

        paymentsToInsert.push({
          invoiceId: invId,
          patientId: patient._id,
          date: apptDate,
          amount: total,
          paymentMethod: 'carte',
          notes: `Règlement TPE Carte Bancaire facture ${invNum}.`,
        });
      }

      notificationLogsToInsert.push({
        patientId: patient._id,
        channel: 'WhatsApp',
        provider: 'WhatsAppWebJS',
        recipient: patient.phone,
        messageType: '24Hours',
        subject: 'Rappel RDV Aujourd\'hui',
        body: `Bonjour ${patient.name}, nous vous confirmons votre consultation aujourd'hui à ${slot.timeHour}:${String(slot.timeMin).padStart(2, '0')}.`,
        status: 'Delivered',
        interactiveAction: slot.status === 'Confirmed' || slot.status === 'In Treatment' ? 'Confirmed' : 'None',
        sentAt: new Date(Date.now() - 3600000 * 3),
      });
    }

    // C. Future Appointments (Next 3 Weeks) -> Confirmed, Scheduled
    for (let day = 1; day <= 21; day++) {
      if (day % 7 === 0) continue; // Skip Sundays
      for (let slotHour of [9, 11, 15, 17]) {
        const pIdx = (day * 3 + slotHour) % patients.length;
        const tIdx = (day + slotHour) % treatments.length;
        const patient = patients[pIdx];
        const treatment = treatments[tIdx];

        const apptDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, slotHour, 0);

        appointmentsToInsert.push({
          patientId: patient._id,
          doctorId: doctor._id,
          dateTime: apptDate,
          duration: treatment.duration,
          status: day <= 3 ? 'Confirmed' : 'Scheduled',
          chair: slotHour % 2 === 0 ? 'Fauteuil 1' : 'Fauteuil 2',
          notes: `Rendez-vous programmé : ${treatment.desc}.`,
        });
      }
    }

    // 7. Seed 3D Dental Charting (Tooth Histories) for Patients
    for (let p of patients) {
      const toothConditions: { tooth: number; status: any; notes: string; cost: number }[] = [
        { tooth: 16, status: 'Implant', notes: 'Implant titane Straumann posé avec succès', cost: 7500 },
        { tooth: 26, status: 'Crown', notes: 'Couronne Zircone monolithique scellée', cost: 2800 },
        { tooth: 36, status: 'Root Canal', notes: 'Dévitalisation 3 canaux obturés', cost: 1200 },
        { tooth: 46, status: 'Filling', notes: 'Obturation composite esthétique face occlusale', cost: 600 },
        { tooth: 48, status: 'Extracted', notes: 'Dent de sagesse incluse extraite', cost: 900 },
        { tooth: 11, status: 'Healthy', notes: 'Dent saine, bon alignement', cost: 0 },
        { tooth: 21, status: 'Healthy', notes: 'Dent saine', cost: 0 },
      ];

      for (let item of toothConditions) {
        toothHistoriesToInsert.push({
          patientId: p._id,
          toothNumber: item.tooth,
          status: item.status,
          notes: item.notes,
          photosBefore: [],
          photosAfter: [],
          xrays: [],
          cost: item.cost,
          date: new Date(now.getFullYear(), now.getMonth() - 1, 15),
        });
      }
    }

    // Insert all aggregated data
    await Appointment.insertMany(appointmentsToInsert);
    await Invoice.insertMany(invoicesToInsert);
    await PaymentTransaction.insertMany(paymentsToInsert);
    await ToothHistory.insertMany(toothHistoriesToInsert);
    await NotificationLog.insertMany(notificationLogsToInsert);

    console.log('\n===============================================================');
    console.log(' ✨ BASE DE DONNÉES ENRICHIE AVEC SUCCÈS (SEEDED SUCCESSFULLY) !');
    console.log('===============================================================');
    console.log(` 👥 Patients créés           : ${patients.length}`);
    console.log(` 📅 Rendez-vous créés        : ${appointmentsToInsert.length}`);
    console.log(` 🧾 Factures MAD créées       : ${invoicesToInsert.length}`);
    console.log(` 💳 Règlements enregistrés    : ${paymentsToInsert.length}`);
    console.log(` 🦷 Schémas dentaires 3D     : ${toothHistoriesToInsert.length}`);
    console.log(` 💬 Logs de notifications WA : ${notificationLogsToInsert.length}`);
    console.log('===============================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
}

seed();
