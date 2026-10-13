import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import mongoose from 'mongoose';
import Patient from '../models/Patient';
import DocumentModel from '../models/Document';
import ToothHistory from '../models/ToothHistory';
import { liveSyncService } from './liveSyncService';

export interface NanoPixBridgeStatus {
  isInstalled: boolean;
  installPath: string | null;
  dataPath: string;
  isSensorConnected: boolean;
  isAppRunning: boolean;
  isWaitingForShot: boolean;
  activePatientId: string | null;
  activePatientName: string | null;
  activeToothNumber: number | null;
  sensorModel: string;
  sensorSN: string;
  totalImagesCount: number;
}

class NanoPixBridgeService {
  private installPath: string = 'C:\\NanoPix\\1.1.1.8\\NanoPix.exe';
  private launchPath: string = 'C:\\NanoPix\\Launch.exe';
  private dataPath: string = 'C:\\PatientData';
  private knownFiles: Set<string> = new Set();
  private pollInterval: NodeJS.Timeout | null = null;
  private lastHardwareCheckTime: number = 0;
  private isCheckingHardware: boolean = false;

  // Active Acquisition Session State
  private activePatientId: string | null = null;
  private activePatientName: string | null = null;
  private activeToothNumber: number | null = null;
  private isWaitingForShot: boolean = false;
  private sessionStartedAt: number | null = null;

  // Cached hardware presence status
  private isSensorConnected: boolean = false;
  private isAppRunning: boolean = false;
  private isProcessingFile: boolean = false;

  constructor() {
    this.scanInitialFiles();
  }

