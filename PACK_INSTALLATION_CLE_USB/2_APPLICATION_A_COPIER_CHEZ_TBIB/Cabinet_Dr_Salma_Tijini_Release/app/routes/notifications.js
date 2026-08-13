"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const NotificationLog_1 = __importDefault(require("../models/NotificationLog"));
const MessageTemplate_1 = __importDefault(require("../models/MessageTemplate"));
const NotificationSettings_1 = __importDefault(require("../models/NotificationSettings"));
const Patient_1 = __importDefault(require("../models/Patient"));
const Appointment_1 = __importDefault(require("../models/Appointment"));
const notificationProvider_1 = require("../services/notificationProvider");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
/**
 * GET /api/notifications/logs
 * Fetch notification logs with optional filters & search
 */
router.get('/logs', auth_1.protect, async (req, res) => {
    try {
        const { channel, status, search, limit = 100 } = req.query;
        const filter = {};
        if (channel)
            filter.channel = channel;
        if (status)
            filter.status = status;
        let logs = await NotificationLog_1.default.find(filter)
            .populate('patientId', 'name phone email')
            .populate('appointmentId', 'dateTime status')
            .sort({ createdAt: -1 })
            .limit(Number(limit));
        if (search) {
            const q = String(search).toLowerCase();
            logs = logs.filter((l) => l.recipient.toLowerCase().includes(q) ||
                l.body.toLowerCase().includes(q) ||
                l.patientId?.name?.toLowerCase().includes(q));
        }
        res.json(logs);
    }
    catch (err) {
        res.status(500).json({ message: 'Error fetching notification logs', error: err.message });
    }
});
/**
 * GET /api/notifications/settings
 * Fetch clinic notification configuration settings
 */
router.get('/settings', auth_1.protect, async (req, res) => {
    try {
        const settings = await notificationProvider_1.notificationProvider.getSettings();
        res.json(settings);
    }
    catch (err) {
        res.status(500).json({ message: 'Error fetching settings', error: err.message });
    }
});
/**
 * PUT /api/notifications/settings
 * Update notification API credentials & settings
 */
router.put('/settings', auth_1.protect, async (req, res) => {
    try {
        let settings = await NotificationSettings_1.default.findOne();
        if (!settings) {
            settings = new NotificationSettings_1.default(req.body);
        }
        else {
            Object.assign(settings, req.body);
        }
        await settings.save();
        res.json(settings);
    }
    catch (err) {
        res.status(500).json({ message: 'Error saving settings', error: err.message });
    }
});
/**
 * GET /api/notifications/templates
 * Fetch message templates list
 */
router.get('/templates', auth_1.protect, async (req, res) => {
    try {
        let templates = await MessageTemplate_1.default.find().sort({ name: 1 });
        if (templates.length === 0) {
            // Seed default templates if empty
            templates = await MessageTemplate_1.default.insertMany([
                {
                    name: 'Rappel WhatsApp 24H Standard',
                    channel: 'WhatsApp',
                    messageType: '24Hours',
                    language: 'fr',
                    body: 'Bonjour {{patient_name}},\n\nCeci est un rappel de votre rendez-vous au Cabinet Dentaire Dr. Salma Tijini.\n\n📅 Date: {{appointment_date}}\n🕒 Heure: {{appointment_time}}\n📍 Adresse: {{clinic_address}}\n\nMerci de confirmer votre présence.',
                    buttons: [{ type: 'Confirm', label: '✅ Confirmer' }, { type: 'Cancel', label: '❌ Annuler' }],
                    isDefault: true,
                },
                {
                    name: 'Rappel SMS Court',
                    channel: 'SMS',
                    messageType: '24Hours',
                    language: 'fr',
                    body: 'Cabinet Dr Salma Tijini: RDV le {{appointment_date}} a {{appointment_time}}. Tel: {{clinic_phone}}',
                    isDefault: true,
                },
            ]);
        }
        res.json(templates);
    }
    catch (err) {
        res.status(500).json({ message: 'Error fetching templates', error: err.message });
    }
});
/**
 * POST /api/notifications/templates
 * Create new message template
 */
router.post('/templates', auth_1.protect, async (req, res) => {
    try {
        const template = await MessageTemplate_1.default.create(req.body);
        res.status(201).json(template);
    }
    catch (err) {
        res.status(400).json({ message: 'Error creating template', error: err.message });
    }
});
/**
 * PUT /api/notifications/templates/:id
 */
router.put('/templates/:id', auth_1.protect, async (req, res) => {
    try {
        const template = await MessageTemplate_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(template);
    }
    catch (err) {
        res.status(400).json({ message: 'Error updating template', error: err.message });
    }
});
/**
 * DELETE /api/notifications/templates/:id
 */
router.delete('/templates/:id', auth_1.protect, async (req, res) => {
    try {
        await MessageTemplate_1.default.findByIdAndDelete(req.params.id);
        res.json({ message: 'Template deleted' });
    }
    catch (err) {
        res.status(500).json({ message: 'Error deleting template', error: err.message });
    }
});
/**
 * POST /api/notifications/send-manual
 * Send single manual notification
 */
