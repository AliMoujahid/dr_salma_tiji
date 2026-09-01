import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import Patient from '../models/Patient';
import DocumentModel from '../models/Document';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

const isValidObjectId = (id: any): boolean => {
  return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);
};

// Configure dynamic disk storage based on patient details
const storage = multer.diskStorage({
  destination: async function (req: any, file, cb) {
    try {
      const patientId = req.body.patientId || req.query.patientId;
      const category = req.body.category || req.query.category || 'Documents'; // Photos, XRays, Documents, Videos, Audio

      let patientName = 'Unknown_Patient';
      if (isValidObjectId(patientId)) {
        const patient = await Patient.findById(patientId);
        if (patient) {
          // Normalize patient name to be safe for directory naming on Windows/Linux
          patientName = patient.name.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_').trim() || 'Patient';
        }
      }

      // Root uploads folder: backend/uploads/Patients/[Patient_Name]/[Category]
      const dirPath = path.join(__dirname, '..', '..', 'uploads', 'Patients', patientName, category);

      // Create recursive directory if it doesn't exist
      fs.mkdirSync(dirPath, { recursive: true });

      cb(null, dirPath);
    } catch (err: any) {
      cb(err, '');
    }
  },
  filename: function (req, file, cb) {
    // Keep original extension, append timestamp
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_') || 'file';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({ storage: storage });

// Helper to reliably compute relative upload path with leading slash
const getRelativeUploadPath = (fullPath: string): string => {
  const normalized = fullPath.replace(/\\/g, '/');
  const match = normalized.match(/\/uploads\/(.+)$/i);
  if (match && match[1]) {
    return '/' + match[1].replace(/^\/+/, '');
  }
  return '/' + path.basename(fullPath);
};

// Upload a single file
router.post('/upload', protect, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Aucun fichier n\'a été téléversé.' });
      return;
    }

    let { patientId, category, fileType } = req.body;
    if (!isValidObjectId(patientId)) {
      // Clean up uploaded file if patientId is invalid
      try {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      } catch {}
      res.status(400).json({ message: 'L\'identifiant du patient est invalide ou manquant.' });
      return;
    }

    const relativePath = getRelativeUploadPath(req.file.path);
    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');

    // Auto-detect exact category and fileType from extension
    if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) {
      fileType = 'Video';
      category = 'Videos';
    } else if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) {
      fileType = 'Audio';
      category = 'Audio';
    } else if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext)) {
      fileType = category === 'XRays' ? 'XRay' : 'Photo';
      category = category === 'XRays' ? 'XRays' : 'Photos';
    } else {
      fileType = 'Document';
      category = 'Documents';
    }

    const newDoc = await DocumentModel.create({
      patientId,
      fileName: req.file.originalname,
      fileType,
      category,
      filePath: relativePath,
      fileSize: req.file.size,
    });

    res.status(201).json(newDoc);
  } catch (error: any) {
    console.error('Error in document upload route:', error);
    res.status(500).json({ message: 'Erreur lors du téléversement du fichier.', error: error.message });
  }
});

// Get all files for a patient
router.get('/patient/:patientId', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { patientId } = req.params;

    if (!isValidObjectId(patientId)) {
      res.status(400).json({ message: 'Identifiant patient invalide.' });
      return;
    }

    const { category, fileType } = req.query;
    const query: any = { patientId };

    if (category) {
      query.category = category;
    }
    if (fileType) {
      query.fileType = fileType;
    }

    const docs = await DocumentModel.find(query).sort({ createdAt: -1 });
    res.json(docs);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la récupération des fichiers.', error: error.message });
  }
});

// Rename file
router.put('/:id/rename', protect, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: 'Identifiant de fichier invalide.' });
      return;
    }

    const { newName } = req.body;
    if (!newName || typeof newName !== 'string' || !newName.trim()) {
      res.status(400).json({ message: 'Le nouveau nom est requis.' });
      return;
    }

    const doc = await DocumentModel.findById(req.params.id);
    if (!doc) {
      res.status(404).json({ message: 'Fichier introuvable.' });
      return;
    }

    // Rename file physically on disk safely
    const absolutePath = path.join(__dirname, '..', '..', 'uploads', doc.filePath);
    const dir = path.dirname(absolutePath);
    const ext = path.extname(absolutePath);
    
    // Add extension if not present in the new name
    const trimmedName = newName.trim();
    const formattedNewName = trimmedName.endsWith(ext) ? trimmedName : trimmedName + ext;
    const newAbsolutePath = path.join(dir, formattedNewName);

    try {
      if (fs.existsSync(absolutePath)) {
        fs.renameSync(absolutePath, newAbsolutePath);
      }
    } catch (fsErr: any) {
      console.warn('Physical file rename warning:', fsErr.message);
    }

    // Update database reference
    doc.fileName = formattedNewName;
    
    // Reconstruct relative filePath
    const relativeDir = path.dirname(doc.filePath);
    doc.filePath = path.join(relativeDir, formattedNewName).replace(/\\/g, '/');

    await doc.save();
    res.json(doc);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors du renommage du fichier.', error: error.message });
  }
});

// Delete file
router.delete('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: 'Identifiant de fichier invalide.' });
      return;
    }

    const doc = await DocumentModel.findById(req.params.id);
    if (!doc) {
      res.status(404).json({ message: 'Fichier introuvable.' });
      return;
    }

    // Delete physical file on disk safely
    try {
      const absolutePath = path.join(__dirname, '..', '..', 'uploads', doc.filePath);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch (fsErr: any) {
      console.warn('Physical file delete warning:', fsErr.message);
    }

    await doc.deleteOne();
    res.json({ message: 'Fichier supprimé avec succès.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la suppression du fichier.', error: error.message });
  }
});

export default router;
