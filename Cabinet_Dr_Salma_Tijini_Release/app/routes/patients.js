"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Patient_1 = __importDefault(require("../models/Patient"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get all patients with filters, search, and pagination
router.get('/', auth_1.protect, async (req, res) => {
    try {
        const { search, archived = 'false', favorite, limit = '10', page = '1' } = req.query;
        const query = {};
        // Filtering by archived status
        query.isArchived = archived === 'true';
        // Filter by favorite status
        if (favorite === 'true') {
            query.isFavorite = true;
        }
        // Global Search (name, phone, email, nationalId)
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { name: searchRegex },
                { phone: searchRegex },
                { email: searchRegex },
                { nationalId: searchRegex },
            ];
        }
        const pageSize = parseInt(limit, 10);
        const pageNum = parseInt(page, 10);
        const total = await Patient_1.default.countDocuments(query);
        const list = await Patient_1.default.find(query)
            .sort({ updatedAt: -1 })
            .skip((pageNum - 1) * pageSize)
            .limit(pageSize);
        res.json({
            patients: list,
            total,
            pages: Math.ceil(total / pageSize),
            currentPage: pageNum,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des patients.', error: error.message });
    }
});
// Get recently viewed patients
router.get('/recent', auth_1.protect, async (req, res) => {
    try {
        const recent = await Patient_1.default.find({ isArchived: false, recentlyViewedAt: { $ne: undefined } })
            .sort({ recentlyViewedAt: -1 })
            .limit(5);
        res.json(recent);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des patients récents.', error: error.message });
    }
});
// Get patient details by ID
router.get('/:id', auth_1.protect, async (req, res) => {
    try {
        const patient = await Patient_1.default.findById(req.params.id);
        if (!patient) {
            res.status(404).json({ message: 'Patient introuvable.' });
            return;
        }
        // Update recently viewed timestamp
        patient.recentlyViewedAt = new Date();
        await patient.save();
        res.json(patient);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération du patient.', error: error.message });
    }
});
// Create new patient
router.post('/', auth_1.protect, async (req, res) => {
    try {
        const { name, nationalId, phone, email, address, birthDate, gender, bloodType, emergencyContact, insurance, medicalHistory, allergies, currentMedications, notes, profilePictureUrl, } = req.body;
        if (!name || !phone || !birthDate || !gender) {
            res.status(400).json({ message: 'Veuillez renseigner les champs obligatoires (Nom, Téléphone, Date de Naissance, Genre).' });
            return;
        }
        const newPatient = await Patient_1.default.create({
            name,
            nationalId,
            phone,
            email,
            address,
            birthDate,
            gender,
            bloodType,
            emergencyContact,
            insurance,
            medicalHistory: medicalHistory || [],
            allergies: allergies || [],
            currentMedications: currentMedications || [],
            notes,
            profilePictureUrl,
            isArchived: false,
            isFavorite: false,
        });
        res.status(201).json(newPatient);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la création du patient.', error: error.message });
    }
});
// Edit patient details
router.put('/:id', auth_1.protect, async (req, res) => {
    try {
        const updatedPatient = await Patient_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!updatedPatient) {
            res.status(404).json({ message: 'Patient introuvable.' });
            return;
        }
        res.json(updatedPatient);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour du patient.', error: error.message });
    }
});
// Toggle Archive patient
router.put('/:id/archive', auth_1.protect, async (req, res) => {
    try {
        const patient = await Patient_1.default.findById(req.params.id);
        if (!patient) {
            res.status(404).json({ message: 'Patient introuvable.' });
            return;
        }
        patient.isArchived = !patient.isArchived;
        await patient.save();
        res.json({ message: patient.isArchived ? 'Patient archivé.' : 'Patient désarchivé.', patient });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la modification de l\'archivage.', error: error.message });
    }
});
// Toggle Favorite patient
router.put('/:id/favorite', auth_1.protect, async (req, res) => {
    try {
        const patient = await Patient_1.default.findById(req.params.id);
        if (!patient) {
            res.status(404).json({ message: 'Patient introuvable.' });
            return;
        }
        patient.isFavorite = !patient.isFavorite;
        await patient.save();
        res.json({ message: patient.isFavorite ? 'Ajouté aux favoris.' : 'Retiré des favoris.', patient });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors du toggle favori.', error: error.message });
    }
});
// Delete patient completely
router.delete('/:id', auth_1.protect, async (req, res) => {
    try {
        const patient = await Patient_1.default.findByIdAndDelete(req.params.id);
        if (!patient) {
            res.status(404).json({ message: 'Patient introuvable.' });
            return;
        }
        res.json({ message: 'Patient supprimé définitivement.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la suppression du patient.', error: error.message });
    }
});
exports.default = router;