router.post('/send-manual', auth_1.protect, async (req, res) => {
    try {
        const { patientId, appointmentId, channel, recipient, subject, body } = req.body;
        const result = await notificationProvider_1.notificationProvider.dispatch({
            channel,
            recipient,
            subject,
            body,
        });
        const log = await NotificationLog_1.default.create({
            patientId,
            appointmentId,
            channel,
            provider: result.provider,
            recipient,
            messageType: 'Manual',
            subject,
            body,
            status: result.success ? 'Sent' : 'Failed',
            errorDetails: result.errorDetails,
            sentAt: result.success ? new Date() : undefined,
        });
        res.json({ result, log });
    }
    catch (err) {
        res.status(500).json({ message: 'Error sending manual notification', error: err.message });
    }
});
/**
 * POST /api/notifications/send-bulk
 * Bulk broadcast message to multiple patients
 */
router.post('/send-bulk', auth_1.protect, async (req, res) => {
    try {
        const { patientIds, channel, subject, body } = req.body;
        if (!Array.isArray(patientIds) || patientIds.length === 0) {
            return res.status(400).json({ message: 'No patients selected' });
        }
        const patients = await Patient_1.default.find({ _id: { $in: patientIds } });
        const logs = [];
        for (const patient of patients) {
            const recipient = channel === 'Email' ? patient.email : patient.phone;
            if (!recipient)
                continue;
            // Variable interpolation
            const interpolatedBody = body.replace(/\{\{patient_name\}\}/g, patient.name);
            const result = await notificationProvider_1.notificationProvider.dispatch({
                channel,
                recipient,
                subject,
                body: interpolatedBody,
            });
            const log = await NotificationLog_1.default.create({
                patientId: patient._id,
                channel,
                provider: result.provider,
                recipient,
                messageType: 'Bulk',
                subject,
                body: interpolatedBody,
                status: result.success ? 'Sent' : 'Failed',
                errorDetails: result.errorDetails,
                sentAt: result.success ? new Date() : undefined,
            });
            logs.push(log);
        }
        res.json({ message: `Bulk broadcast sent to ${logs.length} patients`, count: logs.length });
    }
    catch (err) {
        res.status(500).json({ message: 'Error sending bulk broadcast', error: err.message });
    }
});
/**
 * POST /api/notifications/retry/:id
 * Retry a failed message
 */
router.post('/retry/:id', auth_1.protect, async (req, res) => {
    try {
        const log = await NotificationLog_1.default.findById(req.params.id);
        if (!log)
            return res.status(404).json({ message: 'Log not found' });
        const result = await notificationProvider_1.notificationProvider.dispatch({
            channel: log.channel,
            recipient: log.recipient,
            subject: log.subject,
            body: log.body,
        });
        log.retryCount += 1;
        log.status = result.success ? 'Sent' : 'Failed';
        log.errorDetails = result.errorDetails;
        if (result.success)
            log.sentAt = new Date();
        await log.save();
        res.json(log);
    }
    catch (err) {
        res.status(500).json({ message: 'Error retrying notification', error: err.message });
    }
});
/**
 * GET /api/notifications/confirm-appointment/:appointmentId/:action
 * Public interactive response endpoint (Confirm / Cancel)
 */
router.get('/confirm-appointment/:appointmentId/:action', async (req, res) => {
    try {
        const { appointmentId, action } = req.params;
        const appt = await Appointment_1.default.findById(appointmentId).populate('patientId');
        if (!appt)
            return res.send('<h2>Lien invalide ou rendez-vous inexistant.</h2>');
        if (action === 'confirm') {
            appt.status = 'Confirmed';
            await appt.save();
            return res.send(`
        <div style="font-family: Arial; text-align: center; padding: 40px; color: #1e293b;">
          <h1 style="color: #10b981;">✅ Rendez-vous Confirmé !</h1>
          <p>Merci ! Votre rendez-vous au Cabinet Dentaire Dr. Salma Tijini est bien confirmé.</p>
        </div>
      `);
        }
        else if (action === 'cancel') {
            appt.status = 'Cancelled';
            await appt.save();
            return res.send(`
        <div style="font-family: Arial; text-align: center; padding: 40px; color: #1e293b;">
          <h1 style="color: #ef4444;">❌ Rendez-vous Annulé</h1>
          <p>Votre annulation a bien été prise en compte. Merci de nous avoir prévenus.</p>
        </div>
      `);
        }
        res.send('Action inconnue.');
    }
    catch (err) {
        res.status(500).send('Erreur lors de la mise à jour.');
    }
});
/**
 * POST /api/notifications/webhook/whatsapp
 * Meta WhatsApp Cloud API Webhook receiver
 */
router.post('/webhook/whatsapp', (req, res) => {
    res.sendStatus(200);
});
router.get('/webhook/whatsapp', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === 'drtijini_verify_token') {
        return res.status(200).send(challenge);
    }
    res.sendStatus(403);
});
exports.default = router;
