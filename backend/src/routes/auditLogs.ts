import { Router, Response } from 'express';
import AuditLog from '../models/AuditLog';
import Patient from '../models/Patient';
import { protect, restrictTo, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all audit actions logs history (restricted to ADMIN)
router.get('/', protect, restrictTo('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors du chargement de l\'historique professionnel.', error: error.message });
  }
});

// Restore a soft-deleted patient (restricted to ADMIN)
router.post('/restore/:id', protect, restrictTo('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const log = await AuditLog.findById(req.params.id);
    if (!log) {
      res.status(404).json({ message: 'Log d\'historique introuvable.' });
      return;
    }

    if (log.action !== 'DELETE_PATIENT') {
      res.status(400).json({ message: 'Cette action n\'est pas restaurable.' });
      return;
    }

    // Check if patient document still exists in MongoDB
    let patient = await Patient.findById(log.targetId);
    
    if (patient) {
      // If it exists, just remove the soft delete flags
      patient.deleted = false;
      patient.deletedAt = undefined;
      patient.deletedBy = undefined;
      await patient.save();
    } else {
      // Recreate document if it was completely hard-deleted
      const backup = { ...log.backupData };
      delete backup._id; // prevent duplication ID clash if recreating
      patient = await Patient.create({
        ...backup,
        deleted: false,
        isArchived: false,
      });
    }

    // Log the restoration action
    await AuditLog.create({
      userId: req.user?._id,
      userName: req.user?.name || 'Inconnu',
      action: 'RESTORE_PATIENT',
      targetId: patient._id,
      targetName: patient.name,
      details: `Patient "${patient.name}" a été restauré par ${req.user?.name}.`,
    });

    res.json({ message: `Patient "${patient.name}" restauré avec succès.`, patient });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la restauration du patient.', error: error.message });
  }
});

export default router;
