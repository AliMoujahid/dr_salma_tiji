import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from all possible locations
const envPaths = [
  path.join(__dirname, '.env'),
  path.join(__dirname, '..', '.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'app', '.env'),
];
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}
dotenv.config();

import express from 'express';
import cors from 'cors';
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
import liveSyncRoutes from './routes/liveSync';
import { reminderScheduler } from './services/reminderScheduler';
import { backupScheduler } from './services/backupScheduler';
import { licenseService } from './services/licenseService';
import { securityHeaders, sanitizeInputs, apiRateLimiter } from './middleware/security';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dr-tijini';

// 1. Enterprise Security Headers (Helmet-Grade)
app.use(securityHeaders);

// 2. NoSQL Operator & Injection Sanitizer
app.use(sanitizeInputs);

// 3. Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 4. Rate Limiting for all API Endpoints
app.use('/api', apiRateLimiter);


// Ensure upload folders exist
const possibleUploadDirs = [
  path.join(__dirname, 'uploads'),
  path.join(__dirname, '..', 'uploads'),
  path.join(process.cwd(), 'app', 'uploads'),
  path.join(process.cwd(), 'uploads'),
];
let uploadsDir = possibleUploadDirs[0];
for (const dir of possibleUploadDirs) {
  if (fs.existsSync(dir)) {
    uploadsDir = dir;
    break;
  }
}
const tempDir = path.join(uploadsDir, 'temp');
fs.mkdirSync(tempDir, { recursive: true });

// Static file hosting for uploaded patient documents
app.use('/uploads', express.static(uploadsDir));

import bcrypt from 'bcryptjs';
import User from './models/User';
import ClinicConfig from './models/ClinicConfig';

// Connect to MongoDB & Auto-Bootstrap default admin with resilient auto-retry & auto-auth validation
const connectWithRetry = async () => {
  const secureUri = 'mongodb://tijini_app:Tijini%40App%23Dental2026%21@127.0.0.1:27017/dr-tijini?authSource=dr-tijini';
  const openUri = 'mongodb://127.0.0.1:27017/dr-tijini';
  const envUri = process.env.MONGODB_URI;

  // Prioritize candidates: if envUri is provided use it, then test secure auth, then open URI
  const candidateUris = Array.from(new Set([envUri, secureUri, openUri].filter(Boolean) as string[]));

  let connected = false;
  let attempts = 0;

  while (!connected) {
    attempts++;
    for (const uri of candidateUris) {
      try {
        if (mongoose.connection.readyState !== 0) {
          await mongoose.disconnect();
        }
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
        
        // Verify that we can actually read from the database (verifies authentication if enabled)
        await User.findOne({ username: 'admin' });
        
        connected = true;
        console.log(`✅ MongoDB connecté et validé avec succès (${uri.includes('@') ? 'Mode Sécurisé Authentifié' : 'Mode Local Standard'}).`);
        break;
      } catch (err: any) {
        console.warn(`⚠️ [MongoDB] Échec de validation avec URI (${uri.split('@').pop()}): ${err.message}`);
        try {
          await mongoose.disconnect();
        } catch {}
      }
    }

    if (!connected) {
      console.log(`⏳ [MongoDB] Tentative #${attempts} échouée. Nouvelle tentative dans 3 secondes...`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  try {
    // Ensure Admin Account Exists & is Active
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Moujahid@97', salt);
    let adminUser = await User.findOne({
      $or: [{ username: 'admin' }, { email: 'admin@tijini.com' }, { email: 'doctor@tijini.com' }],
    });

    if (!adminUser) {
      await User.create({
        username: 'admin',
        email: 'admin@tijini.com',
        passwordHash,
        name: 'Dr. Salma Tijini',
        role: 'ADMIN',
        active: true,
      });
      console.log('⚡ Compte Administrateur initialisé avec succès (admin / Moujahid@97).');
    } else {
      // Ensure credentials and permissions are up to date
      adminUser.passwordHash = passwordHash;
      adminUser.role = 'ADMIN';
      adminUser.active = true;
      if (!adminUser.username) adminUser.username = 'admin';
      await adminUser.save();
      console.log('⚡ Compte Administrateur synchronisé et actif (admin / Moujahid@97).');
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
};

connectWithRetry();


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
app.use('/api/events', liveSyncRoutes);

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
  path.join(__dirname, 'public'),
  path.join(__dirname, '..', 'public'),
  path.join(process.cwd(), 'app', 'public'),
  path.join(process.cwd(), 'public'),
  path.join(__dirname, '..', '..', 'frontend', 'dist'),
  path.join(process.cwd(), 'frontend', 'dist'),
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
  console.log(`✅ Serving Frontend from: ${frontendDir}`);
  app.use(express.static(frontendDir));

  // SPA Fallback for all non-API GET requests
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendDir!, 'index.html'));
  });
} else {
  console.warn('⚠️ No frontend build found in possible directories:', possibleFrontendDirs);
}

// Hardened Error handling middleware (Prevents information disclosure)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('⚠️ [Server Error]', err.message || err);
  const isProduction = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    message: err.message || 'Une erreur interne du serveur est survenue.',
    ...(isProduction ? {} : { stack: err.stack }),
  });
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
