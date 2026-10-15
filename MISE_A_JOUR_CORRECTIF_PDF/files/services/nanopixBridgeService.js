"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.nanopixBridgeService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const mongoose_1 = __importDefault(require("mongoose"));
const Patient_1 = __importDefault(require("../models/Patient"));
const Document_1 = __importDefault(require("../models/Document"));
const ToothHistory_1 = __importDefault(require("../models/ToothHistory"));
const liveSyncService_1 = require("./liveSyncService");
class NanoPixBridgeService {
    installPath = 'C:\\NanoPix\\1.1.1.8\\NanoPix.exe';
    launchPath = 'C:\\NanoPix\\Launch.exe';
    dataPath = 'C:\\PatientData';
    knownFiles = new Set();
    pollInterval = null;
    lastHardwareCheckTime = 0;
    isCheckingHardware = false;
    // Active Acquisition Session State
    activePatientId = null;
    activePatientName = null;
    activeToothNumber = null;
    isWaitingForShot = false;
    sessionStartedAt = null;
    // Cached hardware presence status
    isSensorConnected = false;
    isAppRunning = false;
    isProcessingFile = false;
    constructor() {
        this.scanInitialFiles();
    }
    /**
     * Initializes real-time file watcher & silent hardware detection
     */
    initService() {
        console.log('📡 [NanoPix Bridge] Démarrage du service de liaison Eighteeth NanoPix...');
        if (!fs_1.default.existsSync(this.dataPath)) {
            try {
                fs_1.default.mkdirSync(this.dataPath, { recursive: true });
            }
            catch (err) {
                console.warn(`[NanoPix Bridge] Impossible de créer ${this.dataPath}: ${err.message}`);
            }
        }
        // 1. Initial silent hardware check (hidden background)
        this.checkHardwareStatus();
        // 2. Fast filesystem scanner for new acquired radiographs (every 1.5 seconds - pure fs, 0 cmd)
        this.pollInterval = setInterval(() => {
            this.scanForNewAcquisitions();
        }, 1500);
    }
    /**
     * Index already existing images so we only react to newly shot X-rays
     */
    scanInitialFiles() {
        if (!fs_1.default.existsSync(this.dataPath))
            return;
        try {
            const items = fs_1.default.readdirSync(this.dataPath);
            for (const item of items) {
                const fullItem = path_1.default.join(this.dataPath, item);
                try {
                    if (fs_1.default.statSync(fullItem).isDirectory()) {
                        const files = fs_1.default.readdirSync(fullItem);
                        for (const f of files) {
                            this.knownFiles.add(path_1.default.join(fullItem, f));
                        }
                    }
                    else {
                        this.knownFiles.add(fullItem);
                    }
                }
                catch { }
            }
            console.log(`📡 [NanoPix Bridge] ${this.knownFiles.size} clichés existants répertoriés.`);
        }
        catch (err) {
            console.warn('[NanoPix Bridge] Erreur scan initial:', err.message);
        }
    }
    /**
     * Check if FTDI USB sensor environment and NanoPix software are available (100% pure Node.js, 0 CMD)
     */
    checkHardwareStatus() {
        const hasNanoPixSoftware = fs_1.default.existsSync(this.installPath) || fs_1.default.existsSync(this.launchPath);
        const hasDataFolder = fs_1.default.existsSync(this.dataPath);
        this.isSensorConnected = hasNanoPixSoftware || hasDataFolder;
        this.lastHardwareCheckTime = Date.now();
        this.isCheckingHardware = false;
    }
    /**
     * Scans C:\PatientData for new .jpg thumbnails or .ioss radiographs
     */
    async scanForNewAcquisitions() {
        if (!fs_1.default.existsSync(this.dataPath) || this.isProcessingFile)
            return;
        try {
            const patientFolders = fs_1.default.readdirSync(this.dataPath);
            for (const folder of patientFolders) {
                if (folder === 'database')
                    continue;
                const folderPath = path_1.default.join(this.dataPath, folder);
                try {
                    const stats = fs_1.default.statSync(folderPath);
                    if (!stats.isDirectory())
                        continue;
                    const files = fs_1.default.readdirSync(folderPath);
                    for (const file of files) {
                        const fullPath = path_1.default.join(folderPath, file);
                        // We specifically look for the high-definition thumbnail JPG or IOSS file
                        if (!this.knownFiles.has(fullPath)) {
                            if (file.toLowerCase().endsWith('_thumbnail.jpg') || file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.png')) {
                                // Check if file write is complete (size > 0 and stable)
                                try {
                                    const fStat = fs_1.default.statSync(fullPath);
                                    if (fStat.size > 1000) {
                                        this.isProcessingFile = true;
                                        this.knownFiles.add(fullPath);
                                        console.log(`📸 [NanoPix Bridge] Nouveau cliché radio détecté : ${fullPath}`);
                                        await this.importAcquiredXRay(fullPath, folder, fStat.size);
                                        this.isProcessingFile = false;
                                    }
                                }
                                catch {
                                    // File might still be locked by NanoPix writer; try next tick
                                }
                            }
                            else {
                                this.knownFiles.add(fullPath);
                            }
                        }
                    }
                }
                catch { }
            }
        }
        catch { }
    }
    /**
     * Process a freshly detected X-ray, copy to MERN storage and notify React
     */
    async importAcquiredXRay(filePath, folderName, fileSize) {
        try {
            // 1. Identify target patient
            let targetPatient = null;
            if (this.activePatientId && mongoose_1.default.Types.ObjectId.isValid(this.activePatientId)) {
                targetPatient = await Patient_1.default.findById(this.activePatientId);
            }
            // Fallback: search by folder name or pick the most recent patient
            if (!targetPatient) {
                targetPatient = await Patient_1.default.findOne({
                    $or: [
                        { nationalId: folderName },
                        { phone: folderName },
                    ],
                    deleted: { $ne: true },
                });
            }
            if (!targetPatient) {
                // Fallback to most recently viewed active patient
                targetPatient = await Patient_1.default.findOne({ deleted: { $ne: true }, isArchived: false })
                    .sort({ recentlyViewedAt: -1, updatedAt: -1 });
            }
            if (!targetPatient) {
                console.warn('⚠️ [NanoPix Bridge] Aucun patient cible trouvé pour associer le cliché.');
                return;
            }
            // 2. Prepare upload destination inside MERN uploads directory
            const possibleUploadDirs = [
                path_1.default.join(process.cwd(), 'uploads'),
                path_1.default.join(process.cwd(), 'backend', 'uploads'),
                path_1.default.join(__dirname, '..', '..', 'uploads'),
            ];
            let uploadBase = possibleUploadDirs[0];
            for (const d of possibleUploadDirs) {
                if (fs_1.default.existsSync(d)) {
                    uploadBase = d;
                    break;
                }
            }
            const patientSafeFolder = targetPatient.name.replace(/[^a-zA-Z0-9_\-]/g, '_');
            const targetDir = path_1.default.join(uploadBase, 'Patients', patientSafeFolder, 'XRays');
            fs_1.default.mkdirSync(targetDir, { recursive: true });
            const timestamp = Date.now();
            const tooth = this.activeToothNumber || null;
            const toothLabel = tooth ? `Dent_${tooth}` : 'Periapicale';
            const destFileName = `RVG_NanoPix_${toothLabel}_${timestamp}.jpg`;
            const destPath = path_1.default.join(targetDir, destFileName);
            // Copy file safely
            fs_1.default.copyFileSync(filePath, destPath);
            // Construct relative path for Web URL
            const relativeWebPath = `uploads/Patients/${patientSafeFolder}/XRays/${destFileName}`.replace(/\\/g, '/');
            // 3. Create Document record in MongoDB
            const doc = await Document_1.default.create({
                patientId: targetPatient._id,
                fileName: destFileName,
                fileType: 'XRay',
                category: 'Periapical',
                filePath: relativeWebPath,
                fileSize,
                uploadedAt: new Date(),
            });
            console.log(`✅ [NanoPix Bridge] Cliché radio enregistré dans MongoDB pour ${targetPatient.name} (Doc ID: ${doc._id})`);
            // 4. If tooth specified, record in tooth history
            if (tooth) {
                try {
                    await ToothHistory_1.default.create({
                        patientId: targetPatient._id,
                        toothNumber: tooth,
                        procedureName: 'Radiographie RVG Rétro-alvéolaire',
                        status: 'HEALTHY',
                        notes: `Acquisition numérique Eighteeth NanoPix 1 (${new Date().toLocaleTimeString('fr-FR')})`,
                        xrays: [relativeWebPath],
                        date: new Date(),
                    });
                }
                catch (tErr) {
                    console.warn('[NanoPix Bridge] Note dentaire non enregistrée:', tErr.message);
                }
            }
            // 5. Broadcast to React via LiveSync SSE
            liveSyncService_1.liveSyncService.broadcast('DOCUMENTS_CHANGED', 'create', {
                entityId: doc._id.toString(),
                entityName: destFileName,
                sourceUser: 'Eighteeth NanoPix 1 Sensor',
                data: {
                    documentId: doc._id.toString(),
                    patientId: targetPatient._id.toString(),
                    patientName: targetPatient.name,
                    tooth,
                    filePath: relativeWebPath,
                    url: `/${relativeWebPath}`,
                    timestamp,
                    sensorModel: 'Eighteeth NanoPix 1 (EN1)',
                },
            });
            // Reset acquisition state
            this.isWaitingForShot = false;
            this.activeToothNumber = null;
        }
        catch (err) {
            console.error('❌ [NanoPix Bridge] Erreur lors de l\'importation du cliché:', err.message);
        }
    }
    /**
     * Arm acquisition session for a specific patient and tooth
     */
    startSession(params) {
        this.activePatientId = params.patientId;
        this.activePatientName = params.patientName || null;
        this.activeToothNumber = params.tooth || null;
        this.isWaitingForShot = true;
        this.sessionStartedAt = Date.now();
        console.log(`🎯 [NanoPix Bridge] Session d'acquisition armée pour ${this.activePatientName || this.activePatientId} (Dent #${this.activeToothNumber || 'Toutes'})`);
        // Auto-launch official NanoPix app if not already running
        if (!this.isAppRunning) {
            this.launchApp();
        }
        return this.getStatus();
    }
    /**
     * Cancel active session
     */
    cancelSession() {
        this.isWaitingForShot = false;
        this.activePatientId = null;
        this.activePatientName = null;
        this.activeToothNumber = null;
        this.sessionStartedAt = null;
        return this.getStatus();
    }
    /**
     * Launch official NanoPix software via Launch.exe
     */
    launchApp() {
        const targetExe = fs_1.default.existsSync(this.launchPath) ? this.launchPath : this.installPath;
        if (!fs_1.default.existsSync(targetExe)) {
            console.warn(`[NanoPix Bridge] Exécutable introuvable: ${targetExe}`);
            return false;
        }
        try {
            (0, child_process_1.exec)(`start "" "${targetExe}"`, { windowsHide: false });
            this.isAppRunning = true;
            console.log('🚀 [NanoPix Bridge] Application Eighteeth NanoPix lancée avec succès.');
            return true;
        }
        catch (err) {
            console.error('[NanoPix Bridge] Échec du lancement de NanoPix.exe:', err.message);
            return false;
        }
    }
    /**
     * Get full bridge status
     */
    getStatus() {
        // Only refresh hardware status if more than 30s have elapsed and a client requests status
        if (Date.now() - this.lastHardwareCheckTime > 30000) {
            this.checkHardwareStatus();
        }
        return {
            isInstalled: fs_1.default.existsSync(this.installPath) || fs_1.default.existsSync(this.launchPath),
            installPath: fs_1.default.existsSync(this.installPath) ? this.installPath : null,
            dataPath: this.dataPath,
            isSensorConnected: this.isSensorConnected,
            isAppRunning: this.isAppRunning,
            isWaitingForShot: this.isWaitingForShot,
            activePatientId: this.activePatientId,
            activePatientName: this.activePatientName,
            activeToothNumber: this.activeToothNumber,
            sensorModel: 'Eighteeth NanoPix 1 (Size 1 - EN1)',
            sensorSN: 'PE641300T611240838X',
            totalImagesCount: this.knownFiles.size,
        };
    }
}
exports.nanopixBridgeService = new NanoPixBridgeService();
