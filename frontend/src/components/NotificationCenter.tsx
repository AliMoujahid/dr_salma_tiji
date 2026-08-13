import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, AlertTriangle, RefreshCw, Send, MessageSquare, Mail, Smartphone, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NotificationLog } from '../types';

export const NotificationCenter: React.FC = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchLogs();
  }, [token]);

  const fetchLogs = () => {
    fetch(`${API_URL}/notifications/logs?limit=15`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setLogs(data);
      })
      .catch((err) => console.error('Error fetching notification logs:', err))
      .finally(() => setLoading(false));
  };

  const handleRetry = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    fetch(`${API_URL}/notifications/retry/${id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => fetchLogs())
      .catch((err) => console.error('Error retrying message:', err));
  };

  const failedCount = logs.filter((l) => l.status === 'Failed').length;
  const sentTodayCount = logs.filter((l) => {
    const d = new Date(l.createdAt);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="relative">
      {/* Header Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition-all cursor-pointer"
        title="Centre de Notifications"
      >
        <Bell className="w-5 h-5" />
        {failedCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white font-bold text-xxs flex items-center justify-center animate-bounce">
            {failedCount}
          </span>
        )}
      </button>

      {/* Floating Dropdown Modal */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-96 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl z-50 overflow-hidden flex flex-col font-sans text-white">
          
          {/* Header */}
          <div className="p-4 border-b border-white/10 bg-slate-950 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Centre de Notifications</h4>
                <p className="text-xxs text-slate-400">{sentTodayCount} envoyés aujourd'hui</p>
              </div>
            </div>

            <button
              onClick={fetchLogs}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 p-3 gap-2 bg-slate-950/40 border-b border-white/5 text-xs">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-xxs text-slate-400 block">Délivrés</span>
                <span className="font-bold text-emerald-400">{logs.filter((l) => l.status === 'Sent' || l.status === 'Delivered').length}</span>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <div>
                <span className="text-xxs text-slate-400 block">Échecs</span>
                <span className="font-bold text-rose-400">{failedCount}</span>
              </div>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto no-scrollbar p-3 flex flex-col gap-2">
            {logs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">Aucune notification récente.</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log._id}
                  className="p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-1.5 hover:border-white/10 transition-all"
                >
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5">
                      {log.channel === 'WhatsApp' && <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />}
                      {log.channel === 'SMS' && <Smartphone className="w-3.5 h-3.5 text-blue-400" />}
                      {log.channel === 'Email' && <Mail className="w-3.5 h-3.5 text-amber-400" />}
                      <span className="font-bold text-slate-200">{log.patientId?.name || log.recipient}</span>
                    </div>

                    <span
                      className={`text-xxs font-bold px-2 py-0.5 rounded-full ${
                        log.status === 'Sent' || log.status === 'Delivered'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>

                  <p className="text-xxs text-slate-400 line-clamp-2 leading-relaxed">{log.body}</p>

                  <div className="flex justify-between items-center border-t border-white/5 pt-1 mt-1 text-xxs text-slate-500">
                    <span>{new Date(log.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    {log.status === 'Failed' && (
                      <button
                        onClick={(e) => handleRetry(log._id, e)}
                        className="text-rose-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" /> Reconnecter / Réessayer
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Navigation link */}
          <div className="p-3 border-t border-white/10 bg-slate-950 text-center">
            <a
              href="/notifications"
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1 cursor-pointer"
            >
              Gérer toutes les notifications <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

        </div>
      )}
    </div>
  );
};
