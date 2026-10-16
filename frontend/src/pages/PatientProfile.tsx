import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DentalChart } from '../components/DentalChart';
import { Dental3DViewer } from '../components/Dental3DViewer';
import { API_URL, UPLOADS_URL } from '../config/api';
import { useLiveSync } from '../context/LiveSyncContext';
import {
  User,
  Heart,
  Calendar,
  FileText,
  CreditCard,
  Image as ImageIcon,
  History,
  UploadCloud,
  ChevronRight,
  Eye,
  Download,
  Trash2,
  Bookmark,
  FileDigit,
  Plus,
  ArrowLeft,
  Search,
  Table,
  Loader2,
  Video as VideoIcon,
  Volume2,
  Film,
  MessageSquare,
  Radio,
  ExternalLink,
  Printer,
  CheckSquare,
  Square,
  Receipt,
  Wallet,
  X,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Edit,
  AlertTriangle,
} from 'lucide-react';
import { Patient, Invoice, PaymentTransaction, Appointment, Document, DentalAct, ClinicConfig } from '../types';
import { formatDate, formatDateTime, formatBirthDateWithAge, formatRelativeDateTime } from '../utils/dateUtils';
import { PatientLedgerPrintLayout } from '../components/PatientLedgerPrintLayout';
import { InvoicePrintLayout } from '../components/InvoicePrintLayout';
import { SearchableActSelect } from '../components/SearchableActSelect';
import { DENTAL_CATEGORIES } from '../components/DentalActsManager';
import { parseToothNumbers, getToothLabel } from '../utils/dentalUtils';
import { getLocalAvatar } from '../utils/avatarUtils';


