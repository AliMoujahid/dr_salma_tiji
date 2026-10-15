"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const Invoice_1 = __importDefault(require("../models/Invoice"));
const Patient_1 = __importDefault(require("../models/Patient"));
const Payment_1 = __importDefault(require("../models/Payment"));
const auth_1 = require("../middleware/auth");
const security_1 = require("../middleware/security");
const router = (0, express_1.Router)();
// Helper to escape special regex characters and prevent ReDoS/syntax errors
const escapeRegex = (text) => {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};
const isValidObjectId = (id) => {
    return typeof id === 'string' && mongoose_1.default.Types.ObjectId.isValid(id);
};
// Get all invoices with filter options
router.get('/', auth_1.protect, async (req, res) => {
    try {
        const { patientId, status, search, limit = '20', page = '1' } = req.query;
        const query = {};
        if (isValidObjectId(patientId)) {
            query.patientId = patientId;
        }
        if (status) {
            query.paymentStatus = status;
        }
        if (search && typeof search === 'string' && search.trim()) {
            const escaped = escapeRegex(search.trim());
            const regex = new RegExp(escaped, 'i');
            const matchingPatients = await Patient_1.default.find({
                $or: [{ name: regex }, { phone: regex }, { nationalId: regex }],
            }).select('_id');
            const patientIds = matchingPatients.map((p) => p._id);
            query.$or = [
                { invoiceNumber: regex },
                { 'items.description': regex },
                ...(patientIds.length > 0 ? [{ patientId: { $in: patientIds } }] : []),
            ];
        }
        const pageSize = Math.max(1, parseInt(limit, 10) || 20);
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const total = await Invoice_1.default.countDocuments(query);
        const list = await Invoice_1.default.find(query)
            .populate('patientId', 'name phone nationalId')
            .populate('createdBy', 'name')
            .sort({ date: -1, createdAt: -1 })
            .skip((pageNum - 1) * pageSize)
            .limit(pageSize);
        res.json({
            invoices: list,
            total,
            pages: Math.max(1, Math.ceil(total / pageSize)),
            currentPage: pageNum,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des factures.', error: error.message });
    }
});
// Get invoice by ID
router.get('/:id', auth_1.protect, async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            res.status(400).json({ message: 'Identifiant de facture invalide.' });
            return;
        }
        const invoice = await Invoice_1.default.findById(req.params.id)
            .populate('patientId', 'name phone nationalId address email insurance')
            .populate('createdBy', 'name');
        if (!invoice) {
            res.status(404).json({ message: 'Facture introuvable.' });
            return;
        }
        res.json(invoice);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération de la facture.', error: error.message });
    }
});
// Create a new invoice (automatically generates the next invoice number if not provided)
router.post('/', auth_1.protect, async (req, res) => {
    try {
        const { patientId, date, items, discount, paymentMode, paymentStatus, paidAmount } = req.body;
        if (!patientId || !items || !Array.isArray(items) || items.length === 0) {
            res.status(400).json({ message: 'Champs requis manquants ou liste d\'actes vide.' });
            return;
        }
        if (!isValidObjectId(patientId)) {
            res.status(400).json({ message: 'Identifiant patient invalide.' });
            return;
        }
        const patient = await Patient_1.default.findById(patientId);
        // Format line items with amount (A payer), advance (Avance), and remaining (Reste)
        const formattedItems = items.map((item) => {
            const amount = Math.max(0, parseFloat(item.amount) || 0);
            const advance = Math.max(0, parseFloat(item.advance !== undefined ? item.advance : item.amount) || 0);
            const remaining = Math.max(0, amount - advance);
            return {
                date: item.date || '',
                tooth: item.tooth || '',
                description: item.description || '',
                amount,
                advance,
                remaining,
            };
        });
        // Calculate total amount from items safely
        const totalAmount = formattedItems.reduce((sum, item) => sum + item.amount, 0);
        const disc = Math.max(0, parseFloat(discount) || 0);
        const netAmount = Math.max(0, totalAmount - disc);
        // Sum advances from items if paidAmount not explicitly set
        const itemsTotalAdvance = formattedItems.reduce((sum, item) => sum + item.advance, 0);
        const finalPaidAmount = paidAmount !== undefined ? Math.max(0, parseFloat(paidAmount) || 0) : itemsTotalAdvance;
        // Derive payment status
        let derivedStatus = paymentStatus;
        if (!derivedStatus) {
            if (finalPaidAmount >= netAmount && netAmount > 0) {
                derivedStatus = 'Paid';
            }
            else if (finalPaidAmount > 0) {
                derivedStatus = 'Partially Paid';
            }
            else {
                derivedStatus = 'Unpaid';
            }
        }
        // Auto-generate invoice number (format: [num]/[year])
        const invoiceDateObj = date && !isNaN(new Date(date).getTime()) ? new Date(date) : new Date();
        const currentYear = invoiceDateObj.getFullYear();
        const countInvoices = await Invoice_1.default.countDocuments({
            date: {
                $gte: new Date(`${currentYear}-01-01`),
                $lte: new Date(`${currentYear}-12-31`),
            },
        });
        const nextNumber = countInvoices + 1026; // Start from 1026 to match facture context
        const invoiceNumber = `${nextNumber}/${currentYear}`;
        const newInvoice = await Invoice_1.default.create({
            invoiceNumber,
            patientId,
            date: invoiceDateObj,
            items: formattedItems,
            totalAmount,
            discount: disc,
            netAmount,
            paymentMode: paymentMode || 'espèces',
            paymentStatus: derivedStatus,
            paidAmount: finalPaidAmount,
            createdBy: req.user?._id,
        });
        // Automatically record initial payment transaction for revenue & audit synchronization
        if (finalPaidAmount > 0) {
            try {
                await Payment_1.default.create({
                    invoiceId: newInvoice._id,
                    patientId,
                    amount: finalPaidAmount,
                    paymentMethod: paymentMode || 'espèces',
                    notes: `Règlement initial / Avance - Facture N° ${invoiceNumber}`,
                    date: invoiceDateObj,
                });
            }
            catch (payErr) {
                console.warn('Warning creating initial PaymentTransaction:', payErr);
            }
        }
        await (0, security_1.recordAudit)({
            userId: req.user?._id,
            userName: req.user?.name || 'Praticien',
            action: 'CREATE_INVOICE',
            severity: 'INFO',
            targetId: newInvoice._id,
            targetName: `Facture N° ${invoiceNumber}`,
            details: `Création de la facture N° ${invoiceNumber} pour ${patient?.name || 'Patient'} - Total: ${netAmount} DH (Avance: ${finalPaidAmount} DH).`,
            req,
        });
        const populated = await Invoice_1.default.findById(newInvoice._id)
            .populate('patientId', 'name phone nationalId')
            .populate('createdBy', 'name');
        res.status(201).json(populated);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la création de la facture.', error: error.message });
    }
});
// Edit/update invoice (e.g., adjustments, logs)
router.put('/:id', auth_1.protect, async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            res.status(400).json({ message: 'Identifiant de facture invalide.' });
            return;
        }
        const { items, discount, paymentMode, paymentStatus, paidAmount, date } = req.body;
        const invoice = await Invoice_1.default.findById(req.params.id);
        if (!invoice) {
            res.status(404).json({ message: 'Facture introuvable.' });
            return;
        }
        if (items && Array.isArray(items)) {
            const formattedItems = items.map((item) => {
                const amount = Math.max(0, parseFloat(item.amount) || 0);
                const advance = Math.max(0, parseFloat(item.advance !== undefined ? item.advance : item.amount) || 0);
                const remaining = Math.max(0, amount - advance);
                return {
                    date: item.date || '',
                    tooth: item.tooth || '',
                    description: item.description || '',
                    amount,
                    advance,
                    remaining,
                };
            });
            invoice.items = formattedItems;
            invoice.totalAmount = formattedItems.reduce((sum, item) => sum + item.amount, 0);
        }
        if (discount !== undefined) {
            invoice.discount = Math.max(0, parseFloat(discount) || 0);
        }
        invoice.netAmount = Math.max(0, invoice.totalAmount - invoice.discount);
        if (paymentMode)
            invoice.paymentMode = paymentMode;
        if (paidAmount !== undefined) {
            invoice.paidAmount = Math.max(0, parseFloat(paidAmount) || 0);
        }
        else if (items && Array.isArray(items)) {
            invoice.paidAmount = invoice.items.reduce((sum, item) => sum + (item.advance || 0), 0);
        }
        if (paymentStatus) {
            invoice.paymentStatus = paymentStatus;
        }
        else {
            if (invoice.paidAmount >= invoice.netAmount && invoice.netAmount > 0) {
                invoice.paymentStatus = 'Paid';
            }
            else if (invoice.paidAmount > 0) {
                invoice.paymentStatus = 'Partially Paid';
            }
            else {
                invoice.paymentStatus = 'Unpaid';
            }
        }
        if (date && !isNaN(new Date(date).getTime()))
            invoice.date = new Date(date);
        await invoice.save();
        await (0, security_1.recordAudit)({
            userId: req.user?._id,
            userName: req.user?.name || 'Praticien',
            action: 'UPDATE_INVOICE',
            severity: 'INFO',
            targetId: invoice._id,
            targetName: `Facture N° ${invoice.invoiceNumber}`,
            details: `Mise à jour des honoraires de la facture N° ${invoice.invoiceNumber} (Montant Net: ${invoice.netAmount} DH).`,
            req,
        });
        const populated = await Invoice_1.default.findById(invoice._id)
            .populate('patientId', 'name phone nationalId')
            .populate('createdBy', 'name');
        res.json(populated);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour de la facture.', error: error.message });
    }
});
// Delete invoice
router.delete('/:id', auth_1.protect, async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            res.status(400).json({ message: 'Identifiant de facture invalide.' });
            return;
        }
        const deleted = await Invoice_1.default.findByIdAndDelete(req.params.id);
        if (!deleted) {
            res.status(404).json({ message: 'Facture introuvable.' });
            return;
        }
        await (0, security_1.recordAudit)({
            userId: req.user?._id,
            userName: req.user?.name || 'Praticien',
            action: 'DELETE_INVOICE',
            severity: 'WARNING',
            targetId: deleted._id,
            targetName: `Facture N° ${deleted.invoiceNumber}`,
            details: `Suppression définitive de la facture N° ${deleted.invoiceNumber} (${deleted.netAmount} DH).`,
            backupData: deleted.toObject(),
            req,
        });
        res.json({ message: 'Facture supprimée avec succès.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la suppression de la facture.', error: error.message });
    }
});
exports.default = router;
