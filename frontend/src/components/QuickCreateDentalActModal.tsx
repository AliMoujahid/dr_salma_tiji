import React, { useState, useEffect } from 'react';
import { Plus, X, Sparkles, Loader2, Check } from 'lucide-react';
import { DentalAct } from '../types';
import { DENTAL_CATEGORIES } from './DentalActsManager';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_URL } from '../config/api';

interface QuickCreateDentalActModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillName?: string;
  onActCreated: (act: DentalAct) => void;
  colorScheme?: 'purple' | 'blue';
}

export const QuickCreateDentalActModal: React.FC<QuickCreateDentalActModalProps> = ({
  isOpen,
  onClose,
  prefillName = '',
  onActCreated,
  colorScheme = 'purple',
}) => {
  const { token } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [category, setCategory] = useState(DENTAL_CATEGORIES[0]);
  const [defaultPrice, setDefaultPrice] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(prefillName || '');
      setCategory(DENTAL_CATEGORIES[0]);
      setDefaultPrice('');
      setDescription('');
    }
  }, [isOpen, prefillName]);

  if (!isOpen) return null;

  const isPurple = colorScheme === 'purple';
  const primaryBgClass = isPurple ? 'bg-purple-600 hover:bg-purple-500' : 'bg-blue-600 hover:bg-blue-500';
  const shadowClass = isPurple ? 'shadow-purple-600/25' : 'shadow-blue-600/25';
  const focusBorderClass = isPurple ? 'focus:border-purple-500' : 'focus:border-blue-500';
  const badgeClass = isPurple
    ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800'
    : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !defaultPrice) {
      toast.error('Champs requis', 'Veuillez renseigner le nom de l\'acte et le tarif.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/dental-acts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          category,
          defaultPrice: Number(defaultPrice),
          description: description.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || errData.message || 'Erreur lors de l\'enregistrement');
      }

      const createdAct: DentalAct = await res.json();
      toast.success(
        'Acte ajouté au catalogue !',
        `"${createdAct.name}" est désormais disponible dans le catalogue (${createdAct.defaultPrice} DH).`
      );

      onActCreated(createdAct);
      onClose();
    } catch (err: any) {
      console.error('Create dental act error:', err);
      toast.error('Erreur', err.message || 'Impossible de créer cet acte.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${badgeClass}`}>
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Ajouter un Acte au Catalogue
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                L'acte sera sauvegardé et directement appliqué à la ligne.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Désignation de l'acte *
            </label>
            <input
              type="text"
              autoFocus
              placeholder="ex: Couronne Zircone, Implant Dentaire..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none ${focusBorderClass}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Tarif par défaut (DH) *
              </label>
              <input
                type="number"
                min="0"
                step="50"
                placeholder="ex: 500"
                value={defaultPrice}
                onChange={(e) => setDefaultPrice(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none ${focusBorderClass}`}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Catégorie *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-900 dark:text-white focus:outline-none ${focusBorderClass}`}
              >
                {DENTAL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Description / Notes cliniques (Optionnel)
            </label>
            <textarea
              rows={2}
              placeholder="Détails techniques, matériaux, cotation..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none ${focusBorderClass}`}
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim() || !defaultPrice}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-white font-bold text-xs shadow-md ${primaryBgClass} ${shadowClass} disabled:opacity-50 cursor-pointer transition-all disabled:cursor-not-allowed`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Enregistrer & Sélectionner</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
