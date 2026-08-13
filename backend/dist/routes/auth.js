"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-super-secret-dental-key';
// Login route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Veuillez saisir votre email et mot de passe.' });
        }
        const user = await User_1.default.findOne({ email });
        if (!user || !user.active) {
            return res.status(401).json({ message: 'Identifiants incorrects ou compte inactif.' });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Identifiants incorrects.' });
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, JWT_SECRET, {
            expiresIn: '30d',
        });
        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatarUrl: user.avatarUrl,
            },
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur serveur lors de la connexion.', error: error.message });
    }
});
// Register route (Admin only)
router.post('/register', auth_1.protect, (0, auth_1.restrictTo)('ADMIN'), async (req, res) => {
    try {
        const { email, password, name, role, avatarUrl } = req.body;
        if (!email || !password || !name || !role) {
            return res.status(400).json({ message: 'Veuillez remplir tous les champs obligatoires.' });
        }
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        const newUser = await User_1.default.create({
            email,
            passwordHash,
            name,
            role,
            avatarUrl,
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
// Get current user profile
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
