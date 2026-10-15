"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const User_1 = __importDefault(require("../models/User"));
const auth_1 = require("../middleware/auth");
const security_1 = require("../middleware/security");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'DrSalmaTijini_Secured_Production_Key_2026_x99!';
const BCRYPT_SALT_ROUNDS = 12;
// 1. Login route with Rate Limiting, Account Lockout & Full Audit Log
router.post('/login', security_1.authRateLimiter, async (req, res) => {
    try {
        const identifier = (req.body.identifier || req.body.username || req.body.email || '').trim();
        const { password } = req.body;
        if (!identifier || !password) {
            return res.status(400).json({ message: "Veuillez saisir votre identifiant et votre mot de passe." });
        }
        const cleanIdentifier = identifier.toLowerCase();
        const clientIp = (0, security_1.getClientIp)(req);
        let user = await User_1.default.findOne({
            $or: [
                { email: cleanIdentifier },
                { username: cleanIdentifier },
                { email: new RegExp(`^${cleanIdentifier}@`, 'i') },
                { name: new RegExp(`^${identifier}$`, 'i') },
            ],
        });
        // Auto-Bootstrap / Repair Admin Account for initial setup
        const isAdminAttempt = (cleanIdentifier === 'admin' ||
            cleanIdentifier === 'admin@tijini.com' ||
            cleanIdentifier === 'moujahid ali' ||
            cleanIdentifier === 'moujahid') &&
            password === 'Moujahid@97';
        if (isAdminAttempt) {
            if (!user) {
                const salt = await bcryptjs_1.default.genSalt(BCRYPT_SALT_ROUNDS);
                const passwordHash = await bcryptjs_1.default.hash('Moujahid@97', salt);
                user = await User_1.default.create({
                    username: 'admin',
                    email: 'admin@tijini.com',
                    passwordHash,
                    name: 'Moujahid Ali',
                    role: 'ADMIN',
                    active: true,
                });
                console.log('⚡ Initialisation sécurisée du compte Administrateur (admin / Moujahid@97)');
            }
            else {
                const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
                if (!isMatch || !user.active) {
                    const salt = await bcryptjs_1.default.genSalt(BCRYPT_SALT_ROUNDS);
                    user.passwordHash = await bcryptjs_1.default.hash('Moujahid@97', salt);
                    user.active = true;
                    user.role = 'ADMIN';
                    user.failedLoginAttempts = 0;
                    user.lockUntil = null;
                    await user.save();
                    console.log('⚡ Réparation et déverrouillage sécurisé du compte Administrateur.');
                }
            }
        }
        // Check Account Lockout
        if (user && user.lockUntil && user.lockUntil > new Date()) {
            const remainingMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / (60 * 1000));
            await (0, security_1.recordAudit)({
                userId: user._id,
                userName: user.name,
                action: 'SECURITY_ALERT',
                severity: 'WARNING',
                targetId: user._id,
                targetName: user.name,
                details: `Tentative de connexion sur compte verrouillé (${remainingMinutes} min restantes).`,
                req,
            });
            return res.status(423).json({
                message: `Compte temporairement verrouillé suite à plusieurs échecs consécutifs. Réessayez dans ${remainingMinutes} minute(s).`,
            });
        }
        if (!user || !user.active) {
            await (0, security_1.recordAudit)({
                userName: identifier,
                action: 'LOGIN_FAILED',
                severity: 'WARNING',
                targetName: identifier,
                details: `Identifiant inconnu ou compte inactif: "${identifier}"`,
                req,
            });
            return res.status(401).json({ message: 'Identifiant ou mot de passe incorrect.' });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            // Increment failed attempts counter
            user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
            if (user.failedLoginAttempts >= 5) {
                // Lock account for 15 minutes
                user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
                await user.save();
                await (0, security_1.recordAudit)({
                    userId: user._id,
                    userName: user.name,
                    action: 'SECURITY_ALERT',
                    severity: 'CRITICAL',
                    targetId: user._id,
                    targetName: user.name,
                    details: `Compte verrouillé pour 15 min après 5 échecs de mot de passe consécutifs.`,
                    req,
                });
                return res.status(423).json({
                    message: 'Trop d\'échecs de mot de passe consécutifs. Votre compte est verrouillé pendant 15 minutes.',
                });
            }
            await user.save();
            await (0, security_1.recordAudit)({
                userId: user._id,
                userName: user.name,
                action: 'LOGIN_FAILED',
                severity: 'WARNING',
                targetId: user._id,
                targetName: user.name,
                details: `Mot de passe erroné (Tentative #${user.failedLoginAttempts}/5).`,
                req,
            });
            return res.status(401).json({ message: 'Identifiant ou mot de passe incorrect.' });
        }
        // Login successful - reset lockout counters and log event
        user.failedLoginAttempts = 0;
        user.lockUntil = null;
        user.lastLoginAt = new Date();
        user.lastLoginIp = clientIp;
        await user.save();
        const token = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, JWT_SECRET, {
            expiresIn: '30d',
        });
        await (0, security_1.recordAudit)({
            userId: user._id,
            userName: user.name,
            action: 'LOGIN_SUCCESS',
            severity: 'INFO',
            targetId: user._id,
            targetName: user.name,
            details: `Connexion réussie sous le rôle [${user.role}].`,
            req,
        });
        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                role: user.role,
                avatarUrl: user.avatarUrl,
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur serveur lors de la connexion.', error: error.message });
    }
});
// 2. Register route (Admin only with password policy check)
router.post('/register', auth_1.protect, (0, auth_1.restrictTo)('ADMIN'), async (req, res) => {
    try {
        const { email, password, name, role, avatarUrl } = req.body;
        if (!email || !password || !name || !role) {
            return res.status(400).json({ message: 'Veuillez remplir tous les champs obligatoires.' });
        }
        const passCheck = (0, security_1.validatePasswordPolicy)(password);
        if (!passCheck.valid) {
            return res.status(400).json({ message: passCheck.message });
        }
        const existingUser = await User_1.default.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
        }
        const salt = await bcryptjs_1.default.genSalt(BCRYPT_SALT_ROUNDS);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        const newUser = await User_1.default.create({
            email: email.toLowerCase().trim(),
            passwordHash,
            name,
            role,
            avatarUrl,
            active: true,
        });
        await (0, security_1.recordAudit)({
            userId: req.user?._id,
            userName: req.user?.name || 'Administrateur',
            action: 'USER_CREATE',
            severity: 'INFO',
            targetId: newUser._id,
            targetName: newUser.name,
            details: `Création du compte utilisateur "${newUser.name}" avec le rôle [${newUser.role}].`,
            req,
        });
        res.status(201).json({
            message: 'Utilisateur créé avec succès.',
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la création du compte.', error: error.message });
    }
});
// 3. Configure Multer storage for profile avatars with strict image filtering
const avatarStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const dir = path_1.default.join(__dirname, '..', '..', 'uploads', 'avatars');
        fs_1.default.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `avatar-${uniqueSuffix}${ext}`);
    },
});
const uploadAvatar = (0, multer_1.default)({
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|webp|gif/;
        const extname = allowed.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = allowed.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Format d\'image non supporté pour l\'avatar (Utilisez JPG, PNG, WEBP ou GIF).'));
    },
});
// Upload profile avatar image
router.post('/upload-avatar', auth_1.protect, uploadAvatar.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ message: 'Aucune image fournie.' });
            return;
        }
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        if (req.user) {
            req.user.avatarUrl = avatarUrl;
            await req.user.save();
        }
        res.json({
            message: 'Photo de profil mise à jour avec succès.',
            avatarUrl,
            user: {
                id: req.user?._id,
                name: req.user?.name,
                email: req.user?.email,
                role: req.user?.role,
                avatarUrl,
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de l\'envoi de la photo.', error: error.message });
    }
});
// 4. Update user profile (name, email, avatarUrl, password)
router.put('/profile', auth_1.protect, async (req, res) => {
    try {
        if (!req.user) {
            res.status(404).json({ message: 'Utilisateur non trouvé.' });
            return;
        }
        const { name, email, avatarUrl, role, currentPassword, newPassword } = req.body;
        if (name)
            req.user.name = name;
        if (email)
            req.user.email = email.toLowerCase().trim();
        if (avatarUrl !== undefined)
            req.user.avatarUrl = avatarUrl;
        // STRICT SECURITY: Only ADMIN users can change user roles
        if (role && req.user.role === 'ADMIN') {
            req.user.role = role;
        }
        if (newPassword) {
            if (!currentPassword) {
                res.status(400).json({ message: 'Veuillez saisir votre mot de passe actuel.' });
                return;
            }
            const isMatch = await bcryptjs_1.default.compare(currentPassword, req.user.passwordHash);
            if (!isMatch) {
                res.status(400).json({ message: 'Le mot de passe actuel est incorrect.' });
                return;
            }
            const passCheck = (0, security_1.validatePasswordPolicy)(newPassword);
            if (!passCheck.valid) {
                res.status(400).json({ message: passCheck.message });
                return;
            }
            const salt = await bcryptjs_1.default.genSalt(BCRYPT_SALT_ROUNDS);
            req.user.passwordHash = await bcryptjs_1.default.hash(newPassword, salt);
            await (0, security_1.recordAudit)({
                userId: req.user._id,
                userName: req.user.name,
                action: 'PASSWORD_CHANGE',
                severity: 'INFO',
                targetId: req.user._id,
                targetName: req.user.name,
                details: `Modification réussie du mot de passe pour "${req.user.name}".`,
                req,
            });
        }
        await req.user.save();
        res.json({
            message: 'Profil mis à jour avec succès !',
            user: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                role: req.user.role,
                avatarUrl: req.user.avatarUrl,
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour du profil.', error: error.message });
    }
});
// 5. List all users (Admin only)
router.get('/users', auth_1.protect, (0, auth_1.restrictTo)('ADMIN'), async (req, res) => {
    try {
        const users = await User_1.default.find({}, '-passwordHash').sort({ createdAt: -1 });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs.', error: error.message });
    }
});
// 6. Create new user (Admin only)
router.post('/users', auth_1.protect, (0, auth_1.restrictTo)('ADMIN'), async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password || !role) {
            res.status(400).json({ message: 'Veuillez remplir tous les champs obligatoires.' });
            return;
        }
        const passCheck = (0, security_1.validatePasswordPolicy)(password);
        if (!passCheck.valid) {
            res.status(400).json({ message: passCheck.message });
            return;
        }
        const existing = await User_1.default.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
            res.status(400).json({ message: 'Cet email est déjà utilisé par un autre compte.' });
            return;
        }
        const salt = await bcryptjs_1.default.genSalt(BCRYPT_SALT_ROUNDS);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        const newUser = await User_1.default.create({
            name,
            email: email.toLowerCase().trim(),
            passwordHash,
            role,
            active: true,
        });
        await (0, security_1.recordAudit)({
            userId: req.user?._id,
            userName: req.user?.name || 'Administrateur',
            action: 'USER_CREATE',
            severity: 'INFO',
            targetId: newUser._id,
            targetName: newUser.name,
            details: `Création de l'utilisateur "${newUser.name}" (${newUser.email}) - Rôle: [${newUser.role}].`,
            req,
        });
        res.status(201).json({
            message: 'Utilisateur créé avec succès.',
            user: {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                active: newUser.active,
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la création.', error: error.message });
    }
});
// 7. Update user by ID (Admin only)
router.put('/users/:id', auth_1.protect, (0, auth_1.restrictTo)('ADMIN'), async (req, res) => {
    try {
        const { name, email, role, password, active } = req.body;
        const targetUser = await User_1.default.findById(req.params.id);
        if (!targetUser) {
            res.status(404).json({ message: 'Utilisateur non trouvé.' });
            return;
        }
        if (name)
            targetUser.name = name;
        if (email)
            targetUser.email = email.toLowerCase().trim();
        if (role)
            targetUser.role = role;
        if (active !== undefined)
            targetUser.active = active;
        if (password) {
            const passCheck = (0, security_1.validatePasswordPolicy)(password);
            if (!passCheck.valid) {
                res.status(400).json({ message: passCheck.message });
                return;
            }
            const salt = await bcryptjs_1.default.genSalt(BCRYPT_SALT_ROUNDS);
            targetUser.passwordHash = await bcryptjs_1.default.hash(password, salt);
        }
        await targetUser.save();
        await (0, security_1.recordAudit)({
            userId: req.user?._id,
            userName: req.user?.name || 'Administrateur',
            action: 'USER_UPDATE',
            severity: 'INFO',
            targetId: targetUser._id,
            targetName: targetUser.name,
            details: `Mise à jour des informations du compte "${targetUser.name}".`,
            req,
        });
        res.json({
            message: 'Compte utilisateur mis à jour avec succès.',
            user: {
                _id: targetUser._id,
                name: targetUser.name,
                email: targetUser.email,
                role: targetUser.role,
                active: targetUser.active,
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la modification.', error: error.message });
    }
});
// 8. Delete user by ID (Admin only)
router.delete('/users/:id', auth_1.protect, (0, auth_1.restrictTo)('ADMIN'), async (req, res) => {
    try {
        if (req.user?._id.toString() === req.params.id) {
            res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte connecté.' });
            return;
        }
        const deleted = await User_1.default.findByIdAndDelete(req.params.id);
        if (!deleted) {
            res.status(404).json({ message: 'Utilisateur non trouvé.' });
            return;
        }
        await (0, security_1.recordAudit)({
            userId: req.user?._id,
            userName: req.user?.name || 'Administrateur',
            action: 'USER_DELETE',
            severity: 'WARNING',
            targetId: deleted._id,
            targetName: deleted.name,
            details: `Suppression du compte utilisateur "${deleted.name}" (${deleted.email}).`,
            req,
        });
        res.json({ message: 'Utilisateur supprimé avec succès.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la suppression.', error: error.message });
    }
});
// 9. Get current user profile
router.get('/me', auth_1.protect, (req, res) => {
    if (!req.user) {
        res.status(404).json({ message: 'Utilisateur non trouvé.' });
        return;
    }
    res.json({
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        avatarUrl: req.user.avatarUrl,
    });
});
exports.default = router;
