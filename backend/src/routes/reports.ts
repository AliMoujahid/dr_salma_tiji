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

    // Patients statistics
    const totalPatients = await Patient.countDocuments({ isArchived: false });
    const archivedPatients = await Patient.countDocuments({ isArchived: true });

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
    const startOfYear = new Date(`${currentYear}-01-01`);

    const payments = await PaymentTransaction.find({
      date: { $gte: startOfYear },
    });

    // Group by month
    const monthlyRevenue = Array(12)
      .fill(0)
      .map((_, i) => ({
        month: new Date(currentYear, i).toLocaleString('fr-FR', { month: 'short' }),
        revenue: 0,
      }));

    payments.forEach((payment) => {
      const monthIndex = new Date(payment.date).getMonth();
      if (monthIndex >= 0 && monthIndex < 12) {
        monthlyRevenue[monthIndex].revenue += payment.amount;
      }
    });

    // Common treatments count
    const commonTreatments = await ToothHistory.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);

    res.json({
      monthlyRevenue,
      commonTreatments: commonTreatments.map((t) => ({ name: t._id, value: t.count })),
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Erreur lors du calcul des rapports financiers.', error: error.message });
  }
});

export default router;
