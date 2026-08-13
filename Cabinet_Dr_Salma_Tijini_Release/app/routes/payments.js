"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Payment_1 = __importDefault(require("../models/Payment"));
const Invoice_1 = __importDefault(require("../models/Invoice"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get payment transactions for an invoice
router.get('/invoice/:invoiceId', auth_1.protect, async (req, res) => {
    try {
        const list = await Payment_1.default.find({ invoiceId: req.params.invoiceId }).sort({ date: -1 });
        res.json(list);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération de l\'historique des paiements.', error: error.message });
    }
});
// Get payment transactions for a patient
router.get('/patient/:patientId', auth_1.protect, async (req, res) => {
    try {
        const list = await Payment_1.default.find({ patientId: req.params.patientId })
            .populate('invoiceId', 'invoiceNumber totalAmount netAmount')
            .sort({ date: -1 });
        res.json(list);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des transactions du patient.', error: error.message });
    }
});
// Add a new payment transaction (logs payment and updates parent invoice paid amount/status)
router.post('/', auth_1.protect, async (req, res) => {
    try {
        const { invoiceId, patientId, amount, paymentMethod, notes, date } = req.body;
        if (!invoiceId || !patientId || amount === undefined || amount <= 0 || !paymentMethod) {
            res.status(400).json({ message: 'Champs requis manquants ou montant invalide.' });
            return;
        }
        const invoice = await Invoice_1.default.findById(invoiceId);
        if (!invoice) {
            res.status(404).json({ message: 'Facture introuvable.' });
            return;
        }
        const payVal = parseFloat(amount);
        const newPaidAmount = invoice.paidAmount + payVal;
        // Determine payment status
        let paymentStatus = 'Partially Paid';
        if (newPaidAmount >= invoice.netAmount) {
            paymentStatus = 'Paid';
        }
        else if (newPaidAmount <= 0) {
            paymentStatus = 'Unpaid';
        }
        // Save payment transaction
        const transaction = await Payment_1.default.create({
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
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la journalisation du paiement.', error: error.message });
    }
});
// Delete a payment transaction (reverts the paidAmount on parent invoice)
router.delete('/:id', auth_1.protect, async (req, res) => {
    try {
        const transaction = await Payment_1.default.findById(req.params.id);
        if (!transaction) {
            res.status(404).json({ message: 'Transaction de paiement introuvable.' });
            return;
        }
        const invoice = await Invoice_1.default.findById(transaction.invoiceId);
        if (invoice) {
            const revertedPaidAmount = Math.max(0, invoice.paidAmount - transaction.amount);
            invoice.paidAmount = revertedPaidAmount;
            if (revertedPaidAmount >= invoice.netAmount) {
                invoice.paymentStatus = 'Paid';
            }
            else if (revertedPaidAmount > 0) {
                invoice.paymentStatus = 'Partially Paid';
            }
            else {
                invoice.paymentStatus = 'Unpaid';
            }
            await invoice.save();
        }
        await transaction.deleteOne();
        res.json({ message: 'Paiement annulé avec succès.', invoice });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la suppression de la transaction.', error: error.message });
    }
});
exports.default = router;
