import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Printer,
  RefreshCw,
  Eye,
  ClipboardCopy,
  MessageSquare,
  Search,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  FileText,
  FileSpreadsheet,
  Send,
  Calendar,
  Sparkles,
  Check,
  Edit,
  ExternalLink,
} from 'lucide-react';
import { Devis, DevisItem, Patient, ClinicConfig, DentalAct } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DevisPrintLayout } from '../components/DevisPrintLayout';
import { SearchablePatientSelect } from '../components/SearchablePatientSelect';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { SearchableActInput } from '../components/SearchableActInput';
import { QuickCreateDentalActModal } from '../components/QuickCreateDentalActModal';
import { API_URL } from '../config/api';

export const DevisEditor: React.FC = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [devisList, setDevisList] = useState<Devis[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [dentalActs, setDentalActs] = useState<DentalAct[]>([]);
  const [config, setConfig] = useState<ClinicConfig | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');
  const [loading, setLoading] = useState(true);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Invoiced'>('all');
  const [actCatalogSearch, setActCatalogSearch] = useState('');

  // Editor states
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [devisNumber, setDevisNumber] = useState('');
  const [devisDate, setDevisDate] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [discount, setDiscount] = useState('0');
  const [status, setStatus] = useState<'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Invoiced'>('Draft');
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<any[]>([
    { date: '', tooth: '', description: '', amount: 0 },
  ]);

  // Edit / Preview target
  const [editDevisId, setEditDevisId] = useState<string | null>(null);
  const [previewDevisData, setPreviewDevisData] = useState<Devis | null>(null);
  const [previewScale, setPreviewScale] = useState(0.72);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  // Quick Create Dental Act modal
  const [showQuickActModal, setShowQuickActModal] = useState(false);
  const [quickActPrefill, setQuickActPrefill] = useState('');
  const [targetActRowIndex, setTargetActRowIndex] = useState<number | null>(null);

  const handleOpenQuickActModal = (rowIndex: number | null, prefillName = '') => {
    setTargetActRowIndex(rowIndex);
    setQuickActPrefill(prefillName);
    setShowQuickActModal(true);
  };

  const handleActCreated = (newAct: DentalAct) => {
    setDentalActs((prev) => {
      if (prev.some((a) => a._id === newAct._id)) return prev;
      return [newAct, ...prev];
    });

    if (targetActRowIndex !== null && lineItems[targetActRowIndex]) {
      const updated = [...lineItems];
      updated[targetActRowIndex].description = newAct.name;
      updated[targetActRowIndex].amount = newAct.defaultPrice;
      setLineItems(updated);
    } else {
      const lastRow = lineItems[lineItems.length - 1];
      if (lastRow && !lastRow.description && (!lastRow.amount || lastRow.amount === 0)) {
        const updated = [...lineItems];
        updated[lineItems.length - 1].description = newAct.name;
        updated[lineItems.length - 1].amount = newAct.defaultPrice;
        setLineItems(updated);
      } else {
        setLineItems((prev) => [
          ...prev,
          { date: '', tooth: '', description: newAct.name, amount: newAct.defaultPrice },
        ]);
      }
    }
  };

  useEffect(() => {
    fetchDevis();
    fetchPatients();
    fetchClinicConfig();
    fetchDentalActs();
  }, []);

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

  // Listen to navigation state from other pages (e.g. from PatientProfile "Créer un Devis")
  useEffect(() => {
    if (location.state) {
      const stateObj = location.state as any;
      if (stateObj.editDevisId || stateObj.devisId) {
        const targetId = stateObj.editDevisId || stateObj.devisId;
        fetch(`${API_URL}/devis/${targetId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((d) => {
            if (d && d._id) {
              handleEditDevis(d);
            }
          })
          .catch((err) => console.error('Error fetching specific devis:', err));
      } else if (stateObj.patientId) {
        handleNewDevis(stateObj.patientId, stateObj.prefilledItems || []);
      }
    }
  }, [location.state]);

  const fetchDevis = () => {
    setLoading(true);
    fetch(`${API_URL}/devis?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setDevisList(data.devis || []))
      .catch((err) => console.error('Error fetching devis:', err))
      .finally(() => setLoading(false));
  };

  const fetchPatients = () => {
    fetch(`${API_URL}/patients?limit=200`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setPatients(data.patients || []))
      .catch((err) => console.error('Error fetching patients:', err));
  };

  const fetchClinicConfig = () => {
    fetch(`${API_URL}/clinic/config`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch((err) => console.error('Error fetching clinic configs:', err));
  };

  const handleQuickAddAct = (act: DentalAct) => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');

    const newItem = {
      date: `${day}/${month}`,
      tooth: '',
      description: act.name,
      amount: act.defaultPrice,
    };

    if (lineItems.length === 1 && !lineItems[0].description && Number(lineItems[0].amount) === 0) {
      setLineItems([newItem]);
    } else {
      setLineItems([...lineItems, newItem]);
    }
    toast.success('Acte ajouté', `"${act.name}" inséré (${act.defaultPrice} DH).`);
  };

  const handleNewDevis = (prefillPatientId = '', prefilledItems: any[] = []) => {
    setEditDevisId(null);
    setSelectedPatientId(prefillPatientId || '');
    setDevisNumber('');

    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
    setDevisDate(formattedToday);

    // Default valid until: 30 days
    const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    setValidUntil(in30Days.toISOString().split('T')[0]);

    setDiscount('0');
    setStatus('Draft');
    setNotes('');

    if (prefilledItems && prefilledItems.length > 0) {
      setLineItems(
        prefilledItems.map((item) => ({
          date: item.date ? item.date.slice(0, 5) : `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}`,
          tooth: item.tooth && item.tooth !== '-' ? item.tooth : '',
          description: item.description || item.actName || '',
          amount: Number(item.amount) || Number(item.cost) || 0,
        }))
      );
    } else {
      setLineItems([
        {
          date: `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}`,
          tooth: '',
          description: '',
          amount: 0,
        },
      ]);
    }

    setViewMode('edit');
  };

  const handleEditDevis = (devis: Devis) => {
    setEditDevisId(devis._id);
    setSelectedPatientId(devis.patientId?._id || (devis.patientId as any) || '');
    setDevisNumber(devis.devisNumber);
    setDevisDate(devis.date ? devis.date.split('T')[0] : '');
    setValidUntil(devis.validUntil ? devis.validUntil.split('T')[0] : '');
    setDiscount(String(devis.discount || 0));
    setStatus(devis.status || 'Draft');
    setNotes(devis.notes || '');

    if (devis.items && devis.items.length > 0) {
      setLineItems(
        devis.items.map((it) => ({
          date: it.date || '',
          tooth: it.tooth || '',
          description: it.description || '',
          amount: it.amount || 0,
        }))
      );
    } else {
      setLineItems([{ date: '', tooth: '', description: '', amount: 0 }]);
    }

    setViewMode('edit');
  };

  const handleAddLineItem = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    setLineItems([...lineItems, { date: `${day}/${month}`, tooth: '', description: '', amount: 0 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length === 1) {
      setLineItems([{ date: '', tooth: '', description: '', amount: 0 }]);
      return;
    }
    const updated = [...lineItems];
    updated.splice(index, 1);
    setLineItems(updated);
  };

  const handleLineItemChange = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    if (field === 'amount') {
      const amt = Math.max(0, parseFloat(value) || 0);
      updated[index].amount = amt;
    } else if (field === 'description') {
      updated[index].description = value;
      const match = dentalActs.find(
        (a) => a.name.toLowerCase() === (value || '').trim().toLowerCase()
      );
      if (match && (!updated[index].amount || Number(updated[index].amount) === 0)) {
        updated[index].amount = match.defaultPrice;
      }
    } else {
      updated[index][field] = value;
    }
    setLineItems(updated);
  };

  const calculateGrossTotal = () => {
    return lineItems.reduce((sum, item) => sum + (parseFloat(item.amount as any) || 0), 0);
  };

  const calculateNetTotal = () => {
    return Math.max(0, calculateGrossTotal() - (parseFloat(discount) || 0));
  };

  const handleSaveDevis = async () => {
    if (!selectedPatientId) {
      toast.error('Patient requis', 'Veuillez sélectionner un patient.');
      return;
    }

    const validItems = lineItems.filter(
      (item) => item.description.trim() || Number(item.amount) > 0
    );

    if (validItems.length === 0) {
      toast.error('Actes requis', 'Veuillez saisir au moins un acte ou soin estimé.');
      return;
    }

    const payload = {
      patientId: selectedPatientId,
      date: devisDate ? new Date(devisDate).toISOString() : new Date().toISOString(),
      validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
      items: validItems,
      discount: parseFloat(discount) || 0,
      status,
      notes: notes.trim(),
    };

    try {
      const url = editDevisId ? `${API_URL}/devis/${editDevisId}` : `${API_URL}/devis`;
      const method = editDevisId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Échec de l\'enregistrement du devis');
      }

      const savedDevis: Devis = await res.json();
      toast.success(
        editDevisId ? 'Devis mis à jour' : 'Devis créé avec succès',
        `Devis N° ${savedDevis.devisNumber} enregistré (${savedDevis.netAmount.toFixed(2)} DH).`
      );

      fetchDevis();
      setViewMode('list');
    } catch (err: any) {
      console.error('Save devis error:', err);
      toast.error('Erreur', err.message || 'Impossible d\'enregistrer le devis.');
    }
  };

  const handleDeleteDevis = async (id: string, num: string) => {
    if (!window.confirm(`Confirmez-vous la suppression définitive du Devis N° ${num} ?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/devis/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Suppression impossible');
      }

      toast.success('Devis supprimé', `Le devis N° ${num} a été supprimé.`);
      setDevisList((prev) => prev.filter((d) => d._id !== id));
      if (previewDevisData?._id === id) setPreviewDevisData(null);
    } catch (err: any) {
      toast.error('Erreur', err.message || 'Échec de la suppression.');
    }
  };

  const handleConvertToInvoice = async (devis: Devis) => {
    if (!window.confirm(`Voulez-vous transformer le Devis N° ${devis.devisNumber} en Facture officielle ?`)) {
      return;
    }

    setConvertingId(devis._id);
    try {
      const res = await fetch(`${API_URL}/devis/${devis._id}/convert-to-invoice`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Conversion échouée');
      }

      const data = await res.json();
      toast.success('Devis Transformé en Facture !', data.message);

      // Refresh list
      fetchDevis();

      // Ask user if they want to view the new invoice
      if (data.invoice?._id) {
        navigate('/invoices', {
          state: { editInvoiceId: data.invoice._id },
        });
      }
    } catch (err: any) {
      console.error('Convert devis error:', err);
      toast.error('Erreur', err.message || 'Impossible de convertir le devis.');
    } finally {
      setConvertingId(null);
    }
  };

  const handleSendWhatsApp = async (devis: Devis) => {
    const patientPhone = devis.patientId?.phone;
    if (!patientPhone) {
      toast.warning('Téléphone manquant', 'Le patient n\'a pas de numéro de téléphone renseigné.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/notifications/send-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          patientId: devis.patientId?._id || (devis.patientId as any),
          channel: 'WhatsApp',
          body: `Bonjour ${devis.patientId?.name || ''},\n\nVoici votre Devis Dentaire N° ${devis.devisNumber} d'un montant de ${devis.netAmount.toFixed(2)} DH émis par le ${config?.cabinetFr || 'Cabinet Dentaire Dr. Salma Tijini'}. Ce devis est valable 30 jours. Pour toute question ou prise de rendez-vous, nous restons à votre entière disposition.`,
        }),
      });

      if (!res.ok) throw new Error('Échec d\'envoi WhatsApp');
      toast.success('Devis envoyé !', `Le devis a été transmis par WhatsApp à ${devis.patientId?.name}.`);
    } catch (err: any) {
      toast.error('Erreur', err.message || 'Impossible d\'envoyer le WhatsApp.');
    }
  };

  // Filtered devis
  const filteredDevis = useMemo(() => {
    return devisList.filter((d) => {
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
      if (!matchesStatus) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();

      const num = (d.devisNumber || '').toLowerCase();
      const patientName = `${d.patientId?.name || ''} ${d.patientId?.prenom || ''}`.toLowerCase();
      const phone = (d.patientId?.phone || '').toLowerCase();
      const cnie = (d.patientId?.nationalId || '').toLowerCase();
      const itemsMatch = d.items?.some((it) => (it.description || '').toLowerCase().includes(term));

      return num.includes(term) || patientName.includes(term) || phone.includes(term) || cnie.includes(term) || itemsMatch;
    });
  }, [devisList, statusFilter, searchTerm]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const totalCount = devisList.length;
    const acceptedCount = devisList.filter((d) => d.status === 'Accepted' || d.status === 'Invoiced').length;
    const pendingCount = devisList.filter((d) => d.status === 'Sent' || d.status === 'Draft').length;
    const totalEstimatedAmount = devisList.reduce((sum, d) => sum + (d.netAmount || 0), 0);

    return { totalCount, acceptedCount, pendingCount, totalEstimatedAmount };
  }, [devisList]);

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'Accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xxs font-extrabold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Accepté
          </span>
        );
      case 'Invoiced':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xxs font-extrabold bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20">
            <FileText className="w-3 h-3" />
            Facturé
          </span>
        );
      case 'Sent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xxs font-extrabold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
            <Clock className="w-3 h-3" />
            En attente
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xxs font-extrabold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
            <AlertCircle className="w-3 h-3" />
            Refusé
          </span>
        );
      case 'Draft':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xxs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Brouillon
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-app)] overflow-y-auto no-scrollbar p-4 md:p-6 select-none">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Devis & Propositions Thérapeutiques
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Édition, gestion et transformation des devis dentaires estimatifs pour les patients.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {viewMode === 'edit' ? (
            <button
              onClick={() => setViewMode('list')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer border border-slate-200 dark:border-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour à la liste</span>
            </button>
          ) : (
            <button
              onClick={() => handleNewDevis()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nouveau Devis</span>
            </button>
          )}
        </div>
      </div>

      {/* --- VIEW MODE 1: LIST OF DEVIS --- */}
      {viewMode === 'list' && (
        <div className="flex flex-col gap-6">
          {/* 4 Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xxs font-extrabold uppercase tracking-wider text-slate-400">Total Devis Émis</span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">{kpis.totalCount}</div>
                <span className="text-xxs text-slate-500 mt-0.5 block">Toutes périodes confondues</span>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-600/10 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-200 dark:border-purple-500/20">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xxs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Devis Acceptés / Facturés</span>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">{kpis.acceptedCount}</div>
                <span className="text-xxs text-slate-500 mt-0.5 block">Validés par le patient</span>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xxs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">En Attente / Négociation</span>
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 tabular-nums">{kpis.pendingCount}</div>
                <span className="text-xxs text-slate-500 mt-0.5 block">En cours de décision</span>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-200 dark:border-blue-500/20">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xxs font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">Volume Total Estimé</span>
                <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1 tabular-nums">
                  {kpis.totalEstimatedAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-400">DH</span>
                </div>
                <span className="text-xxs text-slate-500 mt-0.5 block">Potentiel soins cliniques</span>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-600/10 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-200 dark:border-purple-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search & Status Filter bar */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-xs">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par N° Devis, Nom du patient, Téléphone, CNIE ou Acte..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: 'all', label: 'Tous' },
                  { id: 'Draft', label: 'Brouillons' },
                  { id: 'Sent', label: 'En attente' },
                  { id: 'Accepted', label: 'Acceptés' },
                  { id: 'Invoiced', label: 'Facturés' },
                  { id: 'Rejected', label: 'Refusés' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Devis Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 flex justify-center items-center">
                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredDevis.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                Aucun devis trouvé pour les critères sélectionnés.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase text-[11px] font-bold border-b border-slate-200/80 dark:border-white/10 tracking-wider">
                      <th className="py-3.5 px-4 w-36">N° Devis</th>
                      <th className="py-3.5 px-3 w-28 text-center">Date</th>
                      <th className="py-3.5 px-4">Patient</th>
                      <th className="py-3.5 px-3 text-center w-24">Actes</th>
                      <th className="py-3.5 px-4 text-right w-32">Total Devis</th>
                      <th className="py-3.5 px-3 text-center w-28">Statut</th>
                      <th className="py-3.5 px-4 text-center w-48">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {filteredDevis.map((devis) => (
                      <tr
                        key={devis._id}
                        className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => setPreviewDevisData(devis)}
                      >
                        {/* Devis N° */}
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                            {devis.devisNumber}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-3 text-center">
                          <span className="text-slate-600 dark:text-slate-300 font-semibold tabular-nums">
                            {devis.date ? new Date(devis.date).toLocaleDateString('fr-FR') : '—'}
                          </span>
                        </td>

                        {/* Patient */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-white uppercase">
                              {devis.patientId?.name || 'Patient Inconnu'}{devis.patientId?.prenom ? ` ${devis.patientId.prenom}` : ''}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {devis.patientId?.phone || devis.patientId?.nationalId || ''}
                            </span>
                          </div>
                        </td>

                        {/* Actes Count */}
                        <td className="py-3.5 px-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xxs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {devis.items?.length || 0} acte(s)
                          </span>
                        </td>

                        {/* Total Devis */}
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-mono font-black text-slate-900 dark:text-white text-xs">
                            {(devis.netAmount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}{' '}
                            <span className="text-[10px] text-slate-400">DH</span>
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3 text-center">
                          {getStatusBadge(devis.status)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Aperçu / Print */}
                            <button
                              type="button"
                              onClick={() => setPreviewDevisData(devis)}
                              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-600/10 dark:hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 transition-all cursor-pointer shadow-2xs"
                              title="Aperçu A4 & Impression"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleEditDevis(devis)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-all cursor-pointer shadow-2xs"
                              title="Modifier ce devis"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Convert to Invoice */}
                            {devis.status !== 'Invoiced' && (
                              <button
                                type="button"
                                disabled={convertingId === devis._id}
                                onClick={() => handleConvertToInvoice(devis)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xxs font-bold transition-all cursor-pointer shadow-2xs"
                                title="Transformer ce devis en facture officielle"
                              >
                                <FileCheck className="w-3 h-3" />
                                <span>Facturer</span>
                              </button>
                            )}

                            {/* WhatsApp */}
                            <button
                              type="button"
                              onClick={() => handleSendWhatsApp(devis)}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/10 dark:hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 transition-all cursor-pointer shadow-2xs"
                              title="Envoyer le devis par WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteDevis(devis._id, devis.devisNumber)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Supprimer ce devis"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- VIEW MODE 2: EDIT / CREATE DEVIS --- */}
      {viewMode === 'edit' && (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Main Form (Left Column) */}
          <div className="flex-1 w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-sm p-6 flex flex-col gap-6">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {editDevisId ? `Modifier le Devis N° ${devisNumber}` : 'Nouveau Devis Estimatif'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Renseignez les soins dentaires prévisionnels et le montant estimé.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Statut :</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="h-9 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Draft">Brouillon</option>
                  <option value="Sent">En attente (Envoyé)</option>
                  <option value="Accepted">Accepté</option>
                  <option value="Rejected">Refusé</option>
                  <option value="Invoiced">Facturé</option>
                </select>
              </div>
            </div>

            {/* Patient & Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Patient *
                </label>
                <SearchablePatientSelect
                  patients={patients}
                  selectedId={selectedPatientId}
                  onChange={(id: string) => setSelectedPatientId(id)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Date du Devis
                </label>
                <CustomDatePicker
                  value={devisDate}
                  onChange={(val) => setDevisDate(val)}
                  placeholder="Date d'émission"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Date de Validité (30 jours)
                </label>
                <CustomDatePicker
                  value={validUntil}
                  onChange={(val) => setValidUntil(val)}
                  placeholder="Valable jusqu'au"
                />
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  Soins & Actes Estimés ({lineItems.length})
                </h3>
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter une ligne</span>
                </button>
              </div>

              <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-visible">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase text-xxs font-bold border-b border-slate-200 dark:border-white/10">
                    <tr>
                      <th className="py-2.5 px-3 w-24 text-center">Date</th>
                      <th className="py-2.5 px-2.5 w-20 text-center">Dent</th>
                      <th className="py-2.5 px-3">Désignation de l'acte</th>
                      <th className="py-2.5 px-3 text-right w-32">Montant (DH)</th>
                      <th className="py-2.5 px-2 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {lineItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                        <td className="py-2 px-2.5 text-center">
                          <input
                            type="text"
                            placeholder="JJ/MM"
                            value={item.date}
                            onChange={(e) => handleLineItemChange(idx, 'date', e.target.value)}
                            className="w-full text-center px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-xs font-mono"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="text"
                            placeholder="ex: 12"
                            value={item.tooth}
                            onChange={(e) => handleLineItemChange(idx, 'tooth', e.target.value)}
                            className="w-full text-center px-1.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-xs font-bold"
                          />
                        </td>
                        <td className="py-2 px-2.5">
                          <SearchableActInput
                            value={item.description}
                            dentalActs={dentalActs}
                            colorScheme="purple"
                            placeholder="Rechercher ou saisir un acte (ex: Couronne, Implant...)"
                            onChangeText={(text) => handleLineItemChange(idx, 'description', text)}
                            onSelectAct={(actName, defaultPrice) => {
                              const updated = [...lineItems];
                              updated[idx].description = actName;
                              updated[idx].amount = defaultPrice;
                              setLineItems(updated);
                            }}
                            onAddNewAct={(prefill) => handleOpenQuickActModal(idx, prefill)}
                          />
                        </td>
                        <td className="py-2 px-2.5 text-right">
                          <input
                            type="number"
                            min="0"
                            step="50"
                            placeholder="0.00"
                            value={item.amount === 0 ? '' : item.amount}
                            onChange={(e) => handleLineItemChange(idx, 'amount', e.target.value)}
                            className="w-full text-right px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-xs font-mono font-bold text-slate-900 dark:text-white"
                          />
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(idx)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Supprimer cette ligne"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes / Remarques */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Remarques / Conditions Thérapeutiques (Optionnel)
              </label>
              <textarea
                rows={2}
                placeholder="ex: Devis comprenant la pose d'implants et couronnes céramiques, valable 30 jours..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Summary & Save Footer */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                {editDevisId && (
                  <button
                    type="button"
                    onClick={() => {
                      const cur = devisList.find((d) => d._id === editDevisId);
                      if (cur) setPreviewDevisData(cur);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 text-xs font-bold cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Aperçu A4</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Remise (DH) :</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-24 text-right px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-xs font-mono font-bold"
                  />
                </div>

                <div className="text-right">
                  <span className="text-xxs font-extrabold uppercase text-slate-400 block">Total Net Estimé</span>
                  <span className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono">
                    {calculateNetTotal().toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSaveDevis}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 cursor-pointer transition-all"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Enregistrer le Devis</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Act Catalog Drawer (Right Column) */}
          <div className="w-full lg:w-80 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-sm p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Catalogue
                </h3>
              </div>
              <button
                type="button"
                onClick={() => handleOpenQuickActModal(null, '')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 text-xs font-bold hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 dark:hover:text-white transition-all cursor-pointer shadow-2xs"
                title="Ajouter un nouvel acte au catalogue"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Nouveau</span>
              </button>
            </div>
            <p className="text-xxs text-slate-400 leading-tight">
              Cliquez sur un acte ci-dessous pour l'ajouter automatiquement au devis avec son tarif :
            </p>

            {/* Quick search inside side catalog */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrer les actes du catalogue..."
                value={actCatalogSearch}
                onChange={(e) => setActCatalogSearch(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
              />
              {actCatalogSearch && (
                <button
                  type="button"
                  onClick={() => setActCatalogSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex flex-col gap-1.5 max-h-[460px] overflow-y-auto no-scrollbar pr-1">
              {dentalActs.filter((a) => !actCatalogSearch.trim() || a.name.toLowerCase().includes(actCatalogSearch.toLowerCase()) || (a.category && a.category.toLowerCase().includes(actCatalogSearch.toLowerCase()))).length === 0 ? (
                <div className="text-center py-6 px-2 text-xxs text-slate-400 flex flex-col items-center gap-2.5">
                  <span>Aucun acte ne correspond à votre recherche.</span>
                  <button
                    type="button"
                    onClick={() => handleOpenQuickActModal(null, actCatalogSearch)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Ajouter "{actCatalogSearch || 'Nouvel Acte'}"</span>
                  </button>
                </div>
              ) : (
                dentalActs
                  .filter((a) => !actCatalogSearch.trim() || a.name.toLowerCase().includes(actCatalogSearch.toLowerCase()) || (a.category && a.category.toLowerCase().includes(actCatalogSearch.toLowerCase())))
                  .map((act) => (
                  <button
                    key={act._id}
                    type="button"
                    onClick={() => handleQuickAddAct(act)}
                    className="flex justify-between items-center p-2 rounded-xl bg-slate-50 hover:bg-purple-50 dark:bg-white/5 dark:hover:bg-purple-950/30 border border-slate-200/60 dark:border-white/5 hover:border-purple-300 dark:hover:border-purple-700 text-left transition-all cursor-pointer group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 truncate">
                        {act.name}
                      </div>
                      <div className="text-[10px] text-slate-400">{act.category || 'Soins'}</div>
                    </div>
                    <span className="text-xs font-black font-mono text-purple-600 dark:text-purple-400 shrink-0">
                      {act.defaultPrice} DH
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: A4 PRINT & PREVIEW MODAL --- */}
      {previewDevisData && config && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs select-none">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header bar */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-slate-950/60 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-600/10 text-purple-400 border border-purple-500/20">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Aperçu A4 • Devis N° {previewDevisData.devisNumber}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Patient : <strong className="text-white">{previewDevisData.patientId?.name || ''} {previewDevisData.patientId?.prenom || ''}</strong>
                  </p>
                </div>
              </div>

              {/* Actions & Zoom Controls */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1">
                  <span className="text-xxs text-slate-400">Zoom :</span>
                  <button
                    onClick={() => setPreviewScale((s) => Math.max(0.5, s - 0.05))}
                    className="text-xs font-bold text-slate-300 hover:text-white px-1.5"
                  >
                    -
                  </button>
                  <span className="text-xxs font-mono text-white font-bold">{Math.round(previewScale * 100)}%</span>
                  <button
                    onClick={() => setPreviewScale((s) => Math.min(1.0, s + 0.05))}
                    className="text-xs font-bold text-slate-300 hover:text-white px-1.5"
                  >
                    +
                  </button>
                </div>

                {/* Print button */}
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/20 cursor-pointer transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer le Devis (A4)</span>
                </button>

                {/* Close */}
                <button
                  onClick={() => setPreviewDevisData(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Document Preview Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 flex justify-center">
              <div
                style={{
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top center',
                  marginBottom: `${(1 - previewScale) * 350}px`,
                }}
                className="transition-transform duration-200"
              >
                <DevisPrintLayout devis={previewDevisData} config={config} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Create Dental Act Modal */}
      <QuickCreateDentalActModal
        isOpen={showQuickActModal}
        onClose={() => setShowQuickActModal(false)}
        prefillName={quickActPrefill}
        onActCreated={handleActCreated}
        colorScheme="purple"
      />
    </div>
  );
};
