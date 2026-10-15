import { Router, Response } from 'express';
import mongoose from 'mongoose';
import ToothHistory from '../models/ToothHistory';
import Patient from '../models/Patient';
import Treatment from '../models/Treatment';
import { protect, AuthRequest } from '../middleware/auth';
import { recordAudit } from '../middleware/security';
import { mapActToToothStatus, parseToothNumbers, matchesTooth } from '../utils/dentalUtils';

const router = Router();

const isValidObjectId = (id: any): boolean => {
  return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);
};

// Get full odontogram tooth statuses for a patient (latest state for each tooth, merged with Carnet Treatments)
router.get('/patient/:patientId', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { patientId } = req.params;

    if (!isValidObjectId(patientId)) {
      res.status(400).json({ message: 'Identifiant patient invalide.' });
      return;
    }

    // 1. Aggregate to get the latest status for each tooth from ToothHistory
    const odontogram: any[] = await ToothHistory.aggregate([
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

    // 2. Fetch patient's Carnet Treatments to seamlessly merge any clinical acts (e.g. Extraction, Crown, etc.)
    const treatments = await Treatment.find({
      patientId: new mongoose.Types.ObjectId(patientId as string),
    }).sort({ date: -1, createdAt: -1 });

    const toothMap = new Map<number, any>();
    for (const item of odontogram) {
      toothMap.set(item.toothNumber, item);
    }

    // Overlay treatments from the Carnet
    for (const t of treatments) {
      const parsedTeeth = parseToothNumbers(t.tooth);
      const computedStatus = mapActToToothStatus(t.actName, t.category);

      for (const tNum of parsedTeeth) {
        const existing = toothMap.get(tNum);
        if (!existing) {
          toothMap.set(tNum, {
            toothNumber: tNum,
            status: computedStatus,
            notes: `${t.actName}${t.notes ? ' - ' + t.notes : ''}`,
            historyCount: 1,
            lastUpdated: t.date,
          });
        } else {
          // If treatment is extraction or implant or crown, it has strong clinical priority over a generic 'Filling' or 'Healthy'
          const isPriorityStatus = computedStatus === 'Extracted' || computedStatus === 'Missing' || computedStatus === 'Implant' || computedStatus === 'Crown';
          const isGenericStatus = existing.status === 'Filling' || existing.status === 'Healthy';
          const isNewer = new Date(t.date).getTime() >= new Date(existing.lastUpdated).getTime();

          if ((isPriorityStatus && (isGenericStatus || isNewer)) || isNewer) {
            existing.status = computedStatus;
            existing.notes = `${t.actName}${t.notes ? ' - ' + t.notes : ''}`;
            existing.lastUpdated = t.date;
          }
        }
      }
    }

    res.json(Array.from(toothMap.values()));
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'odontogramme.', error: error.message });
  }
});

// Get detailed chronological history of a specific tooth (merged ToothHistory + Carnet Treatments)
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

    // 1. Fetch ToothHistory records (including legacy single digit if 11)
    const historyQuery: any = {
      patientId: new mongoose.Types.ObjectId(patientId as string),
      toothNumber: tNum,
    };
    if (tNum === 11) {
      historyQuery.toothNumber = { $in: [11, 1] };
    }

    const [history, treatments] = await Promise.all([
      ToothHistory.find(historyQuery).populate('invoiceId', 'invoiceNumber').sort({ date: -1 }),
      Treatment.find({ patientId: new mongoose.Types.ObjectId(patientId as string) }).populate('invoiceId', 'invoiceNumber').sort({ date: -1 }),
    ]);

    // 2. Filter treatments that match this tooth (e.g. tooth 11 matches "1" and "11")
    const matchedTreatments = treatments.filter((t) => matchesTooth(t.tooth, tNum));

    // Convert treatments to ToothHistory compatible shape if not already recorded in ToothHistory
    const combined: any[] = [...history];

    for (const tr of matchedTreatments) {
      const alreadyInHistory = history.some(
        (h) => h.procedureName === tr.actName && Math.abs(new Date(h.date).getTime() - new Date(tr.date).getTime()) < 60000
      );

      if (!alreadyInHistory) {
        combined.push({
          _id: tr._id,
          patientId: tr.patientId,
          toothNumber: tNum,
          procedureName: tr.actName,
          status: mapActToToothStatus(tr.actName, tr.category),
          cost: tr.cost,
          notes: tr.notes,
          invoiceId: tr.invoiceId,
          date: tr.date,
          source: 'CARNET',
        });
      }
    }

    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.json(combined);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'historique de la dent.', error: error.message });
  }
});

// Add a new tooth intervention / change status
router.post('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { patientId, toothNumber, procedureName, status, notes, cost, invoiceId, date, photosBefore, photosAfter, xrays, addToCarnet } = req.body;

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

    const patient = await Patient.findById(patientId);

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

    // Optionally synchronize to Carnet Financier (Diftar du Patient)
    if (addToCarnet) {
      try {
        await Treatment.create({
          patientId,
          date: date ? new Date(date) : new Date(),
          tooth: String(tNum),
          actName: procedureName ? procedureName.trim() : `Acte Clinique - Dent ${tNum} (${status})`,
          cost: parseFloat(cost) || 0,
          status: 'Terminé',
          notes: notes || '',
          createdBy: req.user?._id,
        });
      } catch (err) {
        console.error('Error auto-creating treatment from tooth intervention:', err);
      }
    }

    await recordAudit({
      userId: req.user?._id,
      userName: req.user?.name || 'Praticien',
      action: 'UPDATE_TOOTH_HISTORY',
      severity: 'INFO',
      targetId: record._id,
      targetName: `Dent #${tNum} - ${patient?.name || 'Patient'}`,
      details: `Acte "${procedureName || status}" appliqué sur la dent #${tNum} (Statut: ${status}).`,
      req,
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

    await recordAudit({
      userId: req.user?._id,
      userName: req.user?.name || 'Praticien',
      action: 'UPDATE_TOOTH_HISTORY',
      severity: 'INFO',
      targetId: record._id,
      targetName: `Dent #${record.toothNumber}`,
      details: `Modification de l'acte dentaire #${record.toothNumber} (${record.status}).`,
      req,
    });

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

    await recordAudit({
      userId: req.user?._id,
      userName: req.user?.name || 'Praticien',
      action: 'UPDATE_TOOTH_HISTORY',
      severity: 'WARNING',
      targetId: record._id,
      targetName: `Dent #${record.toothNumber}`,
      details: `Suppression de l'historique de soin sur la dent #${record.toothNumber}.`,
      req,
    });

    res.json({ message: 'Historique supprimé.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'enregistrement.', error: error.message });
  }
});

export default router;

