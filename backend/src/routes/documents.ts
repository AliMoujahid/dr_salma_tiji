import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Patient from '../models/Patient';
import DocumentModel from '../models/Document';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

// Configure dynamic disk storage based on patient details
const storage = multer.diskStorage({
  destination: async function (req: any, file, cb) {
    try {
      const patientId = req.body.patientId || req.query.patientId;
      const category = req.body.category || req.query.category || 'Documents'; // Photos, XRays, Documents, Videos, Audio

      let patientName = 'Unknown_Patient';
      if (patientId) {
        const patient = await Patient.findById(patientId);
        if (patient) {
          // Normalize patient name to be safe for directory naming on Windows/Linux
          patientName = patient.name.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_').trim();
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
    const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({ storage: storage });

// Upload a single file
router.post('/upload', protect, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'Aucun fichier n\'a été téléversé.' });
      return;
    }

    const { patientId, category, fileType } = req.body;
    if (!patientId) {
      res.status(400).json({ message: 'L\'ID du patient est requis.' });
      return;
    }

    // Save relative path for frontend asset access, e.g. "Patients/Amine_El_Amrani/XRays/file.png"
    // Extract everything after the "uploads" directory
    const parts = req.file.path.split('uploads');
    const relativePath = parts.length > 1 ? parts[1].replace(/\\/g, '/') : req.file.path;

    const newDoc = await DocumentModel.create({
      patientId,
      fileName: req.file.originalname,
      fileType: fileType || 'Document', // Photo, XRay, Document, Video, Audio
      category: category || 'Others',
      filePath: relativePath,
      fileSize: req.file.size,
    });

    res.status(201).json(newDoc);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors du téléversement du fichier.', error: error.message });
  }
});

// Get all files for a patient
router.get('/patient/:patientId', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { patientId } = req.params;
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
    const { newName } = req.body;
    if (!newName) {
      res.status(400).json({ message: 'Le nouveau nom est requis.' });
      return;
    }

    const doc = await DocumentModel.findById(req.params.id);
    if (!doc) {
      res.status(404).json({ message: 'Fichier introuvable.' });
      return;
    }

    // Rename file physically on disk
    const absolutePath = path.join(__dirname, '..', '..', 'uploads', doc.filePath);
    const dir = path.dirname(absolutePath);
    const ext = path.extname(absolutePath);
    
    // Add extension if not present in the new name
    const formattedNewName = newName.endsWith(ext) ? newName : newName + ext;
    const newAbsolutePath = path.join(dir, formattedNewName);

    if (fs.existsSync(absolutePath)) {
      fs.renameSync(absolutePath, newAbsolutePath);
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
    const doc = await DocumentModel.findById(req.params.id);
    if (!doc) {
      res.status(404).json({ message: 'Fichier introuvable.' });
      return;
    }

    // Delete physical file on disk
    const absolutePath = path.join(__dirname, '..', '..', 'uploads', doc.filePath);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    await doc.deleteOne();
    res.json({ message: 'Fichier supprimé avec succès.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la suppression du fichier.', error: error.message });
  }
});

export default router;
