import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import NotificationLog from '../models/NotificationLog';
import MessageTemplate from '../models/MessageTemplate';
import NotificationSettings from '../models/NotificationSettings';
import FollowUpReminder from '../models/FollowUpReminder';
import Patient from '../models/Patient';
import Appointment from '../models/Appointment';
import Invoice from '../models/Invoice';
import DocumentModel from '../models/Document';
import { notificationProvider } from '../services/notificationProvider';
import { whatsappService } from '../services/whatsappService';
import { protect } from '../middleware/auth';

const router = express.Router();

// Configure temp upload for attachments
const tempUploadDir = path.join(__dirname, '..', '..', 'uploads', 'temp');
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

const upload = multer({
  dest: tempUploadDir,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB max
});

/**
 * GET /api/notifications/whatsapp-status
 * Fetch current WhatsApp Web connection status & QR code
 */
router.get('/whatsapp-status', protect, (req: Request, res: Response) => {
  try {
    const status = whatsappService.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/notifications/whatsapp-init
 * Start WhatsApp Web headless client session
 */
router.post('/whatsapp-init', protect, async (req: Request, res: Response) => {
  try {
    await whatsappService.initClient(true);
    const status = whatsappService.getStatus();
    res.json({ message: 'Initialisation de WhatsApp Web lancée...', status });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/notifications/whatsapp-logout
 * Logout and clear WhatsApp Web session data
 */
router.post('/whatsapp-logout', protect, async (req: Request, res: Response) => {
  try {
    await whatsappService.logout();
    res.json({ message: 'WhatsApp Web déconnecté et session réinitialisée.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

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

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      logs = logs.filter(
        (l: any) =>
          l.recipient?.toLowerCase()?.includes(q) ||
          l.body?.toLowerCase()?.includes(q) ||
          l.subject?.toLowerCase()?.includes(q) ||
          l.patientId?.name?.toLowerCase()?.includes(q)
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
 * GET /api/notifications/patient-attachments/:patientId
 * Fetch patient's invoices and medical documents for WhatsApp attachment selection
 */
router.get('/patient-attachments/:patientId', protect, async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const [invoices, documents] = await Promise.all([
      Invoice.find({ patientId }).sort({ date: -1, createdAt: -1 }),
      DocumentModel.find({ patientId }).sort({ uploadedAt: -1 }),
    ]);

    res.json({ invoices, documents });
  } catch (err: any) {
    res.status(500).json({ message: 'Error fetching patient attachments', error: err.message });
  }
});

/**
 * POST /api/notifications/send-manual
 * Send manual notification with optional invoice, document, or custom file attachment
 */
router.post('/send-manual', protect, upload.single('attachment'), async (req: any, res: Response) => {
  try {
    let { patientId, appointmentId, invoiceId, documentId, channel = 'WhatsApp', recipient, subject, body } = req.body;

    let mediaPath: string | undefined;
    let mediaFilename: string | undefined;
    let mediaMimeType: string | undefined;

    let targetPatientName = '';

    // 1. If an invoiceId is specified, format complete invoice message breakdown
    if (invoiceId) {
      const inv = await Invoice.findById(invoiceId).populate('patientId');
      if (inv) {
        if (!recipient && (inv.patientId as any)?.phone) {
          recipient = (inv.patientId as any).phone;
        }
        if (!patientId) {
          patientId = (inv.patientId as any)?._id;
        }
        targetPatientName = (inv.patientId as any)?.name || '';

        // If custom body wasn't supplied or is default, generate structured professional invoice text
        if (!body || body.trim() === '') {
          const invDateStr = new Date(inv.date || inv.createdAt).toLocaleDateString('fr-FR');
          const itemsText = inv.items?.map((it) => `  • ${it.description}${it.tooth ? ` (Dent ${it.tooth})` : ''} : ${it.amount.toLocaleString('fr-FR')} MAD`).join('\n') || '';
          const due = Math.max(0, inv.netAmount - (inv.paidAmount || 0));

          body = `🧾 *FACTURE N° ${inv.invoiceNumber}*\n` +
            `*Cabinet Dentaire Dr. Salma Tijini*\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 Patient : *${targetPatientName || 'Client'}*\n` +
            `📅 Date : *${invDateStr}*\n\n` +
            `📋 *Détail des Soins :*\n${itemsText}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `💰 Total Brut : *${inv.totalAmount.toLocaleString('fr-FR')} MAD*\n` +
            (inv.discount > 0 ? `🏷️ Remise : *-${inv.discount.toLocaleString('fr-FR')} MAD*\n` : '') +
            `💳 *Net à Payer : ${inv.netAmount.toLocaleString('fr-FR')} MAD*\n` +
            `✅ Montant Réglé : *${(inv.paidAmount || 0).toLocaleString('fr-FR')} MAD*\n` +
            `⏳ *Reste Dû : ${due.toLocaleString('fr-FR')} MAD*\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `Mode de règlement : ${inv.paymentMode}\n\n` +
            `Merci pour votre confiance. 🦷✨\n` +
            `_Cabinet Dr. Salma Tijini - Av Hassan II, Skhirat_`;
        }
      }
    }

    // 2. If a documentId is specified (uploaded patient document/X-Ray)
    if (documentId) {
      const doc = await DocumentModel.findById(documentId).populate('patientId');
      if (doc) {
        if (!recipient && (doc.patientId as any)?.phone) {
          recipient = (doc.patientId as any).phone;
        }
        if (!patientId) {
          patientId = (doc.patientId as any)?._id;
        }
        if (!targetPatientName) {
          targetPatientName = (doc.patientId as any)?.name || '';
        }

        const fullPath = path.join(__dirname, '..', '..', 'uploads', doc.filePath.replace(/^\/+/, ''));
        if (fs.existsSync(fullPath)) {
          mediaPath = fullPath;
          mediaFilename = doc.fileName;
        }
      }
    }

    // 3. If a custom file was uploaded directly in the request
    if (req.file) {
      mediaPath = req.file.path;
      mediaFilename = req.file.originalname;
      mediaMimeType = req.file.mimetype;
    }

    // Look up patient name and phone if patientId exists
    if (patientId) {
      const patient = await Patient.findById(patientId);
      if (patient) {
        if (!recipient) {
          recipient = channel === 'Email' ? patient.email : patient.phone;
        }
        if (!targetPatientName) {
          targetPatientName = patient.name;
        }
      }
    }

    // Interpolate variable {{patient_name}} with actual patient name
    if (body) {
      body = body.replace(/\{\{patient_name\}\}/g, targetPatientName || 'Cher patient');
    }

    if (!recipient) {
      return res.status(400).json({ message: 'Numéro de téléphone / destinataire introuvable.' });
    }

    const result = await notificationProvider.dispatch({
      channel,
      recipient,
      subject: subject || (invoiceId ? 'Facture' : documentId || req.file ? 'Document' : undefined),
      body: body || 'Veuillez trouver votre document ci-joint.',
      mediaPath,
      mediaFilename,
      mediaMimeType,
    });

    let log = null;
    try {
      log = await NotificationLog.create({
        patientId: patientId || undefined,
        appointmentId: appointmentId || undefined,
        channel,
        provider: result.provider,
        recipient,
        messageType: invoiceId ? 'Invoice' : documentId || req.file ? 'Document' : 'Manual',
        subject: subject || (invoiceId ? 'Facture Cabinet' : documentId || req.file ? 'Document Médical' : undefined),
        body,
        status: result.success ? 'Sent' : 'Failed',
        errorDetails: result.errorDetails,
        sentAt: result.success ? new Date() : undefined,
      });
    } catch (logErr) {
      console.warn('[NotificationLog] Warning creating log:', logErr);
    }

    // Clean up temporary upload file if one was created
    if (req.file && fs.existsSync(req.file.path)) {
      setTimeout(() => {
        try {
          fs.unlinkSync(req.file.path);
        } catch {}
      }, 5000);
    }

    res.json({ result, log, message: result.success ? 'Message et document envoyés avec succès !' : 'Échec de l\'envoi' });
  } catch (err: any) {
    console.error('Error in send-manual notification:', err);
    res.status(500).json({ message: 'Erreur lors de l\'envoi de la notification', error: err.message });
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

export default router;
