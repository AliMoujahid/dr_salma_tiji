import { Router, Response } from 'express';
import mongoose from 'mongoose';
import Appointment from '../models/Appointment';
import Patient from '../models/Patient';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

const isValidObjectId = (id: any): boolean => {
  return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);
};

// Get all appointments (with optional date range)
router.get('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { start, end } = req.query;
    const query: any = {};

    if (start && end) {
      const startDate = new Date(start as string);
      const endDate = new Date(end as string);
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        query.dateTime = {
          $gte: startDate,
          $lte: endDate,
        };
      }
    }

    const list = await Appointment.find(query)
      .populate('patientId', 'name phone email profilePictureUrl')
      .populate('doctorId', 'name')
      .sort({ dateTime: 1 });

    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la récupération des rendez-vous.', error: error.message });
  }
});

// Get Waiting Room Queue statistics for today
router.get('/waiting-room', protect, async (req: AuthRequest, res: Response) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const appointmentsToday = await Appointment.find({
      dateTime: { $gte: startOfToday, $lte: endOfToday },
    }).populate('patientId', 'name phone profilePictureUrl');

    const waiting = appointmentsToday.filter((a) => a.status === 'Confirmed' || a.status === 'Scheduled');
    const inTreatment = appointmentsToday.filter((a) => a.status === 'In Treatment');
    const finished = appointmentsToday.filter((a) => a.status === 'Completed');

    // Calculate dummy average waiting time or mock it based on created vs completed
    const avgWaitingTimeMinutes = 18;

    res.json({
      waiting,
      inTreatment,
      finished,
      avgWaitingTimeMinutes,
      totalToday: appointmentsToday.length,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la récupération de la salle d\'attente.', error: error.message });
  }
});

// Create new appointment
router.post('/', protect, async (req: AuthRequest, res: Response) => {
  try {
    const { patientId, dateTime, duration, chair, notes, status } = req.body;
    let { doctorId } = req.body;

    if (!patientId || !dateTime || !chair) {
      res.status(400).json({ message: 'Champs requis manquants pour le rendez-vous.' });
      return;
    }

    if (!isValidObjectId(patientId)) {
      res.status(400).json({ message: 'Identifiant patient invalide.' });
      return;
    }

    const apptDate = new Date(dateTime);
    if (isNaN(apptDate.getTime())) {
      res.status(400).json({ message: 'Date ou heure de rendez-vous invalide.' });
      return;
    }

    // Fallback doctorId to logged in user if not provided or invalid
    if (!isValidObjectId(doctorId)) {
      doctorId = req.user?._id;
    }

    const newAppt = await Appointment.create({
      patientId,
      doctorId,
      dateTime: apptDate,
      duration: Math.max(5, parseInt(duration, 10) || 30),
      chair,
      notes,
      status: status || 'Scheduled',
    });

    const populated = await Appointment.findById(newAppt._id)
      .populate('patientId', 'name phone email profilePictureUrl')
      .populate('doctorId', 'name');

    res.status(201).json(populated);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la création du rendez-vous.', error: error.message });
  }
});

// Update appointment (handles status change and drag & drop resizing/moving)
router.put('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: 'Identifiant de rendez-vous invalide.' });
      return;
    }

    const { dateTime, duration, status, chair, notes, doctorId } = req.body;
    const updateFields: any = {};

    if (dateTime) {
      const parsedDate = new Date(dateTime);
      if (!isNaN(parsedDate.getTime())) updateFields.dateTime = parsedDate;
    }
    if (duration !== undefined) updateFields.duration = Math.max(5, parseInt(duration, 10) || 30);
    if (status) updateFields.status = status;
    if (chair) updateFields.chair = chair;
    if (notes !== undefined) updateFields.notes = notes;
    if (isValidObjectId(doctorId)) updateFields.doctorId = doctorId;

    const updatedAppt = await Appointment.findByIdAndUpdate(req.params.id, updateFields, { new: true })
      .populate('patientId', 'name phone email profilePictureUrl')
      .populate('doctorId', 'name');

    if (!updatedAppt) {
      res.status(404).json({ message: 'Rendez-vous introuvable.' });
      return;
    }

    res.json(updatedAppt);
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du rendez-vous.', error: error.message });
  }
});

// Delete appointment
router.delete('/:id', protect, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: 'Identifiant de rendez-vous invalide.' });
      return;
    }

    const deleted = await Appointment.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ message: 'Rendez-vous introuvable.' });
      return;
    }
    res.json({ message: 'Rendez-vous supprimé avec succès.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors de la suppression du rendez-vous.', error: error.message });
  }
});

export default router;
