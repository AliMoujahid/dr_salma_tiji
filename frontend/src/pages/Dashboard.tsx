import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  CalendarDays,
  DollarSign,
  TrendingUp,
  Clock,
  ArrowUpRight,
  FileText
} from 'lucide-react';

interface Stats {
  totalPatients: number;
  appointmentsTodayCount: number;
  revenueToday: number;
  outstandingBalance: number;
  recentInvoices: any[];
  upcomingAppointments: any[];
}

export const Dashboard: React.FC = () => {
  const { token } = useAuth();
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

  if (loading || !stats) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-400">Chargement des données du tableau de bord...</p>
        </div>
      </div>
    );
  }

  // Find max monthly revenue to scale the graph bars
  const maxRevenue = financials.monthlyRevenue.reduce((max: number, m: any) => Math.max(max, m.revenue), 0) || 1;

  const kpis = [
    {
      name: 'Patients Actifs',
      value: stats.totalPatients,
      icon: Users,
      color: 'from-blue-600/20 to-cyan-500/5',
      iconColor: 'text-blue-400',
    },
    {
      name: 'Rendez-vous Aujourd\'hui',
      value: stats.appointmentsTodayCount,
      icon: CalendarDays,
      color: 'from-indigo-600/20 to-purple-500/5',
      iconColor: 'text-indigo-400',
    },
    {
      name: 'Recettes du Jour',
      value: `${stats.revenueToday.toFixed(2)} DH`,
      icon: DollarSign,
      color: 'from-emerald-600/20 to-teal-500/5',
      iconColor: 'text-emerald-400',
    },
    {
      name: 'Restes à Recouvrer',
      value: `${stats.outstandingBalance.toFixed(2)} DH`,
      icon: Clock,
      color: 'from-rose-600/20 to-pink-500/5',
      iconColor: 'text-rose-400',
    },
  ];

  return (
    <div className="flex-1 p-8 flex flex-col gap-8 overflow-y-auto no-scrollbar max-h-[calc(100vh-80px)] select-none">
      
      {/* Welcome banner */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Bonjour, Dr. Tijini</h2>
          <p className="text-xs text-slate-400 mt-1">Voici l'état opérationnel et financier de votre cabinet pour aujourd'hui.</p>
        </div>
        <button
          onClick={() => navigate('/invoices')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white transition-all shadow-lg shadow-blue-600/20 cursor-pointer"
        >
          <span>Nouvelle Facture</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* KPI grid panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => (
          <div
            key={index}
            className={`rounded-2xl bg-gradient-to-br ${kpi.color} border border-white/5 p-6 flex items-center justify-between shadow-lg hover:border-white/10 transition-all group`}
          >
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{kpi.name}</span>
              <span className="text-2xl font-bold text-white tracking-tight group-hover:scale-102 transition-all origin-left">
                {kpi.value}
              </span>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <kpi.icon className={`w-6 h-6 ${kpi.iconColor}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue monthly bar graph card */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900/40 border border-white/5 p-6 shadow-xl flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recettes Mensuelles (DH)</h3>
              <p className="text-xxs text-slate-500 mt-0.5">Évolution mensuelle des encaissements de l'année en cours</p>
            </div>
            <TrendingUp className="w-5 h-5 text-indigo-400" />
          </div>

          {/* Bar Chart Graphics */}
          <div className="flex gap-4 h-48 items-end justify-between px-2 pt-4">
            {financials.monthlyRevenue.map((item: any, i: number) => {
              const heightPct = Math.max(4, (item.revenue / maxRevenue) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group/bar cursor-pointer">
                  <div className="w-full relative flex justify-center">
                    <span className="absolute -top-7 scale-0 group-hover/bar:scale-100 transition-all duration-200 text-xxs font-bold text-emerald-400 bg-slate-950/80 px-2 py-0.5 rounded border border-white/10 z-10 font-mono">
                      {item.revenue.toFixed(0)}
                    </span>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full max-w-[20px] rounded-t bg-gradient-to-t from-blue-600 to-indigo-400 hover:from-emerald-500 hover:to-teal-400 transition-all duration-300 group-hover/bar:shadow-lg shadow-indigo-500/20"
                    ></div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 tracking-tighter">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Most common treatments card */}
        <div className="rounded-2xl bg-slate-900/40 border border-white/5 p-6 shadow-xl flex flex-col gap-6">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Actes Fréquents</h3>
            <p className="text-xxs text-slate-500 mt-0.5">Répartition des traitements par type d'intervention</p>
          </div>

          <div className="flex flex-col gap-3 justify-center h-full">
            {financials.commonTreatments.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">Données insuffisantes.</p>
            ) : (
              financials.commonTreatments.map((treatment: any, index: number) => (
                <div key={index} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-300 truncate max-w-[150px]">{treatment.name}</span>
                    <span className="text-indigo-400 font-mono font-bold">{treatment.value}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, (treatment.value / stats.totalPatients) * 100 || 20)}%` }}
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Lists Row: Agenda and Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Today's Agenda */}
        <div className="rounded-2xl bg-slate-900/40 border border-white/5 p-6 shadow-xl flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Rendez-vous du Jour</h3>
            <span className="text-xxs font-extrabold text-indigo-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded-md">
              Aujourd'hui
            </span>
          </div>

          <div className="flex flex-col gap-3.5 max-h-[300px] overflow-y-auto no-scrollbar">
            {stats.upcomingAppointments.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-10">Aucun rendez-vous planifié aujourd'hui.</p>
            ) : (
              stats.upcomingAppointments.map((appt) => (
                <div
                  key={appt._id}
                  onClick={() => navigate(`/patients/${appt.patientId?._id}`)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-white/10">
                      <img
                        src={appt.patientId?.profilePictureUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${appt.patientId?.name}`}
                        alt={appt.patientId?.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">{appt.patientId?.name}</h4>
                      <p className="text-xxs text-slate-400 mt-0.5">{appt.notes || 'Consultation courante'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-blue-400 font-mono">
                      {new Date(appt.dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                      {appt.chair}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="rounded-2xl bg-slate-900/40 border border-white/5 p-6 shadow-xl flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Dernières Factures</h3>
            <span className="text-xxs text-slate-400 font-medium">Flux récent</span>
          </div>

          <div className="flex flex-col gap-3.5 max-h-[300px] overflow-y-auto no-scrollbar">
            {stats.recentInvoices.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-10">Aucune facture enregistrée.</p>
            ) : (
              stats.recentInvoices.map((inv) => (
                <div
                  key={inv._id}
                  onClick={() => navigate(`/invoices`)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600/10 rounded-xl border border-blue-500/15">
                      <FileText className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white font-mono">FACT-{inv.invoiceNumber}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{inv.patientId?.name}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="text-xs font-bold text-white font-mono">
                      {inv.netAmount.toFixed(2)} DH
                    </span>
                    <span
                      className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        inv.paymentStatus === 'Paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : inv.paymentStatus === 'Partially Paid'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {inv.paymentStatus === 'Paid'
                        ? 'Payé'
                        : inv.paymentStatus === 'Partially Paid'
                        ? 'Partiel'
                        : 'Impayé'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
