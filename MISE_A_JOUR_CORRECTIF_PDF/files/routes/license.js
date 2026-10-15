"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const licenseService_1 = require("../services/licenseService");
const router = (0, express_1.Router)();
/**
 * GET /api/license/status
 * Get the current license status and Machine ID
 */
router.get('/status', (req, res) => {
    try {
        const status = licenseService_1.licenseService.verifyLicense();
        res.json(status);
    }
    catch (error) {
        res.status(500).json({
            active: false,
            machineId: licenseService_1.licenseService.getMachineId(),
            message: error.message,
        });
    }
});
/**
 * GET /api/license/machine-id
 * Returns the unique Machine ID of this server
 */
router.get('/machine-id', (req, res) => {
    try {
        const machineId = licenseService_1.licenseService.getMachineId();
        res.json({ machineId });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
/**
 * POST /api/license/activate
 * Submit a license key to activate the application
 */
router.post('/activate', (req, res) => {
    try {
        const { licenseKey } = req.body;
        if (!licenseKey || typeof licenseKey !== 'string') {
            res.status(400).json({
                success: false,
                message: 'Veuillez renseigner une clé de licence valide.',
            });
            return;
        }
        const result = licenseService_1.licenseService.activate(licenseKey);
        if (result.success) {
            res.json({
                success: true,
                message: 'Application activée avec succès !',
                status: result.status,
            });
        }
        else {
            res.status(400).json({
                success: false,
                message: result.status.message || 'Clé de licence invalide pour cette machine.',
                status: result.status,
            });
        }
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: `Erreur lors de l'activation : ${error.message}`,
        });
    }
});
exports.default = router;
