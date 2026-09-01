import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { protect, restrictTo, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-super-secret-dental-key';

// Login route (Supports username or email)
router.post('/login', async (req: any, res: any) => {
  try {
    const identifier = (req.body.identifier || req.body.username || req.body.email || '').trim();
    const { password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ message: "Veuillez saisir votre nom d'utilisateur et mot de passe." });
    }

    const cleanIdentifier = identifier.toLowerCase();
    const user = await User.findOne({
      $or: [
        { email: cleanIdentifier },
        { username: cleanIdentifier },
        { email: new RegExp(`^${cleanIdentifier}@`, 'i') },
        { name: new RegExp(`^${identifier}$`, 'i') },
      ],
    });

    if (!user || !user.active) {
      return res.status(401).json({ message: 'Identifiant ou mot de passe incorrect.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Identifiant ou mot de passe incorrect.' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: '30d',
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
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur serveur lors de la connexion.', error: error.message });
  }
});


// Register route (Admin only)
router.post('/register', protect, restrictTo('ADMIN'), async (req: any, res: any) => {
  try {
    const { email, password, name, role, avatarUrl } = req.body;
    if (!email || !password || !name || !role) {
      return res.status(400).json({ message: 'Veuillez remplir tous les champs obligatoires.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
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
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la création du compte.', error: error.message });
  }
});

// Configure Multer storage for profile avatars
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', '..', 'uploads', 'avatars');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Upload profile avatar image
router.post('/upload-avatar', protect, uploadAvatar.single('avatar'), async (req: AuthRequest, res: Response) => {
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
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de l\'envoi de la photo.', error: error.message });
  }
});

// Update user profile (name, email, role, avatarUrl, password)
router.put('/profile', protect, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(404).json({ message: 'Utilisateur non trouvé.' });
      return;
    }

    const { name, email, avatarUrl, role, currentPassword, newPassword } = req.body;

    if (name) req.user.name = name;
    if (email) req.user.email = email;
    if (avatarUrl !== undefined) req.user.avatarUrl = avatarUrl;
    // STRICT SECURITY: Only ADMIN users can change user roles
    if (role && req.user.role === 'ADMIN') {
      req.user.role = role;
    }

    if (newPassword) {
      if (!currentPassword) {
        res.status(400).json({ message: 'Veuillez saisir votre mot de passe actuel.' });
        return;
      }
      const isMatch = await bcrypt.compare(currentPassword, req.user.passwordHash);
      if (!isMatch) {
        res.status(400).json({ message: 'Le mot de passe actuel est incorrect.' });
        return;
      }
      const salt = await bcrypt.genSalt(10);
      req.user.passwordHash = await bcrypt.hash(newPassword, salt);
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
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du profil.', error: error.message });
  }
});

// List all users (Admin only)
router.get('/users', protect, restrictTo('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find({}, '-passwordHash').sort({ createdAt: -1 });
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs.', error: error.message });
  }
});

// Create new user (Admin only)
router.post('/users', protect, restrictTo('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      res.status(400).json({ message: 'Veuillez remplir tous les champs obligatoires.' });
      return;
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      res.status(400).json({ message: 'Cet email est déjà utilisé par un autre compte.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      active: true,
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
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la création.', error: error.message });
  }
});

// Update user by ID (Admin only)
router.put('/users/:id', protect, restrictTo('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, role, password, active } = req.body;
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      res.status(404).json({ message: 'Utilisateur non trouvé.' });
      return;
    }

    if (name) targetUser.name = name;
    if (email) targetUser.email = email.toLowerCase().trim();
    if (role) targetUser.role = role;
    if (active !== undefined) targetUser.active = active;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      targetUser.passwordHash = await bcrypt.hash(password, salt);
    }

    await targetUser.save();

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
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la modification.', error: error.message });
  }
});

// Delete user by ID (Admin only)
router.delete('/users/:id', protect, restrictTo('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?._id.toString() === req.params.id) {
      res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte connecté.' });
      return;
    }

    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ message: 'Utilisateur non trouvé.' });
      return;
    }

    res.json({ message: 'Utilisateur supprimé avec succès.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la suppression.', error: error.message });
  }
});

// Get current user profile
router.get('/me', protect, (req: AuthRequest, res: Response) => {
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

export default router;

