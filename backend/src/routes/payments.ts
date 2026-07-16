import { Router, Response } from 'express';
import PaymentTransaction from '../models/Payment';
import Invoice from '../models/Invoice';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

// Get payment transactions for an invoice
router.get('/invoice/:invoiceId', protect, async (req: AuthRequest, res: Response) => {
  try {
    const list = await PaymentTransaction.find({ invoiceId: req.params.invoiceId }).sort({ date: -1 });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'historique des paiements.', error: error.message });
  }
});

// Get payment transactions for a patient
router.get('/patient/:patientId', protect, async (req: AuthRequest, res: Response) => {
  try {
    const list = await PaymentTransaction.find({ patientId: req.params.patientId })
      .populate('invoiceId', 'invoiceNumber totalAmount netAmount')
      .sort({ date: -1 });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la récupération des transactions du patient.', error: error.message });
  }
});

// Add a new payment transaction (logs payment and updates parent invoice paid amount/status)
router.post('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { invoiceId, patientId, amount, paymentMethod, notes, date } = req.body;

    if (!invoiceId || !patientId || amount === undefined || amount <= 0 || !paymentMethod) {
      res.status(400).json({ message: 'Champs requis manquants ou montant invalide.' });
      return;
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      res.status(404).json({ message: 'Facture introuvable.' });
      return;
    }

    const payVal = parseFloat(amount);
    const newPaidAmount = invoice.paidAmount + payVal;

    // Determine payment status
    let paymentStatus: 'Paid' | 'Partially Paid' | 'Unpaid' = 'Partially Paid';
    if (newPaidAmount >= invoice.netAmount) {
      paymentStatus = 'Paid';
    } else if (newPaidAmount <= 0) {
      paymentStatus = 'Unpaid';
    }

    // Save payment transaction
    const transaction = await PaymentTransaction.create({
      invoiceId,
      patientId,
      amount: payVal,
      paymentMethod,
      notes,
      date: date ? new Date(date) : new Date(),
    });

    // Update parent invoice
    invoice.paidAmount = Math.min(newPaidAmount, invoice.netAmount);
    invoice.paymentStatus = paymentStatus;
    await invoice.save();

    res.status(201).json({
      transaction,
      invoice,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la journalisation du paiement.', error: error.message });
  }
});

// Delete a payment transaction (reverts the paidAmount on parent invoice)
router.delete('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    const transaction = await PaymentTransaction.findById(req.params.id);
    if (!transaction) {
      res.status(404).json({ message: 'Transaction de paiement introuvable.' });
      return;
    }

    const invoice = await Invoice.findById(transaction.invoiceId);
    if (invoice) {
      const revertedPaidAmount = Math.max(0, invoice.paidAmount - transaction.amount);
      invoice.paidAmount = revertedPaidAmount;

      if (revertedPaidAmount >= invoice.netAmount) {
        invoice.paymentStatus = 'Paid';
      } else if (revertedPaidAmount > 0) {
        invoice.paymentStatus = 'Partially Paid';
      } else {
        invoice.paymentStatus = 'Unpaid';
      }
      await invoice.save();
    }

    await transaction.deleteOne();
    res.json({ message: 'Paiement annulé avec succès.', invoice });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la suppression de la transaction.', error: error.message });
  }
});

export default router;
