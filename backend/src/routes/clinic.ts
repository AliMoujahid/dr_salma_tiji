import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ClinicConfig from '../models/ClinicConfig';
import { protect, restrictTo, AuthRequest } from '../middleware/auth';

const router = Router();

// Multer storage for clinic assets (logo, signature, stamp)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dirPath = path.join(__dirname, '..', '..', 'uploads', 'Clinic');
    fs.mkdirSync(dirPath, { recursive: true });
    cb(null, dirPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

// Get Clinic configuration
router.get('/config', async (req: AuthRequest, res: Response) => {
  try {
    let config = await ClinicConfig.findOne();
    if (!config) {
      // Create default config if not exists
      config = await ClinicConfig.create({});
    }
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la récupération de la configuration.', error: error.message });
  }
});

// Update Clinic configuration
router.put('/config', protect, restrictTo('ADMIN', 'DOCTOR'), async (req: AuthRequest, res: Response) => {
  try {
    let config = await ClinicConfig.findOne();
    if (!config) {
      config = new ClinicConfig(req.body);
    } else {
      Object.assign(config, req.body);
    }
    await config.save();
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la configuration.', error: error.message });
  }
});

// Upload logo, stamp, or signature
router.post(
  '/config/upload-asset',
  protect,
  restrictTo('ADMIN', 'DOCTOR'),
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'stamp', maxCount: 1 },
    { name: 'signature', maxCount: 1 },
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      let config = await ClinicConfig.findOne();
      if (!config) {
        config = await ClinicConfig.create({});
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

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
    } catch (error: any) {
      res.status(500).json({ message: 'Erreur lors du téléversement de l\'image.', error: error.message });
    }
  }
);

export default router;
