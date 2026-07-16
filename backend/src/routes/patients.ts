import { Router, Response } from 'express';
import Patient from '../models/Patient';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all patients with filters, search, and pagination
router.get('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { search, archived = 'false', favorite, limit = '10', page = '1' } = req.query;

    const query: any = {};

    // Filtering by archived status
    query.isArchived = archived === 'true';

    // Filter by favorite status
    if (favorite === 'true') {
      query.isFavorite = true;
    }

    // Global Search (name, phone, email, nationalId)
    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      query.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
        { nationalId: searchRegex },
      ];
    }

    const pageSize = parseInt(limit as string, 10);
    const pageNum = parseInt(page as string, 10);

    const total = await Patient.countDocuments(query);
    const list = await Patient.find(query)
      .sort({ updatedAt: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize);

    res.json({
      patients: list,
      total,
      pages: Math.ceil(total / pageSize),
      currentPage: pageNum,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la récupération des patients.', error: error.message });
  }
});

// Get recently viewed patients
router.get('/recent', protect, async (req: AuthRequest, res: Response) => {
  try {
    const recent = await Patient.find({ isArchived: false, recentlyViewedAt: { $ne: undefined } })
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
    const patient = await Patient.findById(req.params.id);
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
      medicalHistory: medicalHistory || [],
      allergies: allergies || [],
      currentMedications: currentMedications || [],
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

// Delete patient completely
router.delete('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    const patient = await Patient.findByIdAndDelete(req.params.id);
    if (!patient) {
      res.status(404).json({ message: 'Patient introuvable.' });
      return;
    }
    res.json({ message: 'Patient supprimé définitivement.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la suppression du patient.', error: error.message });
  }
});

export default router;