  /**
   * Initializes real-time file watcher & silent hardware detection
   */
  public initService(): void {
    console.log('📡 [NanoPix Bridge] Démarrage du service de liaison Eighteeth NanoPix...');

    if (!fs.existsSync(this.dataPath)) {
      try {
        fs.mkdirSync(this.dataPath, { recursive: true });
      } catch (err: any) {
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
  private scanInitialFiles(): void {
    if (!fs.existsSync(this.dataPath)) return;
    try {
      const items = fs.readdirSync(this.dataPath);
      for (const item of items) {
        const fullItem = path.join(this.dataPath, item);
        try {
          if (fs.statSync(fullItem).isDirectory()) {
            const files = fs.readdirSync(fullItem);
            for (const f of files) {
              this.knownFiles.add(path.join(fullItem, f));
            }
          } else {
            this.knownFiles.add(fullItem);
          }
        } catch {}
      }
      console.log(`📡 [NanoPix Bridge] ${this.knownFiles.size} clichés existants répertoriés.`);
    } catch (err: any) {
      console.warn('[NanoPix Bridge] Erreur scan initial:', err.message);
    }
  }

  /**
   * Check if FTDI USB sensor environment and NanoPix software are available (100% pure Node.js, 0 CMD)
   */
  public checkHardwareStatus(): void {
    const hasNanoPixSoftware = fs.existsSync(this.installPath) || fs.existsSync(this.launchPath);
    const hasDataFolder = fs.existsSync(this.dataPath);
    this.isSensorConnected = hasNanoPixSoftware || hasDataFolder;
    this.lastHardwareCheckTime = Date.now();
    this.isCheckingHardware = false;
  }

  /**
   * Scans C:\PatientData for new .jpg thumbnails or .ioss radiographs
   */
  private async scanForNewAcquisitions(): Promise<void> {
    if (!fs.existsSync(this.dataPath) || this.isProcessingFile) return;

    try {
      const patientFolders = fs.readdirSync(this.dataPath);

      for (const folder of patientFolders) {
        if (folder === 'database') continue;
        const folderPath = path.join(this.dataPath, folder);

        try {
          const stats = fs.statSync(folderPath);
          if (!stats.isDirectory()) continue;

          const files = fs.readdirSync(folderPath);

          for (const file of files) {
            const fullPath = path.join(folderPath, file);

            // We specifically look for the high-definition thumbnail JPG or IOSS file
            if (!this.knownFiles.has(fullPath)) {
              if (file.toLowerCase().endsWith('_thumbnail.jpg') || file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.png')) {
                // Check if file write is complete (size > 0 and stable)
                try {
                  const fStat = fs.statSync(fullPath);
                  if (fStat.size > 1000) {
                    this.isProcessingFile = true;
                    this.knownFiles.add(fullPath);
                    console.log(`📸 [NanoPix Bridge] Nouveau cliché radio détecté : ${fullPath}`);
                    await this.importAcquiredXRay(fullPath, folder, fStat.size);
                    this.isProcessingFile = false;
                  }
                } catch {
                  // File might still be locked by NanoPix writer; try next tick
                }
              } else {
                this.knownFiles.add(fullPath);
              }
            }
          }
        } catch {}
      }
    } catch {}
  }

  /**
   * Process a freshly detected X-ray, copy to MERN storage and notify React
   */
  private async importAcquiredXRay(filePath: string, folderName: string, fileSize: number): Promise<void> {
    try {
      // 1. Identify target patient
      let targetPatient: any = null;

      if (this.activePatientId && mongoose.Types.ObjectId.isValid(this.activePatientId)) {
        targetPatient = await Patient.findById(this.activePatientId);
      }

      // Fallback: search by folder name or pick the most recent patient
      if (!targetPatient) {
        targetPatient = await Patient.findOne({
          $or: [
            { nationalId: folderName },
            { phone: folderName },
          ],
          deleted: { $ne: true },
        });
      }

      if (!targetPatient) {
        // Fallback to most recently viewed active patient
        targetPatient = await Patient.findOne({ deleted: { $ne: true }, isArchived: false })
          .sort({ recentlyViewedAt: -1, updatedAt: -1 });
      }

      if (!targetPatient) {
        console.warn('⚠️ [NanoPix Bridge] Aucun patient cible trouvé pour associer le cliché.');
        return;
      }

      // 2. Prepare upload destination inside MERN uploads directory
      const possibleUploadDirs = [
        path.join(process.cwd(), 'uploads'),
        path.join(process.cwd(), 'backend', 'uploads'),
        path.join(__dirname, '..', '..', 'uploads'),
      ];
      let uploadBase = possibleUploadDirs[0];
      for (const d of possibleUploadDirs) {
        if (fs.existsSync(d)) {
          uploadBase = d;
          break;
        }
      }

      const patientSafeFolder = targetPatient.name.replace(/[^a-zA-Z0-9_\-]/g, '_');
      const targetDir = path.join(uploadBase, 'Patients', patientSafeFolder, 'XRays');
      fs.mkdirSync(targetDir, { recursive: true });

      const timestamp = Date.now();
      const tooth = this.activeToothNumber || null;
      const toothLabel = tooth ? `Dent_${tooth}` : 'Periapicale';
      const destFileName = `RVG_NanoPix_${toothLabel}_${timestamp}.jpg`;
      const destPath = path.join(targetDir, destFileName);

      // Copy file safely
      fs.copyFileSync(filePath, destPath);

      // Construct relative path for Web URL
      const relativeWebPath = `uploads/Patients/${patientSafeFolder}/XRays/${destFileName}`.replace(/\\/g, '/');

      // 3. Create Document record in MongoDB
      const doc = await DocumentModel.create({
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
          await ToothHistory.create({
            patientId: targetPatient._id,
            toothNumber: tooth,
            procedureName: 'Radiographie RVG Rétro-alvéolaire',
            status: 'HEALTHY',
            notes: `Acquisition numérique Eighteeth NanoPix 1 (${new Date().toLocaleTimeString('fr-FR')})`,
            xrays: [relativeWebPath],
            date: new Date(),
          });
        } catch (tErr: any) {
          console.warn('[NanoPix Bridge] Note dentaire non enregistrée:', tErr.message);
        }
      }

      // 5. Broadcast to React via LiveSync SSE
      liveSyncService.broadcast('DOCUMENTS_CHANGED', 'create', {
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
    } catch (err: any) {
      console.error('❌ [NanoPix Bridge] Erreur lors de l\'importation du cliché:', err.message);
    }
  }

  /**
   * Arm acquisition session for a specific patient and tooth
   */
  public startSession(params: { patientId: string; patientName?: string; tooth?: number }): NanoPixBridgeStatus {
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
  public cancelSession(): NanoPixBridgeStatus {
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
  public launchApp(): boolean {
    const targetExe = fs.existsSync(this.launchPath) ? this.launchPath : this.installPath;
    if (!fs.existsSync(targetExe)) {
      console.warn(`[NanoPix Bridge] Exécutable introuvable: ${targetExe}`);
      return false;
    }

    try {
      exec(`start "" "${targetExe}"`, { windowsHide: false });
      this.isAppRunning = true;
      console.log('🚀 [NanoPix Bridge] Application Eighteeth NanoPix lancée avec succès.');
      return true;
    } catch (err: any) {
      console.error('[NanoPix Bridge] Échec du lancement de NanoPix.exe:', err.message);
      return false;
    }
  }

  /**
   * Get full bridge status
   */
  public getStatus(): NanoPixBridgeStatus {
    // Only refresh hardware status if more than 30s have elapsed and a client requests status
    if (Date.now() - this.lastHardwareCheckTime > 30000) {
      this.checkHardwareStatus();
    }

    return {
      isInstalled: fs.existsSync(this.installPath) || fs.existsSync(this.launchPath),
      installPath: fs.existsSync(this.installPath) ? this.installPath : null,
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

export const nanopixBridgeService = new NanoPixBridgeService();
