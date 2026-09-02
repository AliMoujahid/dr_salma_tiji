import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';

// Route imports
import authRoutes from './routes/auth';
import patientRoutes from './routes/patients';
import appointmentRoutes from './routes/appointments';
import teethRoutes from './routes/teeth';
import invoiceRoutes from './routes/invoices';
import paymentRoutes from './routes/payments';
import documentRoutes from './routes/documents';
import clinicRoutes from './routes/clinic';
import backupRoutes from './routes/backup';
import reportRoutes from './routes/reports';
import notificationRoutes from './routes/notifications';
import licenseRoutes from './routes/license';
import auditLogRoutes from './routes/auditLogs';
import dentalActsRoutes, { ensureDefaultActs } from './routes/dentalActs';
import { reminderScheduler } from './services/reminderScheduler';
import { backupScheduler } from './services/backupScheduler';
import { licenseService } from './services/licenseService';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dr-tijini';

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure upload folders exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
const tempDir = path.join(uploadsDir, 'temp');
fs.mkdirSync(tempDir, { recursive: true });

// Static file hosting for uploaded patient documents
app.use('/uploads', express.static(uploadsDir));

import bcrypt from 'bcryptjs';
import User from './models/User';
import ClinicConfig from './models/ClinicConfig';

// Connect to MongoDB & Auto-Bootstrap default admin
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected successfully.');
    try {
      // Ensure Admin Account Exists
      const adminUser = await User.findOne({ username: 'admin' });
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Moujahid@97', salt);

      if (!adminUser) {
        await User.create({
          username: 'admin',
          email: 'admin@tijini.com',
          passwordHash,
          name: 'Moujahid Ali',
          role: 'ADMIN',
          active: true,
        });
        console.log('⚡ Initialisation automatique du compte Administrateur (admin / Moujahid@97).');
      } else {
        // Guarantee password and role are active
        const isMatch = await bcrypt.compare('Moujahid@97', adminUser.passwordHash);
        if (!isMatch || !adminUser.active || adminUser.role !== 'ADMIN') {
          adminUser.passwordHash = passwordHash;
          adminUser.role = 'ADMIN';
          adminUser.active = true;
          await adminUser.save();
          console.log('⚡ Synchronisation du compte Administrateur (admin / Moujahid@97).');
        }
      }

      // Ensure Clinic Configuration Exists
      const configCount = await ClinicConfig.countDocuments();
      if (configCount === 0) {
        await ClinicConfig.create({
          cabinetFr: 'Cabinet Dentaire Dr. Salma Tijini',
          cabinetAr: 'عيادة الدكتورة سلمى التيجيني لطب وجراحة الأسنان',
          drFr: 'Dr. Salma Tijini',
          drAr: 'الدكتورة سلمى التيجيني',
          specsFr: 'Implantologie - Esthétique dentaire - Chirurgie buccale\nOrthodontie - Soins & Prothèses - Radio Panoramique 3D',
          specsAr: 'علاج وتجميل الأسنان - زراعة الأسنان - تقويم الأسنان\nجراحة الفم والأسنان - تركيبات الزيركون - راديو بانوراميك',
          address: 'Angle Av. Hassan II & Rue Al Qods, Imm. Al Andalous, 1er Étage, Skhirat',
          phones: '+212 6 13 11 71 31',
          email: 'dr.salmatijini@gmail.com',
          ice: '003291823000045',
          inbe: '102938475',
          ifVal: '54321098',
        });
        console.log('⚡ Configuration clinique initiale créée.');
      }

      // Ensure Default Dental Acts & Tariffs Catalog Exists
      await ensureDefaultActs();
    } catch (bootErr) {
      console.error('Erreur initialisation données par défaut:', bootErr);
    }
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });


// License API routes (must be available without license block)
app.use('/api/license', licenseRoutes);

// License validation middleware for protected medical data API routes
app.use('/api', (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Allow license status checks and login without valid license
  if (req.path.startsWith('/license') || req.path === '/auth/login') {
    return next();
  }

  const licenseStatus = licenseService.verifyLicense();
  if (!licenseStatus.active) {
    res.status(403).json({
      error: 'LICENSE_INVALID_OR_EXPIRED',
      message: licenseStatus.message || 'Licence d\'utilisation invalide ou expirée pour cette machine.',
      machineId: licenseStatus.machineId,
    });
    return;
  }

  next();
});

// Setup API routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/teeth', teethRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/clinic', clinicRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/dental-acts', dentalActsRoutes);

import { whatsappService } from './services/whatsappService';

// Start Automated Reminder Scheduler, Backup Cron Engines & WhatsApp Web Service
reminderScheduler.initScheduler();
backupScheduler.initScheduler();
whatsappService.initClient();

// Base route status check
app.get('/health', (req, res) => {
  const licenseStatus = licenseService.verifyLicense();
  res.json({
    status: 'healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    license: {
      active: licenseStatus.active,
      machineId: licenseStatus.machineId,
      daysRemaining: licenseStatus.daysRemaining,
    },
  });
});

// Production Static Frontend Hosting
const possibleFrontendDirs = [
  path.join(__dirname, '..', 'public'),
  path.join(__dirname, '..', '..', 'frontend', 'dist'),
  path.join(process.cwd(), 'public'),
  path.join(process.cwd(), 'dist'),
];

let frontendDir: string | null = null;
for (const dir of possibleFrontendDirs) {
  if (fs.existsSync(path.join(dir, 'index.html'))) {
    frontendDir = dir;
    break;
  }
}

if (frontendDir) {
  console.log(`Serving Frontend from: ${frontendDir}`);
  app.use(express.static(frontendDir));

  // SPA Fallback for all non-API GET requests
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendDir!, 'index.html'));
  });
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ message: 'Une erreur interne du serveur est survenue.', error: err.message });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Cabinet Dentaire Dr. Salma Tijini - Système Actif `);
  console.log(` Port: ${PORT}`);
  console.log(` Machine ID: ${licenseService.getMachineId()}`);
  const lic = licenseService.verifyLicense();
  console.log(` Statut Licence: ${lic.active ? '✅ ACTIVE (' + lic.type + ')' : '❌ NON ACTIVÉE'}`);
  console.log(`====================================================`);
});