export const PatientProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const { toast, confirm } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState<string>(() => {
    return (location.state as any)?.activeTab || 'Overview';
  });
  const [chartMode, setChartMode] = useState<'3D' | '2D'>('3D');
  const [loading, setLoading] = useState(true);

  // Restore tab and checked items if coming back from InvoiceEditor
  useEffect(() => {
    if ((location.state as any)?.activeTab) {
      setActiveTab((location.state as any).activeTab);
    }
    if ((location.state as any)?.selectedActIds && Array.isArray((location.state as any).selectedActIds)) {
      setSelectedActsForInvoice((location.state as any).selectedActIds);
    }
  }, [location.state]);

  // Sub-data states
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

  const [uploadCategory, setUploadCategory] = useState<'Photos' | 'XRays' | 'Documents' | 'Videos' | 'Audio'>('Documents');
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<Document | null>(null);

  // Carnet Financier (Diftar du Patient) & Treatments state
  const [ledgerData, setLedgerData] = useState<{
    summary: { totalActsAmount: number; totalPaidAmount: number; remainingBalance: number; unbilledCount: number };
    acts: any[];
    payments: any[];
    unbilledActs: any[];
  } | null>(null);
  const [selectedActsForInvoice, setSelectedActsForInvoice] = useState<string[]>([]);
  const [dentalActs, setDentalActs] = useState<DentalAct[]>([]);
  const [clinicConfig, setClinicConfig] = useState<ClinicConfig | null>(null);

  // Add Treatment Modal state
  const [showCarnetPreview, setShowCarnetPreview] = useState(false);
  const [carnetPreviewScale, setCarnetPreviewScale] = useState<number>(0.70);
  const [previewInvoiceData, setPreviewInvoiceData] = useState<Invoice | null>(null);
  const [invoicePreviewScale, setInvoicePreviewScale] = useState<number>(0.72);
  const [showAddActModal, setShowAddActModal] = useState(false);
  const [selectedActId, setSelectedActId] = useState('');
  const [actDate, setActDate] = useState(new Date().toISOString().split('T')[0]);
  const [actTooth, setActTooth] = useState('');
  const [actName, setActName] = useState('');
  const [actCost, setActCost] = useState('');
  const [actAdvance, setActAdvance] = useState('');
  const [actPaymentMode, setActPaymentMode] = useState('espèces');
  const [actNotes, setActNotes] = useState('');

  // Quick Act Advance / Tranche Payment modal state
  const [showActAdvanceModal, setShowActAdvanceModal] = useState(false);
  const [selectedActForAdvance, setSelectedActForAdvance] = useState<any>(null);
  const [actAdvanceAmount, setActAdvanceAmount] = useState('');
  const [actAdvancePaymentMode, setActAdvancePaymentMode] = useState('espèces');
  const [actAdvanceDate, setActAdvanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [actAdvanceNotes, setActAdvanceNotes] = useState('');
  const [actAdvanceHistory, setActAdvanceHistory] = useState<any[]>([]);
  const [loadingAdvanceHistory, setLoadingAdvanceHistory] = useState(false);
  const [savingActAdvance, setSavingActAdvance] = useState(false);

  const handleOpenAddActModal = () => {
    setSelectedActId('');
    setActDate(new Date().toISOString().split('T')[0]);
    setActTooth('');
    setActName('');
    setActCost('');
    setActAdvance('');
    setActPaymentMode('espèces');
    setActNotes('');
    setShowAddActModal(true);
  };

  // Quick Create Dental Act Modal state
  const [showQuickCreateActModal, setShowQuickCreateActModal] = useState(false);
  const [newActFormName, setNewActFormName] = useState('');
  const [newActFormCategory, setNewActFormCategory] = useState(DENTAL_CATEGORIES[0]);
  const [newActFormPrice, setNewActFormPrice] = useState<string>('');
  const [newActFormDescription, setNewActFormDescription] = useState('');
  const [savingNewAct, setSavingNewAct] = useState(false);

  const handleOpenQuickCreateAct = (prefillName = '') => {
    setNewActFormName(prefillName);
    setNewActFormCategory(DENTAL_CATEGORIES[0]);
    setNewActFormPrice('');
    setNewActFormDescription('');
    setShowQuickCreateActModal(true);
  };

  const handleQuickCreateAct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActFormName.trim() || !newActFormPrice) {
      toast.error('Veuillez renseigner le nom et le tarif par défaut');
      return;
    }

    setSavingNewAct(true);
    try {
      const res = await fetch(`${API_URL}/dental-acts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newActFormName.trim(),
          category: newActFormCategory,
          defaultPrice: Number(newActFormPrice),
          description: newActFormDescription.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de l'enregistrement de l'acte");
      }

      const createdAct: DentalAct = await res.json();
      setDentalActs((prev) => [...prev, createdAct]);

      // Automatically select the newly created act in the "Consigner un Soin" modal
      setSelectedActId(createdAct._id);
      setActName(createdAct.name);
      setActCost(String(createdAct.defaultPrice || 0));

      setShowQuickCreateActModal(false);
      toast.success(`Acte "${createdAct.name}" ajouté avec succès au catalogue et sélectionné !`);
    } catch (error: any) {
      console.error('Error creating dental act:', error);
      toast.error(error.message || "Impossible d'ajouter l'acte au catalogue");
    } finally {
      setSavingNewAct(false);
    }
  };

  // Payment Modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [logPaymentDate, setLogPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [logPaymentAmount, setLogPaymentAmount] = useState('');
  const [logPaymentMethod, setLogPaymentMethod] = useState<'espèces' | 'chèque' | 'carte' | 'virement' | 'traites'>('espèces');
  const [logPaymentInvoiceId, setLogPaymentInvoiceId] = useState<string>('');
  const [logPaymentNotes, setLogPaymentNotes] = useState('');

  // CSV & Text Preview States
  const [csvPreviewData, setCsvPreviewData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [textPreviewContent, setTextPreviewContent] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [previewSearchTerm, setPreviewSearchTerm] = useState<string>('');

  useEffect(() => {
    if (!previewFile) {
      setCsvPreviewData(null);
      setTextPreviewContent(null);
      setPreviewSearchTerm('');
      return;
    }

    const filename = previewFile.fileName.toLowerCase();
    const isCsv = filename.endsWith('.csv');
    const isTxt = filename.endsWith('.txt') || filename.endsWith('.json') || filename.endsWith('.log');

    if (isCsv || isTxt) {
      setLoadingPreview(true);
      fetch(getDocUrl(previewFile.filePath))
        .then((res) => res.text())
        .then((text) => {
          if (isCsv) {
            setCsvPreviewData(parseCSVText(text));
          } else {
            setTextPreviewContent(text);
          }
        })
        .catch((err) => console.error('Error fetching file content for preview:', err))
        .finally(() => setLoadingPreview(false));
    }
  }, [previewFile]);

  const parseCSVText = (csvText: string) => {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length === 0) return { headers: [], rows: [] };

    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]);
    const rows = lines.slice(1).filter((l) => l.trim().length > 0).map(parseLine);
    return { headers, rows };
  };


  const getDocUrl = (pathStr: string) => {
    if (!pathStr) return '';
    const cleanPath = pathStr.startsWith('/') ? pathStr : '/' + pathStr;
    return `${UPLOADS_URL}${cleanPath}`;
  };

  useEffect(() => {
    fetchPatientProfile();
  }, [id]);

  // Real-Time Live Sync: Refresh patient record and tabs when changes occur
  useLiveSync(['PATIENTS_CHANGED', 'APPOINTMENTS_CHANGED', 'DOCUMENTS_CHANGED', 'FINANCIALS_CHANGED'], (payload) => {
    if (!payload.entityId || payload.entityId === id) {
      fetchPatientProfile();
    }
  });

  const fetchPatientProfile = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const patRes = await fetch(`${API_URL}/patients/${id}`, { headers });
      if (!patRes.ok) {
        setLoading(false);
        setPatient(null);
        toast.error('Patient introuvable', 'Ce dossier patient n\'existe pas ou a été supprimé.');
        navigate('/patients');
        return;
      }
      const patData = await patRes.json();
      if (!patData || !patData._id) {
        setLoading(false);
        setPatient(null);
        toast.error('Patient introuvable', 'Ce dossier patient n\'existe pas.');
        navigate('/patients');
        return;
      }
      setPatient(patData);

      // Fetch Sub-resources concurrently
      const [invRes, payRes, appRes, docRes, ledgerRes, actsRes, cfgRes] = await Promise.all([
        fetch(`${API_URL}/invoices?patientId=${id}`, { headers }),
        fetch(`${API_URL}/payments/patient/${id}`, { headers }),
        fetch(`${API_URL}/appointments?start=${new Date(Date.now() - 31536000000).toISOString()}&end=${new Date(Date.now() + 31536000000).toISOString()}`, { headers }),
        fetch(`${API_URL}/documents/patient/${id}`, { headers }),
        fetch(`${API_URL}/treatments/patient/${id}/ledger`, { headers }),
        fetch(`${API_URL}/dental-acts`, { headers }),
        fetch(`${API_URL}/clinic/config`, { headers }),
      ]);

      const invData = await invRes.json();
      const payData = await payRes.json();
      const appData = await appRes.json();
      const docData = await docRes.json();
      const ledgerResData = await ledgerRes.json();
      const actsData = await actsRes.json();
      const cfgData = await cfgRes.json();

      setInvoices(invData.invoices || []);
      setPayments(payData || []);
      setAppointments(appData.filter((a: any) => (a.patientId?._id || a.patientId) === id));
      setDocuments(docData || []);
      setLedgerData(ledgerResData || null);
      if (Array.isArray(actsData)) setDentalActs(actsData);
      setClinicConfig(cfgData || null);
    } catch (err) {
      console.error('Error fetching patient records:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLedger = async () => {
    if (!id) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_URL}/treatments/patient/${id}/ledger`, { headers });
      const data = await res.json();
      setLedgerData(data);
    } catch (err) {
      console.error('Error fetching ledger:', err);
    }
  };

  const handleOpenPaymentModal = (invoiceId?: string) => {
    if (invoiceId) {
      setLogPaymentInvoiceId(invoiceId);
      const inv = invoices.find((i) => i._id === invoiceId);
      if (inv) {
        setLogPaymentAmount(String(Math.max(0, inv.netAmount - (inv.paidAmount || 0))));
      } else {
        setLogPaymentAmount('');
      }
    } else {
      setLogPaymentInvoiceId('');
      if (ledgerData?.summary?.remainingBalance) {
        setLogPaymentAmount(String(ledgerData.summary.remainingBalance));
      } else {
        setLogPaymentAmount('');
      }
    }
    setLogPaymentDate(new Date().toISOString().split('T')[0]);
    setLogPaymentNotes('');
    setShowPaymentModal(true);
  };

  const handleLogPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(logPaymentAmount);
    if (!amt || amt <= 0 || !id) {
      toast.warning('Montant invalide', 'Veuillez saisir un montant supérieur à 0.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          patientId: id,
          invoiceId: logPaymentInvoiceId || undefined,
          amount: amt,
          paymentMethod: logPaymentMethod,
          notes: logPaymentNotes,
          date: logPaymentDate,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Erreur lors de l\'enregistrement du versement.');
      }

      toast.success('Paiement enregistré', `Règlement de ${amt.toFixed(2)} DH consigné avec succès.`);
      setShowPaymentModal(false);
      setLogPaymentAmount('');
      setLogPaymentNotes('');
      setLogPaymentInvoiceId('');
      fetchLedger();
      fetchPatientProfile();
    } catch (err: any) {
      toast.error('Erreur', err.message || 'Impossible d\'enregistrer le versement.');
    }
  };

  const handleAddTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actName.trim() || !id) {
      toast.warning('Champs requis', 'Veuillez renseigner le nom de l\'acte / soin.');
      return;
    }

    try {
      const parsedTeeth = parseToothNumbers(actTooth);
      const normalizedTooth = parsedTeeth.length === 1 ? String(parsedTeeth[0]) : actTooth.trim();
      const parsedCost = parseFloat(actCost) || 0;
      const parsedAdvance = parseFloat(actAdvance) || 0;

      const res = await fetch(`${API_URL}/treatments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          patientId: id,
          date: actDate,
          tooth: normalizedTooth,
          actName: actName.trim(),
          cost: parsedCost,
          advance: parsedAdvance,
          paymentMode: actPaymentMode || 'espèces',
          notes: actNotes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Erreur lors de l\'enregistrement du soin.');
      }

      toast.success(
        'Soin consigné',
        parsedAdvance > 0
          ? `L'acte "${actName}" a été ajouté (A payer: ${parsedCost} DH, Avance: ${parsedAdvance} DH).`
          : `L'acte "${actName}" a été ajouté au carnet (${parsedCost} DH).`
      );
      setShowAddActModal(false);
      setSelectedActId('');
      setActTooth('');
      setActName('');
      setActCost('');
      setActAdvance('');
      setActPaymentMode('espèces');
      setActNotes('');
      fetchLedger();
      fetchPatientProfile();
    } catch (err: any) {
      toast.error('Erreur', err.message || 'Impossible d\'enregistrer le soin.');
    }
  };

  const fetchActAdvanceHistory = async (treatmentId: string) => {
    setLoadingAdvanceHistory(true);
    try {
      const res = await fetch(`${API_URL}/treatments/${treatmentId}/advances`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActAdvanceHistory(data.payments || []);
        setSelectedActForAdvance((prev: any) => ({
          ...prev,
          amount: data.cost !== undefined ? data.cost : prev?.amount,
          paidAmount: data.paidAmount !== undefined ? data.paidAmount : prev?.paidAmount,
          remainingAmount: data.remainingAmount !== undefined ? data.remainingAmount : prev?.remainingAmount,
        }));
      }
    } catch (err) {
      console.error('Error fetching advance history:', err);
    } finally {
      setLoadingAdvanceHistory(false);
    }
  };

  const handleOpenActAdvanceModal = (act: any) => {
    setSelectedActForAdvance(act);
    setActAdvanceAmount('');
    setActAdvancePaymentMode('espèces');
    setActAdvanceDate(new Date().toISOString().split('T')[0]);
    setActAdvanceNotes('');
    setActAdvanceHistory([]);
    fetchActAdvanceHistory(act._id);
    setShowActAdvanceModal(true);
  };

  const handleSaveActAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActForAdvance || !selectedActForAdvance._id) return;
    const amt = parseFloat(actAdvanceAmount);
    if (!amt || amt <= 0) {
      toast.warning('Montant invalide', 'Veuillez saisir un montant supérieur à 0.');
      return;
    }

    setSavingActAdvance(true);
    try {
      const res = await fetch(`${API_URL}/treatments/${selectedActForAdvance._id}/advance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          amount: amt,
          paymentMethod: actAdvancePaymentMode,
          date: actAdvanceDate,
          notes: actAdvanceNotes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Erreur lors de l\'enregistrement de l\'acompte.');
      }

      toast.success('Acompte enregistré', `Versement de ${amt.toFixed(2)} DH consigné avec succès.`);
      setActAdvanceAmount('');
      setActAdvanceNotes('');
      await fetchActAdvanceHistory(selectedActForAdvance._id);
      fetchLedger();
      fetchPatientProfile();
    } catch (err: any) {
      toast.error('Erreur', err.message || 'Impossible d\'enregistrer l\'acompte.');
    } finally {
      setSavingActAdvance(false);
    }
  };

  const handleDeleteActAdvance = async (paymentId: string, amount: number) => {
    if (!selectedActForAdvance || !selectedActForAdvance._id) return;
    const ok = await confirm({
      title: 'Supprimer ce versement ?',
      message: `Êtes-vous sûr de vouloir supprimer ce versement de ${amount.toFixed(2)} DH ? Le reste dû sera automatiquement réajusté.`,
      confirmText: 'Supprimer',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const res = await fetch(`${API_URL}/treatments/${selectedActForAdvance._id}/advance/${paymentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Erreur lors de la suppression du versement');
      }
      const data = await res.json();
      toast.success('Versement supprimé', 'Le versement a été retiré et le solde réajusté.');
      setActAdvanceHistory(data.payments || []);
      setSelectedActForAdvance((prev: any) => ({
        ...prev,
        paidAmount: data.paidAmount,
        remainingAmount: data.remainingAmount,
      }));
      fetchLedger();
      fetchPatientProfile();
    } catch (err: any) {
      toast.error('Erreur', err.message || 'Impossible de supprimer ce versement.');
    }
  };

  const handleDeleteTreatment = async (treatmentId: string) => {
    const ok = await confirm({
      title: 'Supprimer ce soin ?',
      message: 'Ce soin sera retiré définitivement du carnet du patient.',
      confirmText: 'Supprimer',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const res = await fetch(`${API_URL}/treatments/${treatmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur suppression soin');
      toast.success('Soin retiré', 'Le soin a été supprimé du carnet.');
      fetchLedger();
    } catch (err: any) {
      toast.error('Erreur', err.message || 'Impossible de supprimer ce soin.');
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    const ok = await confirm({
      title: 'Annuler ce versement ?',
      message: 'Ce versement sera annulé et le solde du patient sera recalculé.',
      confirmText: 'Annuler le versement',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const res = await fetch(`${API_URL}/payments/${paymentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur annulation paiement');
      toast.success('Versement annulé', 'Le paiement a été retiré et le solde recalculé.');
      fetchLedger();
      fetchPatientProfile();
    } catch (err: any) {
      toast.error('Erreur', err.message || 'Impossible d\'annuler ce versement.');
    }
  };

  const handleToggleActSelect = (actId: string) => {
    if (selectedActsForInvoice.includes(actId)) {
      setSelectedActsForInvoice(selectedActsForInvoice.filter((i) => i !== actId));
    } else {
      setSelectedActsForInvoice([...selectedActsForInvoice, actId]);
    }
  };

  const handleSelectAllUnbilled = () => {
    if (!ledgerData) return;
    const unbilledIds = ledgerData.acts.filter((a) => !a.invoiceId).map((a) => a._id);
    if (selectedActsForInvoice.length === unbilledIds.length) {
      setSelectedActsForInvoice([]);
    } else {
      setSelectedActsForInvoice(unbilledIds);
    }
  };

  const handleInvoiceSelectedActs = () => {
    const fullPatientName = patient ? `${patient.name}${patient.prenom ? ' ' + patient.prenom : ''}` : '';
    if (!ledgerData || selectedActsForInvoice.length === 0) {
      navigate('/invoices', { state: { patientId: patient?._id, patientName: fullPatientName } });
      return;
    }
    const chosenActs = ledgerData.acts.filter((a) => selectedActsForInvoice.includes(a._id));
    navigate('/invoices', {
      state: {
        patientId: patient?._id,
        patientName: fullPatientName,
        prefilledItems: chosenActs,
      },
    });
  };

  const handleUpdateApptStatus = async (apptId: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_URL}/appointments/${apptId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Erreur lors de la mise à jour du rendez-vous');

      const statusLabel =
        newStatus === 'Completed'
          ? 'Terminé'
          : newStatus === 'Cancelled'
          ? 'Annulé'
          : newStatus === 'No Show'
          ? 'Absent'
          : 'Planifié';

      toast.success('Rendez-vous actualisé', `Le rendez-vous a été marqué comme "${statusLabel}".`);

      setAppointments((prev) =>
        prev.map((a) => (a._id === apptId ? { ...a, status: newStatus as any } : a))
      );
    } catch (err: any) {
      console.error(err);
      toast.error('Erreur', err.message || 'Impossible de mettre à jour le statut du rendez-vous');
    }
  };

  const handleSendApptWhatsApp = (appt: Appointment) => {
    const phone = patient?.phone;
    if (!phone) {
      toast.warning('Numéro introuvable', 'Le patient ne possède pas de numéro de téléphone valide.');
      return;
    }
    const dateStr = new Date(appt.dateTime).toLocaleDateString('fr-FR');
    const timeStr = new Date(appt.dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const patName = `${patient.name} ${patient.prenom || ''}`.trim();
    const message = encodeURIComponent(
      `Bonjour ${patName},\nNous vous rappelons votre rendez-vous au Cabinet Dentaire Dr. Salma Tijini le ${dateStr} à ${timeStr}.\nEn cas d'empêchement, merci de nous prévenir au plus vite.`
    );
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${message}`, '_blank');
  };

  const isVideoFile = (fileName: string, fileType?: string) =>
    fileType === 'Video' || ['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(fileName.toLowerCase().split('.').pop() || '');

  const isAudioFile = (fileName: string, fileType?: string) =>
    fileType === 'Audio' || ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(fileName.toLowerCase().split('.').pop() || '');

  const isImageFile = (fileName: string, fileType?: string) =>
    (fileType && ['Photo', 'XRay'].includes(fileType)) || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(fileName.toLowerCase().split('.').pop() || '');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !id) return;

    const file = e.target.files[0];
    const ext = file.name.toLowerCase().split('.').pop() || '';

    // Auto-detect exact category and fileType from extension
    let cat = uploadCategory;
    let fileType: 'Photo' | 'XRay' | 'Document' | 'Video' | 'Audio' = 'Document';

    if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) {
      cat = 'Videos';
      fileType = 'Video';
    } else if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) {
      cat = 'Audio';
      fileType = 'Audio';
    } else if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext)) {
      cat = uploadCategory === 'XRays' ? 'XRays' : 'Photos';
      fileType = uploadCategory === 'XRays' ? 'XRay' : 'Photo';
    } else {
      cat = 'Documents';
      fileType = 'Document';
    }

    const formData = new FormData();
    formData.append('patientId', id);
    formData.append('category', cat);
    formData.append('fileType', fileType);
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await fetch(`${API_URL}/documents/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Upload failed');
      }
      const newDoc = await res.json();
      setDocuments([newDoc, ...documents]);
      toast.success('Document ajouté', 'Le fichier a été téléversé avec succès.');
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error('Erreur d\'importation', err.message || 'Impossible de téléverser le fichier.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    const confirmed = await confirm({
      title: 'Supprimer ce fichier ?',
      message: 'Ce document médical sera définitivement retiré du dossier patient.',
      variant: 'danger',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
    });
    if (!confirmed) return;

    try {
      await fetch(`${API_URL}/documents/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocuments(documents.filter((doc) => doc._id !== fileId));
      if (previewFile?._id === fileId) setPreviewFile(null);
      toast.success('Fichier supprimé', 'Le document a été retiré.');
    } catch (err) {
      console.error('Delete file error:', err);
      toast.error('Erreur', 'Impossible de supprimer le document.');
    }
  };

  const handleSendDocWhatsApp = async (doc: Document) => {
    if (!patient?.phone) {
      toast.warning('Numéro manquant', 'Le patient ne dispose pas d\'un numéro de téléphone.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/notifications/send-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          patientId: id,
          documentId: doc._id,
          recipient: patient.phone,
          channel: 'WhatsApp',
          body: `Bonjour ${patient.name},\n\nVeuillez trouver ci-joint votre document médical : "${doc.fileName}" (${doc.fileType}) transmis par le Cabinet Dentaire Dr. Salma Tijini.`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Échec de l\'envoi');

      toast.success(
        'Document transmis !',
        `Le document "${doc.fileName}" a été envoyé avec succès au patient par WhatsApp.`
      );
    } catch (err: any) {
      console.error('Error sending document via WhatsApp:', err);
      toast.error('Erreur', err.message || 'Impossible d\'envoyer le document.');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!patient || !patient._id) {
    return (
      <div className="flex-1 p-8 flex flex-col items-center justify-center gap-4 text-center min-h-[500px]">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Dossier Patient Introuvable</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
          Ce dossier patient n'existe pas dans la base de données ou a été supprimé.
        </p>
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à la liste des Patients</span>
        </button>
      </div>
    );
  }

  const tabs = [
    { name: 'Overview', label: 'Vue d\'ensemble', icon: History },
    { name: 'Ledger', label: 'Carnet Financier (Diftar)', icon: CreditCard },
    { name: 'Chart', label: 'Odontogramme', icon: Bookmark },
    { name: 'Medical', label: 'Dossier Médical', icon: User },
    { name: 'Invoices', label: 'Factures', icon: FileText },
    { name: 'Appointments', label: 'Rendez-vous', icon: Calendar },
    { name: 'Files', label: 'Documents & Radios', icon: ImageIcon },
  ];

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 overflow-y-auto no-scrollbar max-h-[calc(100vh-80px)] select-none print:block print:p-0 print:max-h-none print:overflow-visible">
      {/* Offscreen Print Component (Rendered strictly when printing) */}
      <div className="hidden print:block">
        {previewInvoiceData && clinicConfig ? (
          <InvoicePrintLayout
            invoice={previewInvoiceData}
            config={clinicConfig}
          />
        ) : patient && (
          <PatientLedgerPrintLayout
            patient={patient}
            config={clinicConfig}
            acts={ledgerData?.acts || []}
            payments={ledgerData?.payments || []}
            summary={ledgerData?.summary || { totalActsAmount: 0, totalPaidAmount: 0, remainingBalance: 0 }}
          />
        )}
      </div>

      {/* Screen Views (Hidden during printing) */}
      <div className="print:hidden flex flex-col gap-6">
        {/* Back button */}
        <div className="flex items-center shrink-0">
          <button
            onClick={() => navigate('/patients')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 transition-all text-xs font-semibold cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux Patients</span>
          </button>
        </div>

      {/* Patient Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 p-6 rounded-2xl shadow-sm shrink-0">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800 shrink-0 shadow-xs">
            <img
              src={getLocalAvatar(patient.name, patient.prenom, patient.profilePictureUrl)}
              alt={`${patient.name} ${patient.prenom || ''}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = getLocalAvatar(patient.name, patient.prenom);
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                <span className="uppercase">{patient.name}</span>{patient.prenom ? ` ${patient.prenom}` : ''}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xxs font-extrabold border ${
                patient.isArchived
                  ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400'
                  : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              }`}>
                {patient.isArchived ? 'Archivé' : 'Actif'}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <span>📱 <strong className="text-slate-800 dark:text-slate-200 font-mono">{patient.phone}</strong></span>
              {patient.email && <span>✉️ {patient.email}</span>}
              {patient.nationalId && <span>🪪 CNIE : <strong className="text-slate-800 dark:text-slate-200 font-mono">{patient.nationalId}</strong></span>}
              <span className="text-blue-600 dark:text-blue-400 font-semibold">🎂 Né(e) le : <strong>{formatBirthDateWithAge(patient.birthDate)}</strong></span>
              <span>📅 Créé le : <strong>{formatDate(patient.createdAt)}</strong></span>
            </div>

          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigate('/invoices', { state: { patientId: patient._id, patientName: `${patient.name}${patient.prenom ? ' ' + patient.prenom : ''}` } })}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs cursor-pointer shadow-md shadow-blue-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Facturer</span>
          </button>
        </div>
      </div>

      {/* Modern Segmented Pill Tabs Navigation */}
      <div className="flex items-center gap-2 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 overflow-x-auto no-scrollbar shadow-xs shrink-0 min-h-[58px]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.name;
          return (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <tab.icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'text-white scale-110' : 'text-slate-400 dark:text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT PANELS */}
      <div className="flex-1">
        
        {/* OVERVIEW PANEL */}
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Quick Summary / Critical Clinical Info */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* Alert items: allergies, systemic diseases */}
              <div className="p-6 rounded-2xl bg-rose-50/80 dark:bg-rose-500/5 border border-rose-200/80 dark:border-rose-500/10 flex flex-col gap-3 shadow-xs">
                <h4 className="text-xs font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-widest">Alertes médicales & antécédents</h4>
                <div className="flex flex-wrap gap-2">
                  {patient.allergies.map((al, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/20 text-xs font-bold text-rose-700 dark:text-rose-400 shadow-xs">
                      ⚠️ Allergie : {al}
                    </span>
                  ))}
                  {patient.medicalHistory.map((hist, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 text-xs font-bold text-amber-800 dark:text-amber-400 shadow-xs">
                      ❤️ Antécédent : {hist}
                    </span>
                  ))}
                  {patient.allergies.length === 0 && patient.medicalHistory.length === 0 && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Aucune alerte médicale signalée.</span>
                  )}
                </div>
              </div>

              {/* Patient timeline logs */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Activité Récente</h3>
                  <button
                    onClick={() => setActiveTab('Appointments')}
                    className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Tous les RDV</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {appointments.slice(0, 4).map((appt) => {
                    const isCompleted = appt.status === 'Completed';
                    const isCancelled = appt.status === 'Cancelled' || appt.status === 'No Show';
                    const isScheduled = appt.status === 'Scheduled';

                    return (
                      <div
                        key={appt._id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                          isCompleted
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200/60 dark:border-emerald-500/20'
                            : isCancelled
                            ? 'bg-rose-50/40 dark:bg-rose-950/10 border-rose-200/60 dark:border-rose-500/20 opacity-80'
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200/70 dark:border-white/5 hover:border-blue-500/40'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                                : isCancelled
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                            }`}
                          >
                            <Calendar className="w-4 h-4" />
                          </div>

                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                                {formatDateTime(appt.dateTime)}
                              </span>
                              <span className="text-xxs text-slate-400">({appt.duration || 30} min)</span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                              {appt.notes || 'Consultation de contrôle'}
                            </p>
                          </div>
                        </div>

                        {/* Direct Action Buttons & Status Badge */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap">
                          {isScheduled && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdateApptStatus(appt._id, 'Completed')}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
                                title="Marquer ce rendez-vous comme Terminé"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Terminer</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSendApptWhatsApp(appt)}
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/10 dark:hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 transition-all cursor-pointer"
                                title="Envoyer un rappel par WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleUpdateApptStatus(appt._id, 'Cancelled')}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 dark:bg-white/5 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-white/5 transition-all cursor-pointer"
                                title="Annuler le rendez-vous"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>

                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                                Planifié
                              </span>
                            </>
                          )}

                          {isCompleted && (
                            <>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                                <Check className="w-3 h-3 stroke-[3]" />
                                <span>Terminé</span>
                              </span>

                              <button
                                type="button"
                                onClick={handleOpenAddActModal}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-600/10 dark:hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-xs font-bold transition-all cursor-pointer border border-blue-200 dark:border-blue-500/20"
                                title="Consigner le soin effectué au carnet du patient"
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Consigner un Soin</span>
                              </button>
                            </>
                          )}

                          {isCancelled && (
                            <>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                                <span>{appt.status === 'No Show' ? 'Absent' : 'Annulé'}</span>
                              </span>

                              <button
                                type="button"
                                onClick={() => handleUpdateApptStatus(appt._id, 'Scheduled')}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer border border-slate-200 dark:border-white/10"
                                title="Repasser en Planifié"
                              >
                                Rétablir
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {appointments.length === 0 && (
                    <div className="py-8 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Calendar className="w-8 h-8 opacity-40" />
                      <p className="text-xs">Aucune activité récente disponible.</p>
                      <button
                        onClick={() => navigate('/appointments', { state: { patientId: patient._id, patientName: `${patient.name} ${patient.prenom || ''}` } })}
                        className="mt-1 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-600/10 dark:text-blue-400 text-xs font-bold transition-all cursor-pointer"
                      >
                        + Planifier un RDV
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right sidebar: Quick stats */}
            <div className="flex flex-col gap-6">
              
              {/* Financial Summary */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col gap-4">
                <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Résumé Financier</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Total facturé :</span>
                    <span className="text-slate-900 dark:text-white font-mono font-bold">
                      {invoices.reduce((sum, i) => sum + i.netAmount, 0).toFixed(2)} DH
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Montant payé :</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                      {invoices.reduce((sum, i) => sum + i.paidAmount, 0).toFixed(2)} DH
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-slate-100 dark:border-white/5 pt-2 mt-1">
                    <span className="text-slate-500 dark:text-slate-400">Solde restant :</span>
                    <span className="text-rose-600 dark:text-rose-400 font-mono font-bold">
                      {Math.max(0, invoices.reduce((sum, i) => sum + i.netAmount - i.paidAmount, 0)).toFixed(2)} DH
                    </span>
                  </div>
                </div>
              </div>

              {/* General notes */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col gap-3">
                <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Observations Cliniques</h3>
                <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                  {patient.notes || 'Aucune note clinique enregistrée.'}
                </p>
              </div>

            </div>

          </div>
        )}

        {/* DENTAL CHART PANEL */}
        {activeTab === 'Chart' && (
          <div className="flex flex-col gap-4">
            {/* 3D vs 2D Toggle Switcher */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-sm">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Odontogramme Clinique & Schéma Dentaire</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Basculez entre l'arcade 3D interactive et le schéma 2D classique</p>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-white/5">
                <button
                  onClick={() => setChartMode('3D')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    chartMode === '3D' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Vue 3D HD (R3F)
                </button>
                <button
                  onClick={() => setChartMode('2D')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    chartMode === '2D' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Vue 2D Schématique
                </button>
              </div>
            </div>

            {/* Display Selected Chart Mode */}
            {id && (
              chartMode === '3D' ? (
                <Dental3DViewer
                  patientId={id}
                  carnetActs={ledgerData?.acts || []}
                  onUpdateCarnet={fetchLedger}
                />
              ) : (
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-sm">
                  <DentalChart
                    patientId={id}
                    carnetActs={ledgerData?.acts || []}
                  />
                </div>
              )
            )}
          </div>
        )}

        {/* MEDICAL HISTORY PANEL */}
        {activeTab === 'Medical' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-sm">
            
            {/* Demographics & Basic info */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-white/5 pb-2">Informations Générales</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-500 font-medium">Groupe Sanguin :</span>
                  <span className="text-slate-900 dark:text-white font-bold">{patient.bloodType || 'Non précisé'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-500 font-medium">Genre :</span>
                  <span className="text-slate-900 dark:text-white font-bold">
                    {patient.gender === 'Male' ? 'Masculin' : patient.gender === 'Female' ? 'Féminin' : patient.gender}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 col-span-2">
                  <span className="text-slate-500 font-medium">Adresse principale :</span>
                  <span className="text-slate-800 dark:text-white font-semibold leading-relaxed">{patient.address || 'Aucune adresse renseignée.'}</span>
                </div>
              </div>
            </div>

            {/* Urgent references & contacts */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-white/5 pb-2">Personne de confiance (Urgence)</h3>
              <div className="flex flex-col gap-2 text-xs">
                <p className="text-slate-800 dark:text-white font-semibold">Nom : <strong>{patient.emergencyContact?.name || 'Aucun'}</strong></p>
                <p className="text-slate-800 dark:text-white font-semibold">Relation : <strong>{patient.emergencyContact?.relationship || 'N/A'}</strong></p>
                <p className="text-blue-600 dark:text-blue-400 font-bold">Téléphone : <strong>{patient.emergencyContact?.phone || 'N/A'}</strong></p>
              </div>
            </div>

          </div>
        )}

        {/* INVOICES PANEL */}
        {activeTab === 'Invoices' && (
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Factures du Patient</h3>
            </div>

            {invoices.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">Aucune facture enregistrée pour ce patient.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {invoices.map((inv) => (
                  <div
                    key={inv._id}
                    onClick={() => setPreviewInvoiceData(inv)}
                    className="flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100/90 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/5 rounded-xl transition-all select-none cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-blue-50 text-blue-600 dark:bg-blue-600/10 dark:text-blue-400 rounded-xl border border-blue-200 dark:border-blue-500/20 group-hover:scale-105 transition-transform">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white font-mono">FACTURE N° {inv.invoiceNumber}</h4>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold group-hover:underline">
                            (Cliquer pour afficher / imprimer)
                          </span>
                        </div>
                        <p className="text-xxs text-slate-500 dark:text-slate-400 mt-1">
                          Date : <strong className="text-slate-700 dark:text-slate-300 font-mono">{formatDate(inv.date)}</strong> • {inv.items.length} acte(s)
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6" onClick={(e) => e.stopPropagation()}>
                      <div className="text-right flex flex-col items-end gap-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">{inv.netAmount.toFixed(2)} DH</span>
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          inv.paymentStatus === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                            : inv.paymentStatus === 'Partially Paid'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                        }`}>
                          {inv.paymentStatus === 'Paid' ? 'Payée' : inv.paymentStatus === 'Partially Paid' ? 'Partiel' : 'Impayée'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {inv.paymentStatus !== 'Paid' && (
                          <button
                            onClick={() => handleOpenPaymentModal(inv._id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xxs cursor-pointer shadow-xs"
                          >
                            Régler
                          </button>
                        )}
                        <button
                          onClick={() => setPreviewInvoiceData(inv)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-600/10 dark:hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 font-semibold text-xs border border-blue-200 dark:border-blue-500/20 transition-all cursor-pointer shadow-xs"
                          title="Aperçu & Impression PDF de cette facture"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Aperçu A4 / Imprimer PDF</span>
                        </button>
                        <button
                          onClick={() =>
                            navigate('/invoices', {
                              state: {
                                editInvoiceId: inv._id,
                                returnPatientId: id,
                                returnTab: 'Invoices',
                              },
                            })
                          }
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-all shadow-xs"
                          title="Modifier directement cette facture dans l'éditeur"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline text-xs font-semibold">Modifier</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CARNET FINANCIER & DIFTAR DU PATIENT */}
        {activeTab === 'Ledger' && (
          <div className="flex flex-col gap-5">
            {/* 3 Top Summary KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-xs flex items-center justify-between transition-all hover:border-blue-500/30">
                <div>
                  <span className="text-xxs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">Total Soins Réalisés</span>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
                    {(ledgerData?.summary?.totalActsAmount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-sm font-bold text-slate-400">DH</span>
                  </div>
                  <span className="text-xxs text-slate-500 dark:text-slate-400 mt-1 block">
                    {ledgerData?.acts?.length || 0} soin(s) au carnet
                  </span>
                </div>
                <div className="p-3.5 bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-200/60 dark:border-blue-500/20">
                  <Bookmark className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-xs flex items-center justify-between transition-all hover:border-emerald-500/30">
                <div>
                  <span className="text-xxs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Versé / Réglé</span>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                    {(ledgerData?.summary?.totalPaidAmount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-sm font-bold text-emerald-500/70">DH</span>
                  </div>
                  <span className="text-xxs text-slate-500 dark:text-slate-400 mt-1 block">
                    {ledgerData?.payments?.length || 0} versement(s) encaissé(s)
                  </span>
                </div>
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-200/60 dark:border-emerald-500/20">
                  <CreditCard className="w-6 h-6" />
                </div>
              </div>

              <div className={`p-5 rounded-2xl border shadow-xs flex items-center justify-between transition-all ${
                (ledgerData?.summary?.remainingBalance || 0) > 0
                  ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/30'
                  : 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/30'
              }`}>
                <div>
                  <span className={`text-xxs font-extrabold uppercase tracking-wider ${
                    (ledgerData?.summary?.remainingBalance || 0) > 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {(ledgerData?.summary?.remainingBalance || 0) > 0 ? 'Reste Global à Payer' : 'Situation Financière'}
                  </span>
                  <div className={`text-2xl font-black mt-1 tabular-nums ${
                    (ledgerData?.summary?.remainingBalance || 0) > 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {(ledgerData?.summary?.remainingBalance || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-sm font-bold opacity-75">DH</span>
                  </div>
                  <span className={`text-xxs font-bold mt-1 block ${
                    (ledgerData?.summary?.remainingBalance || 0) > 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {(ledgerData?.summary?.remainingBalance || 0) > 0
                      ? 'Solde restant dû par le patient'
                      : 'Compte 100% à jour (Soldé)'}
                  </span>
                </div>
                <div className={`p-3.5 rounded-2xl border ${
                  (ledgerData?.summary?.remainingBalance || 0) > 0
                    ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                    : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                }`}>
                  <Receipt className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-xs flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleOpenAddActModal}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Consigner un Soin / Acte</span>
                </button>
                <button
                  onClick={() => handleOpenPaymentModal()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Enregistrer un Versement</span>
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleInvoiceSelectedActs}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedActsForInvoice.length > 0
                      ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/25 ring-2 ring-purple-400/40'
                      : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>
                    {selectedActsForInvoice.length > 0
                      ? `Facturer la sélection (${selectedActsForInvoice.length})`
                      : 'Créer une Facture'}
                  </span>
                </button>

                <button
                  onClick={() => setShowCarnetPreview(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs font-bold transition-all cursor-pointer"
                  title="Aperçu avant impression du Carnet"
                >
                  <Eye className="w-4 h-4" />
                  <span>Aperçu Carnet</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                  title="Imprimer le carnet officiel du patient"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer le Carnet (A4)</span>
                </button>
              </div>
            </div>

            {/* Carnet Ledger Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Journal des Soins & Règlements
                  </h4>
                  {ledgerData?.acts?.some((a) => !a.invoiceId) ? (
                    <button
                      onClick={handleSelectAllUnbilled}
                      className="text-xs text-blue-600 hover:text-blue-500 font-bold cursor-pointer underline underline-offset-2 ml-2"
                    >
                      {selectedActsForInvoice.length === ledgerData.acts.filter((a) => !a.invoiceId).length
                        ? 'Tout désélectionner'
                        : `Sélectionner tous les non facturés (${ledgerData.acts.filter((a) => !a.invoiceId).length})`}
                    </button>
                  ) : null}
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {((ledgerData?.acts?.length || 0) + (ledgerData?.payments?.length || 0))} opération(s)
                </span>
              </div>

              {(!ledgerData || ((ledgerData.acts.length === 0) && (ledgerData.payments.length === 0))) ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  Aucun soin ou paiement enregistré dans le carnet pour ce patient.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase text-[11px] font-bold border-b border-slate-200/80 dark:border-white/10 tracking-wider">
                        <th className="py-3.5 px-3 w-12 text-center">Sélec.</th>
                        <th className="py-3.5 px-3 w-28 text-center">Date</th>
                        <th className="py-3.5 px-3 w-28 text-center">Opération</th>
                        <th className="py-3.5 px-2.5 w-16 text-center">Dent</th>
                        <th className="py-3.5 px-4">Désignation</th>
                        <th className="py-3.5 px-3 text-right w-28">A Payer</th>
                        <th className="py-3.5 px-3 text-right w-28 text-purple-600 dark:text-purple-400">Avance</th>
                        <th className="py-3.5 px-3 text-right w-28 text-amber-600 dark:text-amber-400">Reste</th>
                        <th className="py-3.5 px-3 text-center w-36">Facturation</th>
                        <th className="py-3.5 px-3 w-28 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {[
                        ...ledgerData.acts.map((a) => ({ ...a, kind: 'SOIN' })),
                        ...ledgerData.payments.map((p) => ({ ...p, kind: 'PAYMENT' })),
                      ]
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((entry: any) => {
                          const isSoin = entry.kind === 'SOIN';
                          const isSelected = selectedActsForInvoice.includes(entry._id);
                          const actCost = Number(entry.amount) || 0;
                          const actPaid = Number(entry.paidAmount) || 0;
                          const actRemaining = entry.remainingAmount !== undefined
                            ? Number(entry.remainingAmount)
                            : Math.max(0, actCost - actPaid);

                          return (
                            <tr
                              key={entry._id}
                              className={`hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors ${
                                isSelected ? 'bg-blue-50/60 dark:bg-blue-900/15' : ''
                              }`}
                            >
                              {/* Sélec */}
                              <td className="py-3.5 px-3 text-center">
                                {isSoin && !entry.invoiceId ? (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleActSelect(entry._id)}
                                    title={isSelected ? 'Désélectionner' : 'Sélectionner pour facturer'}
                                    className={`mx-auto w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'border-2 border-slate-300 dark:border-slate-600 hover:border-blue-500 bg-white dark:bg-slate-800'
                                    }`}
                                  >
                                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                  </button>
                                ) : isSoin ? (
                                  <span
                                    title="Déjà inclus dans une facture"
                                    className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-500/20"
                                  >
                                    <Check className="w-3 h-3 stroke-[2.5]" />
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                                )}
                              </td>

                              {/* Date */}
                              <td className="py-3.5 px-3 text-center">
                                <span className="text-slate-700 dark:text-slate-200 font-semibold text-xs tabular-nums">
                                  {formatDate(entry.date)}
                                </span>
                              </td>

                              {/* Opération Badge */}
                              <td className="py-3.5 px-3 text-center">
                                {isSoin ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-500/20 whitespace-nowrap">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                                    Soin
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-500/20 whitespace-nowrap">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                    Règlement
                                  </span>
                                )}
                              </td>

                              {/* Dent */}
                              <td className="py-3.5 px-2.5 text-center">
                                {isSoin && entry.tooth && entry.tooth !== '-' ? (
                                  <span className="inline-flex items-center justify-center min-w-7 h-6 px-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-white/10 shadow-2xs">
                                    {entry.tooth}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                                )}
                              </td>

                              {/* Désignation */}
                              <td className="py-3.5 px-4">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs leading-snug">
                                    {isSoin ? entry.description : `Versement reçu (${entry.paymentMethod || 'Espèces'})`}
                                  </span>
                                  {entry.notes && !entry.notes.startsWith('Facture N°') ? (
                                    <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">
                                      {entry.notes}
                                    </span>
                                  ) : null}
                                </div>
                              </td>

                              {/* A Payer */}
                              <td className="py-3.5 px-3 text-right">
                                {isSoin ? (
                                  <span className="text-slate-900 dark:text-white font-bold text-xs tabular-nums">
                                    {actCost.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-[10px] text-slate-400">DH</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                                )}
                              </td>

                              {/* Avance */}
                              <td className="py-3.5 px-3 text-right">
                                {isSoin ? (
                                  actPaid > 0 ? (
                                    <span className="text-purple-600 dark:text-purple-400 font-extrabold text-xs tabular-nums">
                                      {actPaid.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-[10px] text-purple-400">DH</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                                  )
                                ) : (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-xs tabular-nums">
                                    +{(Number(entry.amount) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-[10px] text-emerald-500/70">DH</span>
                                  </span>
                                )}
                              </td>

                              {/* Reste */}
                              <td className="py-3.5 px-3 text-right">
                                {isSoin ? (
                                  actRemaining > 0 ? (
                                    <span className="inline-flex items-center gap-0.5 font-black text-xs text-amber-600 dark:text-amber-400 tabular-nums">
                                      {actRemaining.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-[10px] text-amber-400/80">DH</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20">
                                      Réglé ✓
                                    </span>
                                  )
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                                )}
                              </td>

                              {/* Facturation */}
                              <td className="py-3.5 px-3 text-center">
                                {entry.invoiceId ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const invId = entry.invoiceId._id || entry.invoiceId;
                                      const found = invoices.find((i) => i._id === invId);
                                      if (found) {
                                        setPreviewInvoiceData(found);
                                      } else {
                                        navigate('/invoices', {
                                          state: { editInvoiceId: invId, returnPatientId: id, returnTab: 'Ledger' },
                                        });
                                      }
                                    }}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/25 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-500/30 whitespace-nowrap cursor-pointer transition-all shadow-xs"
                                    title="Cliquer pour voir et imprimer cette facture"
                                  >
                                    <FileText className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
                                    <span>Facturé N° {entry.invoiceId.invoiceNumber || entry.invoiceId}</span>
                                    <Eye className="w-2.5 h-2.5 ml-0.5 opacity-70" />
                                  </button>
                                ) : isSoin ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/25 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-500/20 whitespace-nowrap">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    À facturer
                                  </span>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {isSoin && entry.source === 'TREATMENT' && actRemaining > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenActAdvanceModal(entry)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                                      title="Verser un acompte sur ce soin"
                                    >
                                      <Plus className="w-3 h-3 stroke-[3]" />
                                      <span>Acompte</span>
                                    </button>
                                  )}
                                  {isSoin && entry.source === 'TREATMENT' ? (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTreatment(entry._id)}
                                      className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                                      title="Supprimer ce soin du carnet"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  ) : !isSoin ? (
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePayment(entry._id)}
                                      className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                                      title="Annuler ce versement"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* APPOINTMENTS PANEL */}
        {activeTab === 'Appointments' && (
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Planification & Agenda Patient</h3>
              <button
                onClick={() =>
                  navigate('/appointments', {
                    state: {
                      patientId: patient?._id,
                      patientName: `${patient?.name || ''} ${patient?.prenom || ''}`.trim(),
                    },
                  })
                }
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Nouveau Rendez-vous</span>
              </button>
            </div>
            
            {appointments.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Calendar className="w-10 h-10 opacity-30" />
                <p className="text-xs font-semibold">Aucun rendez-vous consigné pour ce patient.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {appointments.map((appt) => {
                  const isCompleted = appt.status === 'Completed';
                  const isCancelled = appt.status === 'Cancelled' || appt.status === 'No Show';
                  const isScheduled = appt.status === 'Scheduled';

                  return (
                    <div
                      key={appt._id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition-all ${
                        isCompleted
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200/60 dark:border-emerald-500/20'
                          : isCancelled
                          ? 'bg-rose-50/40 dark:bg-rose-950/10 border-rose-200/60 dark:border-rose-500/20 opacity-80'
                          : 'bg-slate-50 dark:bg-white/5 border-slate-200/70 dark:border-white/5 hover:border-blue-500/40'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`p-2.5 rounded-xl shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                              : isCancelled
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                              : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-600/10 dark:text-indigo-400'
                          }`}
                        >
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                              {formatDateTime(appt.dateTime)}
                            </h4>
                            <span className="text-xxs text-slate-400">({formatRelativeDateTime(appt.dateTime)})</span>
                          </div>
                          <p className="text-xxs text-slate-500 dark:text-slate-400 mt-1">
                            Durée : <strong className="text-slate-700 dark:text-slate-300 font-mono">{appt.duration} min</strong>
                            {appt.notes ? ` • ${appt.notes}` : ' • Consultation & Soins'}
                          </p>
                        </div>
                      </div>

                      {/* Direct Actions in Appointments Tab */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                        {isScheduled && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdateApptStatus(appt._id, 'Completed')}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
                              title="Marquer le rendez-vous comme Terminé"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Terminer</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSendApptWhatsApp(appt)}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/10 dark:hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 transition-all cursor-pointer"
                              title="Envoyer un rappel par WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleUpdateApptStatus(appt._id, 'Cancelled')}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 dark:bg-white/5 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-white/5 transition-all cursor-pointer"
                              title="Annuler le rendez-vous"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>

                            <span className="text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                              Planifié
                            </span>
                          </>
                        )}

                        {isCompleted && (
                          <>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Terminé</span>
                            </span>

                            <button
                              type="button"
                              onClick={handleOpenAddActModal}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-600/10 dark:hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-xs font-bold transition-all cursor-pointer border border-blue-200 dark:border-blue-500/20"
                              title="Consigner le soin effectué au carnet du patient"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>Consigner un Soin</span>
                            </button>
                          </>
                        )}

                        {isCancelled && (
                          <>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                              <span>{appt.status === 'No Show' ? 'Absent' : 'Annulé'}</span>
                            </span>

                            <button
                              type="button"
                              onClick={() => handleUpdateApptStatus(appt._id, 'Scheduled')}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer border border-slate-200 dark:border-white/10"
                              title="Repasser en Planifié"
                            >
                              Rétablir
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* FILES & RADIOLOGY PANEL */}
        {activeTab === 'Files' && (
          <div className="flex flex-col gap-6">
            
            {/* Drag & drop upload simulator box */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              <div className="md:col-span-1 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col gap-4">
                <h4 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Catégorie de dossier</h4>
                <div className="flex flex-col gap-1.5">
                  {['Photos', 'XRays', 'Documents', 'Videos', 'Audio'].map((cat: any) => (
                    <button
                      key={cat}
                      onClick={() => setUploadCategory(cat)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
                        uploadCategory === cat
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {cat === 'XRays' ? 'Radiographies (X-Rays)' : cat === 'Photos' ? 'Galerie Photos' : cat}
                    </button>
                  ))}
                </div>

                {uploadCategory === 'XRays' && patient && (
                  <div className="p-3.5 bg-gradient-to-br from-cyan-950/40 via-blue-950/30 to-slate-900 border border-cyan-500/30 rounded-xl flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 text-cyan-400">
                      <Radio className="w-4 h-4" />
                      <span className="text-xs font-bold">Capteur Eighteeth RVG</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Prenez et gérez des radiographies rétro-alvéolaires avec le capteur NanoPix 1.
                    </p>
                    <button
                      onClick={() => navigate('/nanopix', { state: { patientId: patient._id } })}
                      className="w-full py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Ouvrir Studio NanoPix</span>
                    </button>
                  </div>
                )}

                <div className="border border-dashed border-slate-300 dark:border-white/10 hover:border-blue-500/50 transition-all rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer relative bg-slate-50 dark:bg-slate-950/20">
                  <UploadCloud className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                  <span className="text-xxs text-slate-600 dark:text-slate-400 font-bold text-center">Déposez ou sélectionnez un fichier</span>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    disabled={uploading}
                  />
                  {uploading && <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">Importation en cours...</span>}
                </div>
              </div>

              {/* Files library grid list */}
              <div className="md:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col gap-4">
                {(() => {
                  const filteredDocs = documents.filter((doc) => {
                    if (uploadCategory === 'Videos') return isVideoFile(doc.fileName, doc.fileType) || doc.category === 'Videos';
                    if (uploadCategory === 'Audio') return isAudioFile(doc.fileName, doc.fileType) || doc.category === 'Audio';
                    if (uploadCategory === 'Photos') return isImageFile(doc.fileName, doc.fileType) && (doc.category === 'Photos' || doc.fileType === 'Photo');
                    if (uploadCategory === 'XRays') return isImageFile(doc.fileName, doc.fileType) && (doc.category === 'XRays' || doc.fileType === 'XRay');
                    
                    // Documents tab: EXCLUDE Videos, Audio, and Photos/XRays!
                    if (uploadCategory === 'Documents') {
                      if (isVideoFile(doc.fileName, doc.fileType) || isAudioFile(doc.fileName, doc.fileType) || isImageFile(doc.fileName, doc.fileType)) {
                        return false;
                      }
                      return true;
                    }
                    return true;
                  });

                  return (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Fichiers - {uploadCategory} ({filteredDocs.length})
                        </h4>
                        {uploadCategory === 'XRays' && patient && (
                          <button
                            onClick={() => navigate('/nanopix', { state: { patientId: patient._id } })}
                            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <Radio className="w-3.5 h-3.5" />
                            <span>Acquérir avec Studio NanoPix</span>
                          </button>
                        )}
                      </div>
                      
                      {filteredDocs.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-10">Aucun fichier dans la catégorie "{uploadCategory}".</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-4 max-h-[350px] overflow-y-auto no-scrollbar pr-1">
                          {filteredDocs.map((doc) => {
                            const isPdf = doc.fileName.toLowerCase().endsWith('.pdf');
                            return (
                              <div key={doc._id} className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/5 transition-all flex flex-col justify-between gap-3 group relative">
                                <div className="flex gap-3.5 items-start">
                                  <div className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-600/10 dark:text-blue-400 rounded-lg">
                                    {isVideoFile(doc.fileName, doc.fileType) ? (
                                      <VideoIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                    ) : isAudioFile(doc.fileName, doc.fileType) ? (
                                      <Volume2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                    ) : isPdf || doc.fileType === 'Document' ? (
                                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    ) : (
                                      <ImageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <h5 className="text-xs font-semibold text-slate-900 dark:text-white truncate">{doc.fileName}</h5>
                                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wide mt-1 block">
                                      {doc.category} • {(doc.fileSize / 1024).toFixed(0)} KB
                                    </span>
                                  </div>
                                </div>

                                <div className="flex gap-2 justify-end border-t border-slate-200/60 dark:border-white/5 pt-2">
                                  <button
                                    onClick={() => handleSendDocWhatsApp(doc)}
                                    className="p-1 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400 rounded transition-all cursor-pointer"
                                    title="Envoyer par WhatsApp"
                                  >
                                    <MessageSquare className="w-4.5 h-4.5" />
                                  </button>
                                  <button
                                    onClick={() => setPreviewFile(doc)}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded transition-all cursor-pointer"
                                    title="Aperçu"
                                  >
                                    <Eye className="w-4.5 h-4.5" />
                                  </button>
                                  <a
                                    href={`${API_URL}/documents/download/${doc._id}`}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded transition-all cursor-pointer"
                                    title="Télécharger"
                                  >
                                    <Download className="w-4.5 h-4.5" />
                                  </a>
                                  <button
                                    onClick={() => handleDeleteFile(doc._id)}
                                    className="p-1 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded transition-all cursor-pointer"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-4.5 h-4.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

            </div>

            {/* Direct preview panel if active */}
            {previewFile && (
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 flex flex-col gap-3 relative select-none shadow-lg">
                <div className="flex justify-between items-center pr-12 flex-wrap gap-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-md">Aperçu : {previewFile.fileName}</h4>
                  <div className="flex items-center gap-2">
                    <a
                      href={`${API_URL}/documents/download/${previewFile._id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                      title="Télécharger le fichier"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Télécharger</span>
                    </a>
                    <a
                      href={`${API_URL}/documents/preview/${previewFile._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs cursor-pointer"
                      title="Ouvrir en plein écran dans un nouvel onglet"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Ouvrir</span>
                    </a>
                    <button
                      onClick={() => handleSendDocWhatsApp(previewFile)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="absolute right-3.5 top-3.5 p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-950/60 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer z-10"
                >
                  <XIcon />
                </button>
                <div className="w-full flex justify-center bg-slate-100 dark:bg-slate-950 rounded-xl overflow-hidden p-4 min-h-[420px]">
                  {loadingPreview ? (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-500 gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
                      <p className="text-xs font-semibold">Lecture du contenu f l-hin...</p>
                    </div>
                  ) : isVideoFile(previewFile.fileName, previewFile.fileType) ? (
                    <div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto p-2">
                      <video
                        src={getDocUrl(previewFile.filePath)}
                        controls
                        autoPlay
                        className="max-h-[440px] w-full rounded-xl shadow-lg bg-black object-contain"
                      />
                    </div>
                  ) : isAudioFile(previewFile.fileName, previewFile.fileType) ? (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-500 gap-4 w-full max-w-md mx-auto">
                      <div className="p-4 bg-purple-50 dark:bg-purple-600/10 text-purple-600 dark:text-purple-400 rounded-2xl border border-purple-200 dark:border-purple-500/20">
                        <Volume2 className="w-10 h-10" />
                      </div>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-sm">{previewFile.fileName}</p>
                      <audio src={getDocUrl(previewFile.filePath)} controls className="w-full mt-2" />
                    </div>
                  ) : previewFile.fileName.toLowerCase().endsWith('.csv') && csvPreviewData ? (
                    <div className="flex flex-col gap-3 w-full">
                      {/* Header controls for CSV Viewer */}
                      <div className="flex justify-between items-center gap-4 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                          <Table className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span>Tableau CSV ({csvPreviewData.rows.length} lignes)</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Filtrer les données..."
                              value={previewSearchTerm}
                              onChange={(e) => setPreviewSearchTerm(e.target.value)}
                              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          <a
                            href={`${API_URL}/documents/download/${previewFile._id}`}
                            className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Télécharger
                          </a>
                        </div>
                      </div>

                      {/* Interactive Data Table */}
                      <div className="max-h-[380px] overflow-auto rounded-xl border border-slate-200/80 dark:border-white/10 shadow-inner bg-white dark:bg-slate-900">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-white/10 z-10">
                            <tr>
                              <th className="p-2.5 w-10 text-center text-slate-400 font-normal">#</th>
                              {csvPreviewData.headers.map((h, idx) => (
                                <th key={idx} className="p-2.5 border-r border-slate-200/60 dark:border-white/5 whitespace-nowrap">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/60 dark:divide-white/5 font-mono text-xxs">
                            {csvPreviewData.rows
                              .filter((row) =>
                                !previewSearchTerm ||
                                row.some((cell) => cell.toLowerCase().includes(previewSearchTerm.toLowerCase()))
                              )
                              .map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
                                  <td className="p-2.5 text-center text-slate-400 font-sans font-medium">{rIdx + 1}</td>
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="p-2.5 border-r border-slate-200/60 dark:border-white/5 whitespace-nowrap text-slate-800 dark:text-slate-200">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (previewFile.fileName.toLowerCase().endsWith('.txt') || previewFile.fileName.toLowerCase().endsWith('.json') || previewFile.fileName.toLowerCase().endsWith('.log')) && textPreviewContent !== null ? (
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-white/10">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Contenu du Fichier Texte</span>
                        <a
                          href={`${API_URL}/documents/download/${previewFile._id}`}
                          className="py-1 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Télécharger
                        </a>
                      </div>
                      <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl max-h-[400px] overflow-auto whitespace-pre-wrap">
                        {textPreviewContent}
                      </pre>
                    </div>
                  ) : isImageFile(previewFile.fileName, previewFile.fileType) ? (
                    <img
                      src={getDocUrl(previewFile.filePath)}
                      alt={previewFile.fileName}
                      className="max-h-[450px] object-contain rounded-lg mx-auto"
                    />
                  ) : previewFile.fileName.toLowerCase().endsWith('.pdf') ? (
                    <div className="w-full flex flex-col gap-2">
                      <iframe
                        src={`${API_URL}/documents/preview/${previewFile._id}#toolbar=1&navpanes=0`}
                        title={previewFile.fileName}
                        className="w-full h-[540px] rounded-xl border border-slate-200/80 dark:border-white/10 bg-white"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-10 text-slate-500 gap-3">
                      <div className="p-4 bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-200 dark:border-blue-500/20">
                        <FileText className="w-10 h-10" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-sm">{previewFile.fileName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase font-semibold">
                          Fichier {previewFile.fileName.split('.').pop()?.toUpperCase()} • {(previewFile.fileSize / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <a
                        href={`${API_URL}/documents/download/${previewFile._id}`}
                        className="mt-2 py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        Télécharger / Ouvrir le fichier
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* LOG PAYMENT DIALOG MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl p-6 flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
              <h3 className="text-md font-bold text-slate-900 dark:text-white">Journaliser un Paiement</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <XIcon />
              </button>
            </div>

            <form onSubmit={handleLogPayment} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Montant du versement (DH)</label>
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  value={logPaymentAmount}
                  onChange={(e) => setLogPaymentAmount(e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Mode de paiement</label>
                <select
                  value={logPaymentMethod}
                  onChange={(e: any) => setLogPaymentMethod(e.target.value)}
                  className="h-11 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="espèces">Espèces</option>
                  <option value="chèque">Chèque</option>
                  <option value="carte">Carte Bancaire</option>
                  <option value="virement">Virement</option>
                  <option value="traites">Traites / Échéances</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Notes / Observations</label>
                <input
                  type="text"
                  placeholder="ex: Reçu acompte..."
                  value={logPaymentNotes}
                  onChange={(e) => setLogPaymentNotes(e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all cursor-pointer shadow-xs"
                >
                  Confirmer le Règlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ajouter un Soin / Acte au Carnet */}
      {showAddActModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-600/10 text-blue-600">
                  <Bookmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Consigner un Soin / Acte</h3>
                  <p className="text-xs text-slate-500">Ajouter une prestation médicale au carnet du patient</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddActModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                <XIcon />
              </button>
            </div>

            <form onSubmit={handleAddTreatment} className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Date du soin *</label>
                  <input
                    type="date"
                    required
                    value={actDate}
                    onChange={(e) => setActDate(e.target.value)}
                    className="h-11 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Dent (N°)</label>
                    {actTooth && parseToothNumbers(actTooth).length > 0 && (
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 truncate max-w-[150px]">
                        {parseToothNumbers(actTooth).map((n) => `FDI ${n}`).join(', ')}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="ex: 11, 26, 1 (ou -)"
                    value={actTooth}
                    onChange={(e) => setActTooth(e.target.value)}
                    className="h-11 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                  {/* Quick selection chips for most common teeth */}
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {[11, 12, 16, 21, 22, 26, 31, 36, 41, 46].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setActTooth(String(num))}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                          actTooth === String(num)
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Modèle d'acte fréquent (Rechercher par nom)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleOpenQuickCreateAct()}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>+ Ajouter un modèle</span>
                    </button>
                  </div>
                  <SearchableActSelect
                    acts={dentalActs}
                    selectedId={selectedActId}
                    placeholder="Tapez directement pour rechercher un acte..."
                    onSelect={(selected) => {
                      setSelectedActId(selected._id);
                      setActName(selected.name);
                      setActCost(String(selected.defaultPrice || 0));
                    }}
                    onClear={() => {
                      setSelectedActId('');
                    }}
                    onAddNewAct={(queryText) => {
                      handleOpenQuickCreateAct(queryText);
                    }}
                  />
                </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Désignation du soin / acte *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Détartrage supra-gingival, Composite dent 14..."
                  value={actName}
                  onChange={(e) => setActName(e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Tarification : A Payer, Avance, Reste */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Tarif convenu (A Payer) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={actCost}
                        onChange={(e) => setActCost(e.target.value)}
                        className="h-11 w-full pl-3.5 pr-10 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-bold"
                      />
                      <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">DH</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-purple-700 dark:text-purple-400">
                      Avance versée (Facultatif)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max={actCost ? parseFloat(actCost) : undefined}
                        step="0.01"
                        placeholder="0.00"
                        value={actAdvance}
                        onChange={(e) => setActAdvance(e.target.value)}
                        className="h-11 w-full pl-3.5 pr-10 rounded-xl text-sm border border-purple-200 dark:border-purple-500/30 bg-white dark:bg-slate-950 text-purple-900 dark:text-purple-200 focus:outline-none focus:border-purple-500 font-bold"
                      />
                      <span className="absolute right-3 top-3 text-xs font-bold text-purple-400">DH</span>
                    </div>
                  </div>
                </div>

                {/* Live Summary Bar: A Payer / Avance / Reste */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-white/5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Reste à payer :</span>
                    <span className={`font-black text-sm tabular-nums ${
                      (parseFloat(actCost) || 0) - (parseFloat(actAdvance) || 0) > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {Math.max(0, (parseFloat(actCost) || 0) - (parseFloat(actAdvance) || 0)).toFixed(2)} DH
                    </span>
                  </div>

                  {parseFloat(actAdvance) > 0 && (
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-semibold text-slate-500">Mode :</label>
                      <select
                        value={actPaymentMode}
                        onChange={(e) => setActPaymentMode(e.target.value)}
                        className="h-8 px-2 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 focus:outline-none"
                      >
                        <option value="espèces">Espèces</option>
                        <option value="carte">Carte Bancaire</option>
                        <option value="chèque">Chèque</option>
                        <option value="virement">Virement</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Notes / Remarques</label>
                <input
                  type="text"
                  placeholder="ex: Phase 1/3, anesthésie locale..."
                  value={actNotes}
                  onChange={(e) => setActNotes(e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAddActModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all cursor-pointer shadow-xs"
                >
                  Consigner le Soin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Verser un Acompte & Historique des Règlements */}
      {showActAdvanceModal && selectedActForAdvance && (() => {
        const actCost = Number(selectedActForAdvance.amount || 0);
        const actPaid = Number(selectedActForAdvance.paidAmount || 0);
        const actReste = Math.max(0, actCost - actPaid);
        const enteredAmt = parseFloat(actAdvanceAmount) || 0;
        const simTotalPaid = actPaid + enteredAmt;
        const simNewReste = Math.max(0, actCost - simTotalPaid);
        const isOverpaying = enteredAmt > actReste;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs select-none">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
              
              {/* Header */}
              <div className="p-4 px-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/60 dark:bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-600/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Règlement & Acomptes</span>
                      {selectedActForAdvance.tooth && selectedActForAdvance.tooth !== '-' && (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-extrabold">
                          Dent {selectedActForAdvance.tooth}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-md">
                      {selectedActForAdvance.description || selectedActForAdvance.actName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowActAdvanceModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
                
                {/* 1. TOP STATS CARDS (Tarif convenu, Déjà versé, Reste actuel) */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 text-center">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Tarif (A Payer)
                    </div>
                    <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5 tabular-nums">
                      {actCost.toFixed(2)} <span className="text-xs font-bold text-slate-500">DH</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 text-center">
                    <div className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                      Déjà Versé
                    </div>
                    <div className="text-base sm:text-lg font-black text-purple-700 dark:text-purple-300 mt-0.5 tabular-nums">
                      {actPaid.toFixed(2)} <span className="text-xs font-bold text-purple-500">DH</span>
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border text-center ${
                    actReste <= 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-800/40 text-amber-800 dark:text-amber-300'
                  }`}>
                    <div className="text-[11px] font-semibold uppercase tracking-wider">
                      Reste Dû
                    </div>
                    <div className="text-base sm:text-lg font-black mt-0.5 tabular-nums">
                      {actReste.toFixed(2)} <span className="text-xs font-bold">DH</span>
                    </div>
                  </div>
                </div>

                {/* 2. FORM: AJOUTER UN NOUVEAU VERSEMENT */}
                <form onSubmit={handleSaveActAdvance} className="p-4 rounded-xl bg-purple-50/40 dark:bg-purple-950/10 border border-purple-200/70 dark:border-purple-800/40 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-950 dark:text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      Nouveau Versement / Tranche
                    </span>

                    {/* Quick Preset Buttons */}
                    {actReste > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setActAdvanceAmount(String(actReste))}
                          className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-600 hover:bg-purple-700 text-white transition-all cursor-pointer shadow-2xs"
                        >
                          Solder tout ({actReste.toFixed(2)} DH)
                        </button>
                        {actReste >= 100 && (
                          <button
                            type="button"
                            onClick={() => setActAdvanceAmount('100')}
                            className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 cursor-pointer"
                          >
                            100 DH
                          </button>
                        )}
                        {actReste >= 200 && (
                          <button
                            type="button"
                            onClick={() => setActAdvanceAmount('200')}
                            className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 cursor-pointer"
                          >
                            200 DH
                          </button>
                        )}
                        {actReste >= 500 && (
                          <button
                            type="button"
                            onClick={() => setActAdvanceAmount('500')}
                            className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 cursor-pointer"
                          >
                            500 DH
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Input Amount */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Montant à verser aujourd'hui (DH) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        min="1"
                        step="0.01"
                        placeholder="Tapez le montant versé (ex: 100, 200...)"
                        value={actAdvanceAmount}
                        onChange={(e) => setActAdvanceAmount(e.target.value)}
                        className="h-11 w-full pl-3.5 pr-12 rounded-xl text-base font-black border border-purple-300 dark:border-purple-500/50 bg-white dark:bg-slate-950 text-purple-900 dark:text-purple-100 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20"
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs font-black text-purple-500 bg-purple-50 dark:bg-purple-950/60 px-2 py-1 rounded-md">
                        DH
                      </span>
                    </div>
                  </div>

                  {/* DYNAMIC LIVE SIMULATION BAR (Automatically updates without mental math!) */}
                  {enteredAmt > 0 && (
                    <div className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
                      isOverpaying
                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 text-amber-900 dark:text-amber-200'
                        : simNewReste === 0
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-900 dark:text-emerald-200'
                        : 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 text-indigo-900 dark:text-indigo-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        {simNewReste === 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-extrabold text-[10px]">
                            SOLDE FINAL ✓
                          </span>
                        ) : (
                          <span className="font-bold">Calcul en temps réel :</span>
                        )}
                        <span>Total versé : <strong>{simTotalPaid.toFixed(2)} DH</strong></span>
                      </div>
                      <div className="font-extrabold text-sm">
                        Nouveau Reste : <span className={simNewReste === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-300'}>{simNewReste.toFixed(2)} DH</span>
                      </div>
                    </div>
                  )}

                  {/* Date & Mode de paiement */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Date du versement *</label>
                      <input
                        type="date"
                        required
                        value={actAdvanceDate}
                        onChange={(e) => setActAdvanceDate(e.target.value)}
                        className="h-10 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Mode de règlement</label>
                      <select
                        value={actAdvancePaymentMode}
                        onChange={(e) => setActAdvancePaymentMode(e.target.value)}
                        className="h-10 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="espèces">Espèces</option>
                        <option value="carte">Carte Bancaire</option>
                        <option value="chèque">Chèque</option>
                        <option value="virement">Virement</option>
                      </select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Notes (Optionnel)</label>
                    <input
                      type="text"
                      placeholder="ex: 2ème tranche, acompte, solde..."
                      value={actAdvanceNotes}
                      onChange={(e) => setActAdvanceNotes(e.target.value)}
                      className="h-9 px-3 rounded-xl text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={enteredAmt <= 0 || savingActAdvance}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs transition-all cursor-pointer shadow-sm disabled:cursor-not-allowed"
                    >
                      {savingActAdvance ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Enregistrement...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                          <span>Enregistrer le Versement {enteredAmt > 0 ? `(+ ${enteredAmt.toFixed(2)} DH)` : ''}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* 3. HISTORIQUE DES VERSEMENTS / TRANCHES POUR CE SOIN */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                      <History className="w-3.5 h-3.5 text-purple-600" />
                      Historique des versements de ce soin ({actAdvanceHistory.length})
                    </span>
                    {loadingAdvanceHistory && (
                      <Loader2 className="w-3.5 h-3.5 text-purple-600 animate-spin" />
                    )}
                  </div>

                  {actAdvanceHistory.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-center text-xs text-slate-400">
                      Aucun versement n'a encore été enregistré pour ce soin.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl overflow-hidden bg-white dark:bg-slate-950/40">
                      {actAdvanceHistory.map((pmt, pIdx) => (
                        <div
                          key={pmt._id || `pmt-${pIdx}`}
                          className="p-3 flex items-center justify-between hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center shrink-0">
                              #{actAdvanceHistory.length - pIdx}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                                  {pmt.date ? formatDate(pmt.date) : '—'}
                                </span>
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                                  {pmt.paymentMethod || 'Espèces'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {pmt.notes || `Acompte #${actAdvanceHistory.length - pIdx}`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-sm font-black text-purple-700 dark:text-purple-300 tabular-nums">
                              + {Number(pmt.amount || 0).toFixed(2)} DH
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteActAdvance(pmt._id, pmt.amount)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Supprimer ce versement avec confirmation"
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

              {/* Footer */}
              <div className="p-3.5 px-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-white/[0.02] flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowActAdvanceModal(false)}
                  className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Fermer
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Modal: Aperçu du Carnet Patient A4 avant impression */}
      {showCarnetPreview && patient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs select-none">
          <div className="w-full max-w-5xl max-h-[96vh] bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header Toolbar */}
            <div className="p-3.5 px-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 shrink-0 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-600/10 text-purple-600 dark:text-purple-400 shrink-0">
                  <Printer className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    Aperçu du Carnet Patient A4 (Dossier & Historique)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {patient.name} {patient.prenom || ''} • Dossier N° {patient.nationalId || (patient as any).customId || patient._id.slice(-6).toUpperCase()}
                  </p>
                </div>
              </div>

              {/* PDF Zoom & Fit Toolbar */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setCarnetPreviewScale((prev) => Math.max(0.45, Number((prev - 0.08).toFixed(2))))}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Zoom Arrière (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 min-w-[45px] text-center">
                  {Math.round(carnetPreviewScale * 100)}%
                </span>

                <button
                  type="button"
                  onClick={() => setCarnetPreviewScale((prev) => Math.min(1.4, Number((prev + 0.08).toFixed(2))))}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Zoom Avant (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <div className="h-4 w-px bg-slate-300 dark:bg-white/10 mx-1"></div>

                <button
                  type="button"
                  onClick={() => setCarnetPreviewScale(0.70)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    carnetPreviewScale === 0.70
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Afficher la page entière dans l'écran sans couper"
                >
                  Page Entière
                </button>

                <button
                  type="button"
                  onClick={() => setCarnetPreviewScale(1.0)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    carnetPreviewScale === 1.0
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Afficher en taille réelle 100%"
                >
                  100%
                </button>
              </div>

              {/* Actions: Print and Close */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#5c246e] hover:bg-[#4a1c59] text-white rounded-xl text-xs font-bold shadow-md shadow-[#5c246e]/25 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer le Carnet (A4)</span>
                </button>
                <button
                  onClick={() => setShowCarnetPreview(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Scaled Full-Page A4 Sheet View */}
            <div className="flex-1 overflow-auto p-4 md:p-6 flex justify-center items-start bg-slate-950/70">
              <div
                style={{
                  width: `${760 * carnetPreviewScale}px`,
                  height: `${1060 * carnetPreviewScale}px`,
                }}
                className="relative shrink-0 shadow-2xl transition-all duration-150 my-auto"
              >
                <div
                  style={{
                    transform: `scale(${carnetPreviewScale})`,
                    transformOrigin: 'top left',
                    width: '760px',
                    height: '1060px',
                  }}
                  className="absolute top-0 left-0 bg-white rounded-sm overflow-hidden border border-slate-300 shadow-2xl"
                >
                  <PatientLedgerPrintLayout
                    patient={patient}
                    config={clinicConfig}
                    acts={ledgerData?.acts || []}
                    payments={ledgerData?.payments || []}
                    summary={ledgerData?.summary || { totalActsAmount: 0, totalPaidAmount: 0, remainingBalance: 0 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Aperçu de la Facture A4 avant impression */}
      {previewInvoiceData && clinicConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs select-none">
          <div className="w-full max-w-5xl max-h-[96vh] bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header Toolbar */}
            <div className="p-3.5 px-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 shrink-0 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    Aperçu Facture N° {previewInvoiceData.invoiceNumber}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    Patient : {patient?.name} {patient?.prenom || ''} • Total : {previewInvoiceData.netAmount.toFixed(2)} DH
                  </p>
                </div>
              </div>

              {/* PDF Zoom & Fit Toolbar */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setInvoicePreviewScale((prev) => Math.max(0.45, Number((prev - 0.08).toFixed(2))))}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Zoom Arrière (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 min-w-[45px] text-center">
                  {Math.round(invoicePreviewScale * 100)}%
                </span>

                <button
                  type="button"
                  onClick={() => setInvoicePreviewScale((prev) => Math.min(1.4, Number((prev + 0.08).toFixed(2))))}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title="Zoom Avant (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <div className="h-4 w-px bg-slate-300 dark:bg-white/10 mx-1"></div>

                <button
                  type="button"
                  onClick={() => setInvoicePreviewScale(0.72)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    invoicePreviewScale === 0.72
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Afficher la page entière"
                >
                  Page Entière
                </button>

                <button
                  type="button"
                  onClick={() => setInvoicePreviewScale(1.0)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    invoicePreviewScale === 1.0
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Afficher en taille réelle 100%"
                >
                  100%
                </button>
              </div>

              {/* Actions: Edit, Print and Close */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    navigate('/invoices', {
                      state: {
                        editInvoiceId: previewInvoiceData._id,
                        returnPatientId: id,
                        returnTab: 'Invoices',
                      },
                    })
                  }
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  title="Ouvrir dans l'éditeur complet pour modifier les actes ou montants"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Modifier</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/25 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer la Facture (A4)</span>
                </button>

                <button
                  onClick={() => setPreviewInvoiceData(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  title="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Scaled Full-Page A4 Sheet View */}
            <div className="flex-1 overflow-auto p-4 md:p-6 flex justify-center items-start bg-slate-950/70">
              <div
                style={{
                  width: `${760 * invoicePreviewScale}px`,
                  height: `${1060 * invoicePreviewScale}px`,
                }}
                className="relative shrink-0 shadow-2xl transition-all duration-150 my-auto"
              >
                <div
                  style={{
                    transform: `scale(${invoicePreviewScale})`,
                    transformOrigin: 'top left',
                    width: '760px',
                    height: '1060px',
                  }}
                  className="absolute top-0 left-0 bg-white rounded-sm overflow-hidden border border-slate-300 shadow-2xl"
                >
                  <InvoicePrintLayout
                    invoice={previewInvoiceData}
                    config={clinicConfig}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ajouter un Acte / Modèle au Catalogue */}
      {showQuickCreateActModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Ajouter un Modèle au Catalogue
                  </h3>
                  <p className="text-xs text-slate-500">
                    Enregistrer un nouvel acte dans le catalogue médical
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickCreateActModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateAct} className="mt-5 space-y-4">
              {/* Nom de l'acte */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Désignation de l'acte / soin *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="ex: Gingivectomie, Facette céramique, Blanchiment..."
                  value={newActFormName}
                  onChange={(e) => setNewActFormName(e.target.value)}
                  className="h-11 px-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              {/* Catégorie & Prix par défaut */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Catégorie
                  </label>
                  <select
                    value={newActFormCategory}
                    onChange={(e) => setNewActFormCategory(e.target.value)}
                    className="h-11 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
                  >
                    {DENTAL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Prix par défaut (DH) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="10"
                    placeholder="0.00"
                    value={newActFormPrice}
                    onChange={(e) => setNewActFormPrice(e.target.value)}
                    className="h-11 px-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Description optionnelle */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Description / Remarque (Optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Détails techniques, matériel..."
                  value={newActFormDescription}
                  onChange={(e) => setNewActFormDescription(e.target.value)}
                  className="h-10 px-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Link to full catalog settings */}
              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>Enregistré dans le catalogue permanent.</span>
                <a
                  href="/settings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Gérer tout le catalogue</span>
                </a>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setShowQuickCreateActModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingNewAct}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {savingNewAct ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
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
      )}

      </div>
    </div>
  );
};


const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
