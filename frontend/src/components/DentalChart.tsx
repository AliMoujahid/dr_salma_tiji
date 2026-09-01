import React, { useState, useEffect } from 'react';
import { Plus, X, FileText, Camera, Eye, Trash2 } from 'lucide-react';
import { ToothHistory } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDate } from '../utils/dateUtils';


interface DentalChartProps {
  patientId: string;
}

const statusOptions = [
  { value: 'Healthy', label: 'Sain', color: 'bg-emerald-500' },
  { value: 'Missing', label: 'Absente', color: 'bg-slate-600' },
  { value: 'Extracted', label: 'Extraite', color: 'bg-rose-500' },
  { value: 'Implant', label: 'Implant', color: 'bg-blue-500' },
  { value: 'Bridge', label: 'Pont (Bridge)', color: 'bg-violet-500' },
  { value: 'Crown', label: 'Couronne', color: 'bg-amber-500' },
  { value: 'Root Canal', label: 'Dévitalisée (Endo)', color: 'bg-pink-500' },
  { value: 'Filling', label: 'Obturation (Plombage)', color: 'bg-cyan-500' },
  { value: 'Fracture', label: 'Fracture', color: 'bg-red-600' },
  { value: 'Mobile', label: 'Mobile', color: 'bg-teal-500' },
  { value: 'Wisdom Tooth', label: 'Dent de Sagesse', color: 'bg-indigo-500' },
];

