import { Router, Response } from 'express';
import mongoose from 'mongoose';
import Devis from '../models/Devis';
import Invoice from '../models/Invoice';
import Patient from '../models/Patient';
import { protect, AuthRequest } from '../middleware/auth';
import { recordAudit } from '../middleware/security';

const router = Router();

// Helper to escape special regex characters and prevent ReDoS/syntax errors
const escapeRegex = (text: string): string => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

const isValidObjectId = (id: any): boolean => {
  return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);
};

// 1. Get all devis with filter & search options
router.get('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { patientId, status, search, limit = '50', page = '1' } = req.query;
    const query: any = {};

    if (isValidObjectId(patientId)) {
      query.patientId = patientId;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const escaped = escapeRegex(search.trim());
      const regex = new RegExp(escaped, 'i');

      const matchingPatients = await Patient.find({
        $or: [{ name: regex }, { prenom: regex }, { phone: regex }, { nationalId: regex }],
      }).select('_id');
      const patientIds = matchingPatients.map((p) => p._id);

      query.$or = [
        { devisNumber: regex },
        { 'items.description': regex },
        ...(patientIds.length > 0 ? [{ patientId: { $in: patientIds } }] : []),
      ];
    }

    const pageSize = Math.max(1, parseInt(limit as string, 10) || 50);
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);

    const total = await Devis.countDocuments(query);
    const list = await Devis.find(query)
      .populate('patientId', 'name prenom phone nationalId')
      .populate('createdBy', 'name')
      .populate('convertedInvoiceId', 'invoiceNumber date')
      .sort({ date: -1, createdAt: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize);

    res.json({
      devis: list,
      total,
      pages: Math.max(1, Math.ceil(total / pageSize)),
      currentPage: pageNum,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la récupération des devis.', error: error.message });
  }
});

// 2. Get single devis by ID
router.get('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: 'Identifiant de devis invalide.' });
      return;
    }

    const devis = await Devis.findById(req.params.id)
      .populate('patientId', 'name prenom phone nationalId address email insurance')
      .populate('createdBy', 'name')
      .populate('convertedInvoiceId', 'invoiceNumber date netAmount');

    if (!devis) {
      res.status(404).json({ message: 'Devis introuvable.' });
      return;
    }

    res.json(devis);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la récupération du devis.', error: error.message });
  }
});

// 3. Create a new Devis
router.post('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { patientId, date, validUntil, items, discount, status, notes } = req.body;

    if (!patientId || !items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: 'Champs requis manquants ou liste d\'actes vide.' });
      return;
    }

    if (!isValidObjectId(patientId)) {
      res.status(400).json({ message: 'Identifiant patient invalide.' });
      return;
    }

    const patient = await Patient.findById(patientId);

    // Format line items
    const formattedItems = items.map((item: any) => {
      const amount = Math.max(0, parseFloat(item.amount) || 0);
      return {
        date: item.date || '',
        tooth: item.tooth || '',
        description: item.description || '',
        amount,
      };
    });

    const totalAmount = formattedItems.reduce((sum: number, item: any) => sum + item.amount, 0);
    const disc = Math.max(0, parseFloat(discount) || 0);
    const netAmount = Math.max(0, totalAmount - disc);

    const devisDateObj = date && !isNaN(new Date(date).getTime()) ? new Date(date) : new Date();
    const currentYear = devisDateObj.getFullYear();

    // Default validUntil is 30 days after devis date if not provided
    const validUntilDate = validUntil && !isNaN(new Date(validUntil).getTime())
      ? new Date(validUntil)
      : new Date(devisDateObj.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Auto-generate devisNumber (format: DEV-[num]/[year])
    const countDevis = await Devis.countDocuments({
      date: {
        $gte: new Date(`${currentYear}-01-01`),
        $lte: new Date(`${currentYear}-12-31`),
      },
    });

    const nextNumber = countDevis + 1026;
    const devisNumber = `DEV-${nextNumber}/${currentYear}`;

    const newDevis = await Devis.create({
      devisNumber,
      patientId,
      date: devisDateObj,
      validUntil: validUntilDate,
      items: formattedItems,
      totalAmount,
      discount: disc,
      netAmount,
      status: status || 'Draft',
      notes: notes || '',
      createdBy: req.user?._id,
    });

    await recordAudit({
      userId: req.user?._id,
      userName: req.user?.name || 'Praticien',
      action: 'CREATE_DEVIS',
      severity: 'INFO',
      targetId: newDevis._id,
      targetName: `Devis N° ${devisNumber}`,
      details: `Création du devis N° ${devisNumber} pour ${patient?.name || 'Patient'} - Total: ${netAmount} DH.`,
      req,
    });

    const populated = await Devis.findById(newDevis._id)
      .populate('patientId', 'name prenom phone nationalId address email insurance')
      .populate('createdBy', 'name');

    res.status(201).json(populated);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la création du devis.', error: error.message });
  }
});

