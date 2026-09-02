import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Star,
  RefreshCw,
  Sparkles,
  Layers,
  DollarSign,
  Tag,
  Check,
  X,
  Stethoscope,
  Scissors,
  Smile,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DentalAct } from '../types';

export const DENTAL_CATEGORIES = [
  'Consultation & Bilan',
  'Imagerie & Radiologie',
  'Soins Conservateurs',
  'Endodontie',
  'Hygiène & Parodontie',
  'Esthétique Dentaire',
  'Chirurgie & Extraction',
  'Prothèses Fixes',
  'Prothèses Amovibles',
  'Orthodontie & Gouttières',
  'Autre',
];

export const DentalActsManager: React.FC = () => {
  const { token, isAdmin } = useAuth();
  const { toast, confirm } = useToast();

  const [acts, setActs] = useState<DentalAct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAct, setEditingAct] = useState<DentalAct | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState(DENTAL_CATEGORIES[0]);
  const [formPrice, setFormPrice] = useState<number | string>('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsFavorite, setFormIsFavorite] = useState(false);
  const [saving, setSaving] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchActs();
  }, []);

  const fetchActs = () => {
    setLoading(true);
    fetch(`${API_URL}/dental-acts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setActs(data);
      })
      .catch((err) => {
        console.error('Error fetching dental acts:', err);
        toast.error('Erreur', 'Impossible de charger la nomenclature des actes.');
      })
      .finally(() => setLoading(false));
  };

  const handleOpenAddModal = () => {
    setEditingAct(null);
    setFormName('');
    setFormCategory('Soins Conservateurs');
    setFormPrice('');
    setFormDescription('');
    setFormIsFavorite(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (act: DentalAct) => {
    setEditingAct(act);
    setFormName(act.name);
    setFormCategory(act.category || 'Soins Conservateurs');
    setFormPrice(act.defaultPrice);
    setFormDescription(act.description || '');
    setFormIsFavorite(act.isFavorite || false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formPrice === '' || Number(formPrice) < 0) {
      toast.warning('Données requises', 'Veuillez saisir le nom et le tarif de l\'acte.');
      return;
    }

    setSaving(true);
    const payload = {
      name: formName.trim(),
      category: formCategory,
      defaultPrice: Number(formPrice),
      description: formDescription.trim(),
      isFavorite: formIsFavorite,
    };

    const url = editingAct ? `${API_URL}/dental-acts/${editingAct._id}` : `${API_URL}/dental-acts`;
    const method = editingAct ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Erreur lors de l\'enregistrement');
      toast.success(
        editingAct ? 'Acte actualisé' : 'Nouvel acte créé',
        `${formName} (${Number(formPrice).toLocaleString('fr-FR')} DH) enregistré avec succès.`
      );
      setIsModalOpen(false);
      fetchActs();
    } catch (err: any) {
      console.error('Error saving dental act:', err);
      toast.error('Erreur', err.message || 'Impossible d\'enregistrer l\'acte.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (act: DentalAct) => {
    const ok = await confirm({
      title: 'Supprimer cet acte ?',
      message: `Voulez-vous vraiment supprimer "${act.name}" de la nomenclature ?`,
      variant: 'danger',
      confirmText: 'Supprimer',
    });
    if (!ok) return;

    try {
      const res = await fetch(`${API_URL}/dental-acts/${act._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur de suppression');
      toast.success('Acte supprimé', `"${act.name}" a été retiré de la liste.`);
      fetchActs();
    } catch (err: any) {
      console.error('Error deleting dental act:', err);
      toast.error('Erreur', 'Impossible de supprimer l\'acte.');
    }
  };

  const handleResetDefaults = async () => {
    const ok = await confirm({
      title: 'Réinitialiser la nomenclature ?',
      message: 'Voulez-vous restaurer la liste complète des 17 actes et tarifs dentaires par défaut du cabinet ?',
      variant: 'warning',
      confirmText: 'Réinitialiser',
    });
    if (!ok) return;

    try {
      const res = await fetch(`${API_URL}/dental-acts/seed`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur lors de la réinitialisation');
      toast.success('Nomenclature réinitialisée', 'Les tarifs dentaires standards ont été restaurés.');
      fetchActs();
    } catch (err: any) {
      console.error('Error resetting dental acts:', err);
      toast.error('Erreur', 'Impossible de réinitialiser la nomenclature.');
    }
  };

  const filteredActs = useMemo(() => {
    return acts.filter((act) => {
      const matchesSearch =
        (act.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (act.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (act.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'Tous' || act.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [acts, searchQuery, selectedCategory]);

  const stats = useMemo(() => {
    const totalActs = acts.length;
    const avgPrice = totalActs > 0 ? Math.round(acts.reduce((sum, a) => sum + (a.defaultPrice || 0), 0) / totalActs) : 0;
    const categoriesCount = new Set(acts.map((a) => a.category)).size;
    return { totalActs, avgPrice, categoriesCount };
  }, [acts]);

  const getCategoryBadgeColor = (cat: string) => {
    switch (cat) {
      case 'Chirurgie & Extraction':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200';
      case 'Prothèses Fixes':
      case 'Prothèses Amovibles':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200';
      case 'Soins Conservateurs':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200';
      case 'Endodontie':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200';
      case 'Esthétique Dentaire':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-950/50 dark:text-pink-300 border-pink-200';
      case 'Hygiène & Parodontie':
        return 'bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300 border-teal-200';
      case 'Consultation & Bilan':
      case 'Imagerie & Radiologie':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* 1. Header & Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total des Actes</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.totalActs}</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tarif Moyen</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {stats.avgPrice.toLocaleString('fr-FR')} <span className="text-xs font-bold font-mono">DH</span>
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Spécialités Couvertes</span>
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{stats.categoriesCount}</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
            <Tag className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Actions & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-wrap items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher un acte, une prothèse, un soin..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
        >
          <option value="Tous">Toutes les catégories</option>
          {DENTAL_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="Restaurer la liste d'origine"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tarifs d'Origine</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter un Acte</span>
          </button>
        </div>

      </div>

      {/* 3. Dental Acts Table / List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-950/60 text-xxs font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Désignation de l'Acte</th>
                <th className="py-3 px-4">Catégorie</th>
                <th className="py-3 px-4 text-right">Tarif (DH / MAD)</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    Chargement de la nomenclature...
                  </td>
                </tr>
              ) : filteredActs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    Aucun acte dentaire trouvé pour "{searchQuery}".
                  </td>
                </tr>
              ) : (
                filteredActs.map((act) => (
                  <tr
                    key={act._id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-400 text-xxs">
                      {act.code || 'ACT'}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {act.name}
                          {act.isFavorite && (
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                        </span>
                        {act.description && (
                          <span className="text-[11px] text-slate-500 mt-0.5">{act.description}</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xxs font-extrabold border ${getCategoryBadgeColor(
                          act.category
                        )}`}
                      >
                        {act.category}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="font-extrabold font-mono text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/40">
                        {act.defaultPrice.toLocaleString('fr-FR')}{' '}
                        <span className="text-xxs font-sans font-bold">DH</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(act)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 cursor-pointer transition-colors"
                          title="Modifier le tarif"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(act)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* 4. Modal Add / Edit Dental Act */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl p-6 flex flex-col gap-5 animate-in zoom-in-95 duration-150">
            
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/10 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingAct ? 'Modifier l\'Acte & Tarif' : 'Nouvel Acte Dentaire'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Désignation de l'Acte *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Couronne zircone, Détartrage, Carie simple..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Catégorie *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-medium cursor-pointer"
                  >
                    {DENTAL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tarif Standard (DH) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={10}
                    placeholder="ex: 500"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl text-xs font-mono font-bold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Détails Techniques (Optionnel)
                </label>
                <textarea
                  rows={2}
                  placeholder="ex: Inclus anesthésie locale et contrôle post-opératoire..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full p-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isFavoriteAct"
                  checked={formIsFavorite}
                  onChange={(e) => setFormIsFavorite(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                />
                <label htmlFor="isFavoriteAct" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Marquer comme acte fréquent (Favori ⭐)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
