"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const ClinicConfig_1 = __importDefault(require("../models/ClinicConfig"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Multer storage for clinic assets (logo, signature, stamp)
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        const dirPath = path_1.default.join(__dirname, '..', '..', 'uploads', 'Clinic');
        fs_1.default.mkdirSync(dirPath, { recursive: true });
        cb(null, dirPath);
    },
    filename: function (req, file, cb) {
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${file.fieldname}-${Date.now()}${ext}`);
    },
});
const upload = (0, multer_1.default)({ storage });
// Get Clinic configuration
router.get('/config', async (req, res) => {
    try {
        let config = await ClinicConfig_1.default.findOne();
        if (!config) {
            // Create default config if not exists
            config = await ClinicConfig_1.default.create({});
        }
        res.json(config);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération de la configuration.', error: error.message });
    }
});
// Update Clinic configuration
router.put('/config', auth_1.protect, (0, auth_1.restrictTo)('ADMIN', 'DOCTOR'), async (req, res) => {
    try {
        let config = await ClinicConfig_1.default.findOne();
        if (!config) {
            config = new ClinicConfig_1.default(req.body);
        }
        else {
            Object.assign(config, req.body);
        }
        await config.save();
        res.json(config);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour de la configuration.', error: error.message });
    }
});
// Helper to reliably compute relative upload path
const getRelativeUploadPath = (fullPath) => {
    const normalized = fullPath.replace(/\\/g, '/');
    const match = normalized.match(/\/uploads\/(.+)$/i);
    if (match && match[1]) {
        return match[1];
    }
    return path_1.default.basename(fullPath);
};
// Upload logo, stamp, or signature
router.post('/config/upload-asset', auth_1.protect, (0, auth_1.restrictTo)('ADMIN', 'DOCTOR'), upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'stamp', maxCount: 1 },
    { name: 'signature', maxCount: 1 },
]), async (req, res) => {
    try {
        let config = await ClinicConfig_1.default.findOne();
        if (!config) {
            config = await ClinicConfig_1.default.create({});
        }
        const files = req.files;
        if (files?.logo?.[0]) {
            config.logoUrl = getRelativeUploadPath(files.logo[0].path);
        }
        if (files?.stamp?.[0]) {
            config.stampUrl = getRelativeUploadPath(files.stamp[0].path);
        }
        if (files?.signature?.[0]) {
            config.signatureUrl = getRelativeUploadPath(files.signature[0].path);
        }
        await config.save();
        res.json(config);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors du téléversement de l\'image.', error: error.message });
    }
});
const Patient_1 = __importDefault(require("../models/Patient"));
const Appointment_1 = __importDefault(require("../models/Appointment"));
const Invoice_1 = __importDefault(require("../models/Invoice"));
const Payment_1 = __importDefault(require("../models/Payment"));
const Document_1 = __importDefault(require("../models/Document"));
const ToothHistory_1 = __importDefault(require("../models/ToothHistory"));
const FollowUpReminder_1 = __importDefault(require("../models/FollowUpReminder"));
const NotificationLog_1 = __importDefault(require("../models/NotificationLog"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const User_1 = __importDefault(require("../models/User"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// Reset Database / Onboarding Wizard for a New Clinic (Admin only)
router.post('/reset-for-new-cabinet', auth_1.protect, (0, auth_1.restrictTo)('ADMIN'), async (req, res) => {
    try {
        const { wipeData = true, newClinicData, newDoctorAccount } = req.body;
        // 1. Wipe clinical & patient test records if requested
        if (wipeData) {
            await Promise.all([
                Patient_1.default.deleteMany({}),
                Appointment_1.default.deleteMany({}),
                Invoice_1.default.deleteMany({}),
                Payment_1.default.deleteMany({}),
                Document_1.default.deleteMany({}),
                ToothHistory_1.default.deleteMany({}),
                FollowUpReminder_1.default.deleteMany({}),
                NotificationLog_1.default.deleteMany({}),
                AuditLog_1.default.deleteMany({}),
            ]);
        }
        // 2. Update Clinic Config if provided
        let config = await ClinicConfig_1.default.findOne();
        if (!config) {
            config = new ClinicConfig_1.default({});
        }
        if (newClinicData) {
            if (newClinicData.cabinetFr)
                config.cabinetFr = newClinicData.cabinetFr;
            if (newClinicData.cabinetAr)
                config.cabinetAr = newClinicData.cabinetAr;
            if (newClinicData.drFr)
                config.drFr = newClinicData.drFr;
            if (newClinicData.drAr)
                config.drAr = newClinicData.drAr;
            if (newClinicData.specsFr)
                config.specsFr = newClinicData.specsFr;
            if (newClinicData.specsAr)
                config.specsAr = newClinicData.specsAr;
            if (newClinicData.address)
                config.address = newClinicData.address;
            if (newClinicData.phones)
                config.phones = newClinicData.phones;
            if (newClinicData.email)
                config.email = newClinicData.email;
            if (newClinicData.ice !== undefined)
                config.ice = newClinicData.ice;
            if (newClinicData.inbe !== undefined)
                config.inbe = newClinicData.inbe;
            if (newClinicData.ifVal !== undefined)
                config.ifVal = newClinicData.ifVal;
            await config.save();
        }
        // 3. Create or update doctor account if provided
        if (newDoctorAccount?.email && newDoctorAccount?.password) {
            const salt = await bcryptjs_1.default.genSalt(10);
            const passwordHash = await bcryptjs_1.default.hash(newDoctorAccount.password, salt);
            const existingDoctor = await User_1.default.findOne({ email: newDoctorAccount.email.toLowerCase().trim() });
            if (existingDoctor) {
                existingDoctor.name = newDoctorAccount.name || config.drFr;
                existingDoctor.passwordHash = passwordHash;
                existingDoctor.role = 'DOCTOR';
                existingDoctor.active = true;
                await existingDoctor.save();
            }
            else {
                await User_1.default.create({
                    name: newDoctorAccount.name || config.drFr,
                    email: newDoctorAccount.email.toLowerCase().trim(),
                    passwordHash,
                    role: 'DOCTOR',
                    active: true,
                });
            }
        }
        res.json({
            message: 'Cabinet initialisé avec succès ! L\'application est prête pour le nouveau cabinet.',
            config,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de l\'initialisation du cabinet.', error: error.message });
    }
});
exports.default = router;