// 4. Update an existing Devis
router.put('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: 'Identifiant de devis invalide.' });
      return;
    }

    const { date, validUntil, items, discount, status, notes, patientId } = req.body;

    const devis = await Devis.findById(req.params.id);
    if (!devis) {
      res.status(404).json({ message: 'Devis introuvable.' });
      return;
    }

    if (patientId && isValidObjectId(patientId)) {
      devis.patientId = patientId;
    }

    if (date && !isNaN(new Date(date).getTime())) {
      devis.date = new Date(date);
    }

    if (validUntil && !isNaN(new Date(validUntil).getTime())) {
      devis.validUntil = new Date(validUntil);
    }

    if (Array.isArray(items)) {
      devis.items = items.map((item: any) => ({
        date: item.date || '',
        tooth: item.tooth || '',
        description: item.description || '',
        amount: Math.max(0, parseFloat(item.amount) || 0),
      }));

      devis.totalAmount = devis.items.reduce((sum: number, it: any) => sum + it.amount, 0);
    }

    if (discount !== undefined) {
      devis.discount = Math.max(0, parseFloat(discount) || 0);
    }

    devis.netAmount = Math.max(0, devis.totalAmount - devis.discount);

    if (status) {
      devis.status = status;
    }

    if (notes !== undefined) {
      devis.notes = notes;
    }

    await devis.save();

    await recordAudit({
      userId: req.user?._id,
      userName: req.user?.name || 'Praticien',
      action: 'UPDATE_DEVIS',
      severity: 'INFO',
      targetId: devis._id,
      targetName: `Devis N° ${devis.devisNumber}`,
      details: `Mise à jour du devis N° ${devis.devisNumber} - Statut: ${devis.status}, Net: ${devis.netAmount} DH.`,
      req,
    });

    const populated = await Devis.findById(devis._id)
      .populate('patientId', 'name prenom phone nationalId address email insurance')
      .populate('createdBy', 'name')
      .populate('convertedInvoiceId', 'invoiceNumber date');

    res.json(populated);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du devis.', error: error.message });
  }
});

// 5. Delete a Devis
router.delete('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: 'Identifiant de devis invalide.' });
      return;
    }

    const devis = await Devis.findById(req.params.id);
    if (!devis) {
      res.status(404).json({ message: 'Devis introuvable.' });
      return;
    }

    await Devis.findByIdAndDelete(req.params.id);

    await recordAudit({
      userId: req.user?._id,
      userName: req.user?.name || 'Praticien',
      action: 'DELETE_DEVIS',
      severity: 'WARNING',
      targetId: req.params.id,
      targetName: `Devis N° ${devis.devisNumber}`,
      details: `Suppression définitive du devis N° ${devis.devisNumber}.`,
      req,
    });

    res.json({ message: `Devis N° ${devis.devisNumber} supprimé avec succès.` });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la suppression du devis.', error: error.message });
  }
});

// 6. Convert Devis to Invoice (1-Click Transform)
router.post('/:id/convert-to-invoice', protect, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: 'Identifiant de devis invalide.' });
      return;
    }

    const devis = await Devis.findById(req.params.id).populate('patientId');
    if (!devis) {
      res.status(404).json({ message: 'Devis introuvable.' });
      return;
    }

    const now = new Date();
    const currentYear = now.getFullYear();

    const countInvoices = await Invoice.countDocuments({
      date: {
        $gte: new Date(`${currentYear}-01-01`),
        $lte: new Date(`${currentYear}-12-31`),
      },
    });

    const nextInvoiceNumber = `${countInvoices + 1026}/${currentYear}`;

    // Format items for Invoice
    const invoiceItems = devis.items.map((it: any) => ({
      date: it.date || `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`,
      tooth: it.tooth || '',
      description: it.description || '',
      amount: it.amount || 0,
      advance: 0,
      remaining: it.amount || 0,
    }));

    const newInvoice = await Invoice.create({
      invoiceNumber: nextInvoiceNumber,
      patientId: devis.patientId._id,
      date: now,
      items: invoiceItems,
      totalAmount: devis.totalAmount,
      discount: devis.discount,
      netAmount: devis.netAmount,
      paymentMode: 'espèces',
      paymentStatus: 'Unpaid',
      paidAmount: 0,
      createdBy: req.user?._id,
    });

    devis.status = 'Invoiced';
    devis.convertedInvoiceId = newInvoice._id;
    await devis.save();

    await recordAudit({
      userId: req.user?._id,
      userName: req.user?.name || 'Praticien',
      action: 'CONVERT_DEVIS_TO_INVOICE',
      severity: 'INFO',
      targetId: newInvoice._id,
      targetName: `Facture N° ${nextInvoiceNumber}`,
      details: `Conversion du Devis N° ${devis.devisNumber} en Facture N° ${nextInvoiceNumber}.`,
      req,
    });

    res.json({
      message: `Devis N° ${devis.devisNumber} converti avec succès en Facture N° ${nextInvoiceNumber}.`,
      invoice: newInvoice,
      devis,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la conversion du devis en facture.', error: error.message });
  }
});

export default router;
