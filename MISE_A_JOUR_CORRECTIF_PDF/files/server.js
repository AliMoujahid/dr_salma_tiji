"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Load environment variables from all possible locations
const envPaths = [
    path_1.default.join(__dirname, '.env'),
    path_1.default.join(__dirname, '..', '.env'),
    path_1.default.join(process.cwd(), '.env'),
    path_1.default.join(process.cwd(), 'app', '.env'),
];
for (const envPath of envPaths) {
    if (fs_1.default.existsSync(envPath)) {
        dotenv_1.default.config({ path: envPath });
    }
}
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
// Route imports
const auth_1 = __importDefault(require("./routes/auth"));
const patients_1 = __importDefault(require("./routes/patients"));
const appointments_1 = __importDefault(require("./routes/appointments"));
const teeth_1 = __importDefault(require("./routes/teeth"));
const invoices_1 = __importDefault(require("./routes/invoices"));
const payments_1 = __importDefault(require("./routes/payments"));
const documents_1 = __importDefault(require("./routes/documents"));
const clinic_1 = __importDefault(require("./routes/clinic"));
const backup_1 = __importDefault(require("./routes/backup"));
const reports_1 = __importDefault(require("./routes/reports"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const license_1 = __importDefault(require("./routes/license"));
const auditLogs_1 = __importDefault(require("./routes/auditLogs"));
const dentalActs_1 = __importStar(require("./routes/dentalActs"));
const liveSync_1 = __importDefault(require("./routes/liveSync"));
const nanopix_1 = __importDefault(require("./routes/nanopix"));
const treatments_1 = __importDefault(require("./routes/treatments"));
const nanopixBridgeService_1 = require("./services/nanopixBridgeService");
const reminderScheduler_1 = require("./services/reminderScheduler");
const backupScheduler_1 = require("./services/backupScheduler");
const licenseService_1 = require("./services/licenseService");
const security_1 = require("./middleware/security");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dr-tijini';
// 1. Enterprise Security Headers (Helmet-Grade)
app.use(security_1.securityHeaders);
// 2. NoSQL Operator & Injection Sanitizer
app.use(security_1.sanitizeInputs);
// 3. Middlewares
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// 4. Rate Limiting for all API Endpoints
app.use('/api', security_1.apiRateLimiter);
// Ensure upload folders exist and are served
const possibleUploadDirs = [
    path_1.default.join(__dirname, '..', 'uploads'),
    path_1.default.join(__dirname, 'uploads'),
    path_1.default.join(process.cwd(), 'uploads'),
    path_1.default.join(process.cwd(), 'app', 'uploads'),
];
for (const dir of possibleUploadDirs) {
    try {
        fs_1.default.mkdirSync(dir, { recursive: true });
        app.use('/uploads', express_1.default.static(dir));
    }
    catch { }
}
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("./models/User"));
const ClinicConfig_1 = __importDefault(require("./models/ClinicConfig"));
// Connect to MongoDB & Auto-Bootstrap default admin with resilient auto-retry & auto-auth validation
const connectWithRetry = async () => {
    const secureUri = 'mongodb://tijini_app:Tijini%40App%23Dental2026%21@127.0.0.1:27017/dr-tijini?authSource=dr-tijini';
    const openUri = 'mongodb://127.0.0.1:27017/dr-tijini';
    const envUri = process.env.MONGODB_URI;
    // Prioritize candidates: if envUri is provided use it, then test secure auth, then open URI
    const candidateUris = Array.from(new Set([envUri, secureUri, openUri].filter(Boolean)));
    let connected = false;
    let attempts = 0;
    while (!connected) {
        attempts++;
        for (const uri of candidateUris) {
            try {
                if (mongoose_1.default.connection.readyState !== 0) {
                    await mongoose_1.default.disconnect();
                }
                await mongoose_1.default.connect(uri, { serverSelectionTimeoutMS: 4000 });
                // Verify that we can actually read from the database (verifies authentication if enabled)
                await User_1.default.findOne({ username: 'admin' });
                connected = true;
                console.log(`✅ MongoDB connecté et validé avec succès (${uri.includes('@') ? 'Mode Sécurisé Authentifié' : 'Mode Local Standard'}).`);
                break;
            }
            catch (err) {
                console.warn(`⚠️ [MongoDB] Échec de validation avec URI (${uri.split('@').pop()}): ${err.message}`);
                try {
                    await mongoose_1.default.disconnect();
                }
                catch { }
            }
        }
        if (!connected) {
            console.log(`⏳ [MongoDB] Tentative #${attempts} échouée. Nouvelle tentative dans 3 secondes...`);
            await new Promise((resolve) => setTimeout(resolve, 3000));
        }
    }
    try {
        // Ensure Admin Account Exists & is Active
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash('Moujahid@97', salt);
        let adminUser = await User_1.default.findOne({
            $or: [{ username: 'admin' }, { email: 'admin@tijini.com' }, { email: 'doctor@tijini.com' }],
        });
        if (!adminUser) {
            await User_1.default.create({
                username: 'admin',
                email: 'admin@tijini.com',
                passwordHash,
                name: 'Dr. Salma Tijini',
                role: 'ADMIN',
                active: true,
            });
            console.log('⚡ Compte Administrateur initialisé avec succès (admin / Moujahid@97).');
        }
        else {
            // Ensure credentials and permissions are up to date
            adminUser.passwordHash = passwordHash;
            adminUser.role = 'ADMIN';
            adminUser.active = true;
            if (!adminUser.username)
                adminUser.username = 'admin';
            await adminUser.save();
            console.log('⚡ Compte Administrateur synchronisé et actif (admin / Moujahid@97).');
        }
        // Ensure Clinic Configuration Exists
        const configCount = await ClinicConfig_1.default.countDocuments();
        if (configCount === 0) {
            await ClinicConfig_1.default.create({
                cabinetFr: 'Cabinet Dentaire Dr. Salma Tijini',
                cabinetAr: 'عيادة الدكتورة سلمى التيجيني لطب وجراحة الأسنان',
                drFr: 'Dr. Salma Tijini',
                drAr: 'الدكتورة سلمى التيجيني',
                specsFr: 'Implantologie - Esthétique dentaire - Chirurgie buccale\nOrthodontie - Soins & Prothèses - Radio Panoramique 3D',
                specsAr: 'علاج وتجميل الأسنان - زراعة الأسنان - تقويم الأسنان\nجراحة الفم والأسنان - تركيبات الزيركون - راديو بانوراميك',
                address: 'Angle Av. Hassan II & Rue Al Qods, Imm. Al Andalous, 1er Étage, Skhirat',
                phones: '+212 6 13 11 71 31',
                email: 'dr.salmatijini@gmail.com',
                ice: '003291823000045',
                inbe: '102938475',
                ifVal: '54321098',
            });
            console.log('⚡ Configuration clinique initiale créée.');
        }
        // Ensure Default Dental Acts & Tariffs Catalog Exists
        await (0, dentalActs_1.ensureDefaultActs)();
    }
    catch (bootErr) {
        console.error('Erreur initialisation données par défaut:', bootErr);
    }
};
connectWithRetry();
// License API routes (must be available without license block)
app.use('/api/license', license_1.default);
// License validation middleware for protected medical data API routes
app.use('/api', (req, res, next) => {
    // Allow license status checks, events stream, and login without valid license
    if (req.path.startsWith('/license') || req.path === '/auth/login' || req.path.startsWith('/events')) {
        return next();
    }
    const licenseStatus = licenseService_1.licenseService.verifyLicense();
    if (!licenseStatus.active) {
        res.status(403).json({
            error: 'LICENSE_INVALID_OR_EXPIRED',
            message: licenseStatus.message || 'Licence d\'utilisation invalide ou expirée pour cette machine.',
            machineId: licenseStatus.machineId,
        });
        return;
    }
    next();
});
// Setup API routes
app.use('/api/auth', auth_1.default);
app.use('/api/patients', patients_1.default);
app.use('/api/appointments', appointments_1.default);
app.use('/api/teeth', teeth_1.default);
app.use('/api/invoices', invoices_1.default);
app.use('/api/payments', payments_1.default);
app.use('/api/documents', documents_1.default);
app.use('/api/clinic', clinic_1.default);
app.use('/api/backup', backup_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/audit-logs', auditLogs_1.default);
app.use('/api/dental-acts', dentalActs_1.default);
app.use('/api/events', liveSync_1.default);
app.use('/api/nanopix', nanopix_1.default);
app.use('/api/treatments', treatments_1.default);
const whatsappService_1 = require("./services/whatsappService");
// Start Automated Reminder Scheduler, Backup Cron Engines, WhatsApp & NanoPix Bridge Service
reminderScheduler_1.reminderScheduler.initScheduler();
backupScheduler_1.backupScheduler.initScheduler();
whatsappService_1.whatsappService.initClient();
nanopixBridgeService_1.nanopixBridgeService.initService();
// Base route status check
app.get(['/health', '/api/health'], (req, res) => {
    const licenseStatus = licenseService_1.licenseService.verifyLicense();
    res.json({
        status: 'healthy',
        database: mongoose_1.default.connection.readyState === 1 ? 'connected' : 'disconnected',
        license: {
            active: licenseStatus.active,
            machineId: licenseStatus.machineId,
            daysRemaining: licenseStatus.daysRemaining,
        },
    });
});
// Production Static Frontend Hosting
const possibleFrontendDirs = [
    path_1.default.join(__dirname, 'public'),
    path_1.default.join(__dirname, '..', 'public'),
    path_1.default.join(process.cwd(), 'app', 'public'),
    path_1.default.join(process.cwd(), 'public'),
    path_1.default.join(__dirname, '..', '..', 'frontend', 'dist'),
    path_1.default.join(process.cwd(), 'frontend', 'dist'),
    path_1.default.join(process.cwd(), 'dist'),
];
let frontendDir = null;
for (const dir of possibleFrontendDirs) {
    if (fs_1.default.existsSync(path_1.default.join(dir, 'index.html'))) {
        frontendDir = dir;
        break;
    }
}
if (frontendDir) {
    console.log(`✅ Serving Frontend from: ${frontendDir}`);
    app.use(express_1.default.static(frontendDir));
    // SPA Fallback for all non-API GET requests
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
            return next();
        }
        res.sendFile(path_1.default.join(frontendDir, 'index.html'));
    });
}
else {
    console.warn('⚠️ No frontend build found in possible directories:', possibleFrontendDirs);
}
// Hardened Error handling middleware (Prevents information disclosure)
app.use((err, req, res, next) => {
    console.error('⚠️ [Server Error]', err.message || err);
    const isProduction = process.env.NODE_ENV === 'production';
    res.status(err.status || 500).json({
        message: err.message || 'Une erreur interne du serveur est survenue.',
        ...(isProduction ? {} : { stack: err.stack }),
    });
});
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` Cabinet Dentaire Dr. Salma Tijini - Système Actif `);
    console.log(` Port: ${PORT}`);
    console.log(` Machine ID: ${licenseService_1.licenseService.getMachineId()}`);
    const lic = licenseService_1.licenseService.verifyLicense();
    console.log(` Statut Licence: ${lic.active ? '✅ ACTIVE (' + lic.type + ')' : '❌ NON ACTIVÉE'}`);
    console.log(`====================================================`);
});
