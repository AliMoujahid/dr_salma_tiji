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
      amount: t.cost, // A Payer
      paidAmount: t.paidAmount || 0, // Avance versée
      remainingAmount: Math.max(0, (t.cost || 0) - (t.paidAmount || 0)), // Reste à payer
      paymentMode: t.paymentMode || 'espèces',
      status: t.status,
      invoiceId: t.invoiceId,
      notes: t.notes,
      source: 'TREATMENT',
    }))];

    // Reconcile each invoice: ensure all invoice items are represented in the ledger without omission or duplication
    for (const inv of invoices) {
      if (!Array.isArray(inv.items) || inv.items.length === 0) continue;

      // Find all acts already in actsList that are linked to this invoice
      const actsLinkedToInv = actsList.filter((a) => {
        if (!a.invoiceId) return false;
        const linkedId = a.invoiceId._id ? a.invoiceId._id.toString() : a.invoiceId.toString();
        return linkedId === inv._id.toString();
      });

      // Track which linked acts have already been matched with an invoice item (1-to-1 pairing)
      const matchedActIds = new Set<string>();

      for (let idx = 0; idx < inv.items.length; idx++) {
        const item = inv.items[idx];
        const itemDesc = (item.description || '').trim().toLowerCase();
        const itemTooth = (item.tooth || '').trim();
        const itemAmount = Number(item.amount) || 0;

        // Direct match if treatmentId is recorded on the invoice item
        let matchingAct = item.treatmentId
          ? actsLinkedToInv.find(
              (a) => !matchedActIds.has(a._id.toString()) && a._id.toString() === item.treatmentId?.toString()
            )
          : null;

        // Try exact match with an un-paired act linked to this invoice (same desc, amount, and tooth)
        if (!matchingAct) {
          matchingAct = actsLinkedToInv.find((a) => {
            if (matchedActIds.has(a._id.toString())) return false;
            const sameDesc = (a.description || '').trim().toLowerCase() === itemDesc;
            const sameAmount = Math.abs((Number(a.amount) || 0) - itemAmount) < 0.01;
            const sameTooth = !itemTooth || itemTooth === '-' || (a.tooth || '').trim() === itemTooth;
            return sameDesc && sameAmount && sameTooth;
          });
        }

        // Fallback match: same description and same amount
        if (!matchingAct) {
          matchingAct = actsLinkedToInv.find((a) => {
            if (matchedActIds.has(a._id.toString())) return false;
            const sameDesc = (a.description || '').trim().toLowerCase() === itemDesc;
            const sameAmount = Math.abs((Number(a.amount) || 0) - itemAmount) < 0.01;
            return sameDesc && sameAmount;
          });
        }

        // Secondary fallback: any un-paired act linked to this invoice with the same amount
        if (!matchingAct) {
          matchingAct = actsLinkedToInv.find((a) => {
            if (matchedActIds.has(a._id.toString())) return false;
            return Math.abs((Number(a.amount) || 0) - itemAmount) < 0.01;
          });
        }

        if (matchingAct) {
          // This invoice item is already accounted for by an existing Treatment in actsList
          matchedActIds.add(matchingAct._id.toString());
        } else {
          // This invoice item is NOT represented by any existing treatment (e.g. added in InvoiceEditor)!
          // It MUST appear in the Carnet as an act belonging to this invoice.
          let itemDate: Date = inv.date;
          if (item.date) {
            const parts = item.date.split('/');
            if (parts.length >= 2) {
              const d = parseInt(parts[0], 10);
              const m = parseInt(parts[1], 10) - 1;
              const y = parts[2] ? parseInt(parts[2], 10) : new Date(inv.date).getFullYear();
              const parsed = new Date(y, m, d);
              if (!isNaN(parsed.getTime())) {
                itemDate = parsed;
              }
            }
          }

          const isInvPaid = inv.paymentStatus === 'Paid';
          const itemAdvance = isInvPaid ? itemAmount : Math.max(0, Number(item.advance) || 0);

          actsList.push({
            _id: `inv_item_${inv._id}_${(item as any)._id ? (item as any)._id.toString() : idx}`,
            type: 'SOIN',
            date: itemDate,
            tooth: item.tooth || '-',
            description: item.description,
            amount: itemAmount,
            paidAmount: itemAdvance,
            remainingAmount: Math.max(0, itemAmount - itemAdvance),
            paymentMode: inv.paymentMode || 'espèces',
            status: 'Terminé',
            invoiceId: { _id: inv._id, invoiceNumber: inv.invoiceNumber, date: inv.date },
            notes: `Facture N° ${inv.invoiceNumber}`,
            source: 'INVOICE',
          });
        }
      }
    }

    // Consolidate payments
    const paymentsList = payments.map((p) => ({
      _id: p._id,
      treatmentId: p.treatmentId,
      type: 'REGLEMENT',
      date: p.date,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      invoiceId: p.invoiceId,
      notes: p.notes,
    }));

    // Separate standalone payments from payments that are advances on existing acts
    const existingActIds = new Set(actsList.map((a) => a._id.toString()));
    const standalonePayments = paymentsList.filter(
      (p) => !p.treatmentId || !existingActIds.has(p.treatmentId.toString())
    );

    // Calculate totals
    const totalActsAmount = actsList.reduce((sum, act) => sum + (Number(act.amount) || 0), 0);

    // Resilient total paid amount: sum of all payment transactions + any orphan treatment paidAmount
    const trackedTreatmentIds = new Set(
      payments
        .filter((p) => Boolean(p.treatmentId))
        .map((p) => String(p.treatmentId))
    );
    let orphanTreatmentAdvances = 0;
    for (const t of treatments) {
      if ((t.paidAmount || 0) > 0 && !trackedTreatmentIds.has(t._id.toString())) {
        orphanTreatmentAdvances += Number(t.paidAmount) || 0;
      }
    }
    const totalPaidAmount = paymentsList.reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0) + orphanTreatmentAdvances;
    const remainingBalance = Math.max(0, totalActsAmount - totalPaidAmount);

    // Chronological running balance (oldest to newest)
    const chronological = [
      ...actsList.map((a) => ({
        _id: a._id,
        kind: 'SOIN',
        cost: Number(a.amount) || 0,
        advance: Number(a.paidAmount) || 0,
        date: a.date,
      })),
      ...standalonePayments.map((p) => ({
        _id: p._id,
        kind: 'REGLEMENT',
        cost: 0,
        advance: Number(p.amount) || 0,
        date: p.date,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a._id.toString().localeCompare(b._id.toString()));

    let currentRunning = 0;
    const runningMap: Record<string, number> = {};
    for (const item of chronological) {
      if (item.kind === 'SOIN') {
        currentRunning += item.cost;
        currentRunning -= item.advance;
      } else {
        currentRunning -= item.advance;
      }
      runningMap[item._id.toString()] = Math.max(0, currentRunning);
    }

    const actsWithRunning = actsList.map((a) => ({
      ...a,
      runningBalance: runningMap[a._id.toString()] !== undefined ? runningMap[a._id.toString()] : Math.max(0, (a.amount || 0) - (a.paidAmount || 0)),
    }));

    const paymentsWithRunning = paymentsList.map((p) => ({
      ...p,
      runningBalance: runningMap[p._id.toString()] !== undefined ? runningMap[p._id.toString()] : undefined,
    }));

    // Unbilled acts (can be selected to create a new invoice)
    const unbilledActs = actsWithRunning.filter((a) => !a.invoiceId);

    res.json({
      summary: {
        totalActsAmount,
        totalPaidAmount,
        remainingBalance,
        unbilledCount: unbilledActs.length,
      },
      acts: actsWithRunning.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      payments: paymentsWithRunning.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      unbilledActs,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la récupération du carnet patient.', error: error.message });
  }
});

// 3. Add a new treatment for patient with support for A Payer & Avance
router.post('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { patientId, date, tooth, actName, cost, advance, paidAmount, paymentMode, category, status, notes } = req.body;

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

    const finalCost = Math.max(0, parseFloat(cost) || 0);
    const rawAdvance = parseFloat(advance !== undefined ? advance : paidAmount) || 0;
    const finalAdvance = Math.max(0, Math.min(finalCost, rawAdvance));
    const finalPaymentMode = paymentMode || 'espèces';

    const newTreatment = await Treatment.create({
      patientId,
      date: date ? new Date(date) : new Date(),
      tooth: tooth ? String(tooth).trim() : '',
      actName: actName.trim(),
      category: category || 'Soins',
      cost: finalCost,
      paidAmount: finalAdvance,
      paymentMode: finalPaymentMode,
      status: status || 'Terminé',
      notes: notes || '',
      createdBy: req.user?._id,
    });

    // If an advance was paid immediately, record matching PaymentTransaction
    if (finalAdvance > 0) {
      await PaymentTransaction.create({
        patientId,
        treatmentId: newTreatment._id,
        amount: finalAdvance,
        paymentMethod: finalPaymentMode,
        date: newTreatment.date,
        notes: `Avance Soin: ${newTreatment.actName}${newTreatment.tooth ? ` (Dent ${newTreatment.tooth})` : ''}`,
      });
    }

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

    // 4b. Add an additional advance/payment to an existing treatment
    router.post('/:id/advance', protect, async (req: AuthRequest, res: Response) => {
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

        const { amount, paymentMethod, date, notes } = req.body;
        const addAmount = Math.max(0, parseFloat(amount) || 0);
        if (addAmount <= 0) {
          res.status(400).json({ message: 'Veuillez saisir un montant supérieur à 0.' });
          return;
        }

        const prevPaid = treatment.paidAmount || 0;
        treatment.paidAmount = prevPaid + addAmount;
        if (paymentMethod) treatment.paymentMode = paymentMethod;
        await treatment.save();

        // Create matching payment transaction
        const payment = await PaymentTransaction.create({
          patientId: treatment.patientId,
          treatmentId: treatment._id,
          amount: addAmount,
          paymentMethod: paymentMethod || 'espèces',
          date: date ? new Date(date) : new Date(),
          notes: notes || `Versement Acompte: ${treatment.actName}${treatment.tooth ? ` (Dent ${treatment.tooth})` : ''}`,
        });

        res.json({ treatment, payment });
      } catch (error: any) {
        res.status(500).json({ message: 'Erreur lors de l\'enregistrement de l\'acompte.', error: error.message });
      }
    });

    // 4c. Get all advances / tranches recorded for a treatment
    router.get('/:id/advances', protect, async (req: AuthRequest, res: Response) => {
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

        let payments = await PaymentTransaction.find({ treatmentId: treatment._id }).sort({ date: -1, createdAt: -1 });

        // If treatment has paidAmount > 0 but no PaymentTransaction exists (e.g. legacy initial advance), create it so it's visible & manageable
        if ((treatment.paidAmount || 0) > 0 && payments.length === 0) {
          const initialPayment = await PaymentTransaction.create({
            patientId: treatment.patientId,
            treatmentId: treatment._id,
            amount: treatment.paidAmount,
            paymentMethod: treatment.paymentMode || 'espèces',
            date: treatment.date,
            notes: `Avance initiale: ${treatment.actName}${treatment.tooth ? ` (Dent ${treatment.tooth})` : ''}`,
          });
          payments = [initialPayment];
        }

        res.json({
          treatment,
          cost: treatment.cost || 0,
          paidAmount: treatment.paidAmount || 0,
          remainingAmount: Math.max(0, (treatment.cost || 0) - (treatment.paidAmount || 0)),
          payments,
        });
      } catch (error: any) {
        res.status(500).json({ message: 'Erreur lors de la récupération de l\'historique des acomptes.', error: error.message });
      }
    });

    // 4d. Delete a specific advance / tranche for a treatment with auto recalculation of remaining
    router.delete('/:id/advance/:paymentId', protect, async (req: AuthRequest, res: Response) => {
      try {
        const { id, paymentId } = req.params;
        if (!isValidObjectId(id) || !isValidObjectId(paymentId)) {
          res.status(400).json({ message: 'Identifiants invalides.' });
          return;
        }

        const treatment = await Treatment.findById(id);
        if (!treatment) {
          res.status(404).json({ message: 'Soin introuvable.' });
          return;
        }

        const payment = await PaymentTransaction.findOne({ _id: paymentId, treatmentId: treatment._id });
        if (!payment) {
          const anyPayment = await PaymentTransaction.findById(paymentId);
          if (!anyPayment) {
            res.status(404).json({ message: 'Versement introuvable.' });
            return;
          }
          await anyPayment.deleteOne();
        } else {
          await payment.deleteOne();
        }

        // Recalculate remaining payments for this treatment
        const remainingPayments = await PaymentTransaction.find({ treatmentId: treatment._id }).sort({ date: -1, createdAt: -1 });
        const totalPaid = remainingPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
        treatment.paidAmount = totalPaid;
        await treatment.save();

        await recordAudit({
          userId: req.user?._id,
          userName: req.user?.name || 'Praticien',
          action: 'DELETE_PAYMENT',
          severity: 'WARNING',
          targetId: treatment._id,
          targetName: `${treatment.actName}`,
          details: `Suppression d'un acompte pour "${treatment.actName}". Nouveau total versé: ${totalPaid} DH.`,
          req,
        });

        res.json({
          message: 'Versement supprimé avec succès.',
          treatment,
          paidAmount: totalPaid,
          remainingAmount: Math.max(0, (treatment.cost || 0) - totalPaid),
          payments: remainingPayments,
        });
      } catch (error: any) {
        res.status(500).json({ message: 'Erreur lors de la suppression de l\'acompte.', error: error.message });
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

    // Also remove any payments linked specifically to this treatment
    try {
      await PaymentTransaction.deleteMany({ treatmentId: treatment._id });
    } catch {}

    await treatment.deleteOne();
    res.json({ message: 'Soin supprimé du carnet avec succès.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la suppression du soin.', error: error.message });
  }
});

export default router;
