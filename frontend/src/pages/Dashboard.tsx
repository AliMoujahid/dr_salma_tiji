import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  CalendarDays,
  DollarSign,
  TrendingUp,
  Clock,
  ArrowUpRight,
  FileText,
  Sparkles,
  Activity,
  Plus,
  ChevronRight,
  CheckCircle2,
  Armchair,
  CreditCard,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface Stats {
  totalPatients: number;
  archivedPatients?: number;
  appointmentsTodayCount: number;
  revenueToday: number;
  totalInvoiced: number;
  totalCollected: number;
  outstandingBalance: number;
  recentInvoices: any[];
  upcomingAppointments: any[];
}

export const Dashboard: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [financials, setFinancials] = useState<any>({ monthlyRevenue: [], commonTreatments: [] });
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };

        const statsRes = await fetch(`${API_URL}/reports/dashboard-stats`, { headers });
        const statsData = await statsRes.json();
        setStats(statsData);

        const finRes = await fetch(`${API_URL}/reports/financials`, { headers });
        const finData = await finRes.json();
        setFinancials(finData);
      } catch (err) {
        console.error('Error fetching dashboard details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token]);

  // Format today's date in French
  const todayFormatted = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  // Dynamic greeting based on time of day
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Bonjour' : currentHour < 18 ? 'Bon après-midi' : 'Bonsoir';

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.07,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: 'easeOut' as const },
    },
  };

  // Modern Skeleton Loader Component
  if (loading || !stats) {
    return (
      <div className="flex-1 p-6 md:p-8 flex flex-col gap-8 overflow-y-auto no-scrollbar max-h-[calc(100vh-80px)] select-none">
        {/* Skeleton Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 animate-pulse">
          <div className="flex flex-col gap-2">
            <div className="h-8 w-64 bg-slate-800/60 rounded-xl"></div>
            <div className="h-4 w-96 bg-slate-800/40 rounded-lg"></div>
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-32 bg-slate-800/50 rounded-xl"></div>
            <div className="h-10 w-36 bg-blue-600/30 rounded-xl"></div>
          </div>
        </div>

        {/* Skeleton KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-36 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/5 p-6 flex flex-col justify-between animate-pulse shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800/60 rounded-md"></div>
                <div className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-slate-800/50"></div>
              </div>
              <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800/80 rounded-lg"></div>
            </div>
          ))}
        </div>

        {/* Skeleton Analytics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/5 p-6 animate-pulse shadow-sm">
            <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800/60 rounded-md mb-6"></div>
            <div className="h-44 bg-slate-100 dark:bg-slate-800/20 rounded-2xl flex items-end justify-between p-4 gap-3">
              {[40, 65, 30, 80, 50, 95, 70, 85, 60, 45, 90, 75].map((h, i) => (
                <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-slate-200 dark:bg-slate-800/50 rounded-t-lg"></div>
              ))}
            </div>
          </div>
          <div className="h-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/5 p-6 animate-pulse shadow-sm">
            <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800/60 rounded-md mb-6"></div>
            <div className="flex flex-col gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="h-3 w-full bg-slate-200 dark:bg-slate-800/40 rounded-md"></div>
                  <div className="h-2 w-full bg-slate-200 dark:bg-slate-800/20 rounded-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Find max monthly revenue to scale the graph bars
  const maxRevenue = financials.monthlyRevenue.reduce((max: number, m: any) => Math.max(max, m.revenue), 0) || 1;
  const totalAnnualRevenue = financials.monthlyRevenue.reduce((sum: number, m: any) => sum + m.revenue, 0);

  const kpis = [
    {
      id: 'patients',
      name: 'Patients Actifs',
      value: stats.totalPatients.toLocaleString('fr-FR'),
      subtext: `${stats.archivedPatients || 0} archivés`,
      icon: Users,
      gradient: 'from-cyan-500/20 via-blue-500/10 to-transparent',
      borderGlow: 'hover:border-cyan-500/30',
      iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      badge: '+12% ce mois',
      badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      onClick: () => navigate('/patients'),
    },
    {
      id: 'appointments',
      name: "Rendez-vous Aujourd'hui",
      value: stats.appointmentsTodayCount.toString(),
      subtext: stats.upcomingAppointments?.length > 0 ? `${stats.upcomingAppointments.length} en attente` : 'Planning fluide',
      icon: CalendarDays,
      gradient: 'from-violet-500/20 via-indigo-500/10 to-transparent',
      borderGlow: 'hover:border-violet-500/30',
      iconBg: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
      badge: 'Planning',
      badgeColor: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20',
      onClick: () => navigate('/appointments'),
    },
    {
      id: 'revenue',
      name: 'Recettes du Jour',
      value: `${stats.revenueToday.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`,
      subtext: `Total encaissé : ${stats.totalCollected.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} DH`,
      icon: DollarSign,
      gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
      borderGlow: 'hover:border-emerald-500/30',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      badge: 'Encaissé',
      badgeColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
      onClick: () => navigate('/invoices'),
    },
    {
      id: 'outstanding',
      name: 'Restes à Recouvrer',
      value: `${stats.outstandingBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`,
      subtext: 'Factures en attente de solde',
      icon: Clock,
      gradient: 'from-amber-500/20 via-rose-500/10 to-transparent',
      borderGlow: 'hover:border-amber-500/30',
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      badge: 'À régulariser',
      badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
      onClick: () => navigate('/invoices'),
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex-1 p-6 md:p-8 flex flex-col gap-8 overflow-y-auto no-scrollbar max-h-[calc(100vh-80px)] select-none relative"
    >
      {/* Ambient background glow orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse"></div>
      <div className="absolute top-1/3 right-10 w-80 h-80 bg-purple-600/8 rounded-full blur-3xl pointer-events-none -z-10"></div>

      {/* TOP HERO HEADER */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row justify-between lg:items-center gap-5">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xxs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              Cabinet Opérationnel
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium capitalize hidden sm:inline-block">
              {todayFormatted}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-1.5 flex items-center gap-2">
            <span>{greeting}, {user?.name || 'Dr. Salma Tijini'}</span>
            <Sparkles className="w-5 h-5 text-amber-500" />
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 font-normal">
            Supervision clinique, gestion des consultations et état financier en direct.
          </p>
        </div>

        {/* Quick Action Navigation Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => navigate('/patients')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-900/60 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all hover:scale-102 active:scale-98 cursor-pointer shadow-xs"
          >
            <Users className="w-4 h-4 text-cyan-500" />
            <span>Patients</span>
          </button>
          <button
            onClick={() => navigate('/appointments')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-900/60 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all hover:scale-102 active:scale-98 cursor-pointer shadow-xs"
          >
            <CalendarDays className="w-4 h-4 text-violet-500" />
            <span>Agenda</span>
          </button>
          <button
            onClick={() => navigate('/waiting-room')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-900/60 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all hover:scale-102 active:scale-98 cursor-pointer shadow-xs"
          >
            <Armchair className="w-4 h-4 text-indigo-500" />
            <span>Salle d'Attente</span>
          </button>
          <button
            onClick={() => navigate('/invoices')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-all shadow-md shadow-blue-500/20 hover:scale-102 active:scale-98 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Facture</span>
          </button>
        </div>
      </motion.div>

      {/* KPI METRIC CARDS */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi) => (
          <motion.div
            key={kpi.id}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            onClick={kpi.onClick}
            className={`rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/8 p-5 md:p-6 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group ${kpi.borderGlow}`}
          >
            <div className="flex justify-between items-start relative z-10">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{kpi.name}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border w-fit mt-0.5 font-mono ${kpi.badgeColor}`}>
                  {kpi.badge}
                </span>
              </div>
              <div className={`p-2.5 rounded-xl border shadow-inner ${kpi.iconBg} group-hover:scale-110 transition-transform`}>
                <kpi.icon className="w-5 h-5" />
              </div>
            </div>

            <div className="flex flex-col gap-1 relative z-10">
              <span className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight font-mono">
                {kpi.value}
              </span>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium pt-1 border-t border-slate-100 dark:border-white/5">
                <span>{kpi.subtext}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ANALYTICS & CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* REVENUE BAR CHART CARD */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/8 p-6 md:p-7 shadow-sm hover:shadow-md flex flex-col justify-between gap-6 relative overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Recettes & Chiffre d'Affaires
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Total annuel encaissé : <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{totalAnnualRevenue.toLocaleString('fr-FR')} DH</strong>
              </p>
            </div>

            {/* Sub-badge info */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 px-3 py-1.5 rounded-xl self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-mono">Année {new Date().getFullYear()}</span>
            </div>
          </div>

          {/* Bar Chart Canvas with Gridlines */}
          <div className="relative h-56 w-full pt-4 flex flex-col justify-between">
            {/* Background Grid lines */}
            <div className="absolute inset-0 top-4 bottom-7 flex flex-col justify-between pointer-events-none opacity-40">
              <div className="border-b border-dashed border-slate-200 dark:border-white/10 w-full"></div>
              <div className="border-b border-dashed border-slate-200 dark:border-white/10 w-full"></div>
              <div className="border-b border-dashed border-slate-200 dark:border-white/10 w-full"></div>
            </div>

            {/* Bars Column */}
            <div className="flex-1 w-full flex items-end justify-between gap-1.5 sm:gap-3 md:gap-4 relative z-10">
              {financials.monthlyRevenue.map((item: any, i: number) => {
                const heightPct = maxRevenue > 0 ? Math.max(8, (item.revenue / maxRevenue) * 100) : 8;
                const isCurrentMonth = new Date().getMonth() === i;
                const hasRevenue = item.revenue > 0;

                return (
                  <div key={i} className="flex-1 h-full flex flex-col justify-end items-center group/bar cursor-pointer relative">
                    {/* Floating tooltip */}
                    <div className="absolute -top-10 scale-0 group-hover/bar:scale-100 transition-all duration-200 pointer-events-none z-30 whitespace-nowrap">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-white bg-slate-900 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-700 shadow-xl font-mono">
                          {item.revenue.toLocaleString('fr-FR')} DH
                        </span>
                        <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-0.5"></div>
                      </div>
                    </div>

                    {/* Bar Column */}
                    <div className="w-full flex justify-center items-end h-full">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full max-w-[28px] rounded-t-xl transition-all duration-500 group-hover/bar:scale-y-105 origin-bottom relative overflow-hidden ${
                          isCurrentMonth
                            ? 'bg-gradient-to-t from-blue-600 via-indigo-500 to-cyan-400 shadow-md shadow-indigo-500/25 ring-2 ring-cyan-400/40'
                            : hasRevenue
                            ? 'bg-gradient-to-t from-blue-700 via-indigo-600 to-blue-400 dark:from-indigo-900/80 dark:via-blue-600/70 dark:to-cyan-400/80 hover:from-blue-500 hover:to-cyan-400'
                            : 'bg-slate-200 dark:bg-slate-800/60'
                        }`}
                      >
                        {/* Glow highlight on top of bar */}
                        {hasRevenue && (
                          <div className="absolute top-0 inset-x-0 h-1.5 bg-white/50 rounded-t-xl"></div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-Axis Labels */}
            <div className="flex w-full justify-between items-center pt-2 border-t border-slate-200/80 dark:border-white/10 mt-1">
              {financials.monthlyRevenue.map((item: any, i: number) => {
                const isCurrentMonth = new Date().getMonth() === i;
                return (
                  <span
                    key={i}
                    className={`flex-1 text-center text-[10px] font-bold tracking-tight ${
                      isCurrentMonth
                        ? 'text-blue-600 dark:text-cyan-400 font-extrabold underline underline-offset-4 decoration-cyan-400'
                        : 'text-slate-500 dark:text-slate-400 group-hover/bar:text-slate-900 dark:group-hover/bar:text-slate-200'
                    }`}
                  >
                    {item.month}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
            <span className="text-[11px]">Moyenne mensuelle: ~{(totalAnnualRevenue / 12).toFixed(0)} DH</span>
            <button
              onClick={() => navigate('/reports')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-500 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Rapport Financier Complet</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>

        {/* COMMON DENTAL TREATMENTS CARD */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/8 p-6 md:p-7 shadow-sm hover:shadow-md flex flex-col justify-between gap-5 relative overflow-hidden"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20">
                <Activity className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Actes Cliniques Fréquents</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Répartition des interventions réalisées</p>
          </div>

          <div className="flex flex-col gap-3.5 justify-center my-auto">
            {financials.commonTreatments.length === 0 ? (
              <div className="text-center py-10 flex flex-col items-center gap-2">
                <Layers className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                <p className="text-xs text-slate-500 dark:text-slate-400">Aucun historique d'acte disponible pour l'instant.</p>
              </div>
            ) : (
              financials.commonTreatments.map((treatment: any, index: number) => {
                const colors = [
                  'from-blue-500 to-cyan-400',
                  'from-emerald-500 to-teal-400',
                  'from-violet-500 to-purple-400',
                  'from-amber-500 to-orange-400',
                  'from-pink-500 to-rose-400',
                  'from-indigo-500 to-blue-400',
                ];
                const grad = colors[index % colors.length];

                return (
                  <div key={index} className="flex flex-col gap-1.5 group">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[170px] group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                        {treatment.name}
                      </span>
                      <span className="text-indigo-600 dark:text-indigo-300 font-mono font-bold text-xs bg-indigo-50 dark:bg-white/5 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-white/5">
                        {treatment.value} actes
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800/80 overflow-hidden p-0.5 border border-slate-200/50 dark:border-white/5">
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(15, (treatment.value / (stats.totalPatients || 1)) * 100))}%`,
                        }}
                        className={`h-full rounded-full bg-gradient-to-r ${grad} shadow-xs transition-all duration-700`}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <button
            onClick={() => navigate('/patients')}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Explorer Odontogrammes 3D</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>

      </div>

      {/* TODAY'S SCHEDULE & RECENT INVOICES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* TODAY'S APPOINTMENTS AGENDA */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/8 p-6 md:p-7 shadow-sm hover:shadow-md flex flex-col gap-5"
        >
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20">
                <CalendarDays className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Rendez-vous du Jour</h3>
                <p className="text-xxs text-slate-500 dark:text-slate-400">Flux des consultations programmées</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/appointments')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-500 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Voir Agenda</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-3 max-h-[340px] overflow-y-auto no-scrollbar">
            {stats.upcomingAppointments.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center gap-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500/40" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Aucun rendez-vous restant pour aujourd'hui.</p>
                <p className="text-xxs text-slate-400 dark:text-slate-500">Tous les patients programmés ont été consultés.</p>
              </div>
            ) : (
              stats.upcomingAppointments.map((appt) => {
                const timeStr = new Date(appt.dateTime).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <motion.div
                    key={appt._id}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => navigate(`/patients/${appt.patientId?._id}`)}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-white/3 dark:hover:bg-white/6 border border-slate-200/60 dark:border-white/6 hover:border-blue-300 dark:hover:border-blue-500/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 shrink-0 shadow-xs relative">
                        <img
                          src={
                            appt.patientId?.profilePictureUrl ||
                            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(appt.patientId?.name || 'P')}`
                          }
                          alt={appt.patientId?.name}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
                      </div>
                      <div className="flex flex-col">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {appt.patientId?.name || 'Patient'}
                        </h4>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                          {appt.notes || 'Consultation dentaire courante'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-extrabold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-0.5 rounded-lg border border-blue-200 dark:border-blue-500/20 font-mono">
                        {timeStr}
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                        {appt.duration || 30} min
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* RECENT INVOICES & PAYMENTS */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/8 p-6 md:p-7 shadow-sm hover:shadow-md flex flex-col gap-5"
        >
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                <CreditCard className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Facturation Récente</h3>
                <p className="text-xxs text-slate-500 dark:text-slate-400">Derniers règlements et devis émis</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/invoices')}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Gestion Factures</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-3 max-h-[340px] overflow-y-auto no-scrollbar">
            {stats.recentInvoices.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center gap-2">
                <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Aucune facture enregistrée récemment.</p>
              </div>
            ) : (
              stats.recentInvoices.map((inv) => (
                <motion.div
                  key={inv._id}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => navigate('/invoices')}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-white/3 dark:hover:bg-white/6 border border-slate-200/60 dark:border-white/6 hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400 shadow-inner group-hover:scale-105 transition-transform">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white font-mono tracking-wider group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        FACT-{inv.invoiceNumber}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{inv.patientId?.name || 'Patient'}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs md:text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                      {inv.netAmount?.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                    </span>
                    <span
                      className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        inv.paymentStatus === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                          : inv.paymentStatus === 'Partially Paid'
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                          : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                      }`}
                    >
                      {inv.paymentStatus === 'Paid'
                        ? 'Payé'
                        : inv.paymentStatus === 'Partially Paid'
                        ? 'Partiel'
                        : 'Impayé'}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

      </div>

    </motion.div>
  );
};

export default Dashboard;

