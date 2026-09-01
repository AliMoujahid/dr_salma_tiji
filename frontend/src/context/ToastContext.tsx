import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X, AlertCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  toast: {
    success: (title: string, message?: string, duration?: number) => void;
    error: (title: string, message?: string, duration?: number) => void;
    warning: (title: string, message?: string, duration?: number) => void;
    info: (title: string, message?: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Global dispatcher reference for direct function usage
let globalToastHandler: {
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
} | null = null;

export const toast = {
  success: (title: string, message?: string, duration?: number) => {
    globalToastHandler?.showToast('success', title, message, duration);
  },
  error: (title: string, message?: string, duration?: number) => {
    globalToastHandler?.showToast('error', title, message, duration);
  },
  warning: (title: string, message?: string, duration?: number) => {
    globalToastHandler?.showToast('warning', title, message, duration);
  },
  info: (title: string, message?: string, duration?: number) => {
    globalToastHandler?.showToast('info', title, message, duration);
  },
};

export const confirmDialog = (options: ConfirmOptions | string): Promise<boolean> => {
  if (globalToastHandler) {
    return globalToastHandler.confirm(options);
  }
  return Promise.resolve(window.confirm(typeof options === 'string' ? options : options.message || options.title));
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, title: string, message?: string, duration = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = { id, type, title, message, duration };

    setToasts((prev) => [...prev.slice(-4), newToast]); // Keep max 5 toasts visible

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    const parsedOptions: ConfirmOptions = typeof options === 'string'
      ? { title: options }
      : options;

    return new Promise<boolean>((resolve) => {
      setConfirmState({
        isOpen: true,
        options: parsedOptions,
        resolve,
      });
    });
  }, []);

  const handleConfirmAction = (result: boolean) => {
    if (confirmState) {
      confirmState.resolve(result);
      setConfirmState(null);
    }
  };

  useEffect(() => {
    globalToastHandler = { showToast, confirm };
    return () => {
      globalToastHandler = null;
    };
  }, [showToast, confirm]);

  const contextValue: ToastContextType = {
    toasts,
    showToast,
    removeToast,
    confirm,
    toast: {
      success: (title, msg, dur) => showToast('success', title, msg, dur),
      error: (title, msg, dur) => showToast('error', title, msg, dur),
      warning: (title, msg, dur) => showToast('warning', title, msg, dur),
      info: (title, msg, dur) => showToast('info', title, msg, dur),
    },
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      {/* Floating Toast Notification Stack */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -20, scale: 0.92, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -15, scale: 0.95, filter: 'blur(4px)' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`pointer-events-auto rounded-2xl shadow-2xl p-4 flex items-start gap-3.5 border backdrop-blur-2xl transition-all relative overflow-hidden group ${
                t.type === 'success'
                  ? 'bg-white/95 dark:bg-slate-900/90 border-emerald-500/30 text-slate-900 dark:text-white shadow-emerald-500/10'
                  : t.type === 'error'
                  ? 'bg-white/95 dark:bg-slate-900/90 border-rose-500/30 text-slate-900 dark:text-white shadow-rose-500/10'
                  : t.type === 'warning'
                  ? 'bg-white/95 dark:bg-slate-900/90 border-amber-500/30 text-slate-900 dark:text-white shadow-amber-500/10'
                  : 'bg-white/95 dark:bg-slate-900/90 border-blue-500/30 text-slate-900 dark:text-white shadow-blue-500/10'
              }`}
            >
              {/* Icon badge with soft aura glow */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  t.type === 'success'
                    ? 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400'
                    : t.type === 'error'
                    ? 'bg-rose-500/15 text-rose-500 dark:text-rose-400'
                    : t.type === 'warning'
                    ? 'bg-amber-500/15 text-amber-500 dark:text-amber-400'
                    : 'bg-blue-500/15 text-blue-500 dark:text-blue-400'
                }`}
              >
                {t.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                {t.type === 'error' && <AlertTriangle className="w-5 h-5" />}
                {t.type === 'warning' && <AlertCircle className="w-5 h-5" />}
                {t.type === 'info' && <Info className="w-5 h-5" />}
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <h4 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                  {t.title}
                </h4>
                {t.message && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed break-words">
                    {t.message}
                  </p>
                )}
              </div>

              {/* Close button */}
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Countdown progress bar */}
              {t.duration && t.duration > 0 && (
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: t.duration / 1000, ease: 'linear' }}
                  className={`absolute bottom-0 left-0 h-0.5 ${
                    t.type === 'success'
                      ? 'bg-emerald-500'
                      : t.type === 'error'
                      ? 'bg-rose-500'
                      : t.type === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                  }`}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Modern Confirmation Modal Dialog */}
      <AnimatePresence>
        {confirmState?.isOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => handleConfirmAction(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Dialog Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 shadow-2xl flex flex-col gap-5 z-10"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    confirmState.options.variant === 'danger'
                      ? 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/20'
                      : confirmState.options.variant === 'warning'
                      ? 'bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/20'
                      : 'bg-blue-500/15 text-blue-500 dark:text-blue-400 border border-blue-500/20'
                  }`}
                >
                  {confirmState.options.variant === 'danger' ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : confirmState.options.variant === 'warning' ? (
                    <AlertCircle className="w-6 h-6" />
                  ) : (
                    <Info className="w-6 h-6" />
                  )}
                </div>

                <div className="flex-1 min-w-0 pt-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {confirmState.options.title}
                  </h3>
                  {confirmState.options.message && (
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                      {confirmState.options.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Dialog Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => handleConfirmAction(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                >
                  {confirmState.options.cancelText || 'Annuler'}
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmAction(true)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white transition-all shadow-lg cursor-pointer ${
                    confirmState.options.variant === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/25'
                      : confirmState.options.variant === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/25'
                      : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/25'
                  }`}
                >
                  {confirmState.options.confirmText || 'Confirmer'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