export const DentalChart: React.FC<DentalChartProps> = ({ patientId }) => {
  const { token } = useAuth();
  const { toast, confirm } = useToast();
  const [odontogram, setOdontogram] = useState<any[]>([]);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [toothHistoryList, setToothHistoryList] = useState<ToothHistory[]>([]);
  
  // Form states for new entry
  const [newStatus, setNewStatus] = useState('Healthy');
  const [newNotes, setNewNotes] = useState('');
  const [newCost, setNewCost] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchOdontogram();
  }, [patientId]);

  const fetchOdontogram = () => {
    fetch(`${API_URL}/teeth/patient/${patientId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setOdontogram(data))
      .catch((err) => console.error('Error fetching odontogram:', err));
  };

  const openToothModal = (toothNum: number) => {
    setSelectedTooth(toothNum);
    setNewNotes('');
    setNewCost('');
    
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
        fetchOdontogram();
      })
      .catch((err) => console.error('Error saving tooth history:', err))
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
    if (!record) return 'tooth-healthy';
    
    switch (record.status) {
      case 'Missing': return 'tooth-missing';
      case 'Extracted': return 'tooth-extracted';
      case 'Implant': return 'tooth-implant';
      case 'Bridge': return 'tooth-bridge';
      case 'Crown': return 'tooth-crown';
      case 'Root Canal': return 'tooth-rootcanal';
      case 'Filling': return 'tooth-filling';
      case 'Fracture': return 'tooth-fracture';
      case 'Mobile': return 'tooth-mobile';
      case 'Wisdom Tooth': return 'tooth-wisdom';
      default: return 'tooth-healthy';
    }
  };

  // Simplified anatomically styled Tooth shape
  const renderToothSVG = (toothNum: number) => {
    return (
      <svg
        viewBox="0 0 40 50"
        className={`w-10 h-12 cursor-pointer transition-all duration-200 hover:scale-115 ${getToothClass(toothNum)}`}
        onClick={() => openToothModal(toothNum)}
      >
        {/* Roots */}
        <path
          d="M 15 22 L 13 42 C 13 46 16 46 17 42 L 20 25 L 23 42 C 24 46 27 46 27 42 L 25 22 Z"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Crown */}
        <path
          d="M 12 22 C 10 22 9 14 11 8 C 13 4 17 6 20 8 C 23 6 27 4 29 8 C 31 14 30 22 28 22 Z"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Internal Canal (visual reference) */}
        <line x1="20" y1="12" x2="20" y2="24" strokeOpacity="0.3" strokeWidth="1" />
      </svg>
    );
  };

  // Permanent upper arch (18 - 11 | 21 - 28)
  const upperPermanent = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  // Permanent lower arch (48 - 41 | 31 - 38)
  const lowerPermanent = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  // Primary upper arch (55 - 51 | 61 - 65)
  const upperPrimary = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
  // Primary lower arch (85 - 81 | 71 - 75)
  const lowerPrimary = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

  return (
    <div className="flex flex-col gap-6">
      {/* Legend Block */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5 p-4 rounded-2xl bg-white/5 border border-white/5">
        {statusOptions.map((opt) => (
          <div key={opt.value} className="flex items-center gap-2">
            <span className={`w-3.5 h-3.5 rounded-full ${opt.color} shadow-lg shadow-white/5`}></span>
            <span className="text-xs font-medium text-slate-300">{opt.label}</span>
          </div>
        ))}
      </div>

      {/* Odontogram SVG Grid */}
      <div className="flex flex-col gap-8 items-center py-6 px-4 rounded-3xl bg-slate-950/45 border border-white/5 shadow-inner">
        {/* UPPER ARCH (PERMANENT) */}
        <div className="flex flex-col items-center gap-1.5 w-full">
          <span className="text-xxs uppercase tracking-widest text-indigo-400/80 font-bold mb-1">Maxillaire Supérieur (Permanent)</span>
          <div className="flex flex-wrap gap-2.5 justify-center">
            {upperPermanent.map((num) => (
              <div key={num} className="flex flex-col items-center gap-0.5">
                <span className="text-xxs font-bold text-slate-500">{num}</span>
                {renderToothSVG(num)}
              </div>
            ))}
          </div>
        </div>

        {/* PRIMARY ARCHES (UPPER & LOWER) */}
        <div className="flex flex-col md:flex-row gap-12 w-full justify-center">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xxs uppercase tracking-widest text-amber-500/80 font-bold mb-1">Dents de Lait Supérieures</span>
            <div className="flex gap-2">
              {upperPrimary.map((num) => (
                <div key={num} className="flex flex-col items-center gap-0.5">
                  <span className="text-xxs font-semibold text-slate-500">{num}</span>
                  {renderToothSVG(num)}
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-1">
            <span className="text-xxs uppercase tracking-widest text-amber-500/80 font-bold mb-1">Dents de Lait Inférieures</span>
            <div className="flex gap-2">
              {lowerPrimary.map((num) => (
                <div key={num} className="flex flex-col items-center gap-0.5">
                  {renderToothSVG(num)}
                  <span className="text-xxs font-semibold text-slate-500">{num}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* LOWER ARCH (PERMANENT) */}
        <div className="flex flex-col items-center gap-1.5 w-full">
          <div className="flex flex-wrap gap-2.5 justify-center">
            {lowerPermanent.map((num) => (
              <div key={num} className="flex flex-col items-center gap-0.5">
                {renderToothSVG(num)}
                <span className="text-xxs font-bold text-slate-500">{num}</span>
              </div>
            ))}
          </div>
          <span className="text-xxs uppercase tracking-widest text-indigo-400/80 font-bold mt-1">Mandibule Inférieure (Permanent)</span>
        </div>
      </div>

      {/* TOOTH HISTORY & UPDATE MODAL */}
      {selectedTooth !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-3xl max-h-[85vh] rounded-3xl bg-slate-900 border border-white/10 shadow-2xl flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-white/5 bg-slate-950/20">
              <div>
                <h3 className="text-lg font-bold text-white">Dent N° {selectedTooth}</h3>
                <p className="text-xs text-slate-400">Historique clinique et actes effectués</p>
              </div>
              <button
                onClick={() => setSelectedTooth(null)}
                className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6 no-scrollbar">
              
              {/* Left Column: Form to log new intervention */}
              <div className="flex-1 flex flex-col gap-4">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">Nouvel Acte</h4>
                <form onSubmit={handleAddIntervention} className="flex flex-col gap-3.5">
                  
                  {/* Status Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">État de la dent</label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-white/5 bg-slate-950 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Cost Field */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Honoraires (DH)</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={newCost}
                      onChange={(e) => setNewCost(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl text-sm glass-input"
                    />
                  </div>

                  {/* Notes Field */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Observations / Notes</label>
                    <textarea
                      rows={3}
                      placeholder="Détaillez l'acte clinique posé..."
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      className="w-full p-4 rounded-xl text-sm glass-input resize-none"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-sm text-white transition-all shadow-lg shadow-blue-600/20 cursor-pointer"
                  >
                    {submitting ? 'Enregistrement...' : 'Ajouter l\'intervention'}
                  </button>
                </form>
              </div>

              {/* Right Column: History Timeline */}
              <div className="flex-1 flex flex-col gap-4 border-t md:border-t-0 md:border-l border-white/5 pt-6 md:pt-0 md:pl-6">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">Timeline des Actes</h4>
                
                {toothHistoryList.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-10">Aucun historique pour cette dent.</p>
                ) : (
                  <div className="flex flex-col gap-4 max-h-[380px] overflow-y-auto no-scrollbar pr-1">
                    {toothHistoryList.map((item) => (
                      <div
                        key={item._id}
                        className="flex flex-col gap-2 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xxs font-bold text-blue-400 font-mono">
                            {formatDate(item.date)}
                          </span>

                          <span className="text-xs font-extrabold text-slate-300">
                            {statusOptions.find((o) => o.value === item.status)?.label || item.status}
                          </span>
                        </div>
                        {item.notes && <p className="text-xs text-slate-400 leading-normal">{item.notes}</p>}
                        
                        <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-1">
                          <span className="text-xs font-semibold text-slate-500">
                            Cost : <strong className="text-emerald-400 font-bold">{item.cost.toFixed(2)} DH</strong>
                          </span>
                          <button
                            onClick={() => handleDeleteHistory(item._id)}
                            className="p-1 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
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
