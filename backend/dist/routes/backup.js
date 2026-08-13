"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const User_1 = __importDefault(require("../models/User"));
const Patient_1 = __importDefault(require("../models/Patient"));
const Appointment_1 = __importDefault(require("../models/Appointment"));
const ToothHistory_1 = __importDefault(require("../models/ToothHistory"));
const Invoice_1 = __importDefault(require("../models/Invoice"));
const Payment_1 = __importDefault(require("../models/Payment"));
const ClinicConfig_1 = __importDefault(require("../models/ClinicConfig"));
const Document_1 = __importDefault(require("../models/Document"));
const auth_1 = require("../middleware/auth");
const backupScheduler_1 = require("../services/backupScheduler");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ dest: 'uploads/temp/' });
/**
 * GET /api/backup/status
 * Get status of automated daily backups
 */
router.get('/status', auth_1.protect, (req, res) => {
    try {
        const status = backupScheduler_1.backupScheduler.getStatus();
        const backupsList = backupScheduler_1.backupScheduler.getBackupsList();
        res.json({
            ...status,
            backupsList,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération du statut de sauvegarde.', error: error.message });
    }
});
/**
 * POST /api/backup/run-now
 * Trigger an immediate backup on demand
 */
router.post('/run-now', auth_1.protect, (0, auth_1.restrictTo)('ADMIN', 'DOCTOR'), async (req, res) => {
    try {
        const result = await backupScheduler_1.backupScheduler.runBackupWithRetry(3);
        if (result.success) {
            res.json({
                success: true,
                message: 'Sauvegarde effectuée avec succès !',
                path: result.path,
                status: backupScheduler_1.backupScheduler.getStatus(),
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: result.error || 'Échec de la sauvegarde.',
                status: backupScheduler_1.backupScheduler.getStatus(),
            });
        }
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de l\'exécution de la sauvegarde.', error: error.message });
    }
});
/**
 * GET /api/backup/export
 * Export Database Backup as a JSON File download
 */
router.get('/export', auth_1.protect, (0, auth_1.restrictTo)('ADMIN', 'DOCTOR'), async (req, res) => {
    try {
        const data = {
            users: await User_1.default.find(),
            patients: await Patient_1.default.find(),
            appointments: await Appointment_1.default.find(),
            teethHistories: await ToothHistory_1.default.find(),
            invoices: await Invoice_1.default.find(),
            payments: await Payment_1.default.find(),
            configs: await ClinicConfig_1.default.find(),
            documents: await Document_1.default.find(),
            exportedAt: new Date().toISOString(),
        };
        res.setHeader('Content-disposition', `attachment; filename=dental_clinic_backup_${Date.now()}.json`);
        res.setHeader('Content-type', 'application/json');
        res.send(JSON.stringify(data, null, 2));
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de l\'export de la base de données.', error: error.message });
    }
});
/**
 * POST /api/backup/import
 * Import and Restore Database from a JSON File
 */
router.post('/import', auth_1.protect, (0, auth_1.restrictTo)('ADMIN'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Aucun fichier fourni.' });
        }
        const filePath = req.file.path;
        const fileData = fs_1.default.readFileSync(filePath, 'utf-8');
        const parsedData = JSON.parse(fileData);
        // Clean up uploaded temp file
        fs_1.default.unlinkSync(filePath);
        // Validate structure before proceeding
        if (!parsedData.users ||
            !parsedData.patients ||
            !parsedData.appointments ||
            !parsedData.teethHistories ||
            !parsedData.invoices ||
            !parsedData.payments) {
            return res.status(400).json({ message: 'Structure de fichier de sauvegarde non valide.' });
        }
        // Clear existing records
        await User_1.default.deleteMany({});
        await Patient_1.default.deleteMany({});
        await Appointment_1.default.deleteMany({});
        await ToothHistory_1.default.deleteMany({});
        await Invoice_1.default.deleteMany({});
        await Payment_1.default.deleteMany({});
        await ClinicConfig_1.default.deleteMany({});
        await Document_1.default.deleteMany({});
        // Restore data
        if (parsedData.users.length)
            await User_1.default.insertMany(parsedData.users);
        if (parsedData.patients.length)
            await Patient_1.default.insertMany(parsedData.patients);
        if (parsedData.appointments.length)
            await Appointment_1.default.insertMany(parsedData.appointments);
        if (parsedData.teethHistories.length)
            await ToothHistory_1.default.insertMany(parsedData.teethHistories);
        if (parsedData.invoices.length)
            await Invoice_1.default.insertMany(parsedData.invoices);
        if (parsedData.payments.length)
            await Payment_1.default.insertMany(parsedData.payments);
        if (parsedData.configs?.length)
            await ClinicConfig_1.default.insertMany(parsedData.configs);
        if (parsedData.documents?.length)
            await Document_1.default.insertMany(parsedData.documents);
        res.json({ message: 'Base de données restaurée avec succès.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la restauration de la base de données.', error: error.message });
    }
});
exports.default = router;
