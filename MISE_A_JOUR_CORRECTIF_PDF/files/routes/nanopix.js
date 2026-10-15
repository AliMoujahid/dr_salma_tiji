"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const auth_1 = require("../middleware/auth");
const nanopixBridgeService_1 = require("../services/nanopixBridgeService");
const Document_1 = __importDefault(require("../models/Document"));
const Patient_1 = __importDefault(require("../models/Patient"));
const router = (0, express_1.Router)();
/**
 * GET /api/nanopix/status
 * Retrieve real-time status of NanoPix software, hardware sensor and active session
 */
router.get('/status', auth_1.protect, (req, res) => {
    try {
        const status = nanopixBridgeService_1.nanopixBridgeService.getStatus();
        res.json(status);
    }
    catch (err) {
        res.status(500).json({ message: 'Erreur statut NanoPix', error: err.message });
    }
});
/**
 * POST /api/nanopix/start-session
 * Arm the acquisition session for an identified patient and optional tooth
 */
router.post('/start-session', auth_1.protect, async (req, res) => {
    try {
        const { patientId, tooth } = req.body;
        if (!patientId || !mongoose_1.default.Types.ObjectId.isValid(patientId)) {
            res.status(400).json({ message: 'Identifiant patient manquant ou invalide.' });
            return;
        }
        const patient = await Patient_1.default.findById(patientId);
        if (!patient) {
            res.status(404).json({ message: 'Patient introuvable.' });
            return;
        }
        const toothNum = tooth ? parseInt(tooth, 10) : undefined;
        const status = nanopixBridgeService_1.nanopixBridgeService.startSession({
            patientId: patient._id.toString(),
            patientName: patient.name,
            tooth: !isNaN(toothNum) ? toothNum : undefined,
        });
        res.json({
            success: true,
            message: `Session d'acquisition prête pour ${patient.name}. Tirez la radiographie avec le capteur NanoPix.`,
            status,
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Erreur démarrage session NanoPix', error: err.message });
    }
});
/**
 * POST /api/nanopix/cancel-session
 * Cancel active acquisition waiting state
 */
router.post('/cancel-session', auth_1.protect, (req, res) => {
    try {
        const status = nanopixBridgeService_1.nanopixBridgeService.cancelSession();
        res.json({ success: true, message: 'Session annulée.', status });
    }
    catch (err) {
        res.status(500).json({ message: 'Erreur annulation session', error: err.message });
    }
});
/**
 * POST /api/nanopix/launch-app
 * Launch official Eighteeth NanoPix desktop application
 */
router.post('/launch-app', auth_1.protect, (req, res) => {
    try {
        const launched = nanopixBridgeService_1.nanopixBridgeService.launchApp();
        res.json({
            success: launched,
            message: launched ? 'Application Eighteeth NanoPix lancée.' : 'Impossible de lancer l\'application.',
            status: nanopixBridgeService_1.nanopixBridgeService.getStatus(),
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Erreur lancement NanoPix', error: err.message });
    }
});
/**
 * GET /api/nanopix/studies/:patientId
 * Get all radiograph studies linked to patient
 */
router.get('/studies/:patientId', auth_1.protect, async (req, res) => {
    try {
        const patientId = req.params.patientId;
        if (!patientId || !mongoose_1.default.Types.ObjectId.isValid(patientId)) {
            res.status(400).json({ message: 'Identifiant patient invalide.' });
            return;
        }
        const xrays = await Document_1.default.find({
            patientId: new mongoose_1.default.Types.ObjectId(patientId),
            fileType: 'XRay',
        }).sort({ uploadedAt: -1 });
        res.json(xrays);
    }
    catch (err) {
        res.status(500).json({ message: 'Erreur récupération des radios', error: err.message });
    }
});
exports.default = router;
