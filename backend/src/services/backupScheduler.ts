import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import User from '../models/User';
import Patient from '../models/Patient';
import Appointment from '../models/Appointment';
import ToothHistory from '../models/ToothHistory';
import Invoice from '../models/Invoice';
import PaymentTransaction from '../models/Payment';
import ClinicConfig from '../models/ClinicConfig';
import DocumentModel from '../models/Document';

export interface BackupStatus {
  lastBackupDate: string | null;
  lastBackupStatus: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS' | 'NEVER';
  lastBackupPath: string | null;
  totalBackupsCount: number;
  lastError: string | null;
  retriesAttempted: number;
}

class BackupSchedulerService {
  private cronJob: any = null;
  private backupDir: string;
  private statusFile: string;
  private isRunning: boolean = false;

  constructor() {
    // Save to Sauvegardes_Cabinet at root of Release or parent
    const possiblePaths = [
      path.join(process.cwd(), '..', 'Sauvegardes_Cabinet'),
      path.join(process.cwd(), 'Sauvegardes_Cabinet'),
      path.join(__dirname, '..', '..', '..', 'Sauvegardes_Cabinet'),
      path.join(__dirname, '..', '..', 'Sauvegardes_Cabinet'),
    ];

    let chosenDir = possiblePaths[0];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        chosenDir = p;
        break;
      }
    }

    this.backupDir = chosenDir;
    this.statusFile = path.join(this.backupDir, 'backup_status.json');
  }

  /**
   * Initialize automated daily backup cron job
   */
  public initScheduler(): void {
    console.log('📦 Starting Automated Daily Backup & Self-Healing Scheduler...');

    fs.mkdirSync(this.backupDir, { recursive: true });

    // Schedule: Runs every day at 23:00 ('0 23 * * *')
    this.cronJob = cron.schedule('0 23 * * *', () => {
      console.log('⏰ Exécution de la sauvegarde quotidienne automatique (23:00)...');
      this.runBackupWithRetry(3).catch((err) => {
        console.error('Erreur finale sauvegarde quotidienne :', err);
      });
    });

    // Check if a backup is overdue (e.g. PC was shut down at 23:00 yesterday)
    setTimeout(() => {
      this.checkOverdueBackup();
    }, 10000); // 10 seconds after server boot
  }

  /**
   * Check if last backup is older than 24h (e.g. PC was turned off during scheduled time)
   */
  private async checkOverdueBackup(): Promise<void> {
    try {
      const status = this.getStatus();
      if (!status.lastBackupDate) {
        console.log('ℹ️ Aucune sauvegarde précédente détectée. Exécution de la sauvegarde initiale...');
        await this.runBackupWithRetry(2);
        return;
      }

      const lastDate = new Date(status.lastBackupDate);
      const now = new Date();
      const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);

      if (diffHours >= 24) {
        console.log(`⚠️ Dernière sauvegarde effectuée il y a ${Math.round(diffHours)}h (PC probablement éteint hier). Lancement de la sauvegarde de rattrapage...`);
        await this.runBackupWithRetry(2);
      }
    } catch (err: any) {
      console.error('Erreur vérification sauvegarde en retard :', err.message);
    }
  }

  /**
   * Runs the backup with automatic retry logic (Self-Healing)
   */
  public async runBackupWithRetry(maxRetries: number = 3): Promise<{ success: boolean; path?: string; error?: string }> {
    if (this.isRunning) {
      return { success: false, error: 'Une sauvegarde est déjà en cours d\'exécution.' };
    }

    this.isRunning = true;
    let attempt = 0;
    let lastError: any = null;

    while (attempt < maxRetries) {
      attempt++;
      try {
        console.log(`[Backup] Tentative ${attempt}/${maxRetries}...`);
        const resultPath = await this.performBackup();
        
        // Success
        this.saveStatus({
          lastBackupDate: new Date().toISOString(),
          lastBackupStatus: 'SUCCESS',
          lastBackupPath: resultPath,
          totalBackupsCount: this.getBackupsList().length,
          lastError: null,
          retriesAttempted: attempt,
        });

        // Prune old backups (> 30 days)
        this.pruneOldBackups(30);

        console.log(`✅ Sauvegarde réussie et validée : ${resultPath}`);
        this.isRunning = false;
        return { success: true, path: resultPath };
      } catch (err: any) {
        lastError = err;
        console.error(`❌ Échec de la tentative ${attempt}/${maxRetries} :`, err.message);
        
        if (attempt < maxRetries) {
          console.log(`⏳ Auto-Résolution : nouvelle tentative dans 5 secondes...`);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    }

    // All retries failed
    this.saveStatus({
      lastBackupDate: this.getStatus().lastBackupDate,
      lastBackupStatus: 'FAILED',
      lastBackupPath: null,
      totalBackupsCount: this.getBackupsList().length,
      lastError: lastError?.message || 'Erreur inconnue',
      retriesAttempted: attempt,
    });

    this.isRunning = false;
    return { success: false, error: lastError?.message };
  }

  /**
   * Internal routine to dump collections and media
   */
  private async performBackup(): Promise<string> {
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;
    const destinationFolder = path.join(this.backupDir, `Sauvegarde_${timestamp}`);

    fs.mkdirSync(destinationFolder, { recursive: true });

    // 1. Export all database collections to JSON
    const data = {
      version: '1.0',
      exportedAt: now.toISOString(),
      users: await User.find(),
      patients: await Patient.find(),
      appointments: await Appointment.find(),
      teethHistories: await ToothHistory.find(),
      invoices: await Invoice.find(),
      payments: await PaymentTransaction.find(),
      configs: await ClinicConfig.find(),
      documents: await DocumentModel.find(),
      dentalActs: await (await import('../models/DentalAct')).default.find(),
      notificationSettings: await (await import('../models/NotificationSettings')).default.find(),
      messageTemplates: await (await import('../models/MessageTemplate')).default.find(),
      followUpReminders: await (await import('../models/FollowUpReminder')).default.find(),
      auditLogs: await (await import('../models/AuditLog')).default.find(),
      notificationLogs: await (await import('../models/NotificationLog')).default.find(),
      whatsAppReceivedMedia: await (await import('../models/WhatsAppReceivedMedia')).default.find(),
    };

    const dbBackupFile = path.join(destinationFolder, 'database_dump.json');
    fs.writeFileSync(dbBackupFile, JSON.stringify(data, null, 2), 'utf8');

    // Verify written file is not empty
    const stats = fs.statSync(dbBackupFile);
    if (stats.size < 20) {
      throw new Error('Le fichier de base de données généré est vide ou corrompu.');
    }

    // 2. Copy patient uploads if directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const targetUploads = path.join(destinationFolder, 'uploads');

    if (fs.existsSync(uploadsDir)) {
      this.copyDirSync(uploadsDir, targetUploads);
    }

    return destinationFolder;
  }

  /**
   * Keep only the latest N days of backups to save disk space
   */
  private pruneOldBackups(daysToKeep: number = 30): void {
    try {
      if (!fs.existsSync(this.backupDir)) return;

      const entries = fs.readdirSync(this.backupDir, { withFileTypes: true });
      const now = Date.now();
      const maxAgeMs = daysToKeep * 24 * 60 * 60 * 1000;

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('Sauvegarde_')) {
          const folderPath = path.join(this.backupDir, entry.name);
          const stat = fs.statSync(folderPath);
          const ageMs = now - stat.mtimeMs;

          if (ageMs > maxAgeMs) {
            console.log(`🧹 Nettoyage ancien backup (> ${daysToKeep} jours) : ${entry.name}`);
            fs.rmSync(folderPath, { recursive: true, force: true });
          }
        }
      }
    } catch (err: any) {
      console.error('Erreur nettoyage anciens backups :', err.message);
    }
  }

  /**
   * Get current backup status
   */
  public getStatus(): BackupStatus {
    try {
      if (fs.existsSync(this.statusFile)) {
        const raw = fs.readFileSync(this.statusFile, 'utf8');
        return JSON.parse(raw);
      }
    } catch {
      // Fallback
    }

    return {
      lastBackupDate: null,
      lastBackupStatus: 'NEVER',
      lastBackupPath: null,
      totalBackupsCount: this.getBackupsList().length,
      lastError: null,
      retriesAttempted: 0,
    };
  }

  /**
   * Get list of all available backups
   */
  public getBackupsList(): { name: string; path: string; date: Date; sizeBytes: number }[] {
    try {
      if (!fs.existsSync(this.backupDir)) return [];

      const entries = fs.readdirSync(this.backupDir, { withFileTypes: true });
      const list = [];

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('Sauvegarde_')) {
          const folderPath = path.join(this.backupDir, entry.name);
          const stat = fs.statSync(folderPath);
          list.push({
            name: entry.name,
            path: folderPath,
            date: stat.mtime,
            sizeBytes: stat.size,
          });
        }
      }

      return list.sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch {
      return [];
    }
  }

  private saveStatus(status: BackupStatus): void {
    try {
      fs.writeFileSync(this.statusFile, JSON.stringify(status, null, 2), 'utf8');
    } catch {
      // Ignore
    }
  }

  private copyDirSync(src: string, dest: string) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyDirSync(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

export const backupScheduler = new BackupSchedulerService();
