import { Router, Request, Response } from 'express';
import { licenseService } from '../services/licenseService';

const router = Router();

/**
 * GET /api/license/status
 * Get the current license status and Machine ID
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    const status = licenseService.verifyLicense();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({
      active: false,
      machineId: licenseService.getMachineId(),
      message: error.message,
    });
  }
});

/**
 * GET /api/license/machine-id
 * Returns the unique Machine ID of this server
 */
router.get('/machine-id', (req: Request, res: Response) => {
  try {
    const machineId = licenseService.getMachineId();
    res.json({ machineId });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/license/activate
 * Submit a license key to activate the application
 */
router.post('/activate', (req: Request, res: Response) => {
  try {
    const { licenseKey } = req.body;

    if (!licenseKey || typeof licenseKey !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Veuillez renseigner une clé de licence valide.',
      });
      return;
    }

    const result = licenseService.activate(licenseKey);

    if (result.success) {
      res.json({
        success: true,
        message: 'Application activée avec succès !',
        status: result.status,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.status.message || 'Clé de licence invalide pour cette machine.',
        status: result.status,
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Erreur lors de l'activation : ${error.message}`,
    });
  }
});

export default router;
