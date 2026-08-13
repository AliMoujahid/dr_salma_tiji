"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Appointment_1 = __importDefault(require("../models/Appointment"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get all appointments (with optional date range)
router.get('/', auth_1.protect, async (req, res) => {
    try {
        const { start, end } = req.query;
        const query = {};
        if (start && end) {
            query.dateTime = {
                $gte: new Date(start),
                $lte: new Date(end),
            };
        }
        const list = await Appointment_1.default.find(query)
            .populate('patientId', 'name phone email profilePictureUrl')
            .populate('doctorId', 'name')
            .sort({ dateTime: 1 });
        res.json(list);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des rendez-vous.', error: error.message });
    }
});
// Get Waiting Room Queue statistics for today
router.get('/waiting-room', auth_1.protect, async (req, res) => {
    try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        const appointmentsToday = await Appointment_1.default.find({
            dateTime: { $gte: startOfToday, $lte: endOfToday },
        }).populate('patientId', 'name phone profilePictureUrl');
        const waiting = appointmentsToday.filter((a) => a.status === 'Confirmed' || a.status === 'Scheduled');
        const inTreatment = appointmentsToday.filter((a) => a.status === 'In Treatment');
        const finished = appointmentsToday.filter((a) => a.status === 'Completed');
        // Calculate dummy average waiting time or mock it based on created vs completed
        // e.g. 15 minutes average
        const avgWaitingTimeMinutes = 18;
        res.json({
            waiting,
            inTreatment,
            finished,
            avgWaitingTimeMinutes,
            totalToday: appointmentsToday.length,
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération de la salle d\'attente.', error: error.message });
    }
});
// Create new appointment
router.post('/', auth_1.protect, async (req, res) => {
    try {
        const { patientId, dateTime, duration, chair, notes, status } = req.body;
        let { doctorId } = req.body;
        if (!patientId || !dateTime || !chair) {
            res.status(400).json({ message: 'Champs requis manquants pour le rendez-vous.' });
            return;
        }
        // Fallback doctorId to logged in user if not provided or invalid
        if (!doctorId || typeof doctorId !== 'string' || doctorId.length !== 24) {
            doctorId = req.user?._id;
        }
        const newAppt = await Appointment_1.default.create({
            patientId,
            doctorId,
            dateTime: new Date(dateTime),
            duration: duration || 30,
            chair,
            notes,
            status: status || 'Scheduled',
        });
        const populated = await Appointment_1.default.findById(newAppt._id)
            .populate('patientId', 'name phone email profilePictureUrl')
            .populate('doctorId', 'name');
        res.status(201).json(populated);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la création du rendez-vous.', error: error.message });
    }
});
// Update appointment (handles status change and drag & drop resizing/moving)
router.put('/:id', auth_1.protect, async (req, res) => {
    try {
        const { dateTime, duration, status, chair, notes, doctorId } = req.body;
        const updateFields = {};
        if (dateTime)
            updateFields.dateTime = new Date(dateTime);
        if (duration !== undefined)
            updateFields.duration = duration;
        if (status)
            updateFields.status = status;
        if (chair)
            updateFields.chair = chair;
        if (notes !== undefined)
            updateFields.notes = notes;
        if (doctorId)
            updateFields.doctorId = doctorId;
        const updatedAppt = await Appointment_1.default.findByIdAndUpdate(req.params.id, updateFields, { new: true })
            .populate('patientId', 'name phone email profilePictureUrl')
            .populate('doctorId', 'name');
        if (!updatedAppt) {
            res.status(404).json({ message: 'Rendez-vous introuvable.' });
            return;
        }
        res.json(updatedAppt);
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour du rendez-vous.', error: error.message });
    }
});
// Delete appointment
router.delete('/:id', auth_1.protect, async (req, res) => {
    try {
        const deleted = await Appointment_1.default.findByIdAndDelete(req.params.id);
        if (!deleted) {
            res.status(404).json({ message: 'Rendez-vous introuvable.' });
            return;
        }
        res.json({ message: 'Rendez-vous supprimé avec succès.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors de la suppression du rendez-vous.', error: error.message });
    }
});
exports.default = router;
