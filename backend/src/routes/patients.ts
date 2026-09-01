import { Router, Response } from 'express';
import mongoose from 'mongoose';
import Patient from '../models/Patient';
import AuditLog from '../models/AuditLog';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

// Helper to escape special regex characters and prevent ReDoS/syntax errors
const escapeRegex = (text: string): string => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

const isValidObjectId = (id: any): boolean => {
  return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);
};

// Get all patients with filters, search, and pagination
router.get('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { search, archived = 'false', favorite, limit = '10', page = '1' } = req.query;

    const query: any = {};
    query.deleted = { $ne: true };

    // Filtering by archived status
    query.isArchived = archived === 'true';

    // Filter by favorite status
    if (favorite === 'true') {
      query.isFavorite = true;
    }

    // Global Search (name, phone, email, nationalId) with escaped regex
    if (search && typeof search === 'string' && search.trim()) {
      const sanitized = escapeRegex(search.trim());
      const searchRegex = new RegExp(sanitized, 'i');
      query.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { nationalId: searchRegex },
      ];
    }

    const pageSize = Math.max(1, parseInt(limit as string, 10) || 10);
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);

    const total = await Patient.countDocuments(query);
    const list = await Patient.find(query)
      .sort({ updatedAt: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize);

    res.json({
      patients: list,
      total,
      pages: Math.max(1, Math.ceil(total / pageSize)),
      currentPage: pageNum,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la récupération des patients.', error: error.message });
  }
});

// Get recently viewed patients
router.get('/recent', protect, async (req: AuthRequest, res: Response) => {
  try {
    const recent = await Patient.find({ deleted: { $ne: true }, isArchived: false, recentlyViewedAt: { $ne: undefined } })
      .sort({ recentlyViewedAt: -1 })
      .limit(5);
    res.json(recent);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la récupération des patients récents.', error: error.message });
  }
});

// Get patient details by ID
router.get('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: 'Identifiant patient invalide.' });
      return;
    }

    const patient = await Patient.findOne({ _id: req.params.id, deleted: { $ne: true } });
    if (!patient) {
      res.status(404).json({ message: 'Patient introuvable.' });
      return;
    }

    // Update recently viewed timestamp
    patient.recentlyViewedAt = new Date();
    await patient.save();

    res.json(patient);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la récupération du patient.', error: error.message });
  }
});

// Create new patient
router.post('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      nationalId,
      phone,
      email,
      address,
      birthDate,
      gender,
      bloodType,
      emergencyContact,
      insurance,
      medicalHistory,
      allergies,
      currentMedications,
      notes,
      profilePictureUrl,
    } = req.body;

    if (!name || !phone || !birthDate || !gender) {
      res.status(400).json({ message: 'Veuillez renseigner les champs obligatoires (Nom, Téléphone, Date de Naissance, Genre).' });
      return;
    }

    const newPatient = await Patient.create({
      name: name.trim(),
      nationalId: nationalId ? nationalId.trim() : undefined,
      phone: phone.trim(),
      email: email ? email.trim() : undefined,
      address,
      birthDate: new Date(birthDate),
      gender,
      bloodType,
      emergencyContact,
      insurance,
      medicalHistory: Array.isArray(medicalHistory) ? medicalHistory : [],
      allergies: Array.isArray(allergies) ? allergies : [],
      currentMedications: Array.isArray(currentMedications) ? currentMedications : [],
      notes,
      profilePictureUrl,
      isArchived: false,
      isFavorite: false,
    });

    res.status(201).json(newPatient);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la création du patient.', error: error.message });
  }
});

// Edit patient details
router.put('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: 'Identifiant patient invalide.' });
      return;
    }

    const updatedPatient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedPatient) {
      res.status(404).json({ message: 'Patient introuvable.' });
      return;
    }
    res.json(updatedPatient);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du patient.', error: error.message });
  }
});

// Toggle Archive patient
router.put('/:id/archive', protect, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: 'Identifiant patient invalide.' });
      return;
    }

    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      res.status(404).json({ message: 'Patient introuvable.' });
      return;
    }
    patient.isArchived = !patient.isArchived;
    await patient.save();
    res.json({ message: patient.isArchived ? 'Patient archivé.' : 'Patient désarchivé.', patient });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la modification de l\'archivage.', error: error.message });
  }
});

// Toggle Favorite patient
router.put('/:id/favorite', protect, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: 'Identifiant patient invalide.' });
      return;
    }

    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      res.status(404).json({ message: 'Patient introuvable.' });
      return;
    }
    patient.isFavorite = !patient.isFavorite;
    await patient.save();
    res.json({ message: patient.isFavorite ? 'Ajouté aux favoris.' : 'Retiré des favoris.', patient });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors du toggle favori.', error: error.message });
  }
});

// Delete patient completely (Soft Delete with Audit Log tracking)
router.delete('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: 'Identifiant patient invalide.' });
      return;
    }

    const patient = await Patient.findOne({ _id: req.params.id, deleted: { $ne: true } });
    if (!patient) {
      res.status(404).json({ message: 'Patient introuvable.' });
      return;
    }

    // Set soft-delete flags
    patient.deleted = true;
    patient.deletedAt = new Date();
    patient.deletedBy = req.user?._id;
    await patient.save();

    // Create Audit Log with backupData snapshot for restore
    await AuditLog.create({
      userId: req.user?._id,
      userName: req.user?.name || 'Inconnu',
      action: 'DELETE_PATIENT',
      targetId: patient._id,
      targetName: patient.name,
      details: `Patient "${patient.name}" (${patient.nationalId || 'sans CIN'}) a été supprimé par ${req.user?.name}.`,
      backupData: patient.toObject(),
    });

    res.json({ message: 'Patient supprimé et archivé dans l\'historique professionnel.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la suppression du patient.', error: error.message });
  }
});

export default router;
