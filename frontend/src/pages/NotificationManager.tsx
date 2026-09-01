import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Smartphone,
  Mail,
  Sliders,
  FileText,
  Send,
  Users,
  Search,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Check,
  ShieldCheck,
  Calendar,
  Layers,
  Paperclip,
  Receipt,
  UploadCloud,
  FileDigit,
  X,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { NotificationLog, MessageTemplate, NotificationSettings, Patient } from '../types';
import { formatDate, formatDateTime } from '../utils/dateUtils';



export const NotificationManager: React.FC = () => {
  const { token, isAdmin } = useAuth();
  const { toast, confirm } = useToast();
  const [activeTab, setActiveTab] = useState<'Logs' | 'Templates' | 'Send' | 'Settings' | 'FollowUp'>('Logs');
  const [clinicConfig, setClinicConfig] = useState<any>(null);

  // Logs state
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [logFilterChannel, setLogFilterChannel] = useState('');
  const [logFilterStatus, setLogFilterStatus] = useState('');
  const [logSearch, setLogSearch] = useState('');

  // Templates state
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);

  // Settings state
  const [settings, setSettings] = useState<Partial<NotificationSettings>>({
    enableWhatsApp: true,
    enableSMS: true,
    enableEmail: true,
    enableScheduler: true,
    testMode: true,
  });

  // Manual & Bulk Send state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [sendChannel, setSendChannel] = useState<'WhatsApp' | 'SMS' | 'Email'>('WhatsApp');
  const [sendSubject, setSendSubject] = useState('');
  const [sendBody, setSendBody] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  // Attachment state for sending Invoices / Medical Documents / Custom Files
  const [attachmentType, setAttachmentType] = useState<'None' | 'Invoice' | 'Document' | 'Upload'>('None');
  const [patientAttachments, setPatientAttachments] = useState<{ invoices: any[]; documents: any[] } | null>(null);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');

  // WhatsApp Web Client Status state
  const [waStatus, setWaStatus] = useState<any>(null);
  const [loadingWaStatus, setLoadingWaStatus] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchWaStatus = () => {
    fetch(`${API_URL}/notifications/whatsapp-status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setWaStatus(data))
      .catch((err) => console.error('Error fetching WA status:', err));
  };

  const handleInitWa = () => {
    setLoadingWaStatus(true);
    fetch(`${API_URL}/notifications/whatsapp-init`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(() => fetchWaStatus())
      .catch((err) => {
        console.error('Error init WA:', err);
        toast.error('Erreur WhatsApp', err.message || 'Impossible d\'initialiser le client WhatsApp.');
      })
      .finally(() => setLoadingWaStatus(false));
  };

  const handleLogoutWa = async () => {
    const confirmed = await confirm({
      title: 'Déconnecter WhatsApp ?',
      message: 'Voulez-vous vraiment déconnecter la session WhatsApp actuelle et lier un nouveau numéro ?',
      variant: 'warning',
      confirmText: 'Déconnecter',
      cancelText: 'Annuler',
    });
    if (!confirmed) return;

    setLoadingWaStatus(true);
    fetch(`${API_URL}/notifications/whatsapp-logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(() => {
        toast.info('Session WhatsApp fermée', 'Vous pouvez maintenant scanner un nouveau code QR.');
        fetchWaStatus();
        setTimeout(() => {
          handleInitWa();
        }, 1000);
      })
      .catch((err) => {
        console.error('Error logging out WA:', err);
        toast.error('Erreur', 'Impossible de déconnecter la session.');
      })
      .finally(() => setLoadingWaStatus(false));
  };

  const fetchClinicConfig = () => {
    fetch(`${API_URL}/clinic/config`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setClinicConfig(data))
      .catch((err) => console.error('Error fetching clinic configs:', err));
  };

  useEffect(() => {
    fetchLogs();
    fetchTemplates();
    fetchSettings();
    fetchPatients();
    fetchWaStatus();
    fetchClinicConfig();

    const interval = setInterval(fetchWaStatus, 4000);
    return () => clearInterval(interval);
  }, [token]);

  const getWhatsAppTargetNumber = () => {
    if (settings.testMode) {
      return settings.testPhoneNumber || '+212 6 13 11 71 31';
    }
    return clinicConfig?.phones || 'le téléphone du cabinet';
  };

  const fetchLogs = () => {
    let url = `${API_URL}/notifications/logs?limit=200`;
    if (logFilterChannel) url += `&channel=${logFilterChannel}`;
    if (logFilterStatus) url += `&status=${logFilterStatus}`;
    if (logSearch) url += `&search=${encodeURIComponent(logSearch)}`;

    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setLogs(data); })
      .catch((err) => console.error('Error fetching logs:', err));
  };

  const fetchTemplates = () => {
    fetch(`${API_URL}/notifications/templates`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setTemplates(data); })
      .catch((err) => console.error('Error fetching templates:', err));
  };

  const fetchSettings = () => {
    fetch(`${API_URL}/notifications/settings`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setSettings(data))
      .catch((err) => console.error('Error fetching settings:', err));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Save Notification Settings
      const res = await fetch(`${API_URL}/notifications/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error('Échec de l\'enregistrement des paramètres de notification');

      // 2. Save Clinic Phone number if config is present
      if (clinicConfig) {
        await fetch(`${API_URL}/clinic/config`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(clinicConfig),
        });
      }

      toast.success('Paramètres enregistrés', 'Vos options WhatsApp et numéros ont été enregistrés avec succès.');
      fetchSettings();
      fetchClinicConfig();
    } catch (err: any) {
      toast.error('Erreur', err.message || 'Impossible d\'enregistrer les paramètres.');
    }
  };


  const fetchPatients = () => {
    fetch(`${API_URL}/patients?limit=1000`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPatients(data);
        } else if (data && Array.isArray(data.patients)) {
          setPatients(data.patients);
        }
      })
      .catch((err) => console.error('Error fetching patients:', err));
  };

  // Auto-fetch invoices & documents when a single patient is selected
  useEffect(() => {
    if (selectedPatients.length === 1) {
      const pId = selectedPatients[0];
      setLoadingAttachments(true);
      fetch(`${API_URL}/notifications/patient-attachments/${pId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          setPatientAttachments(data);
          if (data.invoices && data.invoices.length > 0) {
            setSelectedInvoiceId(data.invoices[0]._id);
          } else {
            setSelectedInvoiceId('');
          }
          if (data.documents && data.documents.length > 0) {
            setSelectedDocumentId(data.documents[0]._id);
          } else {
            setSelectedDocumentId('');
          }
        })
        .catch((err) => console.error('Error fetching patient attachments:', err))
        .finally(() => setLoadingAttachments(false));
    } else {
      setPatientAttachments(null);
      setSelectedInvoiceId('');
      setSelectedDocumentId('');
    }
  }, [selectedPatients, token]);

  const handleSelectInvoice = (invId: string) => {
    setSelectedInvoiceId(invId);
    if (!patientAttachments?.invoices) return;
    const inv = patientAttachments.invoices.find((i) => i._id === invId);
    if (inv) {
      const patient = patients.find((p) => p._id === selectedPatients[0]);
      const invDateStr = formatDate(inv.date || inv.createdAt);
      const itemsText = inv.items?.map((it: any) => `  • ${it.description}${it.tooth ? ` (Dent ${it.tooth})` : ''} : ${it.amount.toLocaleString('fr-FR')} MAD`).join('\n') || '';

      const due = Math.max(0, inv.netAmount - (inv.paidAmount || 0));

      setSendBody(
        `Bonjour ${patient?.name || ''},\n\n` +
        `Veuillez trouver ci-dessous le détail de votre Facture N° ${inv.invoiceNumber} du ${invDateStr} émise par le Cabinet Dentaire Dr. Salma Tijini.\n\n` +
        `📋 *Détail des Soins :*\n${itemsText}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `💰 Total Brut : ${inv.totalAmount.toLocaleString('fr-FR')} MAD\n` +
        (inv.discount > 0 ? `🏷️ Remise : -${inv.discount.toLocaleString('fr-FR')} MAD\n` : '') +
        `💳 Net à Payer : ${inv.netAmount.toLocaleString('fr-FR')} MAD\n` +
        `✅ Montant Réglé : ${(inv.paidAmount || 0).toLocaleString('fr-FR')} MAD\n` +
        `⏳ Reste Dû : ${due.toLocaleString('fr-FR')} MAD\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Merci pour votre confiance. 🦷✨`
      );
    }
  };

  const handleSelectDocument = (docId: string) => {
    setSelectedDocumentId(docId);
    if (!patientAttachments?.documents) return;
    const doc = patientAttachments.documents.find((d) => d._id === docId);
    if (doc) {
      const patient = patients.find((p) => p._id === selectedPatients[0]);
      setSendBody(
        `Bonjour ${patient?.name || ''},\n\n` +
        `Veuillez trouver ci-joint votre document médical : "${doc.fileName}" (${doc.fileType}) transmis par le Cabinet Dentaire Dr. Salma Tijini.\n\n` +
        `Restant à votre entière disposition pour tout renseignement.`
      );
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPatients.length === 0) {
      toast.warning('Sélection requise', 'Veuillez sélectionner au moins un patient.');
      return;
    }

    setBroadcasting(true);

    try {
      if (selectedPatients.length === 1 && attachmentType !== 'None') {
        // Send single message with attached Invoice / Document / Custom File
        const patientId = selectedPatients[0];
        const formData = new FormData();
        formData.append('patientId', patientId);
        formData.append('channel', sendChannel);
        formData.append('subject', sendSubject);
        formData.append('body', sendBody);

        if (attachmentType === 'Invoice' && selectedInvoiceId) {
          formData.append('invoiceId', selectedInvoiceId);
        } else if (attachmentType === 'Document' && selectedDocumentId) {
          formData.append('documentId', selectedDocumentId);
        } else if (attachmentType === 'Upload' && customFile) {
          formData.append('attachment', customFile);
        }

        const res = await fetch(`${API_URL}/notifications/send-manual`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Échec de l\'envoi');

        toast.success(
          attachmentType === 'Invoice'
            ? 'Facture transmise avec succès !'
            : attachmentType === 'Document'
            ? 'Document transmis avec succès !'
            : 'Fichier transmis avec succès !',
          'Le message et le document ont été envoyés au patient sur WhatsApp.'
        );
        fetchLogs();
        setCustomFile(null);
        setAttachmentType('None');
      } else {
        // Broadcast / multiple send
        const res = await fetch(`${API_URL}/notifications/send-bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            patientIds: selectedPatients,
            channel: sendChannel,
            subject: sendSubject,
            body: sendBody,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Échec de la diffusion');

        toast.success('Diffusion envoyée', data.message || `Messages transmis à ${selectedPatients.length} patient(s).`);
        fetchLogs();
        setSelectedPatients([]);
      }
    } catch (err: any) {
      console.error('Error sending notification:', err);
      toast.error('Erreur', err.message || 'Impossible d\'envoyer le message.');
    } finally {
      setBroadcasting(false);
    }
  };

  const handleRetry = (id: string) => {
    fetch(`${API_URL}/notifications/retry/${id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => fetchLogs())
      .catch((err) => console.error('Error retrying message:', err));
  };

  return (
    <div className="p-6 md:p-8 space-y-6 text-slate-900 dark:text-white font-sans">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30 dark:text-blue-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Centre de Notifications & Rappels IA</h1>
          </div>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestion automatisée et rappels de rendez-vous via WhatsApp Web avec confirmation interactive.
          </p>
        </div>
      </div>

      {/* Modern Segmented Pill Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 overflow-x-auto no-scrollbar shadow-sm">
        <button
          onClick={() => setActiveTab('Logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'Logs'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <Clock className="w-4 h-4" /> <span>Journal & Historique</span>
        </button>
        <button
          onClick={() => setActiveTab('Send')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'Send'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <Send className="w-4 h-4" /> <span>Envoi Manuel / Broadcast</span>
        </button>
        <button
          onClick={() => setActiveTab('Templates')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'Templates'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <FileText className="w-4 h-4" /> <span>Modèles de Messages</span>
        </button>
        <button
          onClick={() => setActiveTab('Settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'Settings'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <Sliders className="w-4 h-4" /> <span>Configuration APIs & Canaux</span>
        </button>
      </div>

      {/* TAB 1: LOGS & HISTORY */}
      {activeTab === 'Logs' && (
        <div className="flex flex-col gap-4">
          
          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher patient, tel, corps..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
                  className="w-full h-10 pl-9 pr-4 rounded-xl text-xs border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
                />
              </div>



              <select
                value={logFilterStatus}
                onChange={(e) => setLogFilterStatus(e.target.value)}
                className="h-10 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-xs"
              >
                <option value="">Tous les états</option>
                <option value="Sent">Envoyé</option>
                <option value="Delivered">Délivré</option>
                <option value="Failed">Échec</option>
              </select>

              <button
                onClick={fetchLogs}
                className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white cursor-pointer shadow-md shadow-blue-600/20 transition-all"
              >
                Filtrer
              </button>
            </div>

            <button
              onClick={fetchLogs}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-all shadow-xs"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Logs Table */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-white/5">
                  <tr>
                    <th className="p-4">Patient / Destinataire</th>
                    <th className="p-4">Canal / Provider</th>
                    <th className="p-4">Type Message</th>
                    <th className="p-4">Contenu du Message</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4">Horodatage</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Aucune notification trouvée.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-white/3 transition-all">
                        <td className="p-4 font-bold text-slate-900 dark:text-white">
                          {log.patientId?.name || log.recipient}
                          <span className="block text-xxs font-normal text-slate-500 dark:text-slate-400">{log.recipient}</span>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-xxs font-semibold text-slate-800 dark:text-slate-300">
                            {log.channel === 'WhatsApp' && <MessageSquare className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                            {log.channel === 'SMS' && <Smartphone className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
                            {log.channel === 'Email' && <Mail className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                            {log.provider}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-indigo-600 dark:text-indigo-400">{log.messageType}</td>
                        <td className="p-4 max-w-xs truncate text-slate-600 dark:text-slate-300">{log.body}</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xxs font-bold ${
                              log.status === 'Sent' || log.status === 'Delivered'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 dark:text-slate-400 text-xxs font-mono">
                          {formatDateTime(log.createdAt)}
                        </td>

                        <td className="p-4 text-right">
                          {log.status === 'Failed' && (
                            <button
                              onClick={() => handleRetry(log._id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 text-xxs font-bold cursor-pointer transition-all shadow-xs"
                            >
                              Réessayer
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: MANUAL & BULK SENDER WITH INVOICE / DOCUMENT ATTACHMENTS */}
      {activeTab === 'Send' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Form */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Envoyer un Message & Documents WhatsApp</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Envoyez des messages, factures détaillées, ordonnances ou radios directement aux patients.</p>
              </div>
            </div>
            
            <form onSubmit={handleSendNotification} className="flex flex-col gap-4">
              
              {/* Attachment Type Selector */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-blue-500" />
                  <span>Pièce Jointe / Type d'envoi</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAttachmentType('None');
                      setCustomFile(null);
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      attachmentType === 'None'
                        ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-500 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Texte Simple</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAttachmentType('Invoice');
                      setCustomFile(null);
                      if (selectedPatients.length !== 1 && patients.length > 0) {
                        setSelectedPatients([patients[0]._id]);
                      }
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      attachmentType === 'Invoice'
                        ? 'bg-emerald-50 dark:bg-emerald-600/20 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Facture Patient</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAttachmentType('Document');
                      setCustomFile(null);
                      if (selectedPatients.length !== 1 && patients.length > 0) {
                        setSelectedPatients([patients[0]._id]);
                      }
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      attachmentType === 'Document'
                        ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Document Médical</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAttachmentType('Upload');
                      if (selectedPatients.length !== 1 && patients.length > 0) {
                        setSelectedPatients([patients[0]._id]);
                      }
                    }}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      attachmentType === 'Upload'
                        ? 'bg-amber-50 dark:bg-amber-600/20 border-amber-500 text-amber-600 dark:text-amber-400 shadow-xs'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Fichier Local</span>
                  </button>
                </div>
              </div>

              {/* Specific Attachment Pickers for the selected patient */}
              {attachmentType === 'Invoice' && (
                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <Receipt className="w-4 h-4" />
                      <span>Sélectionner la facture à envoyer :</span>
                    </span>
                    {loadingAttachments && <span className="text-xxs text-emerald-600 dark:text-emerald-400 animate-pulse">Chargement des factures...</span>}
                  </div>

                  {patientAttachments?.invoices && patientAttachments.invoices.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      <select
                        value={selectedInvoiceId}
                        onChange={(e) => handleSelectInvoice(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl text-xs font-semibold border border-emerald-300 dark:border-emerald-500/30 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 shadow-xs"
                      >
                        {patientAttachments.invoices.map((inv) => (
                          <option key={inv._id} value={inv._id}>
                            Facture N° {inv.invoiceNumber} - {inv.netAmount.toLocaleString('fr-FR')} MAD ({formatDate(inv.date || inv.createdAt)}) • {inv.paymentStatus}
                          </option>
                        ))}

                      </select>

                      <button
                        type="button"
                        onClick={() => handleSelectInvoice(selectedInvoiceId || patientAttachments.invoices[0]._id)}
                        className="self-start text-xxs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1 mt-1"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Insérer le résumé complet de la facture dans le message</span>
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedPatients.length === 1
                        ? 'Ce patient ne possède aucune facture enregistrée pour le moment.'
                        : 'Veuillez sélectionner un patient dans la colonne de droite pour charger ses factures.'}
                    </p>
                  )}
                </div>
              )}

              {attachmentType === 'Document' && (
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/20 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-1.5">
                      <FileText className="w-4 h-4" />
                      <span>Sélectionner le document médical / radio :</span>
                    </span>
                    {loadingAttachments && <span className="text-xxs text-indigo-600 dark:text-indigo-400 animate-pulse">Chargement des documents...</span>}
                  </div>

                  {patientAttachments?.documents && patientAttachments.documents.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      <select
                        value={selectedDocumentId}
                        onChange={(e) => handleSelectDocument(e.target.value)}
                        className="w-full h-11 px-3.5 rounded-xl text-xs font-semibold border border-indigo-300 dark:border-indigo-500/30 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 shadow-xs"
                      >
                        {patientAttachments.documents.map((doc) => (
                          <option key={doc._id} value={doc._id}>
                            {doc.fileName} ({doc.fileType} • {doc.category}) - {(doc.fileSize / 1024).toFixed(0)} Ko
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleSelectDocument(selectedDocumentId || patientAttachments.documents[0]._id)}
                        className="self-start text-xxs font-bold text-indigo-700 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1 mt-1"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Insérer le texte de transmission du document</span>
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedPatients.length === 1
                        ? 'Ce patient ne possède aucun document médical dans sa fiche.'
                        : 'Veuillez sélectionner un patient dans la colonne de droite pour afficher ses documents.'}
                    </p>
                  )}
                </div>
              )}

              {attachmentType === 'Upload' && (
                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 flex flex-col gap-3">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4" />
                    <span>Choisir un fichier sur votre ordinateur (PDF, Image, Radio, Document) :</span>
                  </span>

                  <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-amber-300 dark:border-amber-500/30 rounded-xl hover:bg-amber-100/40 dark:hover:bg-white/5 cursor-pointer transition-all">
                    <UploadCloud className="w-7 h-7 text-amber-500 mb-1" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {customFile ? customFile.name : 'Cliquez pour sélectionner un fichier à envoyer'}
                    </span>
                    <span className="text-xxs text-slate-500 dark:text-slate-400 mt-0.5">
                      {customFile ? `${(customFile.size / 1024).toFixed(0)} Ko` : 'PDF, JPG, PNG, DOCX jusqu\'à 25 Mo'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setCustomFile(e.target.files[0]);
                          if (!sendBody) {
                            setSendBody(`Bonjour, veuillez trouver ci-joint votre document "${e.target.files[0].name}".`);
                          }
                        }
                      }}
                    />
                  </label>
                </div>
              )}

              {/* Quick Template buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xxs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1">Modèles rapides :</span>
                <button
                  type="button"
                  onClick={() => {
                    const patName = selectedPatients.length === 1
                      ? patients.find((p) => p._id === selectedPatients[0])?.name || '{{patient_name}}'
                      : '{{patient_name}}';
                    setSendBody(`Bonjour ${patName},\n\nNous vous rappelons votre consultation prévue au Cabinet Dentaire Dr. Salma Tijini.\n\nMerci de confirmer votre présence.`);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xxs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer transition-all border border-slate-200 dark:border-white/5"
                >
                  📅 Rappel RDV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const patName = selectedPatients.length === 1
                      ? patients.find((p) => p._id === selectedPatients[0])?.name || '{{patient_name}}'
                      : '{{patient_name}}';
                    setSendBody(`Bonjour ${patName},\n\nVeuillez trouver ci-joint le document transmis par le Cabinet Dentaire Dr. Salma Tijini.\n\nNous restons à votre disposition pour toute question.`);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xxs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer transition-all border border-slate-200 dark:border-white/5"
                >
                  📁 Envoi Document
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const patName = selectedPatients.length === 1
                      ? patients.find((p) => p._id === selectedPatients[0])?.name || '{{patient_name}}'
                      : '{{patient_name}}';
                    setSendBody(`Bonjour ${patName},\n\nSuite à votre consultation, voici les recommandations post-opératoires du Dr. Salma Tijini :\n\n• Éviter les aliments trop chauds ou durs aujourd'hui.\n• Prendre les médicaments prescrits.\n\nBon rétablissement ! 🦷`);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xxs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer transition-all border border-slate-200 dark:border-white/5"
                >
                  💊 Conseils Post-Soin
                </button>
              </div>

              {/* Message Body */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                  Message d'accompagnement (WhatsApp)
                </label>
                <textarea
                  rows={6}
                  placeholder="Bonjour {{patient_name}}, nous vous envoyons votre document..."
                  value={sendBody}
                  onChange={(e) => setSendBody(e.target.value)}
                  className="w-full p-4 rounded-xl text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-xs resize-none leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={broadcasting || selectedPatients.length === 0}
                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs sm:text-sm text-white transition-all shadow-lg shadow-blue-600/25 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
              >
                {broadcasting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Envoi en cours...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {selectedPatients.length === 1
                        ? attachmentType === 'Invoice'
                          ? 'Envoyer la Facture sur WhatsApp'
                          : attachmentType === 'Document'
                          ? 'Envoyer le Document Médical sur WhatsApp'
                          : attachmentType === 'Upload'
                          ? 'Envoyer le Fichier sur WhatsApp'
                          : `Envoyer le Message à ${patients.find(p => p._id === selectedPatients[0])?.name || '1 patient'}`
                        : `Diffuser à ${selectedPatients.length} patient(s)`}
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Patient Picker with search */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Sélectionner Patients ({selectedPatients.length})
              </h4>
              <button
                type="button"
                onClick={() => {
                  if (selectedPatients.length === patients.length) setSelectedPatients([]);
                  else setSelectedPatients(patients.map((p) => p._id));
                }}
                className="text-xxs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                {selectedPatients.length === patients.length ? 'Désélectionner' : 'Tous Sélectionner'}
              </button>
            </div>

            {/* Patient Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un patient..."
                value={patientSearchQuery}
                onChange={(e) => setPatientSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl text-xs border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-xs"
              />
            </div>

            <div className="flex-1 max-h-[420px] overflow-y-auto no-scrollbar flex flex-col gap-2">
              {patients
                .filter((p) => {
                  if (!patientSearchQuery) return true;
                  const q = patientSearchQuery.toLowerCase();
                  return (
                    p.name.toLowerCase().includes(q) ||
                    (p.phone && p.phone.toLowerCase().includes(q)) ||
                    (p.nationalId && p.nationalId.toLowerCase().includes(q))
                  );
                })
                .map((p) => {
                  const isSelected = selectedPatients.includes(p._id);
                  return (
                    <div
                      key={p._id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedPatients(selectedPatients.filter((id) => id !== p._id));
                        } else {
                          // For document sending, default to selecting the single target patient
                          if (attachmentType !== 'None') {
                            setSelectedPatients([p._id]);
                          } else {
                            setSelectedPatients([...selectedPatients, p._id]);
                          }
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-300 dark:border-blue-500/50 shadow-xs'
                          : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <h5 className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">{p.name}</h5>
                        <span className="text-xxs text-slate-500 dark:text-slate-400 block">{p.phone || 'Sans tél'}</span>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />}
                    </div>
                  );
                })}
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: TEMPLATES */}
      {activeTab === 'Templates' && (
        <div className="flex flex-col gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col gap-6">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Modèles de Messages WhatsApp
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {templates.filter(t => t.channel === 'WhatsApp').map((template) => (
                <div key={template._id} className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950/40 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{template.name}</h4>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase">{template.messageType} • {template.language.toUpperCase()}</span>
                    </div>
                    {template.isDefault && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-blue-50 text-blue-600 dark:bg-blue-600/20 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">Défaut</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xxs font-semibold text-slate-600 dark:text-slate-400">Contenu du Message :</label>
                    <textarea
                      rows={6}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-300 resize-none focus:outline-none focus:border-blue-500 shadow-xs leading-relaxed"
                      value={template.body}
                      onChange={(e) => {
                        const updated = templates.map(t => t._id === template._id ? { ...t, body: e.target.value } : t);
                        setTemplates(updated);
                      }}
                    />
                  </div>

                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xxs text-slate-400">Variables : {"{{patient_name}}"}, {"{{appointment_date}}"}, {"{{appointment_time}}"}</span>
                    <button
                      type="button"
                      onClick={() => {
                        fetch(`${API_URL}/notifications/templates/${template._id}`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                          },
                          body: JSON.stringify({ body: template.body })
                        })
                          .then(res => {
                            if (!res.ok) throw new Error('Échec de l\'enregistrement du modèle');
                            return res.json();
                          })
                          .then(() => toast.success('Modèle enregistré', 'Le modèle de message a été mis à jour avec succès.'))
                          .catch(err => toast.error('Erreur', err.message));
                      }}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer"
                    >
                      Enregistrer le Modèle
                    </button>
                  </div>
                </div>
              ))}
              {templates.filter(t => t.channel === 'WhatsApp').length === 0 && (
                <div className="col-span-2 p-8 text-center text-slate-400 text-xs font-semibold">Aucun modèle de message WhatsApp trouvé.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SETTINGS & APIS */}
      {activeTab === 'Settings' && (
        <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* WhatsApp Web Client Live Status & QR Code Card */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <Smartphone className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Session WhatsApp Web Officielle (Gratuit 100%)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Connectez le numéro du cabinet pour envoyer des rappels et ordonnances directement aux patients.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    waStatus?.connected
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                      : waStatus?.status === 'INITIALIZING'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${waStatus?.connected ? 'bg-emerald-500 animate-ping' : waStatus?.status === 'INITIALIZING' ? 'bg-blue-500 animate-pulse' : 'bg-amber-500'}`}></span>
                  {waStatus?.connected ? `Connecté (${waStatus?.phoneNumber || 'WhatsApp'})` : waStatus?.status === 'INITIALIZING' ? 'Initialisation...' : waStatus?.status === 'QR_READY' ? 'QR Code Prêt à scanner' : 'Déconnecté'}
                </span>

                <button
                  type="button"
                  onClick={handleInitWa}
                  disabled={loadingWaStatus || waStatus?.status === 'INITIALIZING'}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingWaStatus || waStatus?.status === 'INITIALIZING' ? 'animate-spin' : ''}`} />
                  <span>{loadingWaStatus || waStatus?.status === 'INITIALIZING' ? 'Lancement...' : 'Relancer WhatsApp'}</span>
                </button>

                {waStatus?.connected && (
                  <button
                    type="button"
                    onClick={handleLogoutWa}
                    disabled={loadingWaStatus}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
                  >
                    Déconnecter / Changer de Numéro
                  </button>
                )}
              </div>
            </div>

            {/* Display Loading status when initializing browser */}
            {(loadingWaStatus || waStatus?.status === 'INITIALIZING') && !waStatus?.qrCodeUrl && (
              <div className="p-6 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-500/20 flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300">
                    ⏳ Démarrage du navigateur et génération du QR Code...
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Veuillez patienter 3 à 5 secondes, le QR code WhatsApp va s'afficher ci-dessous.
                  </p>
                </div>
              </div>
            )}

            {/* Display QR Code if awaiting scan */}
            {waStatus?.qrCodeUrl && !waStatus?.connected && (
              <div className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-500/30">
                <div className="p-4 bg-white rounded-2xl shadow-xl border border-slate-200 shrink-0">
                  <img src={waStatus.qrCodeUrl} alt="WhatsApp Web QR Code" className="w-56 h-56 object-contain" />
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      📱 Scannez ce QR Code avec votre WhatsApp
                    </h4>
                  </div>
                  <ol className="text-xs text-slate-700 dark:text-slate-300 flex flex-col gap-2 list-decimal pl-5 leading-relaxed">
                    <li>Ouvrez l'application <strong>WhatsApp</strong> sur le téléphone du cabinet ({getWhatsAppTargetNumber()}).</li>
                    <li>Allez dans <strong>Réglages (ou les 3 points en haut) &gt; Appareils connectés (Linked Devices)</strong>.</li>
                    <li>Cliquez sur <strong>Lier un appareil</strong> et pointez la caméra vers le QR Code ci-contre.</li>
                    <li>Une fois scanné, vos rappels de rendez-vous et messages seront envoyés <strong>automatiquement & gratuitement</strong> !</li>
                  </ol>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-white/5">
                    💡 <em>Le QR Code se rafraîchit automatiquement. Dès que vous le scannez, cette page passe à l'état « Connecté ».</em>
                  </div>
                </div>
              </div>
            )}

            {!waStatus?.connected && !waStatus?.qrCodeUrl && waStatus?.status !== 'INITIALIZING' && !loadingWaStatus && (
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Générer le QR Code d'association WhatsApp Web</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cliquez sur le bouton pour afficher le QR Code et associer votre téléphone ({getWhatsAppTargetNumber()}).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleInitWa}
                  disabled={loadingWaStatus}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 shrink-0 flex items-center gap-2"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>📱 Afficher le QR Code WhatsApp</span>
                </button>
              </div>
            )}

            {waStatus?.connected && (
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-emerald-900 dark:text-emerald-200">
                    WhatsApp Web est connecté avec succès ! ({waStatus?.phoneNumber || 'Cabinet'})
                  </span>
                  <span className="text-[11px] font-normal text-emerald-700 dark:text-emerald-400">
                    Tous les rappels de rendez-vous et ordonnances sont envoyés directement depuis votre numéro.
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {/* WhatsApp & Phone Numbers Config */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
              <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Numéro & Options d'Envoi
            </h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Numéro WhatsApp du Cabinet (Principal)</label>
              <input
                type="text"
                placeholder="+212 6 XX XX XX XX"
                value={clinicConfig?.phones || ''}
                onChange={(e) => setClinicConfig(clinicConfig ? { ...clinicConfig, phones: e.target.value } : null)}
                className="w-full h-11 px-4 rounded-xl text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 shadow-xs"
              />
              <span className="text-[10px] text-slate-500">Ce numéro est utilisé pour afficher sur les ordonnances et contacter les patients.</span>
            </div>

            <div className="flex justify-between items-center border-t border-slate-100 dark:border-white/5 pt-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Activer les rappels WhatsApp automatiques</span>
                <span className="text-[10px] text-slate-500">Envoie un rappel de rendez-vous à la veille de la consultation.</span>
              </div>
              <input
                type="checkbox"
                checked={settings.enableWhatsApp}
                onChange={(e) => setSettings({ ...settings, enableWhatsApp: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Developer / Admin Test Settings */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-sm flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
              <ShieldCheck className="w-4 h-4 text-indigo-500" /> Mode de Test & Simulation (Numéro Personnel)
            </h3>
            
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Mode Test Actif</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Si activé, tous les messages de test seront envoyés sur votre numéro personnel au lieu des vrais patients.</span>
              </div>
              <input
                type="checkbox"
                checked={settings.testMode || false}
                onChange={(e) => setSettings({ ...settings, testMode: e.target.checked })}
                className="w-4 h-4 accent-indigo-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                Numéro de Téléphone de Test (ex: +2126XXXXXXXX ou 06XXXXXXXX)
              </label>
              <input
                type="text"
                placeholder="+212613117131"
                value={settings.testPhoneNumber || ''}
                onChange={(e) => setSettings({ ...settings, testPhoneNumber: e.target.value })}
                className="w-full h-11 px-4 rounded-xl text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 shadow-xs"
              />
            </div>
          </div>

          <div className="lg:col-span-2 flex justify-end mt-2">
            <button
              type="submit"
              className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white transition-all shadow-md shadow-blue-600/20 cursor-pointer"
            >
              Enregistrer tous les paramètres
            </button>
          </div>


        </form>
      )}

    </div>
  );
};
