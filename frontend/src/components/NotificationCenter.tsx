import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  MessageSquare,
  Mail,
  Smartphone,
  ArrowRight,
  Trash2,
  X,
  RotateCcw,
  CheckCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { NotificationLog } from '../types';

export const NotificationCenter: React.FC = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchLogs();
  }, [token]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const fetchLogs = () => {
    fetch(`${API_URL}/notifications/logs?limit=25`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setLogs(data);
      })
      .catch((err) => console.error('Error fetching notification logs:', err))
      .finally(() => setLoading(false));
  };

  const handleRetry = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (retryingId) return;
    setRetryingId(id);

    try {
      const res = await fetch(`${API_URL}/notifications/retry/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('Message renvoyé', 'Le message a été réexpédié avec succès.');
        setLogs((prev) =>
          prev.map((l) =>
            l._id === id
              ? { ...l, status: 'Sent', retryCount: (l.retryCount || 0) + 1, errorDetails: undefined }
              : l
          )
        );
      } else {
        toast.error(
          'Échec de renvoi',
          data.message || data.errorDetails || "WhatsApp Web n'est pas connecté. Veuillez scanner le QR Code."
        );
        setLogs((prev) =>
          prev.map((l) =>
            l._id === id
              ? { ...l, retryCount: (l.retryCount || 0) + 1, errorDetails: data.message || data.errorDetails }
              : l
          )
        );
      }
    } catch (err: any) {
      console.error('Error retrying message:', err);
      toast.error('Erreur', err.message || 'Impossible de renvoyer la notification.');
    } finally {
      setRetryingId(null);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      const res = await fetch(`${API_URL}/notifications/logs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setLogs((prev) => prev.filter((l) => l._id !== id));
        toast.info('Notification supprimée', "L'alerte a été retirée.");
      }
    } catch (err: any) {
      console.error('Error deleting log:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAllFailed = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setClearingAll(true);
    try {
      const res = await fetch(`${API_URL}/notifications/clear-failed`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setLogs((prev) => prev.filter((l) => l.status !== 'Failed'));
        toast.success('Alertes effacées', data.message || "Toutes les alertes d'échec ont été effacées.");
      }
    } catch (err: any) {
      console.error('Error clearing failed logs:', err);
    } finally {
      setClearingAll(false);
    }
  };

  const failedLogs = logs.filter((l) => l.status === 'Failed');
  const failedCount = failedLogs.length;
  const sentTodayCount = logs.filter((l) => {
    const d = new Date(l.createdAt);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="relative" ref={containerRef}>
      {/* Header Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className="relative p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer flex items-center justify-center"
        title="Centre de Notifications"
      >
        <Bell className="w-5 h-5" />
        {failedCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white font-bold text-xxs flex items-center justify-center animate-bounce shadow-md shadow-rose-500/40">
            {failedCount}
          </span>
        )}
      </button>

      {/* Floating Dropdown Modal */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-96 max-w-[92vw] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl shadow-slate-900/15 dark:shadow-black/60 z-50 overflow-hidden flex flex-col font-sans text-slate-900 dark:text-white animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-white/10 bg-slate-50/90 dark:bg-slate-950/80 flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30 dark:text-blue-400 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Centre de Notifications</h4>
                <p className="text-xxs text-slate-500 dark:text-slate-400 font-medium">{sentTodayCount} envoyés aujourd'hui</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {failedCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllFailed}
                  disabled={clearingAll}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 text-xxs font-bold transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                  title="Effacer toutes les alertes d'échec"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{clearingAll ? 'Suppression...' : 'Tout effacer'}</span>
                </button>
              )}

              <button
                onClick={fetchLogs}
                type="button"
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                title="Actualiser"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 p-3 gap-2 bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-white/5 text-xs">
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/20 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xxs text-emerald-800 dark:text-emerald-400 font-semibold block">Délivrés</span>
                <span className="font-extrabold text-sm text-emerald-900 dark:text-emerald-300">
                  {logs.filter((l) => l.status === 'Sent' || l.status === 'Delivered').length}
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200/80 dark:border-rose-500/20 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xxs text-rose-800 dark:text-rose-400 font-semibold block">Échecs</span>
                <span className="font-extrabold text-sm text-rose-900 dark:text-rose-300">{failedCount}</span>
              </div>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-88 overflow-y-auto no-scrollbar p-3 flex flex-col gap-2.5">
            {logs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8 font-medium">Aucune notification récente.</p>
            ) : (
              logs.map((log) => {
                const isSent = log.status === 'Sent' || log.status === 'Delivered';
                const isRetried = log.status === 'Failed' && (log.retryCount || 0) > 0;
                const isUntouched = log.status === 'Failed' && (!log.retryCount || log.retryCount === 0);
                const isRetrying = retryingId === log._id;
                const isDeleting = deletingId === log._id;

                return (
                  <div
                    key={log._id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-2 relative shadow-xs ${
                      isSent
                        ? 'bg-emerald-50/70 hover:bg-emerald-50 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/15 border-emerald-200/80 dark:border-emerald-500/25'
                        : isRetried
                        ? 'bg-amber-50/80 hover:bg-amber-50 dark:bg-amber-500/10 dark:hover:bg-amber-500/15 border-amber-200/90 dark:border-amber-500/30'
                        : 'bg-rose-50/80 hover:bg-rose-50 dark:bg-rose-500/15 dark:hover:bg-rose-500/20 border-rose-200/90 dark:border-rose-500/35'
                    }`}
                  >
                    {/* Top Row: Patient & Status Badge & Close button */}
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5 min-w-0 pr-2">
                        {log.channel === 'WhatsApp' && <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                        {log.channel === 'SMS' && <Smartphone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                        {log.channel === 'Email' && <Mail className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />}
                        <span className="font-bold text-slate-900 dark:text-white truncate">
                          {log.patientId?.name || log.recipient}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-xxs font-bold px-2.5 py-0.5 rounded-full border ${
                            isSent
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30'
                              : isRetried
                              ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/25 dark:text-amber-200 border-amber-300 dark:border-amber-500/40'
                              : 'bg-rose-100 text-rose-900 dark:bg-rose-500/25 dark:text-rose-200 border-rose-300 dark:border-rose-500/40'
                          }`}
                        >
                          {isSent
                            ? '✓ Délivré'
                            : isRetried
                            ? `⚠️ Tentative (${log.retryCount}x)`
                            : '✕ Non Traité'}
                        </span>

                        {/* Individual dismiss button */}
                        <button
                          type="button"
                          onClick={(e) => handleDelete(log._id, e)}
                          disabled={isDeleting}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-all cursor-pointer"
                          title="Supprimer cette alerte"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Message Body */}
                    <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {log.body}
                    </p>

                    {/* Error details if exists */}
                    {log.errorDetails && log.status === 'Failed' && (
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium italic truncate">
                        Motif : {log.errorDetails}
                      </p>
                    )}

                    {/* Bottom Row: Time and Action Button */}
                    <div className="flex justify-between items-center border-t border-slate-200/60 dark:border-white/5 pt-2 mt-0.5 text-xxs text-slate-500 dark:text-slate-400">
                      <span>{new Date(log.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>

                      {log.status === 'Failed' && (
                        <button
                          type="button"
                          onClick={(e) => handleRetry(log._id, e)}
                          disabled={isRetrying}
                          className={`px-3 py-1.5 rounded-xl text-xxs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-xs ${
                            isRetried
                              ? 'bg-amber-600 hover:bg-amber-500 text-white dark:bg-amber-500/25 dark:hover:bg-amber-500/35 dark:text-amber-200 border border-amber-600 dark:border-amber-500/40'
                              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
                          }`}
                        >
                          <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                          <span>
                            {isRetrying
                              ? 'Envoi en cours...'
                              : isRetried
                              ? 'Relancer à nouveau'
                              : 'Reconnecter / Réessayer'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Navigation link */}
          <div className="p-3.5 border-t border-slate-100 dark:border-white/10 bg-slate-50/90 dark:bg-slate-950/80 text-center">
            <a
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              Gérer toutes les notifications <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

        </div>
      )}
    </div>
  );
};


