"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Patient_1 = __importDefault(require("../models/Patient"));
const Appointment_1 = __importDefault(require("../models/Appointment"));
const Invoice_1 = __importDefault(require("../models/Invoice"));
const Payment_1 = __importDefault(require("../models/Payment"));
const ToothHistory_1 = __importDefault(require("../models/ToothHistory"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get dashboard statistics overview
router.get('/dashboard-stats', auth_1.protect, async (req, res) => {
    try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        // Patients statistics
        const totalPatients = await Patient_1.default.countDocuments({ isArchived: false });
        const archivedPatients = await Patient_1.default.countDocuments({ isArchived: true });
        // Appointments statistics
        const appointmentsTodayCount = await Appointment_1.default.countDocuments({
            dateTime: { $gte: startOfToday, $lte: endOfToday },
        });
        // Revenue calculations
        const paymentsToday = await Payment_1.default.find({
            date: { $gte: startOfToday, $lte: endOfToday },
        });
        const revenueToday = paymentsToday.reduce((sum, p) => sum + p.amount, 0);
        // Invoices balances
        const invoices = await Invoice_1.default.find();
        let totalInvoiced = 0;
        let totalCollected = 0;
        invoices.forEach((inv) => {
            totalInvoiced += inv.netAmount;
            totalCollected += inv.paidAmount;
        });
        const outstandingBalance = Math.max(0, totalInvoiced - totalCollected);
        // Recent 5 invoices
        const recentInvoices = await Invoice_1.default.find()
            .populate('patientId', 'name')
            .sort({ date: -1, createdAt: -1 })
            .limit(5);
        // Recent 5 appointments
        const upcomingAppointments = await Appointment_1.default.find({ dateTime: { $gte: new Date() } })
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
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors du calcul des statistiques du tableau de bord.', error: error.message });
    }
});
// Get financial monthly / yearly aggregation reports
router.get('/financials', auth_1.protect, async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(`${currentYear}-01-01`);
        const payments = await Payment_1.default.find({
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
        const commonTreatments = await ToothHistory_1.default.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 6 },
        ]);
        res.json({
            monthlyRevenue,
            commonTreatments: commonTreatments.map((t) => ({ name: t._id, value: t.count })),
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Erreur lors du calcul des rapports financiers.', error: error.message });
    }
});
exports.default = router;
