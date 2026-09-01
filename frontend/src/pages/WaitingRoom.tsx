import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MonitorPlay, Users, Armchair, CheckCircle2, Play, ChevronRight } from 'lucide-react';

interface WaitingRoomData {
  waiting: any[];
  inTreatment: any[];
  finished: any[];
  avgWaitingTimeMinutes: number;
  totalToday: number;
}

export const WaitingRoom: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<WaitingRoomData | null>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchQueue();
    // Poll queue every 30 seconds for live updates
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchQueue = () => {
    fetch(`${API_URL}/appointments/waiting-room`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((resData) => setData(resData))
      .catch((err) => console.error('Error fetching waiting room:', err))
      .finally(() => setLoading(false));
  };

  const handleUpdateStatus = (apptId: string, newStatus: string) => {
    fetch(`${API_URL}/appointments/${apptId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    })
      .then(() => fetchQueue())
      .catch((err) => console.error('Error updating queue status:', err));
  };

  if (loading || !data) {
    return (
      <div className="flex-grow flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 overflow-y-auto no-scrollbar max-h-[calc(100vh-80px)] select-none">
      
      {/* Title & Stats */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Salle d'attente virtuelle
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Supervisez les flux de patients présents aujourd'hui à la clinique en temps réel.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-4 flex flex-col gap-0.5 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Temps d'attente moyen</span>
            <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 font-mono">{data.avgWaitingTimeMinutes} min</span>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl p-4 flex flex-col gap-0.5 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Visiteurs</span>
            <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">{data.totalToday} patients</span>
          </div>
        </div>
      </div>

      {/* Grid lanes (Waiting, In Treatment, Completed) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-2">
        
        {/* WAITING LANE */}
        <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 p-5 flex flex-col gap-4 min-h-[450px] shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
            <h3 className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>En attente ({data.waiting.length})</span>
            </h3>
          </div>

          <div className="flex flex-col gap-3">
            {data.waiting.map((a) => (
              <div
                key={a._id}
                onClick={() => navigate(`/patients/${a.patientId?._id}`)}
                className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100/80 dark:bg-white/3 dark:hover:bg-white/5 border border-slate-200/60 dark:border-white/5 transition-all flex flex-col justify-between gap-3 group relative cursor-pointer"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 shrink-0">
                      <img src={a.patientId?.profilePictureUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${a.patientId?.name}`} alt={a.patientId?.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all">{a.patientId?.name}</h4>
                      <p className="text-[10px] text-slate-500 font-medium font-mono mt-0.5">
                        RDV : {new Date(a.dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-200/60 dark:border-white/5 select-none opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateStatus(a._id, 'In Treatment');
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[10px] cursor-pointer shadow-xs"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Lancer le Soin</span>
                  </button>
                </div>
              </div>
            ))}
            {data.waiting.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-10">Aucun patient en attente.</p>
            )}
          </div>
        </div>

        {/* IN TREATMENT LANE */}
        <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 p-5 flex flex-col gap-4 min-h-[450px] shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
            <h3 className="text-xs font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-2">
              <Armchair className="w-4 h-4" />
              <span>En traitement ({data.inTreatment.length})</span>
            </h3>
          </div>

          <div className="flex flex-col gap-3">
            {data.inTreatment.map((a) => (
              <div
                key={a._id}
                onClick={() => navigate(`/patients/${a.patientId?._id}`)}
                className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100/80 dark:bg-white/3 dark:hover:bg-white/5 border border-slate-200/60 dark:border-white/5 transition-all flex flex-col justify-between gap-3 group relative cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 shrink-0">
                    <img src={a.patientId?.profilePictureUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${a.patientId?.name}`} alt={a.patientId?.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all">{a.patientId?.name}</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Consultation en cours</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-200/60 dark:border-white/5 select-none opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateStatus(a._id, 'Completed');
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px] cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Terminer</span>
                  </button>
                </div>
              </div>
            ))}
            {data.inTreatment.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-10">Aucun patient en cours de soin.</p>
            )}
          </div>
        </div>

        {/* COMPLETED LANE */}
        <div className="rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 p-5 flex flex-col gap-4 min-h-[450px] shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
            <h3 className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Visite Terminée ({data.finished.length})</span>
            </h3>
          </div>

          <div className="flex flex-col gap-3">
            {data.finished.map((a) => (
              <div
                key={a._id}
                onClick={() => navigate(`/patients/${a.patientId?._id}`)}
                className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100/80 dark:bg-white/3 dark:hover:bg-white/5 border border-slate-200/60 dark:border-white/5 transition-all flex flex-col justify-between gap-3 group relative cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 shrink-0">
                    <img src={a.patientId?.profilePictureUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${a.patientId?.name}`} alt={a.patientId?.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all">{a.patientId?.name}</h4>
                    <p className="text-[10px] text-slate-500 font-medium font-mono mt-0.5">Visite terminée</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-200/60 dark:border-white/5 select-none opacity-0 group-hover:opacity-100 transition-all">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Clôturé
                  </span>
                </div>
              </div>
            ))}
            {data.finished.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-10">Aucune visite terminée aujourd'hui.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
