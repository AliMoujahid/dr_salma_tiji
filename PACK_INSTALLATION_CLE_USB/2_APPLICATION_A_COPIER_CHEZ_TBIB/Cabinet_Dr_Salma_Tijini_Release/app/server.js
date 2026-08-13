"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
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
const reminderScheduler_1 = require("./services/reminderScheduler");
const backupScheduler_1 = require("./services/backupScheduler");
const licenseService_1 = require("./services/licenseService");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dr-tijini';
// Middlewares
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Ensure upload folders exist
const uploadsDir = path_1.default.join(__dirname, '..', 'uploads');
const tempDir = path_1.default.join(uploadsDir, 'temp');
fs_1.default.mkdirSync(tempDir, { recursive: true });
// Static file hosting for uploaded patient documents
app.use('/uploads', express_1.default.static(uploadsDir));
// Connect to MongoDB
mongoose_1.default
    .connect(MONGODB_URI)
    .then(() => {
    console.log('MongoDB connected successfully.');
})
    .catch((err) => {
    console.error('MongoDB connection error:', err);
});
// License API routes (must be available without license block)
app.use('/api/license', license_1.default);
// License validation middleware for protected medical data API routes
app.use('/api', (req, res, next) => {
    // Allow license status checks and login without valid license
    if (req.path.startsWith('/license') || req.path === '/auth/login') {
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
// Start Automated Reminder Scheduler & Backup Cron Engines
reminderScheduler_1.reminderScheduler.initScheduler();
backupScheduler_1.backupScheduler.initScheduler();
// Base route status check
app.get('/health', (req, res) => {
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
    path_1.default.join(__dirname, '..', 'public'),
    path_1.default.join(__dirname, '..', '..', 'frontend', 'dist'),
    path_1.default.join(process.cwd(), 'public'),
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
    console.log(`Serving Frontend from: ${frontendDir}`);
    app.use(express_1.default.static(frontendDir));
    // SPA Fallback for all non-API GET requests
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
            return next();
        }
        res.sendFile(path_1.default.join(frontendDir, 'index.html'));
    });
}
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ message: 'Une erreur interne du serveur est survenue.', error: err.message });
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
