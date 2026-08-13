import express, { Request, Response } from 'express';
import NotificationLog from '../models/NotificationLog';
import MessageTemplate from '../models/MessageTemplate';
import NotificationSettings from '../models/NotificationSettings';
import FollowUpReminder from '../models/FollowUpReminder';
import Patient from '../models/Patient';
import Appointment from '../models/Appointment';
import { notificationProvider } from '../services/notificationProvider';
import { protect } from '../middleware/auth';

const router = express.Router();

/**
 * GET /api/notifications/logs
 * Fetch notification logs with optional filters & search
 */
router.get('/logs', protect, async (req: Request, res: Response) => {
  try {
    const { channel, status, search, limit = 100 } = req.query;
    const filter: any = {};

    if (channel) filter.channel = channel;
    if (status) filter.status = status;

    let logs = await NotificationLog.find(filter)
      .populate('patientId', 'name phone email')
      .populate('appointmentId', 'dateTime status')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    if (search) {
      const q = String(search).toLowerCase();
      logs = logs.filter(
        (l: any) =>
          l.recipient.toLowerCase().includes(q) ||
          l.body.toLowerCase().includes(q) ||
          l.patientId?.name?.toLowerCase().includes(q)
      );
    }

    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching notification logs', error: err.message });
  }
});

/**
 * GET /api/notifications/settings
 * Fetch clinic notification configuration settings
 */
router.get('/settings', protect, async (req: Request, res: Response) => {
  try {
    const settings = await notificationProvider.getSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching settings', error: err.message });
  }
});

/**
 * PUT /api/notifications/settings
 * Update notification API credentials & settings
 */
router.put('/settings', protect, async (req: Request, res: Response) => {
  try {
    let settings = await NotificationSettings.findOne();
    if (!settings) {
      settings = new NotificationSettings(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    await settings.save();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ message: 'Error saving settings', error: err.message });
  }
});

/**
 * GET /api/notifications/templates
 * Fetch message templates list
 */
router.get('/templates', protect, async (req: Request, res: Response) => {
  try {
    let templates = await MessageTemplate.find().sort({ name: 1 });
    if (templates.length === 0) {
      // Seed default templates if empty
      templates = await MessageTemplate.insertMany([
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
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching templates', error: err.message });
  }
});

/**
 * POST /api/notifications/templates
 * Create new message template
 */
router.post('/templates', protect, async (req: Request, res: Response) => {
  try {
    const template = await MessageTemplate.create(req.body);
    res.status(201).json(template);
  } catch (err: any) {
    res.status(400).json({ message: 'Error creating template', error: err.message });
  }
});

/**
 * PUT /api/notifications/templates/:id
 */
router.put('/templates/:id', protect, async (req: Request, res: Response) => {
  try {
    const template = await MessageTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(template);
  } catch (err: any) {
    res.status(400).json({ message: 'Error updating template', error: err.message });
  }
});

/**
 * DELETE /api/notifications/templates/:id
 */
router.delete('/templates/:id', protect, async (req: Request, res: Response) => {
  try {
    await MessageTemplate.findByIdAndDelete(req.params.id);
    res.json({ message: 'Template deleted' });
  } catch (err: any) {
    res.status(500).json({ message: 'Error deleting template', error: err.message });
  }
});

/**
 * POST /api/notifications/send-manual
 * Send single manual notification
 */
router.post('/send-manual', protect, async (req: Request, res: Response) => {
  try {
    const { patientId, appointmentId, channel, recipient, subject, body } = req.body;

    const result = await notificationProvider.dispatch({
      channel,
      recipient,
      subject,
      body,
    });

    const log = await NotificationLog.create({
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
  } catch (err: any) {
    res.status(500).json({ message: 'Error sending manual notification', error: err.message });
  }
});

/**
 * POST /api/notifications/send-bulk
 * Bulk broadcast message to multiple patients
 */
router.post('/send-bulk', protect, async (req: Request, res: Response) => {
  try {
    const { patientIds, channel, subject, body } = req.body;
    if (!Array.isArray(patientIds) || patientIds.length === 0) {
      return res.status(400).json({ message: 'No patients selected' });
    }

    const patients = await Patient.find({ _id: { $in: patientIds } });
    const logs = [];

    for (const patient of patients) {
      const recipient = channel === 'Email' ? patient.email : patient.phone;
      if (!recipient) continue;

      // Variable interpolation
      const interpolatedBody = body.replace(/\{\{patient_name\}\}/g, patient.name);

      const result = await notificationProvider.dispatch({
        channel,
        recipient,
        subject,
        body: interpolatedBody,
      });

      const log = await NotificationLog.create({
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
  } catch (err: any) {
    res.status(500).json({ message: 'Error sending bulk broadcast', error: err.message });
  }
});

/**
 * POST /api/notifications/retry/:id
 * Retry a failed message
 */
router.post('/retry/:id', protect, async (req: Request, res: Response) => {
  try {
    const log = await NotificationLog.findById(req.params.id);
    if (!log) return res.status(404).json({ message: 'Log not found' });

    const result = await notificationProvider.dispatch({
      channel: log.channel,
      recipient: log.recipient,
      subject: log.subject,
      body: log.body,
    });

    log.retryCount += 1;
    log.status = result.success ? 'Sent' : 'Failed';
    log.errorDetails = result.errorDetails;
    if (result.success) log.sentAt = new Date();

    await log.save();
    res.json(log);
  } catch (err: any) {
    res.status(500).json({ message: 'Error retrying notification', error: err.message });
  }
});

/**
 * GET /api/notifications/confirm-appointment/:appointmentId/:action
 * Public interactive response endpoint (Confirm / Cancel)
 */
router.get('/confirm-appointment/:appointmentId/:action', async (req: Request, res: Response) => {
  try {
    const { appointmentId, action } = req.params;
    const appt = await Appointment.findById(appointmentId).populate('patientId');
    if (!appt) return res.send('<h2>Lien invalide ou rendez-vous inexistant.</h2>');

    if (action === 'confirm') {
      appt.status = 'Confirmed';
      await appt.save();
      return res.send(`
        <div style="font-family: Arial; text-align: center; padding: 40px; color: #1e293b;">
          <h1 style="color: #10b981;">✅ Rendez-vous Confirmé !</h1>
          <p>Merci ! Votre rendez-vous au Cabinet Dentaire Dr. Salma Tijini est bien confirmé.</p>
        </div>
      `);
    } else if (action === 'cancel') {
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
  } catch (err: any) {
    res.status(500).send('Erreur lors de la mise à jour.');
  }
});

/**
 * POST /api/notifications/webhook/whatsapp
 * Meta WhatsApp Cloud API Webhook receiver
 */
router.post('/webhook/whatsapp', (req: Request, res: Response) => {
  res.sendStatus(200);
});

router.get('/webhook/whatsapp', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === 'drtijini_verify_token') {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

export default router;
