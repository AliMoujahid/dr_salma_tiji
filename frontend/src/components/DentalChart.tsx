import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X, FileText, Camera, Eye, Trash2, Search, Sparkles, Tag, Check, ChevronDown } from 'lucide-react';
import { ToothHistory, DentalAct } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/dateUtils';

interface DentalChartProps {
  patientId: string;
}

const statusOptions = [
  { value: 'Healthy', label: 'Sain', color: 'bg-emerald-500', textBadge: 'bg-emerald-500 text-white' },
  { value: 'Missing', label: 'Absente', color: 'bg-slate-600', textBadge: 'bg-slate-600 text-white' },
  { value: 'Extracted', label: 'Extraite', color: 'bg-rose-500', textBadge: 'bg-rose-500 text-white' },
  { value: 'Implant', label: 'Implant', color: 'bg-blue-600', textBadge: 'bg-blue-600 text-white' },
  { value: 'Bridge', label: 'Pont (Bridge)', color: 'bg-violet-600', textBadge: 'bg-violet-600 text-white' },
  { value: 'Crown', label: 'Couronne', color: 'bg-amber-500', textBadge: 'bg-amber-500 text-white' },
  { value: 'Root Canal', label: 'Dévitalisée (Endo)', color: 'bg-pink-500', textBadge: 'bg-pink-500 text-white' },
  { value: 'Filling', label: 'Obturation (Plombage)', color: 'bg-cyan-600', textBadge: 'bg-cyan-600 text-white' },
  { value: 'Fracture', label: 'Fracture', color: 'bg-red-600', textBadge: 'bg-red-600 text-white' },
  { value: 'Mobile', label: 'Mobile', color: 'bg-teal-600', textBadge: 'bg-teal-600 text-white' },
  { value: 'Wisdom Tooth', label: 'Dent de Sagesse', color: 'bg-indigo-600', textBadge: 'bg-indigo-600 text-white' },
];

