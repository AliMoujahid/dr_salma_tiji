import { Router, Response } from 'express';
import mongoose from 'mongoose';
import ToothHistory from '../models/ToothHistory';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

const isValidObjectId = (id: any): boolean => {
  return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);
};

// Get full odontogram tooth statuses for a patient (latest state for each tooth)
router.get('/patient/:patientId', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { patientId } = req.params;

    if (!isValidObjectId(patientId)) {
      res.status(400).json({ message: 'Identifiant patient invalide.' });
      return;
    }

    // Aggregate to get the latest status for each tooth of the patient
    const odontogram = await ToothHistory.aggregate([
      { $match: { patientId: new mongoose.Types.ObjectId(patientId as string) } },
      { $sort: { date: -1, createdAt: -1 } },
      {
        $group: {
          _id: '$toothNumber',
          latestStatus: { $first: '$status' },
          latestNotes: { $first: '$notes' },
          historyCount: { $sum: 1 },
          lastUpdated: { $first: '$date' },
        },
      },
      { $project: { toothNumber: '$_id', status: '$latestStatus', notes: '$latestNotes', historyCount: 1, lastUpdated: 1, _id: 0 } },
    ]);

    res.json(odontogram);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'odontogramme.', error: error.message });
  }
});

// Get detailed chronological history of a specific tooth
router.get('/patient/:patientId/tooth/:toothNumber', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { patientId, toothNumber } = req.params;

    if (!isValidObjectId(patientId)) {
      res.status(400).json({ message: 'Identifiant patient invalide.' });
      return;
    }

    const tNum = parseInt(toothNumber as string, 10);
    if (isNaN(tNum)) {
      res.status(400).json({ message: 'Numéro de dent invalide.' });
      return;
    }

    const history = await ToothHistory.find({
      patientId: new mongoose.Types.ObjectId(patientId as string),
      toothNumber: tNum,
    })
      .populate('invoiceId', 'invoiceNumber')
      .sort({ date: -1 });

    res.json(history);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'historique de la dent.', error: error.message });
  }
});

// Add a new tooth intervention / change status
router.post('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { patientId, toothNumber, procedureName, status, notes, cost, invoiceId, date, photosBefore, photosAfter, xrays } = req.body;

    if (!patientId || !toothNumber || !status) {
      res.status(400).json({ message: 'patientId, toothNumber et status sont requis.' });
      return;
    }

    if (!isValidObjectId(patientId)) {
      res.status(400).json({ message: 'Identifiant patient invalide.' });
      return;
    }

    const tNum = parseInt(toothNumber, 10);
    if (isNaN(tNum)) {
      res.status(400).json({ message: 'Numéro de dent invalide.' });
      return;
    }

    const record = await ToothHistory.create({
      patientId,
      toothNumber: tNum,
      procedureName: procedureName ? procedureName.trim() : undefined,
      status,
      notes,
      cost: parseFloat(cost) || 0,
      invoiceId: isValidObjectId(invoiceId) ? invoiceId : undefined,
      date: date ? new Date(date) : new Date(),
      photosBefore: Array.isArray(photosBefore) ? photosBefore : [],
      photosAfter: Array.isArray(photosAfter) ? photosAfter : [],
      xrays: Array.isArray(xrays) ? xrays : [],
    });

    res.status(201).json(record);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la création de l\'acte sur la dent.', error: error.message });
  }
});

// Update a tooth history entry
router.put('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: 'Identifiant d\'acte dentaire invalide.' });
      return;
    }

    const record = await ToothHistory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!record) {
      res.status(404).json({ message: 'Enregistrement de la dent introuvable.' });
      return;
    }
    res.json(record);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'enregistrement dentaire.', error: error.message });
  }
});

// Delete a tooth history entry
router.delete('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: 'Identifiant d\'acte dentaire invalide.' });
      return;
    }

    const record = await ToothHistory.findByIdAndDelete(req.params.id);
    if (!record) {
      res.status(404).json({ message: 'Enregistrement introuvable.' });
      return;
    }
    res.json({ message: 'Historique supprimé.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'enregistrement.', error: error.message });
  }
});

export default router;
