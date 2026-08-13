"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const ToothHistory_1 = __importDefault(require("../models/ToothHistory"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get full odontogram tooth statuses for a patient (latest state for each tooth)
router.get('/patient/:patientId', auth_1.protect, async (req, res) => {
    try {
        const { patientId } = req.params;
        // Aggregate to get the latest status for each tooth of the patient
        const odontogram = await ToothHistory_1.default.aggregate([
            { $match: { patientId: new mongoose_1.default.Types.ObjectId(patientId) } },
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
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération de l\'odontogramme.', error: error.message });
    }
});
// Get detailed chronological history of a specific tooth
router.get('/patient/:patientId/tooth/:toothNumber', auth_1.protect, async (req, res) => {
    try {
        const { patientId, toothNumber } = req.params;
        const history = await ToothHistory_1.default.find({
            patientId: new mongoose_1.default.Types.ObjectId(patientId),
            toothNumber: parseInt(toothNumber, 10),
        })
            .populate('invoiceId', 'invoiceNumber')
            .sort({ date: -1 });
        res.json(history);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération de l\'historique de la dent.', error: error.message });
    }
});
// Add a new tooth intervention / change status
router.post('/', auth_1.protect, async (req, res) => {
    try {
        const { patientId, toothNumber, status, notes, cost, invoiceId, date, photosBefore, photosAfter, xrays } = req.body;
        if (!patientId || !toothNumber || !status) {
            res.status(400).json({ message: 'Champs requis manquants pour l\'historique dentaire.' });
            return;
        }
        const record = await ToothHistory_1.default.create({
            patientId,
            toothNumber: parseInt(toothNumber, 10),
            status,
            notes,
            cost: cost || 0,
            invoiceId: invoiceId || undefined,
            date: date ? new Date(date) : new Date(),
            photosBefore: photosBefore || [],
            photosAfter: photosAfter || [],
            xrays: xrays || [],
        });
        res.status(201).json(record);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la création de l\'acte sur la dent.', error: error.message });
    }
});
// Update a tooth history entry
router.put('/:id', auth_1.protect, async (req, res) => {
    try {
        const record = await ToothHistory_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!record) {
            res.status(404).json({ message: 'Enregistrement de la dent introuvable.' });
            return;
        }
        res.json(record);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'enregistrement dentaire.', error: error.message });
    }
});
// Delete a tooth history entry
router.delete('/:id', auth_1.protect, async (req, res) => {
    try {
        const record = await ToothHistory_1.default.findByIdAndDelete(req.params.id);
        if (!record) {
            res.status(404).json({ message: 'Enregistrement introuvable.' });
            return;
        }
        res.json({ message: 'Historique supprimé.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la suppression de l\'enregistrement.', error: error.message });
    }
});
exports.default = router;
