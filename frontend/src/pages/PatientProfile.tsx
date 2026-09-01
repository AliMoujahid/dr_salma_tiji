import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { DentalChart } from '../components/DentalChart';
import { Dental3DViewer } from '../components/Dental3DViewer';
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
} from 'lucide-react';
import { Patient, Invoice, PaymentTransaction, Appointment, Document } from '../types';

export const PatientProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const { toast, confirm } = useToast();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [chartMode, setChartMode] = useState<'3D' | '2D'>('3D');
  const [loading, setLoading] = useState(true);

  // Sub-data states
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

  const [uploadCategory, setUploadCategory] = useState<'Photos' | 'XRays' | 'Documents' | 'Videos' | 'Audio'>('Documents');
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<Document | null>(null);

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

  // Log Payment state
  const [logPaymentInvoiceId, setLogPaymentInvoiceId] = useState('');
  const [logPaymentAmount, setLogPaymentAmount] = useState('');
  const [logPaymentMethod, setLogPaymentMethod] = useState<'espèces' | 'chèque' | 'carte' | 'virement' | 'traites'>('espèces');
  const [logPaymentNotes, setLogPaymentNotes] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const UPLOADS_BASE = API_URL.replace(/\/api\/?$/, '');
  const getDocUrl = (pathStr: string) => {
    if (!pathStr) return '';
    const cleanPath = pathStr.startsWith('/') ? pathStr : '/' + pathStr;
    return `${UPLOADS_BASE}/uploads${cleanPath}`;
  };

  useEffect(() => {
    fetchPatientProfile();
  }, [id]);

  const fetchPatientProfile = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const patRes = await fetch(`${API_URL}/patients/${id}`, { headers });
      const patData = await patRes.json();
      setPatient(patData);

      // Fetch Sub-resources concurrently
      const [invRes, payRes, appRes, docRes] = await Promise.all([
        fetch(`${API_URL}/invoices?patientId=${id}`, { headers }),
        fetch(`${API_URL}/payments/patient/${id}`, { headers }),
        fetch(`${API_URL}/appointments?start=${new Date(Date.now() - 31536000000).toISOString()}&end=${new Date(Date.now() + 31536000000).toISOString()}`, { headers }),
        fetch(`${API_URL}/documents/patient/${id}`, { headers }),
      ]);

      const invData = await invRes.json();
      const payData = await payRes.json();
      const appData = await appRes.json();
      const docData = await docRes.json();

      setInvoices(invData.invoices || []);
      setPayments(payData || []);
      // Filter appointments belonging to this patient
      setAppointments(appData.filter((a: any) => (a.patientId?._id || a.patientId) === id));
      setDocuments(docData || []);
    } catch (err) {
      console.error('Error fetching patient records:', err);
    } finally {
      setLoading(false);
    }
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

  const handleLogPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logPaymentInvoiceId || !logPaymentAmount || !id) return;

    try {
      const res = await fetch(`${API_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          invoiceId: logPaymentInvoiceId,
          patientId: id,
          amount: parseFloat(logPaymentAmount),
          paymentMethod: logPaymentMethod,
          notes: logPaymentNotes,
        }),
      });

      if (!res.ok) throw new Error('Failed to record payment');
      
      setShowPaymentModal(false);
      setLogPaymentAmount('');
      setLogPaymentNotes('');
      fetchPatientProfile(); // reload data
    } catch (err) {
      console.error('Error recording payment:', err);
    }
  };

  const handleOpenPaymentModal = (invoiceId: string) => {
    setLogPaymentInvoiceId(invoiceId);
    const invoice = invoices.find((i) => i._id === invoiceId);
    if (invoice) {
      const outstanding = Math.max(0, invoice.netAmount - invoice.paidAmount);
      setLogPaymentAmount(outstanding.toString());
    }
    setShowPaymentModal(true);
  };

  if (loading || !patient) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const tabs = [
    { name: 'Overview', label: 'Vue d\'ensemble', icon: History },
    { name: 'Chart', label: 'Odontogramme', icon: Bookmark },
    { name: 'Medical', label: 'Dossier Médical', icon: User },
    { name: 'Invoices', label: 'Factures', icon: FileText },
    { name: 'Payments', label: 'Paiements', icon: CreditCard },
    { name: 'Appointments', label: 'Rendez-vous', icon: Calendar },
    { name: 'Files', label: 'Documents & Radios', icon: ImageIcon },
  ];

  return (

    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 overflow-y-auto no-scrollbar max-h-[calc(100vh-80px)] select-none">
      
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
              src={patient.profilePictureUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${patient.name}`}
              alt={patient.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{patient.name}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xxs font-extrabold border ${
                patient.isArchived
                  ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400'
                  : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              }`}>
                {patient.isArchived ? 'Archivé' : 'Actif'}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <span>📱 {patient.phone}</span>
              {patient.email && <span>✉️ {patient.email}</span>}
              {patient.nationalId && <span>🪪 CNI : <strong>{patient.nationalId}</strong></span>}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigate('/invoices', { state: { patientId: patient._id, patientName: patient.name } })}
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
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Activité Récente</h3>
                <div className="flex flex-col gap-4">
                  {appointments.slice(0, 3).map((appt) => (
                    <div key={appt._id} className="flex gap-4 items-start border-l-2 border-blue-500 pl-4 py-1">
                      <div className="flex-1">
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                          {new Date(appt.dateTime).toLocaleDateString('fr-FR')}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">Rendez-vous planifié</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">{appt.notes || 'Consultation de contrôle'}</p>
                      </div>
                      <span className="text-xxs font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-400">
                        {appt.status}
                      </span>
                    </div>
                  ))}
                  {appointments.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-6">Aucune activité récente disponible.</p>
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
                <Dental3DViewer patientId={id} />
              ) : (
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-sm">
                  <DentalChart patientId={id} />
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
                  <span className="text-slate-900 dark:text-white font-bold">{patient.gender}</span>
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
                  <div key={inv._id} className="flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100/80 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/5 rounded-xl transition-all select-none">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-blue-50 text-blue-600 dark:bg-blue-600/10 dark:text-blue-400 rounded-xl border border-blue-200 dark:border-blue-500/20">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white font-mono">FACTURE N° {inv.invoiceNumber}</h4>
                        <p className="text-xxs text-slate-500 dark:text-slate-400 mt-1">
                          Date : {new Date(inv.date).toLocaleDateString('fr-FR')} • {inv.items.length} acte(s)
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
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
                      
                      <div className="flex gap-2">
                        {inv.paymentStatus !== 'Paid' && (
                          <button
                            onClick={() => handleOpenPaymentModal(inv._id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xxs cursor-pointer shadow-xs"
                          >
                            Régler
                          </button>
                        )}
                        <button
                          onClick={() => navigate('/invoices', { state: { printInvoiceId: inv._id } })}
                          className="p-2 rounded-lg bg-white hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-all shadow-xs"
                          title="Imprimer / Importer PDF"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PAYMENTS PANEL */}
        {activeTab === 'Payments' && (
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Grand Livre des Encaissements</h3>
            
            {payments.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">Aucun paiement enregistré.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {payments.map((p) => (
                  <div key={p._id} className="flex justify-between items-center p-3.5 bg-slate-50 hover:bg-slate-100/80 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/5 rounded-xl transition-all">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-600/10 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                        <CreditCard className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">Reçu en {p.paymentMethod}</h4>
                        <p className="text-xxs text-slate-500 dark:text-slate-400 mt-1">
                          Date : {new Date(p.date).toLocaleDateString('fr-FR')} • Réf Fact : {p.invoiceId?.invoiceNumber || 'FACT'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      +{p.amount.toFixed(2)} DH
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* APPOINTMENTS PANEL */}
        {activeTab === 'Appointments' && (
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Planification & Agenda Patient</h3>
            
            {appointments.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">Aucun rendez-vous consigné.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {appointments.map((appt) => (
                  <div key={appt._id} className="flex justify-between items-center p-3.5 bg-slate-50 hover:bg-slate-100/80 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/5 rounded-xl transition-all">
                    <div className="flex items-center gap-3.5">
                      <div className="p-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-600/10 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-500/20">
                        <Calendar className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {new Date(appt.dateTime).toLocaleDateString('fr-FR')} à {new Date(appt.dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </h4>
                        <p className="text-xxs text-slate-500 dark:text-slate-400 mt-1">Durée : {appt.duration} min</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                      appt.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                        : appt.status === 'Scheduled'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                    }`}>
                      {appt.status}
                    </span>
                  </div>
                ))}
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
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Fichiers - {uploadCategory} ({filteredDocs.length})
                      </h4>
                      
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
                                    href={getDocUrl(doc.filePath)}
                                    download
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
                <div className="flex justify-between items-center pr-10">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-md">Aperçu : {previewFile.fileName}</h4>
                  <button
                    onClick={() => handleSendDocWhatsApp(previewFile)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Envoyer via WhatsApp</span>
                  </button>
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
                            href={getDocUrl(previewFile.filePath)}
                            download
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
                          href={getDocUrl(previewFile.filePath)}
                          download
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
                    <iframe
                      src={getDocUrl(previewFile.filePath)}
                      title={previewFile.fileName}
                      className="w-full h-[460px] rounded-lg border-0 bg-white"
                    />
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
                        href={getDocUrl(previewFile.filePath)}
                        download
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
    </div>
  );
};


const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
