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
            const parts = files.logo[0].path.split('uploads');
            config.logoUrl = parts.length > 1 ? parts[1].replace(/\\/g, '/') : files.logo[0].path;
        }
        if (files?.stamp?.[0]) {
            const parts = files.stamp[0].path.split('uploads');
            config.stampUrl = parts.length > 1 ? parts[1].replace(/\\/g, '/') : files.stamp[0].path;
        }
        if (files?.signature?.[0]) {
            const parts = files.signature[0].path.split('uploads');
            config.signatureUrl = parts.length > 1 ? parts[1].replace(/\\/g, '/') : files.signature[0].path;
        }
        await config.save();
        res.json(config);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors du téléversement de l\'image.', error: error.message });
    }
});
exports.default = router;
