import React, { useState } from 'react';
import {
  ShieldAlert,
  Key,
  Copy,
  Check,
  Lock,
  Sparkles,
  AlertTriangle,
  HelpCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface LicenseActivationModalProps {
  machineId: string;
  message?: string;
  validUntil?: string;
  onActivated: () => void;
}

export const LicenseActivationModal: React.FC<LicenseActivationModalProps> = ({
  machineId,
  message,
  validUntil,
  onActivated,
}) => {
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const handleCopyMachineId = () => {
    navigator.clipboard.writeText(machineId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKeyInput.trim()) {
      setErrorMessage('Veuillez coller votre clé de licence reçue.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`${API_URL}/license/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ licenseKey: licenseKeyInput.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMessage('Licence validée avec succès ! Déverrouillage en cours...');
        setTimeout(() => {
          onActivated();
        }, 1200);
      } else {
        setErrorMessage(data.message || 'Clé de licence invalide pour cette machine.');
      }
    } catch (err: any) {
      setErrorMessage(`Erreur de connexion au serveur : ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#030712]/95 backdrop-blur-xl flex items-center justify-center p-4 selection:bg-blue-500/30">
      <div className="w-full max-w-xl bg-[#0b1329] border border-blue-500/30 rounded-3xl shadow-2xl shadow-blue-900/30 overflow-hidden relative animate-in fade-in zoom-in-95 duration-300">
        {/* Glow ambient backgrounds */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="p-8 pb-6 border-b border-slate-800/80 text-center relative">
          <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 mb-4 ring-8 ring-blue-500/10">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Activation du Logiciel Requise
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Cabinet Dentaire Dr. Salma Tijini • Protection de Licence Matérielle
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-8 space-y-6">
          {/* Status Alert */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200/90 leading-relaxed">
              <span className="font-semibold text-amber-300 block mb-0.5">
                Accès Verrouillé
              </span>
              {message || 'Ce logiciel est protégé et lié à l\'empreinte matérielle de cet ordinateur. Veuillez l\'activer pour continuer.'}
            </div>
          </div>

          {/* Machine ID Box */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Code Machine Unique de cet Ordinateur (Hardware ID)</span>
              <span className="text-[10px] text-blue-400 font-mono">Verrou Matériel</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-900/90 border border-slate-700/80 rounded-xl px-4 py-3 font-mono text-sm text-cyan-300 tracking-wider select-all break-all">
                {machineId || 'Détection en cours...'}
              </div>
              <button
                type="button"
                onClick={handleCopyMachineId}
                className="px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 rounded-xl text-xs font-medium transition-all flex items-center gap-2 active:scale-95 shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copier</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              💡 <strong className="text-slate-300">Instructions :</strong> Copiez ce code et transmettez-le à votre développeur/administrateur pour recevoir votre clé d'activation officielle.
            </p>
          </div>

          {/* Activation Key Form */}
          <form onSubmit={handleActivate} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-blue-400" />
                <span>Coller la Clé de Licence d'Activation</span>
              </label>
              <textarea
                rows={3}
                value={licenseKeyInput}
                onChange={(e) => setLicenseKeyInput(e.target.value)}
                placeholder="Exemple : TIJINI-LIC-eyJtYWNoaW5lSWQi..."
                className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-xs font-mono text-slate-100 placeholder:text-slate-600 outline-none resize-none transition-all"
              />
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-2 animate-in fade-in">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !licenseKeyInput.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Vérification de la licence...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Activer le Logiciel Maintenant</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>Dr. Salma Tijini Dental Suite v1.0.0</span>
          <span className="flex items-center gap-1 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Sécurité Cryptographique Active
          </span>
        </div>
      </div>
    </div>
  );
};
