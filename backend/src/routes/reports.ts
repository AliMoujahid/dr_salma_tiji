import { Router, Response } from 'express';
import Patient from '../models/Patient';
import Appointment from '../models/Appointment';
import Invoice from '../models/Invoice';
import PaymentTransaction from '../models/Payment';
import ToothHistory from '../models/ToothHistory';
import { protect, AuthRequest } from '../middleware/auth';

const router = Router();

// Get dashboard statistics overview
router.get('/dashboard-stats', protect, async (req: AuthRequest, res: Response) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Patients statistics (excluding soft-deleted)
    const totalPatients = await Patient.countDocuments({ isArchived: false, deleted: { $ne: true } });
    const archivedPatients = await Patient.countDocuments({ isArchived: true, deleted: { $ne: true } });

    // Appointments statistics
    const appointmentsTodayCount = await Appointment.countDocuments({
      dateTime: { $gte: startOfToday, $lte: endOfToday },
    });
    
    // Revenue calculations
    const paymentsToday = await PaymentTransaction.find({
      date: { $gte: startOfToday, $lte: endOfToday },
    });
    const revenueToday = paymentsToday.reduce((sum, p) => sum + p.amount, 0);

    // Invoices balances
    const invoices = await Invoice.find();
    let totalInvoiced = 0;
    let totalCollected = 0;
    
    invoices.forEach((inv) => {
      totalInvoiced += inv.netAmount;
      totalCollected += inv.paidAmount;
    });

    const outstandingBalance = Math.max(0, totalInvoiced - totalCollected);

    // Recent 5 invoices
    const recentInvoices = await Invoice.find()
      .populate('patientId', 'name')
      .sort({ date: -1, createdAt: -1 })
      .limit(5);

    // Recent 5 appointments
    const upcomingAppointments = await Appointment.find({ dateTime: { $gte: new Date() } })
      .populate('patientId', 'name phone profilePictureUrl')
      .sort({ dateTime: 1 })
      .limit(5);

    res.json({
      totalPatients,
      archivedPatients,
      appointmentsTodayCount,
      revenueToday,
      totalInvoiced,
      totalCollected,
      outstandingBalance,
      recentInvoices,
      upcomingAppointments,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors du calcul des statistiques du tableau de bord.', error: error.message });
  }
});

// Get financial monthly / yearly aggregation reports
router.get('/financials', protect, async (req: AuthRequest, res: Response) => {
  try {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1, 0, 0, 0, 0);

    const payments = await PaymentTransaction.find({
      date: { $gte: startOfYear },
    });

    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const monthlyRevenue = monthNames.map((month) => ({
      month,
      revenue: 0,
    }));

    payments.forEach((payment) => {
      const pDate = new Date(payment.date);
      if (pDate.getFullYear() === currentYear) {
        const monthIndex = pDate.getMonth();
        if (monthIndex >= 0 && monthIndex < 12) {
          monthlyRevenue[monthIndex].revenue += payment.amount;
        }
      }
    });

    // Translation dictionary for clinical conditions
    const treatmentLabels: Record<string, string> = {
      Healthy: 'Dents Saines / Bilan',
      Filling: 'Obturation / Composite',
      Crown: 'Couronne Zircone',
      'Root Canal': 'Dévitalisation / Endodontie',
      Implant: 'Implant Dentaire',
      Extracted: 'Extraction Chirurgicale',
      Bridge: 'Bridge Céramique',
      Fracture: 'Fracture Dentaire',
      Missing: 'Dent Manquante',
      'Wisdom Tooth': 'Dent de Sagesse',
      Mobile: 'Dent Mobile',
    };

    // Common treatments count
    const rawTreatments = await ToothHistory.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);

    const commonTreatments = rawTreatments.map((t) => ({
      name: treatmentLabels[t._id] || t._id,
      rawStatus: t._id,
      value: t.count,
    }));

    res.json({
      monthlyRevenue,
      commonTreatments,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors du calcul des rapports financiers.', error: error.message });
  }
});

export default router;
