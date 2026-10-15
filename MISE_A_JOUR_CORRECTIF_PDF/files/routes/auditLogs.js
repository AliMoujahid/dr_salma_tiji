"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const Patient_1 = __importDefault(require("../models/Patient"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get all audit actions logs history (restricted to ADMIN)
router.get('/', auth_1.protect, (0, auth_1.restrictTo)('ADMIN'), async (req, res) => {
    try {
        const logs = await AuditLog_1.default.find().sort({ createdAt: -1 });
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors du chargement de l\'historique professionnel.', error: error.message });
    }
});
// Restore a soft-deleted patient (restricted to ADMIN)
router.post('/restore/:id', auth_1.protect, (0, auth_1.restrictTo)('ADMIN'), async (req, res) => {
    try {
        const log = await AuditLog_1.default.findById(req.params.id);
        if (!log) {
            res.status(404).json({ message: 'Log d\'historique introuvable.' });
            return;
        }
        if (log.action !== 'DELETE_PATIENT') {
            res.status(400).json({ message: 'Cette action n\'est pas restaurable.' });
            return;
        }
        // Check if patient document still exists in MongoDB
        let patient = await Patient_1.default.findById(log.targetId);
        if (patient) {
            // If it exists, just remove the soft delete flags
            patient.deleted = false;
            patient.deletedAt = undefined;
            patient.deletedBy = undefined;
            await patient.save();
        }
        else {
            // Recreate document if it was completely hard-deleted
            const backup = { ...log.backupData };
            delete backup._id; // prevent duplication ID clash if recreating
            patient = await Patient_1.default.create({
                ...backup,
                deleted: false,
                isArchived: false,
            });
        }
        // Log the restoration action
        await AuditLog_1.default.create({
            userId: req.user?._id,
            userName: req.user?.name || 'Inconnu',
            action: 'RESTORE_PATIENT',
            targetId: patient._id,
            targetName: patient.name,
            details: `Patient "${patient.name}" a été restauré par ${req.user?.name}.`,
        });
        res.json({ message: `Patient "${patient.name}" restauré avec succès.`, patient });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la restauration du patient.', error: error.message });
    }
});
exports.default = router;
