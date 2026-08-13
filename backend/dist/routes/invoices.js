"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Invoice_1 = __importDefault(require("../models/Invoice"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get all invoices with filter options
router.get('/', auth_1.protect, async (req, res) => {
    try {
        const { patientId, status, search, limit = '20', page = '1' } = req.query;
        const query = {};
        if (patientId) {
            query.patientId = patientId;
        }
        if (status) {
            query.paymentStatus = status;
        }
        if (search) {
            // Find invoices by number directly
            query.invoiceNumber = new RegExp(search, 'i');
        }
        const pageSize = parseInt(limit, 10);
        const pageNum = parseInt(page, 10);
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
            pages: Math.ceil(total / pageSize),
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
        // Calculate total amount from items
        const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        const disc = parseFloat(discount) || 0;
        const netAmount = Math.max(0, totalAmount - disc);
        // Auto-generate invoice number (format: [num]/[year])
        const currentYear = new Date(date || Date.now()).getFullYear();
        const countInvoices = await Invoice_1.default.countDocuments({
            date: {
                $gte: new Date(`${currentYear}-01-01`),
                $lte: new Date(`${currentYear}-12-31`),
            },
        });
        const nextNumber = countInvoices + 1026; // Start from 1026 to match facture.html context
        const invoiceNumber = `${nextNumber}/${currentYear}`;
        const newInvoice = await Invoice_1.default.create({
            invoiceNumber,
            patientId,
            date: date ? new Date(date) : new Date(),
            items,
            totalAmount,
            discount: disc,
            netAmount,
            paymentMode: paymentMode || 'espèces',
            paymentStatus: paymentStatus || 'Unpaid',
            paidAmount: parseFloat(paidAmount) || 0,
            createdBy: req.user?._id,
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
        const { items, discount, paymentMode, paymentStatus, paidAmount, date } = req.body;
        const invoice = await Invoice_1.default.findById(req.params.id);
        if (!invoice) {
            res.status(404).json({ message: 'Facture introuvable.' });
            return;
        }
        if (items) {
            invoice.items = items;
            invoice.totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        }
        if (discount !== undefined) {
            invoice.discount = parseFloat(discount) || 0;
        }
        invoice.netAmount = Math.max(0, invoice.totalAmount - invoice.discount);
        if (paymentMode)
            invoice.paymentMode = paymentMode;
        if (paymentStatus)
            invoice.paymentStatus = paymentStatus;
        if (paidAmount !== undefined)
            invoice.paidAmount = parseFloat(paidAmount) || 0;
        if (date)
            invoice.date = new Date(date);
        await invoice.save();
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
        const deleted = await Invoice_1.default.findByIdAndDelete(req.params.id);
        if (!deleted) {
            res.status(404).json({ message: 'Facture introuvable.' });
            return;
        }
        res.json({ message: 'Facture supprimée avec succès.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la suppression de la facture.', error: error.message });
    }
});
exports.default = router;
