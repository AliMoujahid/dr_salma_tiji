import { Router, Response } from 'express';
import mongoose from 'mongoose';
import Treatment from '../models/Treatment';
import Patient from '../models/Patient';
import PaymentTransaction from '../models/Payment';
import Invoice from '../models/Invoice';
import ToothHistory from '../models/ToothHistory';
import { protect, AuthRequest } from '../middleware/auth';
import { recordAudit } from '../middleware/security';
import { mapActToToothStatus, parseToothNumbers } from '../utils/dentalUtils';

const router = Router();

const isValidObjectId = (id: any): boolean => {
  return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);
};

// 1. Get all treatments for a patient
router.get('/patient/:patientId', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { patientId } = req.params;
    if (!isValidObjectId(patientId)) {
      res.status(400).json({ message: 'Identifiant patient invalide.' });
      return;
    }

    const treatments = await Treatment.find({ patientId })
      .populate('invoiceId', 'invoiceNumber date')
      .sort({ date: -1, createdAt: -1 });

    res.json(treatments);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la récupération des soins.', error: error.message });
  }
});

// 2. Get complete patient financial ledger ("Diftar du Patient" : Ha chno dar + Ha chno khalas + Solde)
router.get('/patient/:patientId/ledger', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { patientId } = req.params;
    if (!isValidObjectId(patientId)) {
      res.status(400).json({ message: 'Identifiant patient invalide.' });
      return;
    }

    // Fetch treatments, payments, and invoices
    const [treatments, payments, invoices] = await Promise.all([
      Treatment.find({ patientId }).populate('invoiceId', 'invoiceNumber date').sort({ date: -1, createdAt: -1 }),
      PaymentTransaction.find({ patientId }).populate('invoiceId', 'invoiceNumber').sort({ date: -1, createdAt: -1 }),
      Invoice.find({ patientId }).sort({ date: -1, createdAt: -1 }),
    ]);

    // Consolidate acts: include treatments + invoice items that don't duplicate treatments
    const actsList: any[] = [...treatments.map((t) => ({
      _id: t._id,
      type: 'SOIN',
      date: t.date,
      tooth: t.tooth || '-',
      description: t.actName,
      amount: t.cost,
      status: t.status,
      invoiceId: t.invoiceId,
      notes: t.notes,
      source: 'TREATMENT',
    }))];

    // If there are invoices with items, ensure they appear in the ledger if not already recorded
    for (const inv of invoices) {
      if (Array.isArray(inv.items)) {
        for (const item of inv.items) {
          const alreadyExists = actsList.some(
            (a) => a.invoiceId && (a.invoiceId._id?.toString() === inv._id.toString() || a.invoiceId.toString() === inv._id.toString()) && a.description === item.description
          );
          if (!alreadyExists) {
            actsList.push({
              _id: `inv_item_${inv._id}_${item.description}_${item.amount}`,
              type: 'SOIN',
              date: inv.date,
              tooth: item.tooth || '-',
              description: item.description,
              amount: item.amount || 0,
              status: 'Terminé',
              invoiceId: { _id: inv._id, invoiceNumber: inv.invoiceNumber, date: inv.date },
              notes: `Facture N° ${inv.invoiceNumber}`,
              source: 'INVOICE',
            });
          }
        }
      }
    }

    // Consolidate payments
    const paymentsList = payments.map((p) => ({
      _id: p._id,
      type: 'REGLEMENT',
      date: p.date,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      invoiceId: p.invoiceId,
      notes: p.notes,
    }));

    // Calculate totals
    const totalActsAmount = actsList.reduce((sum, act) => sum + (Number(act.amount) || 0), 0);
    const totalPaidAmount = paymentsList.reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0);
    const remainingBalance = Math.max(0, totalActsAmount - totalPaidAmount);

    // Unbilled acts (can be selected to create a new invoice)
    const unbilledActs = actsList.filter((a) => !a.invoiceId);

    res.json({
      summary: {
        totalActsAmount,
        totalPaidAmount,
        remainingBalance,
        unbilledCount: unbilledActs.length,
      },
      acts: actsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      payments: paymentsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      unbilledActs,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la récupération du carnet patient.', error: error.message });
  }
});

