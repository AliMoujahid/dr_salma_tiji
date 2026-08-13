"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const Patient_1 = __importDefault(require("../models/Patient"));
const Document_1 = __importDefault(require("../models/Document"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Configure dynamic disk storage based on patient details
const storage = multer_1.default.diskStorage({
    destination: async function (req, file, cb) {
        try {
            const patientId = req.body.patientId || req.query.patientId;
            const category = req.body.category || req.query.category || 'Documents'; // Photos, XRays, Documents, Videos, Audio
            let patientName = 'Unknown_Patient';
            if (patientId) {
                const patient = await Patient_1.default.findById(patientId);
                if (patient) {
                    // Normalize patient name to be safe for directory naming on Windows/Linux
                    patientName = patient.name.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_').trim();
                }
            }
            // Root uploads folder: backend/uploads/Patients/[Patient_Name]/[Category]
            const dirPath = path_1.default.join(__dirname, '..', '..', 'uploads', 'Patients', patientName, category);
            // Create recursive directory if it doesn't exist
            fs_1.default.mkdirSync(dirPath, { recursive: true });
            cb(null, dirPath);
        }
        catch (err) {
            cb(err, '');
        }
    },
    filename: function (req, file, cb) {
        // Keep original extension, append timestamp
        const ext = path_1.default.extname(file.originalname);
        const basename = path_1.default.basename(file.originalname, ext).replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${basename}-${uniqueSuffix}${ext}`);
    },
});
const upload = (0, multer_1.default)({ storage: storage });
// Upload a single file
router.post('/upload', auth_1.protect, upload.single('file'), async (req, res) => {
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
        const newDoc = await Document_1.default.create({
            patientId,
            fileName: req.file.originalname,
            fileType: fileType || 'Document', // Photo, XRay, Document, Video, Audio
            category: category || 'Others',
            filePath: relativePath,
            fileSize: req.file.size,
        });
        res.status(201).json(newDoc);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors du téléversement du fichier.', error: error.message });
    }
});
// Get all files for a patient
router.get('/patient/:patientId', auth_1.protect, async (req, res) => {
    try {
        const { patientId } = req.params;
        const { category, fileType } = req.query;
        const query = { patientId };
        if (category) {
            query.category = category;
        }
        if (fileType) {
            query.fileType = fileType;
        }
        const docs = await Document_1.default.find(query).sort({ createdAt: -1 });
        res.json(docs);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des fichiers.', error: error.message });
    }
});
// Rename file
router.put('/:id/rename', auth_1.protect, async (req, res) => {
    try {
        const { newName } = req.body;
        if (!newName) {
            res.status(400).json({ message: 'Le nouveau nom est requis.' });
            return;
        }
        const doc = await Document_1.default.findById(req.params.id);
        if (!doc) {
            res.status(404).json({ message: 'Fichier introuvable.' });
            return;
        }
        // Rename file physically on disk
        const absolutePath = path_1.default.join(__dirname, '..', '..', 'uploads', doc.filePath);
        const dir = path_1.default.dirname(absolutePath);
        const ext = path_1.default.extname(absolutePath);
        // Add extension if not present in the new name
        const formattedNewName = newName.endsWith(ext) ? newName : newName + ext;
        const newAbsolutePath = path_1.default.join(dir, formattedNewName);
        if (fs_1.default.existsSync(absolutePath)) {
            fs_1.default.renameSync(absolutePath, newAbsolutePath);
        }
        // Update database reference
        doc.fileName = formattedNewName;
        // Reconstruct relative filePath
        const relativeDir = path_1.default.dirname(doc.filePath);
        doc.filePath = path_1.default.join(relativeDir, formattedNewName).replace(/\\/g, '/');
        await doc.save();
        res.json(doc);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors du renommage du fichier.', error: error.message });
    }
});
// Delete file
router.delete('/:id', auth_1.protect, async (req, res) => {
    try {
        const doc = await Document_1.default.findById(req.params.id);
        if (!doc) {
            res.status(404).json({ message: 'Fichier introuvable.' });
            return;
        }
        // Delete physical file on disk
        const absolutePath = path_1.default.join(__dirname, '..', '..', 'uploads', doc.filePath);
        if (fs_1.default.existsSync(absolutePath)) {
            fs_1.default.unlinkSync(absolutePath);
        }
        await doc.deleteOne();
        res.json({ message: 'Fichier supprimé avec succès.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la suppression du fichier.', error: error.message });
    }
});
exports.default = router;
