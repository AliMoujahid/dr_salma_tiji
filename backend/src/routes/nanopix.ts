import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { protect, AuthRequest } from '../middleware/auth';
import { nanopixBridgeService } from '../services/nanopixBridgeService';
import DocumentModel from '../models/Document';
import Patient from '../models/Patient';

const router = Router();

/**
 * GET /api/nanopix/status
 * Retrieve real-time status of NanoPix software, hardware sensor and active session
 */
router.get('/status', protect, (req: AuthRequest, res: Response) => {
  try {
    const status = nanopixBridgeService.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ message: 'Erreur statut NanoPix', error: err.message });
  }
});

/**
 * POST /api/nanopix/start-session
 * Arm the acquisition session for an identified patient and optional tooth
 */
router.post('/start-session', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { patientId, tooth } = req.body;

    if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
      res.status(400).json({ message: 'Identifiant patient manquant ou invalide.' });
      return;
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      res.status(404).json({ message: 'Patient introuvable.' });
      return;
    }

    const toothNum = tooth ? parseInt(tooth, 10) : undefined;
    const status = nanopixBridgeService.startSession({
      patientId: patient._id.toString(),
      patientName: patient.name,
      tooth: !isNaN(toothNum as number) ? toothNum : undefined,
    });

    res.json({
      success: true,
      message: `Session d'acquisition prête pour ${patient.name}. Tirez la radiographie avec le capteur NanoPix.`,
      status,
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Erreur démarrage session NanoPix', error: err.message });
  }
});

/**
 * POST /api/nanopix/cancel-session
 * Cancel active acquisition waiting state
 */
router.post('/cancel-session', protect, (req: AuthRequest, res: Response) => {
  try {
    const status = nanopixBridgeService.cancelSession();
    res.json({ success: true, message: 'Session annulée.', status });
  } catch (err: any) {
    res.status(500).json({ message: 'Erreur annulation session', error: err.message });
  }
});

/**
 * POST /api/nanopix/launch-app
 * Launch official Eighteeth NanoPix desktop application
 */
router.post('/launch-app', protect, (req: AuthRequest, res: Response) => {
  try {
    const launched = nanopixBridgeService.launchApp();
    res.json({
      success: launched,
      message: launched ? 'Application Eighteeth NanoPix lancée.' : 'Impossible de lancer l\'application.',
      status: nanopixBridgeService.getStatus(),
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Erreur lancement NanoPix', error: err.message });
  }
});

/**
 * GET /api/nanopix/studies/:patientId
 * Get all radiograph studies linked to patient
 */
router.get('/studies/:patientId', protect, async (req: AuthRequest, res: Response) => {
  try {
    const patientId = req.params.patientId as string;
    if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
      res.status(400).json({ message: 'Identifiant patient invalide.' });
      return;
    }

    const xrays = await DocumentModel.find({
      patientId: new mongoose.Types.ObjectId(patientId),
      fileType: 'XRay',
    }).sort({ uploadedAt: -1 });

    res.json(xrays);
  } catch (err: any) {
    res.status(500).json({ message: 'Erreur récupération des radios', error: err.message });
  }
});

export default router;
