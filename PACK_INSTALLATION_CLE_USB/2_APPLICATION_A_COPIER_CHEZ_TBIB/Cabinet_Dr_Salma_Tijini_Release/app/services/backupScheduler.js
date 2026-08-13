"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backupScheduler = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const User_1 = __importDefault(require("../models/User"));
const Patient_1 = __importDefault(require("../models/Patient"));
const Appointment_1 = __importDefault(require("../models/Appointment"));
const ToothHistory_1 = __importDefault(require("../models/ToothHistory"));
const Invoice_1 = __importDefault(require("../models/Invoice"));
const Payment_1 = __importDefault(require("../models/Payment"));
const ClinicConfig_1 = __importDefault(require("../models/ClinicConfig"));
const Document_1 = __importDefault(require("../models/Document"));
class BackupSchedulerService {
    cronJob = null;
    backupDir;
    statusFile;
    isRunning = false;
    constructor() {
        // Save to Sauvegardes_Cabinet at root of Release or parent
        const possiblePaths = [
            path_1.default.join(process.cwd(), '..', 'Sauvegardes_Cabinet'),
            path_1.default.join(process.cwd(), 'Sauvegardes_Cabinet'),
            path_1.default.join(__dirname, '..', '..', '..', 'Sauvegardes_Cabinet'),
            path_1.default.join(__dirname, '..', '..', 'Sauvegardes_Cabinet'),
        ];
        let chosenDir = possiblePaths[0];
        for (const p of possiblePaths) {
            if (fs_1.default.existsSync(p)) {
                chosenDir = p;
                break;
            }
        }
        this.backupDir = chosenDir;
        this.statusFile = path_1.default.join(this.backupDir, 'backup_status.json');
    }
    /**
     * Initialize automated daily backup cron job
     */
    initScheduler() {
        console.log('📦 Starting Automated Daily Backup & Self-Healing Scheduler...');
        fs_1.default.mkdirSync(this.backupDir, { recursive: true });
        // Schedule: Runs every day at 23:00 ('0 23 * * *')
        this.cronJob = node_cron_1.default.schedule('0 23 * * *', () => {
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
    async checkOverdueBackup() {
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
        }
        catch (err) {
            console.error('Erreur vérification sauvegarde en retard :', err.message);
        }
    }
    /**
     * Runs the backup with automatic retry logic (Self-Healing)
     */
    async runBackupWithRetry(maxRetries = 3) {
        if (this.isRunning) {
            return { success: false, error: 'Une sauvegarde est déjà en cours d\'exécution.' };
        }
        this.isRunning = true;
        let attempt = 0;
        let lastError = null;
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
            }
            catch (err) {
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
    async performBackup() {
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;
        const destinationFolder = path_1.default.join(this.backupDir, `Sauvegarde_${timestamp}`);
        fs_1.default.mkdirSync(destinationFolder, { recursive: true });
        // 1. Export all database collections to JSON
        const data = {
            version: '1.0',
            exportedAt: now.toISOString(),
            users: await User_1.default.find(),
            patients: await Patient_1.default.find(),
            appointments: await Appointment_1.default.find(),
            teethHistories: await ToothHistory_1.default.find(),
            invoices: await Invoice_1.default.find(),
            payments: await Payment_1.default.find(),
            configs: await ClinicConfig_1.default.find(),
            documents: await Document_1.default.find(),
        };
        const dbBackupFile = path_1.default.join(destinationFolder, 'database_dump.json');
        fs_1.default.writeFileSync(dbBackupFile, JSON.stringify(data, null, 2), 'utf8');
        // Verify written file is not empty
        const stats = fs_1.default.statSync(dbBackupFile);
        if (stats.size < 20) {
            throw new Error('Le fichier de base de données généré est vide ou corrompu.');
        }
        // 2. Copy patient uploads if directory exists
        const uploadsDir = path_1.default.join(process.cwd(), 'uploads');
        const targetUploads = path_1.default.join(destinationFolder, 'uploads');
        if (fs_1.default.existsSync(uploadsDir)) {
            this.copyDirSync(uploadsDir, targetUploads);
        }
        return destinationFolder;
    }
    /**
     * Keep only the latest N days of backups to save disk space
     */
    pruneOldBackups(daysToKeep = 30) {
        try {
            if (!fs_1.default.existsSync(this.backupDir))
                return;
            const entries = fs_1.default.readdirSync(this.backupDir, { withFileTypes: true });
            const now = Date.now();
            const maxAgeMs = daysToKeep * 24 * 60 * 60 * 1000;
            for (const entry of entries) {
                if (entry.isDirectory() && entry.name.startsWith('Sauvegarde_')) {
                    const folderPath = path_1.default.join(this.backupDir, entry.name);
                    const stat = fs_1.default.statSync(folderPath);
                    const ageMs = now - stat.mtimeMs;
                    if (ageMs > maxAgeMs) {
                        console.log(`🧹 Nettoyage ancien backup (> ${daysToKeep} jours) : ${entry.name}`);
                        fs_1.default.rmSync(folderPath, { recursive: true, force: true });
                    }
                }
            }
        }
        catch (err) {
            console.error('Erreur nettoyage anciens backups :', err.message);
        }
    }
    /**
     * Get current backup status
     */
    getStatus() {
        try {
            if (fs_1.default.existsSync(this.statusFile)) {
                const raw = fs_1.default.readFileSync(this.statusFile, 'utf8');
                return JSON.parse(raw);
            }
        }
        catch {
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
    getBackupsList() {
        try {
            if (!fs_1.default.existsSync(this.backupDir))
                return [];
            const entries = fs_1.default.readdirSync(this.backupDir, { withFileTypes: true });
            const list = [];
            for (const entry of entries) {
                if (entry.isDirectory() && entry.name.startsWith('Sauvegarde_')) {
                    const folderPath = path_1.default.join(this.backupDir, entry.name);
                    const stat = fs_1.default.statSync(folderPath);
                    list.push({
                        name: entry.name,
                        path: folderPath,
                        date: stat.mtime,
                        sizeBytes: stat.size,
                    });
                }
            }
            return list.sort((a, b) => b.date.getTime() - a.date.getTime());
        }
        catch {
            return [];
        }
    }
    saveStatus(status) {
        try {
            fs_1.default.writeFileSync(this.statusFile, JSON.stringify(status, null, 2), 'utf8');
        }
        catch {
            // Ignore
        }
    }
    copyDirSync(src, dest) {
        fs_1.default.mkdirSync(dest, { recursive: true });
        const entries = fs_1.default.readdirSync(src, { withFileTypes: true });
        for (const entry of entries) {
            const srcPath = path_1.default.join(src, entry.name);
            const destPath = path_1.default.join(dest, entry.name);
            if (entry.isDirectory()) {
                this.copyDirSync(srcPath, destPath);
            }
            else {
                fs_1.default.copyFileSync(srcPath, destPath);
            }
        }
    }
}
exports.backupScheduler = new BackupSchedulerService();