// 3. Add a new treatment for patient
router.post('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { patientId, date, tooth, actName, cost, category, status, notes } = req.body;

    if (!isValidObjectId(patientId)) {
      res.status(400).json({ message: 'Identifiant patient invalide.' });
      return;
    }

    if (!actName || typeof actName !== 'string' || !actName.trim()) {
      res.status(400).json({ message: 'Le nom de l\'acte est requis.' });
      return;
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      res.status(404).json({ message: 'Patient introuvable.' });
      return;
    }

    const newTreatment = await Treatment.create({
      patientId,
      date: date ? new Date(date) : new Date(),
      tooth: tooth ? String(tooth).trim() : '',
      actName: actName.trim(),
      category: category || 'Soins',
      cost: Math.max(0, parseFloat(cost) || 0),
      status: status || 'Terminé',
      notes: notes || '',
      createdBy: req.user?._id,
    });

    // Also link with ToothHistory if a tooth number is specified
    const toothNumbers = parseToothNumbers(tooth);
    const determinedStatus = mapActToToothStatus(actName, category);

    for (const tNum of toothNumbers) {
      try {
        await ToothHistory.create({
          patientId,
          toothNumber: tNum,
          procedureName: actName.trim(),
          status: determinedStatus === 'Healthy' ? 'Filling' : determinedStatus,
          notes: notes || '',
          cost: newTreatment.cost,
          date: newTreatment.date,
        });
      } catch (err) {
        console.error('Error linking treatment to ToothHistory:', err);
      }
    }

    await recordAudit({
      userId: req.user?._id,
      userName: req.user?.name || 'Praticien',
      action: 'CREATE_TREATMENT',
      severity: 'INFO',
      targetId: newTreatment._id,
      targetName: `${newTreatment.actName} (${patient.name})`,
      details: `Ajout du soin "${newTreatment.actName}" (${newTreatment.cost} DH) pour "${patient.name}".`,
      req,
    });

    res.status(201).json(newTreatment);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de l\'enregistrement du soin.', error: error.message });
  }
});

// 4. Update treatment
router.put('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: 'Identifiant invalide.' });
      return;
    }

    const treatment = await Treatment.findById(req.params.id);
    if (!treatment) {
      res.status(404).json({ message: 'Soin introuvable.' });
      return;
    }

    const { date, tooth, actName, cost, status, notes } = req.body;
    if (date) treatment.date = new Date(date);
    if (tooth !== undefined) treatment.tooth = String(tooth).trim();
    if (actName) treatment.actName = actName.trim();
    if (cost !== undefined) treatment.cost = Math.max(0, parseFloat(cost) || 0);
    if (status) treatment.status = status;
    if (notes !== undefined) treatment.notes = notes;

    await treatment.save();
    res.json(treatment);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du soin.', error: error.message });
  }
});

// 5. Delete treatment
router.delete('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: 'Identifiant invalide.' });
      return;
    }

    const treatment = await Treatment.findById(req.params.id);
    if (!treatment) {
      res.status(404).json({ message: 'Soin introuvable.' });
      return;
    }

    // Also remove any linked ToothHistory for this act & tooth
    if (treatment.tooth) {
      const toothNumbers = parseToothNumbers(treatment.tooth);
      for (const tNum of toothNumbers) {
        try {
          await ToothHistory.deleteMany({
            patientId: treatment.patientId,
            toothNumber: tNum,
            procedureName: treatment.actName,
          });
        } catch {}
      }
    }

    await treatment.deleteOne();
    res.json({ message: 'Soin supprimé du carnet avec succès.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la suppression du soin.', error: error.message });
  }
});

export default router;
