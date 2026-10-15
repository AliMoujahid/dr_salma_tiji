"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDocumentPath = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const mongoose_1 = __importDefault(require("mongoose"));
const Patient_1 = __importDefault(require("../models/Patient"));
const Document_1 = __importDefault(require("../models/Document"));
const auth_1 = require("../middleware/auth");
const security_1 = require("../middleware/security");
const router = (0, express_1.Router)();
const isValidObjectId = (id) => {
    return typeof id === 'string' && mongoose_1.default.Types.ObjectId.isValid(id);
};
// Explicit whitelisted extensions for medical clinic environment
const ALLOWED_EXTENSIONS = new Set([
    // Images & Radiographies
    '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tif', '.tiff', '.dcm',
    // Documents & Prescriptions
    '.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt',
    // Videos (Clinical demonstrations)
    '.mp4', '.mov', '.webm', '.mkv', '.avi',
    // Audio
    '.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'
]);
// Explicit list of strictly forbidden dangerous extensions
const FORBIDDEN_EXTENSIONS = new Set([
    '.exe', '.bat', '.cmd', '.sh', '.vbs', '.js', '.ts', '.mjs', '.cjs',
    '.php', '.phtml', '.php3', '.php4', '.php5', '.phps',
    '.html', '.htm', '.xhtml', '.svg', '.dll', '.scr', '.jar', '.com',
    '.ps1', '.vbe', '.wsf', '.hta', '.msi', '.msp', '.py', '.rb'
]);
// Configure dynamic and secure disk storage based on patient details
const storage = multer_1.default.diskStorage({
    destination: async function (req, file, cb) {
        try {
            const patientId = req.body.patientId || req.query.patientId;
            const category = (req.body.category || req.query.category || 'Documents').replace(/[^a-zA-Z0-9]/g, '');
            let patientName = 'Unknown_Patient';
            if (isValidObjectId(patientId)) {
                const patient = await Patient_1.default.findById(patientId);
                if (patient) {
                    // Normalize patient name strictly against path traversal
                    const full = [patient.name, patient.prenom].filter(Boolean).join(' ');
                    patientName = full.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_').trim() || 'Patient';
                }
            }
            // Root uploads folder: backend/uploads/Patients/[Patient_Name]/[Category]
            const dirPath = path_1.default.join(__dirname, '..', '..', 'uploads', 'Patients', patientName, category);
            fs_1.default.mkdirSync(dirPath, { recursive: true });
            cb(null, dirPath);
        }
        catch (err) {
            cb(err, '');
        }
    },
    filename: function (req, file, cb) {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        // Strict extension check inside filename generator
        if (!ALLOWED_EXTENSIONS.has(ext) || FORBIDDEN_EXTENSIONS.has(ext)) {
            return cb(new Error('Extension de fichier non autorisée pour des raisons de sécurité.'), '');
        }
        const basename = path_1.default.basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9\s-_]/g, '')
            .replace(/\s+/g, '_')
            .slice(0, 50) || 'doc';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${basename}-${uniqueSuffix}${ext}`);
    },
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50 MB max
    },
    fileFilter: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (FORBIDDEN_EXTENSIONS.has(ext)) {
            return cb(new Error('Fichier exécutable ou script interdit par la politique de sécurité.'));
        }
        if (!ALLOWED_EXTENSIONS.has(ext)) {
            return cb(new Error(`Extension non autorisée (${ext}). Veuillez utiliser des formats médicaux standards (JPG, PNG, PDF, MP4...).`));
        }
        cb(null, true);
    },
});
// Helper to recursively find a file by filename in a directory
const findFileRecursively = (dir, targetName, maxDepth = 4) => {
    try {
        if (!fs_1.default.existsSync(dir) || maxDepth < 0)
            return null;
        const entries = fs_1.default.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const full = path_1.default.join(dir, entry.name);
            if (entry.isFile()) {
                if (entry.name.toLowerCase() === targetName.toLowerCase()) {
                    return full;
                }
            }
            else if (entry.isDirectory()) {
                const found = findFileRecursively(full, targetName, maxDepth - 1);
                if (found)
                    return found;
            }
        }
    }
    catch { }
    return null;
};
// Helper to reliably resolve the physical document path on disk across any environment
const resolveDocumentPath = (doc) => {
    if (!doc || !doc.filePath)
        return null;
    if (typeof doc.filePath === 'string' && fs_1.default.existsSync(doc.filePath)) {
        return doc.filePath;
    }
    const rawPath = String(doc.filePath || '');
    const normalized = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');
    const withoutUploads = normalized.replace(/^uploads\//i, '');
    const fileNameOnDisk = path_1.default.basename(normalized);
    const candidateDirs = [
        path_1.default.join(__dirname, '..', '..', 'uploads'),
        path_1.default.join(__dirname, '..', 'uploads'),
        path_1.default.join(process.cwd(), 'uploads'),
        path_1.default.join(process.cwd(), 'app', 'uploads'),
        'C:\\Cabinet_Dr_Salma_Tijini_Release\\uploads',
        'C:\\Cabinet_Dr_Salma_Tijini_Release\\app\\uploads',
    ];
    // 1. Direct candidate matching
    for (const dir of candidateDirs) {
        const directCandidate = path_1.default.join(dir, withoutUploads);
        if (fs_1.default.existsSync(directCandidate))
            return directCandidate;
        const normCandidate = path_1.default.join(dir, normalized);
        if (fs_1.default.existsSync(normCandidate))
            return normCandidate;
        const baseCandidate = path_1.default.join(dir, fileNameOnDisk);
        if (fs_1.default.existsSync(baseCandidate))
            return baseCandidate;
    }
    // 2. Recursive fallback in candidate upload folders
    for (const dir of candidateDirs) {
        if (fs_1.default.existsSync(dir)) {
            const found = findFileRecursively(dir, fileNameOnDisk);
            if (found)
                return found;
        }
    }
    return null;
};
exports.resolveDocumentPath = resolveDocumentPath;
// Helper to reliably compute relative upload path with leading slash
const getRelativeUploadPath = (fullPath) => {
    const normalized = fullPath.replace(/\\/g, '/');
    const match = normalized.match(/\/uploads\/(.+)$/i);
    if (match && match[1]) {
        return '/' + match[1].replace(/^\/+/, '');
    }
    return '/' + path_1.default.basename(fullPath);
};
// 1. Upload a single file with Audit Log
router.post('/upload', auth_1.protect, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ message: 'Aucun fichier n\'a été téléversé ou le fichier a été rejeté.' });
            return;
        }
        let { patientId, category, fileType } = req.body;
        if (!isValidObjectId(patientId)) {
            // Clean up uploaded file if patientId is invalid
            try {
                if (fs_1.default.existsSync(req.file.path))
                    fs_1.default.unlinkSync(req.file.path);
            }
            catch { }
            res.status(400).json({ message: 'L\'identifiant du patient est invalide ou manquant.' });
            return;
        }
        const patient = await Patient_1.default.findById(patientId);
        if (!patient) {
            try {
                if (fs_1.default.existsSync(req.file.path))
                    fs_1.default.unlinkSync(req.file.path);
            }
            catch { }
            res.status(404).json({ message: 'Patient introuvable.' });
            return;
        }
        const relativePath = getRelativeUploadPath(req.file.path);
        const ext = path_1.default.extname(req.file.originalname).toLowerCase().replace('.', '');
        // Auto-detect exact category and fileType from extension
        if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) {
            fileType = 'Video';
            category = 'Videos';
        }
        else if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) {
            fileType = 'Audio';
            category = 'Audio';
        }
        else if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tif', 'tiff', 'dcm'].includes(ext)) {
            fileType = category === 'XRays' ? 'XRay' : 'Photo';
            category = category === 'XRays' ? 'XRays' : 'Photos';
        }
        else {
            fileType = 'Document';
            category = 'Documents';
        }
        const newDoc = await Document_1.default.create({
            patientId,
            fileName: req.file.originalname,
            fileType,
            category,
            filePath: relativePath,
            fileSize: req.file.size,
        });
        await (0, security_1.recordAudit)({
            userId: req.user?._id,
            userName: req.user?.name || 'Praticien',
            action: 'UPLOAD_DOCUMENT',
            severity: 'INFO',
            targetId: newDoc._id,
            targetName: newDoc.fileName,
            details: `Ajout du document "${newDoc.fileName}" (${newDoc.fileType}) au dossier de "${patient.name}".`,
            req,
        });
        res.status(201).json(newDoc);
    }
    catch (error) {
        console.error('Error in document upload route:', error);
        res.status(500).json({ message: 'Erreur lors du téléversement du fichier.', error: error.message });
    }
});
// 2. Get all files for a patient
router.get('/patient/:patientId', auth_1.protect, async (req, res) => {
    try {
        const { patientId } = req.params;
        if (!isValidObjectId(patientId)) {
            res.status(400).json({ message: 'Identifiant patient invalide.' });
            return;
        }
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
// 3. Rename file
router.put('/:id/rename', auth_1.protect, async (req, res) => {
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
        const doc = await Document_1.default.findById(req.params.id);
        if (!doc) {
            res.status(404).json({ message: 'Fichier introuvable.' });
            return;
        }
        const oldName = doc.fileName;
        // Rename file physically on disk safely
        const absolutePath = (0, exports.resolveDocumentPath)(doc) || path_1.default.join(__dirname, '..', '..', 'uploads', doc.filePath.replace(/^\/+/, ''));
        const dir = path_1.default.dirname(absolutePath);
        const ext = path_1.default.extname(absolutePath);
        // Add extension if not present in the new name & sanitize
        const cleanBase = newName.trim().replace(/[^a-zA-Z0-9\s-_.]/g, '');
        const formattedNewName = cleanBase.endsWith(ext) ? cleanBase : cleanBase + ext;
        const newAbsolutePath = path_1.default.join(dir, formattedNewName);
        try {
            if (fs_1.default.existsSync(absolutePath)) {
                fs_1.default.renameSync(absolutePath, newAbsolutePath);
            }
        }
        catch (fsErr) {
            console.warn('Physical file rename warning:', fsErr.message);
        }
        doc.fileName = formattedNewName;
        const relativeDir = path_1.default.dirname(doc.filePath);
        doc.filePath = path_1.default.join(relativeDir, formattedNewName).replace(/\\/g, '/');
        await doc.save();
        await (0, security_1.recordAudit)({
            userId: req.user?._id,
            userName: req.user?.name || 'Praticien',
            action: 'RENAME_DOCUMENT',
            severity: 'INFO',
            targetId: doc._id,
            targetName: doc.fileName,
            details: `Renommage du document "${oldName}" en "${formattedNewName}".`,
            req,
        });
        res.json(doc);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors du renommage du fichier.', error: error.message });
    }
});
// 4. Delete file
router.delete('/:id', auth_1.protect, async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            res.status(400).json({ message: 'Identifiant de fichier invalide.' });
            return;
        }
        const doc = await Document_1.default.findById(req.params.id);
        if (!doc) {
            res.status(404).json({ message: 'Fichier introuvable.' });
            return;
        }
        // Delete physical file on disk safely
        try {
            const physicalPath = (0, exports.resolveDocumentPath)(doc);
            if (physicalPath && fs_1.default.existsSync(physicalPath)) {
                fs_1.default.unlinkSync(physicalPath);
            }
        }
        catch (fsErr) {
            console.warn('Physical file delete warning:', fsErr.message);
        }
        await doc.deleteOne();
        await (0, security_1.recordAudit)({
            userId: req.user?._id,
            userName: req.user?.name || 'Praticien',
            action: 'DELETE_DOCUMENT',
            severity: 'WARNING',
            targetId: doc._id,
            targetName: doc.fileName,
            details: `Suppression définitive du document clinique "${doc.fileName}".`,
            req,
        });
        res.json({ message: 'Fichier supprimé avec succès.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la suppression du fichier.', error: error.message });
    }
});
// 5. Preview document inline (PDF, images, etc.)
router.get('/preview/:id', async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            res.status(400).send('Identifiant de document invalide');
            return;
        }
        const doc = await Document_1.default.findById(req.params.id);
        if (!doc) {
            res.status(404).send('Document introuvable');
            return;
        }
        const foundFile = (0, exports.resolveDocumentPath)(doc);
        if (!foundFile) {
            res.status(404).send('Fichier physique introuvable sur le disque');
            return;
        }
        const ext = path_1.default.extname(foundFile).toLowerCase();
        if (ext === '.pdf') {
            res.setHeader('Content-Type', 'application/pdf');
        }
        else if (['.jpg', '.jpeg'].includes(ext)) {
            res.setHeader('Content-Type', 'image/jpeg');
        }
        else if (ext === '.png') {
            res.setHeader('Content-Type', 'image/png');
        }
        else if (ext === '.webp') {
            res.setHeader('Content-Type', 'image/webp');
        }
        else if (['.mp4', '.mov'].includes(ext)) {
            res.setHeader('Content-Type', 'video/mp4');
        }
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.fileName || path_1.default.basename(foundFile))}"`);
        res.sendFile(path_1.default.resolve(foundFile));
    }
    catch (err) {
        res.status(500).send('Erreur affichage du document : ' + err.message);
    }
});
// 6. Direct file download with forced attachment header
router.get('/download/:id', async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            res.status(400).send('Identifiant de document invalide');
            return;
        }
        const doc = await Document_1.default.findById(req.params.id);
        if (!doc) {
            res.status(404).send('Document introuvable');
            return;
        }
        const foundFile = (0, exports.resolveDocumentPath)(doc);
        if (!foundFile) {
            res.status(404).send('Fichier physique introuvable sur le disque');
            return;
        }
        const downloadFileName = doc.fileName || path_1.default.basename(foundFile);
        res.download(path_1.default.resolve(foundFile), downloadFileName);
    }
    catch (err) {
        res.status(500).send('Erreur lors du téléchargement : ' + err.message);
    }
});
exports.default = router;