export const DentalChart: React.FC<DentalChartProps> = ({ patientId }) => {
  const { token } = useAuth();
  const { toast, confirm } = useToast();
  const [odontogram, setOdontogram] = useState<any[]>([]);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [toothHistoryList, setToothHistoryList] = useState<ToothHistory[]>([]);
  const [dentalActs, setDentalActs] = useState<DentalAct[]>([]);
  
  // Form states for new entry
  const [selectedActName, setSelectedActName] = useState('');
  const [actSearchQuery, setActSearchQuery] = useState('');
  const [isActDropdownOpen, setIsActDropdownOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('Healthy');
  const [newNotes, setNewNotes] = useState('');
  const [newCost, setNewCost] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchOdontogram();
    fetchDentalActs();
  }, [patientId]);

  const fetchDentalActs = () => {
    fetch(`${API_URL}/dental-acts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setDentalActs(data);
      })
      .catch((err) => console.error('Error fetching dental acts:', err));
  };

  const fetchOdontogram = () => {
    fetch(`${API_URL}/teeth/patient/${patientId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setOdontogram(data))
      .catch((err) => console.error('Error fetching odontogram:', err));
  };

  const mapActToToothStatus = (actName: string): string => {
    const lower = actName.toLowerCase();
    if (lower.includes('implant')) return 'Implant';
    if (lower.includes('bridge') || lower.includes('pont')) return 'Bridge';
    if (lower.includes('couronne') || lower.includes('zircone') || lower.includes('céramique') || lower.includes('facette')) return 'Crown';
    if (lower.includes('endo') || lower.includes('dévitalis') || lower.includes('reconstitution')) return 'Root Canal';
    if (lower.includes('carie') || lower.includes('plombage') || lower.includes('obturation') || lower.includes('composite')) return 'Filling';
    if (lower.includes('sagesse')) return 'Wisdom Tooth';
    if (lower.includes('extraction') || lower.includes('exo')) return 'Extracted';
    if (lower.includes('fracture')) return 'Fracture';
    if (lower.includes('mobile')) return 'Mobile';
    return 'Healthy';
  };

  const handleSelectAct = (act: DentalAct) => {
    setSelectedActName(act.name);
    setActSearchQuery(act.name);
    setNewCost(act.defaultPrice.toString());
    const autoStatus = mapActToToothStatus(act.name);
    setNewStatus(autoStatus);
    setIsActDropdownOpen(false);
  };

  const handleActSearchChange = (val: string) => {
    setActSearchQuery(val);
    setSelectedActName(val);
    setIsActDropdownOpen(true);

    const match = dentalActs.find(
      (a) => a.name.toLowerCase() === val.trim().toLowerCase()
    );
    if (match) {
      setNewCost(match.defaultPrice.toString());
      setNewStatus(mapActToToothStatus(match.name));
    }
  };

  const filteredActs = useMemo(() => {
    if (!actSearchQuery.trim()) return dentalActs;
    const query = actSearchQuery.toLowerCase();
    return dentalActs.filter(
      (a) =>
        a.name.toLowerCase().includes(query) ||
        a.category.toLowerCase().includes(query) ||
        (a.code && a.code.toLowerCase().includes(query))
    );
  }, [dentalActs, actSearchQuery]);

  const openToothModal = (toothNum: number) => {
    setSelectedTooth(toothNum);
    setNewNotes('');
    setNewCost('');
    setSelectedActName('');
    setActSearchQuery('');
    setIsActDropdownOpen(false);
    
    // Find current status if exists
    const current = odontogram.find((t) => t.toothNumber === toothNum);
    setNewStatus(current?.status || 'Healthy');

    // Fetch chronological history
    fetch(`${API_URL}/teeth/patient/${patientId}/tooth/${toothNum}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setToothHistoryList(data))
      .catch((err) => console.error('Error fetching tooth history:', err));
  };

  const handleAddIntervention = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTooth) return;

    setSubmitting(true);
    fetch(`${API_URL}/teeth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        patientId,
        toothNumber: selectedTooth,
        procedureName: selectedActName || actSearchQuery || undefined,
        status: newStatus,
        notes: newNotes,
        cost: parseFloat(newCost) || 0,
      }),
    })
      .then((res) => res.json())
      .then((newRecord) => {
        setToothHistoryList([newRecord, ...toothHistoryList]);
        setNewNotes('');
        setNewCost('');
        setSelectedActName('');
        setActSearchQuery('');
        fetchOdontogram();
        toast.success('Acte enregistré', `Intervention sur la dent N° ${selectedTooth} enregistrée.`);
      })
      .catch((err) => {
        console.error('Error saving tooth history:', err);
        toast.error('Erreur', 'Impossible d\'enregistrer l\'intervention.');
      })
      .finally(() => setSubmitting(false));
  };

  const handleDeleteHistory = async (id: string) => {
    const confirmed = await confirm({
      title: 'Supprimer cette intervention ?',
      message: 'Cette intervention dentaire sera définitivement retirée de l\'historique du patient.',
      variant: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
    });
    if (!confirmed) return;

    fetch(`${API_URL}/teeth/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => {
        setToothHistoryList(toothHistoryList.filter((item) => item._id !== id));
        fetchOdontogram();
        toast.success('Intervention supprimée', 'L\'acte a été retiré de la fiche.');
      })
      .catch((err) => {
        console.error('Error deleting record:', err);
        toast.error('Erreur', 'Impossible de supprimer l\'intervention.');
      });
  };

  const getToothClass = (toothNum: number) => {
    const record = odontogram.find((t) => t.toothNumber === toothNum);
    if (!record) return 'fill-slate-300 dark:fill-slate-700 hover:fill-blue-500';
    
    switch (record.status) {
      case 'Missing': return 'fill-slate-500';
      case 'Extracted': return 'fill-rose-500';
      case 'Implant': return 'fill-blue-600';
      case 'Bridge': return 'fill-violet-600';
      case 'Crown': return 'fill-amber-500';
      case 'Root Canal': return 'fill-pink-500';
      case 'Filling': return 'fill-cyan-600';
      case 'Fracture': return 'fill-red-600';
      case 'Mobile': return 'fill-teal-600';
      case 'Wisdom Tooth': return 'fill-indigo-600';
      default: return 'fill-emerald-500';
    }
  };

  const renderToothSVG = (toothNum: number) => {
    return (
      <svg
        viewBox="0 0 100 120"
        className="w-11 h-13 transition-all duration-300 transform group-hover:scale-110 drop-shadow-sm"
      >
        {/* Crown */}
        <path
          d="M 20 50 C 15 20, 85 20, 80 50 C 80 70, 70 75, 50 75 C 30 75, 20 70, 20 50 Z"
          className={`${getToothClass(toothNum)} transition-colors duration-300`}
        />
        {/* Roots */}
        <path
          d="M 25 70 C 25 95, 35 110, 40 110 C 45 110, 45 85, 50 75 C 55 85, 55 110, 60 110 C 65 110, 75 95, 75 70 Z"
          className={`${getToothClass(toothNum)} opacity-65 transition-colors duration-300`}
        />
      </svg>
    );
  };

  // Standard FDI quadrants
  const upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
  const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
  const lowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
  const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];

  return (
    <div className="flex flex-col gap-6">
      
      {/* Legend & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xs">
        <div className="flex flex-wrap gap-3">
          {statusOptions.slice(0, 7).map((status) => (
            <div key={status.value} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-full ${status.color} shadow-xs`}></span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{status.label}</span>
            </div>
          ))}
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">💡 Cliquez sur une dent pour ouvrir sa fiche clinique</span>
      </div>

      {/* ODONTOGRAM CANVAS */}
      <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 shadow-xs flex flex-col items-center gap-8">
        
        {/* Upper Jaw */}
        <div className="flex flex-col items-center gap-2 w-full max-w-4xl">
          <span className="text-[11px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">Maxillaire Supérieur (Haut)</span>
          <div className="flex justify-center gap-4 sm:gap-8 w-full border-b border-slate-200 dark:border-white/10 pb-6">
            
            {/* Quadrant 1 (Upper Right) */}
            <div className="flex gap-1 sm:gap-2.5">
              {upperRight.map((num) => (
                <button
                  key={num}
                  onClick={() => openToothModal(num)}
                  className="group flex flex-col items-center gap-1 p-1.5 sm:p-2 rounded-2xl hover:bg-blue-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <span className="text-xs font-black font-mono text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-white transition-colors">
                    {num}
                  </span>
                  {renderToothSVG(num)}
                </button>
              ))}
            </div>

            {/* Quadrant 2 (Upper Left) */}
            <div className="flex gap-1 sm:gap-2.5">
              {upperLeft.map((num) => (
                <button
                  key={num}
                  onClick={() => openToothModal(num)}
                  className="group flex flex-col items-center gap-1 p-1.5 sm:p-2 rounded-2xl hover:bg-blue-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <span className="text-xs font-black font-mono text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-white transition-colors">
                    {num}
                  </span>
                  {renderToothSVG(num)}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* Lower Jaw */}
        <div className="flex flex-col items-center gap-2 w-full max-w-4xl">
          <div className="flex justify-center gap-4 sm:gap-8 w-full border-t border-slate-200 dark:border-white/10 pt-6">
            
            {/* Quadrant 4 (Lower Right) */}
            <div className="flex gap-1 sm:gap-2.5">
              {lowerRight.map((num) => (
                <button
                  key={num}
                  onClick={() => openToothModal(num)}
                  className="group flex flex-col items-center gap-1 p-1.5 sm:p-2 rounded-2xl hover:bg-blue-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  {renderToothSVG(num)}
                  <span className="text-xs font-black font-mono text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-white transition-colors">
                    {num}
                  </span>
                </button>
              ))}
            </div>

            {/* Quadrant 3 (Lower Left) */}
            <div className="flex gap-1 sm:gap-2.5">
              {lowerLeft.map((num) => (
                <button
                  key={num}
                  onClick={() => openToothModal(num)}
                  className="group flex flex-col items-center gap-1 p-1.5 sm:p-2 rounded-2xl hover:bg-blue-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  {renderToothSVG(num)}
                  <span className="text-xs font-black font-mono text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-white transition-colors">
                    {num}
                  </span>
                </button>
              ))}
            </div>

          </div>
          <span className="text-[11px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider mt-2">Mandibule Inférieure (Bas)</span>
        </div>

      </div>

      {/* TOOTH HISTORY & UPDATE MODAL (CLAIRE & HIGH-CONTRAST DISPLAY) */}
      {selectedTooth !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
            
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-600/20 border border-blue-300 dark:border-blue-500/40 flex items-center justify-center font-mono font-black text-lg text-blue-700 dark:text-blue-400 shadow-xs">
                  {selectedTooth}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Dent N° {selectedTooth}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Actes cliniques, nomenclature des soins et tarification</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTooth(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6 no-scrollbar">
              
              {/* Left Column: Form to log new intervention */}
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Nouvel Acte Clinique</span>
                  </h4>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                    Tarifs automatiques
                  </span>
                </div>

                {/* Frequent Acts Quick Pills */}
                {dentalActs.length > 0 && (
                  <div className="flex flex-col gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-wider flex items-center gap-1">
                      ⚡ Actes Fréquents (Cliquez pour remplir) :
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar pt-0.5">
                      {dentalActs.slice(0, 10).map((act) => (
                        <button
                          key={act._id}
                          type="button"
                          onClick={() => handleSelectAct(act)}
                          className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-600/20 border border-slate-300 dark:border-slate-700 hover:border-blue-400 text-xs text-slate-800 dark:text-slate-200 font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs group"
                        >
                          <span>{act.name}</span>
                          <span className="font-mono text-[10px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-500/30">
                            {act.defaultPrice} DH
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handleAddIntervention} className="flex flex-col gap-3.5">
                  
                  {/* Searchable Dental Act Field */}
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
                      <span>Acte / Soin Clinique (Nomenclature)</span>
                      {newCost && (
                        <span className="text-xxs font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/30">
                          Tarif : {newCost} DH
                        </span>
                      )}
                    </label>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Rechercher ou saisir un acte (ex: Couronne zircone, Carie...)"
                        value={actSearchQuery}
                        onChange={(e) => handleActSearchChange(e.target.value)}
                        onFocus={() => setIsActDropdownOpen(true)}
                        className="w-full h-11 pl-10 pr-10 rounded-xl text-xs sm:text-sm font-semibold bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      
                      {actSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setActSearchQuery('');
                            setSelectedActName('');
                            setNewCost('');
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Dropdown Suggestions List */}
                    {isActDropdownOpen && filteredActs.length > 0 && (
                      <div className="absolute z-30 top-full left-0 right-0 mt-1.5 max-h-56 overflow-y-auto rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xl p-1.5 flex flex-col gap-1 no-scrollbar">
                        {filteredActs.map((act) => (
                          <button
                            key={act._id}
                            type="button"
                            onClick={() => handleSelectAct(act)}
                            className="w-full px-3 py-2 rounded-xl text-left hover:bg-blue-50 dark:hover:bg-blue-600/20 border border-transparent hover:border-blue-200 dark:hover:border-blue-500/30 flex items-center justify-between transition-all cursor-pointer group"
                          >
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300">
                                {act.name}
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                {act.category} {act.code ? `• ${act.code}` : ''}
                              </span>
                            </div>
                            <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-500/30">
                              {act.defaultPrice} DH
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Anatomical Status & Cost Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {/* Status Dropdown */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">État de la dent</label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                      >
                        {statusOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Cost Field with Auto-Pricing from Settings */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                        <span>Honoraires (DH)</span>
                        <span className="text-xxs text-emerald-600 dark:text-emerald-400 font-bold font-mono">MAD</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="0.00"
                          value={newCost}
                          onChange={(e) => setNewCost(e.target.value)}
                          className="w-full h-11 px-4 pr-10 rounded-xl text-sm font-mono font-black bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 pointer-events-none">
                          DH
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Notes Field */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Observations / Détails cliniques</label>
                    <textarea
                      rows={2}
                      placeholder="Détaillez l'acte clinique posé, anesthésie, matériaux..."
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      className="w-full p-3 rounded-xl text-xs font-medium bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none shadow-2xs"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] font-black text-xs sm:text-sm text-white transition-all shadow-md shadow-blue-500/25 cursor-pointer flex items-center justify-center gap-2 mt-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{submitting ? 'Enregistrement...' : 'Ajouter l\'acte sur la dent'}</span>
                  </button>
                </form>
              </div>

              {/* Right Column: History Timeline */}
              <div className="flex-1 flex flex-col gap-4 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-6 md:pt-0 md:pl-6">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Timeline des Actes</h4>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-bold">
                    {toothHistoryList.length} intervention(s)
                  </span>
                </div>
                
                {toothHistoryList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center gap-2 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <Tag className="w-8 h-8 text-slate-400" />
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Aucun historique enregistré pour cette dent.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto no-scrollbar pr-1">
                    {toothHistoryList.map((item) => {
                      const statusObj = statusOptions.find((o) => o.value === item.status);
                      return (
                        <div
                          key={item._id}
                          className="flex flex-col gap-2.5 p-3.5 rounded-2xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs transition-all group"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-slate-900 dark:text-white">
                                {item.procedureName || statusObj?.label || item.status}
                              </span>
                              <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">
                                {formatDate(item.date)}
                              </span>
                            </div>

                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-2xs ${statusObj?.textBadge || 'bg-slate-600 text-white'}`}>
                              {statusObj?.label || item.status}
                            </span>
                          </div>

                          {item.notes && (
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-normal bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-transparent p-2.5 rounded-xl">
                              {item.notes}
                            </p>
                          )}
                          
                          <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-0.5">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                              Tarif : <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-black text-sm">{item.cost ? item.cost.toFixed(2) : '0.00'} DH</strong>
                            </span>
                            <button
                              onClick={() => handleDeleteHistory(item._id)}
                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg opacity-80 group-hover:opacity-100 transition-all cursor-pointer"
                              title="Supprimer cette intervention"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
};
