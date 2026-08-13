import { Router, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import User from '../models/User';
import Patient from '../models/Patient';
import Appointment from '../models/Appointment';
import ToothHistory from '../models/ToothHistory';
import Invoice from '../models/Invoice';
import PaymentTransaction from '../models/Payment';
import ClinicConfig from '../models/ClinicConfig';
import DocumentModel from '../models/Document';
import { protect, restrictTo, AuthRequest } from '../middleware/auth';
import { backupScheduler } from '../services/backupScheduler';

const router = Router();
const upload = multer({ dest: 'uploads/temp/' });

/**
 * GET /api/backup/status
 * Get status of automated daily backups
 */
router.get('/status', protect, (req: AuthRequest, res: Response) => {
  try {
    const status = backupScheduler.getStatus();
    const backupsList = backupScheduler.getBackupsList();
    res.json({
      ...status,
      backupsList,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la récupération du statut de sauvegarde.', error: error.message });
  }
});

/**
 * POST /api/backup/run-now
 * Trigger an immediate backup on demand
 */
router.post('/run-now', protect, restrictTo('ADMIN', 'DOCTOR'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await backupScheduler.runBackupWithRetry(3);
    if (result.success) {
      res.json({
        success: true,
        message: 'Sauvegarde effectuée avec succès !',
        path: result.path,
        status: backupScheduler.getStatus(),
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Échec de la sauvegarde.',
        status: backupScheduler.getStatus(),
      });
    }
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de l\'exécution de la sauvegarde.', error: error.message });
  }
});

/**
 * GET /api/backup/export
 * Export Database Backup as a JSON File download
 */
router.get('/export', protect, restrictTo('ADMIN', 'DOCTOR'), async (req: AuthRequest, res: Response) => {
  try {
    const data = {
      users: await User.find(),
      patients: await Patient.find(),
      appointments: await Appointment.find(),
      teethHistories: await ToothHistory.find(),
      invoices: await Invoice.find(),
      payments: await PaymentTransaction.find(),
      configs: await ClinicConfig.find(),
      documents: await DocumentModel.find(),
      exportedAt: new Date().toISOString(),
    };

    res.setHeader('Content-disposition', `attachment; filename=dental_clinic_backup_${Date.now()}.json`);
    res.setHeader('Content-type', 'application/json');
    res.send(JSON.stringify(data, null, 2));
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de l\'export de la base de données.', error: error.message });
  }
});

/**
 * POST /api/backup/import
 * Import and Restore Database from a JSON File
 */
router.post(
  '/import',
  protect,
  restrictTo('ADMIN'),
  upload.single('file'),
  async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Aucun fichier fourni.' });
      }

      const filePath = req.file.path;
      const fileData = fs.readFileSync(filePath, 'utf-8');
      const parsedData = JSON.parse(fileData);

      // Clean up uploaded temp file
      fs.unlinkSync(filePath);

      // Validate structure before proceeding
      if (
        !parsedData.users ||
        !parsedData.patients ||
        !parsedData.appointments ||
        !parsedData.teethHistories ||
        !parsedData.invoices ||
        !parsedData.payments
      ) {
        return res.status(400).json({ message: 'Structure de fichier de sauvegarde non valide.' });
      }

      // Clear existing records
      await User.deleteMany({});
      await Patient.deleteMany({});
      await Appointment.deleteMany({});
      await ToothHistory.deleteMany({});
      await Invoice.deleteMany({});
      await PaymentTransaction.deleteMany({});
      await ClinicConfig.deleteMany({});
      await DocumentModel.deleteMany({});

      // Restore data
      if (parsedData.users.length) await User.insertMany(parsedData.users);
      if (parsedData.patients.length) await Patient.insertMany(parsedData.patients);
      if (parsedData.appointments.length) await Appointment.insertMany(parsedData.appointments);
      if (parsedData.teethHistories.length) await ToothHistory.insertMany(parsedData.teethHistories);
      if (parsedData.invoices.length) await Invoice.insertMany(parsedData.invoices);
      if (parsedData.payments.length) await PaymentTransaction.insertMany(parsedData.payments);
      if (parsedData.configs?.length) await ClinicConfig.insertMany(parsedData.configs);
      if (parsedData.documents?.length) await DocumentModel.insertMany(parsedData.documents);

      res.json({ message: 'Base de données restaurée avec succès.' });
    } catch (error: any) {
      res.status(500).json({ message: 'Erreur lors de la restauration de la base de données.', error: error.message });
    }
  }
);

export default router;
