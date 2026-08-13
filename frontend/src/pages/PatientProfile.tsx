import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  ArrowLeft
} from 'lucide-react';
import { Patient, Invoice, PaymentTransaction, Appointment, Document } from '../types';

export const PatientProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
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

  // File Upload states
  const [uploadCategory, setUploadCategory] = useState<'Photos' | 'XRays' | 'Documents' | 'Videos' | 'Audio'>('Documents');
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<Document | null>(null);

  // Log Payment state
  const [logPaymentInvoiceId, setLogPaymentInvoiceId] = useState('');
  const [logPaymentAmount, setLogPaymentAmount] = useState('');
  const [logPaymentMethod, setLogPaymentMethod] = useState<'espèces' | 'chèque' | 'carte' | 'virement' | 'traites'>('espèces');
  const [logPaymentNotes, setLogPaymentNotes] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const UPLOADS_URL = API_URL.replace('/api', '/uploads');

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !id) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('patientId', id);
    formData.append('category', uploadCategory);

    // Map file types to match DocumentSchema.fileType enum
    let fileType: 'Photo' | 'XRay' | 'Document' | 'Video' | 'Audio' = 'Document';
    if (uploadCategory === 'Photos') fileType = 'Photo';
    if (uploadCategory === 'XRays') fileType = 'XRay';
    if (uploadCategory === 'Videos') fileType = 'Video';
    if (uploadCategory === 'Audio') fileType = 'Audio';
    formData.append('fileType', fileType);

    setUploading(true);
    try {
      const res = await fetch(`${API_URL}/documents/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const newDoc = await res.json();
      setDocuments([newDoc, ...documents]);
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Supprimer ce fichier définitivement ?')) return;

    try {
      await fetch(`${API_URL}/documents/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocuments(documents.filter((doc) => doc._id !== fileId));
      if (previewFile?._id === fileId) setPreviewFile(null);
    } catch (err) {
      console.error('Delete file error:', err);
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
    <div className="flex-1 p-8 flex flex-col gap-6 overflow-y-auto no-scrollbar max-h-[calc(100vh-80px)] select-none">
      
      {/* Back button */}
      <div className="flex items-center">
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-slate-400 hover:text-white transition-all text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour aux Patients</span>
        </button>
      </div>

      {/* Patient Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 border border-white/5 p-6 rounded-3xl shadow-lg">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full overflow-hidden border border-white/10 bg-slate-800 shrink-0">
            <img
              src={patient.profilePictureUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${patient.name}`}
              alt={patient.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white tracking-tight">{patient.name}</h2>
              <span className={`px-2 py-0.5 rounded text-xxs font-extrabold border ${
                patient.isArchived
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                {patient.isArchived ? 'Archivé' : 'Actif'}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 text-xs text-slate-400 font-medium">
              <span>📱 {patient.phone}</span>
              {patient.email && <span>✉️ {patient.email}</span>}
              {patient.nationalId && <span>🪪 CNI : {patient.nationalId}</span>}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigate('/invoices', { state: { patientId: patient._id, patientName: patient.name } })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs cursor-pointer shadow shadow-blue-500/10 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Facturer</span>
          </button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-white/5 select-none no-scrollbar overflow-x-auto gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            onClick={() => setActiveTab(tab.name)}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.name
                ? 'border-blue-500 text-blue-400 bg-white/3'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB CONTENT PANELS */}
      <div className="flex-1">
        
        {/* OVERVIEW PANEL */}
        {activeTab === 'Overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Quick Summary / Critical Clinical Info */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* Alert items: allergies, systemic diseases */}
              <div className="p-6 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex flex-col gap-3">
                <h4 className="text-xs font-extrabold text-rose-400 uppercase tracking-widest">Alertes médicales & antécédents</h4>
                <div className="flex flex-wrap gap-2">
                  {patient.allergies.map((al, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-400">
                      ⚠️ Allergie : {al}
                    </span>
                  ))}
                  {patient.medicalHistory.map((hist, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-400">
                      ❤️ Antécédent : {hist}
                    </span>
                  ))}
                  {patient.allergies.length === 0 && patient.medicalHistory.length === 0 && (
                    <span className="text-xs text-slate-400 font-medium">Aucune alerte médicale signalée.</span>
                  )}
                </div>
              </div>

              {/* Patient timeline logs */}
              <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 shadow-md flex flex-col gap-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Activité Récente</h3>
                <div className="flex flex-col gap-4">
                  {appointments.slice(0, 3).map((appt) => (
                    <div key={appt._id} className="flex gap-4 items-start border-l-2 border-blue-500 pl-4 py-1">
                      <div className="flex-1">
                        <span className="text-[10px] font-bold text-blue-400">
                          {new Date(appt.dateTime).toLocaleDateString('fr-FR')}
                        </span>
                        <h4 className="text-xs font-bold text-white mt-0.5">Rendez-vous planifié</h4>
                        <p className="text-xs text-slate-400 leading-normal">{appt.notes || 'Consultation de contrôle'}</p>
                      </div>
                      <span className="text-xxs font-extrabold uppercase px-2 py-0.5 rounded bg-white/5 border border-white/5 text-slate-400">
                        {appt.status}
                      </span>
                    </div>
                  ))}
                  {appointments.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-6">Aucune activité récente disponible.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Right sidebar: Quick stats */}
            <div className="flex flex-col gap-6">
              
              {/* Financial Summary */}
              <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 shadow-md flex flex-col gap-4">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Résumé Financier</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Total facturé :</span>
                    <span className="text-white font-mono font-bold">
                      {invoices.reduce((sum, i) => sum + i.netAmount, 0).toFixed(2)} DH
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Montant payé :</span>
                    <span className="text-emerald-400 font-mono font-bold">
                      {invoices.reduce((sum, i) => sum + i.paidAmount, 0).toFixed(2)} DH
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2 mt-1">
                    <span className="text-slate-400">Solde restant :</span>
                    <span className="text-rose-400 font-mono font-bold">
                      {Math.max(0, invoices.reduce((sum, i) => sum + i.netAmount - i.paidAmount, 0)).toFixed(2)} DH
                    </span>
                  </div>
                </div>
              </div>

              {/* General notes */}
              <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 shadow-md flex flex-col gap-3">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Observations Cliniques</h3>
                <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
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
            <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-900/40 border border-white/5 shadow-md">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Odontogramme Clinique & Schéma Dentaire</h3>
                <p className="text-xs text-slate-400">Basculez entre l'arcade 3D interactive et le schéma 2D classique</p>
              </div>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-white/5">
                <button
                  onClick={() => setChartMode('3D')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    chartMode === '3D' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Vue 3D HD (R3F)
                </button>
                <button
                  onClick={() => setChartMode('2D')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    chartMode === '2D' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white'
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
                <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 shadow-md">
                  <DentalChart patientId={id} />
                </div>
              )
            )}
          </div>
        )}

        {/* MEDICAL HISTORY PANEL */}
        {activeTab === 'Medical' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-slate-900/40 border border-white/5 shadow-md">
            
            {/* Demographics & Basic info */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">Informations Générales</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-500 font-medium">Groupe Sanguin :</span>
                  <span className="text-white font-bold">{patient.bloodType || 'Non précisé'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-slate-500 font-medium">Genre :</span>
                  <span className="text-white font-bold">{patient.gender}</span>
                </div>
                <div className="flex flex-col gap-0.5 col-span-2">
                  <span className="text-slate-500 font-medium">Adresse principale :</span>
                  <span className="text-white font-semibold leading-relaxed">{patient.address || 'Aucune adresse renseignée.'}</span>
                </div>
              </div>
            </div>

            {/* Urgent references & contacts */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">Personne de confiance (Urgence)</h3>
              <div className="flex flex-col gap-2 text-xs">
                <p className="text-white font-semibold">Nom : <strong>{patient.emergencyContact?.name || 'Aucun'}</strong></p>
                <p className="text-white font-semibold">Relation : <strong>{patient.emergencyContact?.relationship || 'N/A'}</strong></p>
                <p className="text-blue-400 font-bold">Téléphone : <strong>{patient.emergencyContact?.phone || 'N/A'}</strong></p>
              </div>
            </div>

          </div>
        )}

        {/* INVOICES PANEL */}
        {activeTab === 'Invoices' && (
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 shadow-md flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Factures du Patient</h3>
            </div>

            {invoices.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-10">Aucune facture enregistrée pour ce patient.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {invoices.map((inv) => (
                  <div key={inv._id} className="flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all select-none">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-blue-600/10 rounded-xl border border-blue-500/20 text-blue-400">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white font-mono">FACTURE N° {inv.invoiceNumber}</h4>
                        <p className="text-xxs text-slate-400 mt-1">
                          Date : {new Date(inv.date).toLocaleDateString('fr-FR')} • {inv.items.length} acte(s)
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-right flex flex-col items-end gap-1">
                        <span className="text-xs font-bold text-white font-mono">{inv.netAmount.toFixed(2)} DH</span>
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          inv.paymentStatus === 'Paid'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : inv.paymentStatus === 'Partially Paid'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {inv.paymentStatus === 'Paid' ? 'Payée' : inv.paymentStatus === 'Partially Paid' ? 'Partiel' : 'Impayée'}
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        {inv.paymentStatus !== 'Paid' && (
                          <button
                            onClick={() => handleOpenPaymentModal(inv._id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xxs cursor-pointer"
                          >
                            Régler
                          </button>
                        )}
                        <button
                          onClick={() => navigate('/invoices', { state: { printInvoiceId: inv._id } })}
                          className="p-2 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 text-slate-400 hover:text-white cursor-pointer"
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
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 shadow-md flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Grand Livre des Encaissements</h3>
            
            {payments.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-10">Aucun paiement enregistré.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {payments.map((p) => (
                  <div key={p._id} className="flex justify-between items-center p-3.5 bg-white/5 border border-white/5 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-600/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                        <CreditCard className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Reçu en {p.paymentMethod}</h4>
                        <p className="text-xxs text-slate-400 mt-1">
                          Date : {new Date(p.date).toLocaleDateString('fr-FR')} • Réf Fact : {p.invoiceId?.invoiceNumber || 'FACT'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
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
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-white/5 shadow-md flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Planification & Agenda Patient</h3>
            
            {appointments.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-10">Aucun rendez-vous consigné.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {appointments.map((appt) => (
                  <div key={appt._id} className="flex justify-between items-center p-3.5 bg-white/5 border border-white/5 rounded-2xl">
                    <div className="flex items-center gap-3.5">
                      <div className="p-2 bg-indigo-600/10 rounded-xl border border-indigo-500/20 text-indigo-400">
                        <Calendar className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">
                          {new Date(appt.dateTime).toLocaleDateString('fr-FR')} à {new Date(appt.dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </h4>
                        <p className="text-xxs text-slate-400 mt-1">Durée : {appt.duration} min • {appt.chair}</p>
                      </div>
                    </div>
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      appt.status === 'Completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : appt.status === 'Scheduled'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
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
              
              <div className="md:col-span-1 p-5 rounded-2xl bg-slate-900/40 border border-white/5 flex flex-col gap-4">
                <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Catégorie de dossier</h4>
                <div className="flex flex-col gap-1.5">
                  {['Photos', 'XRays', 'Documents', 'Videos', 'Audio'].map((cat: any) => (
                    <button
                      key={cat}
                      onClick={() => setUploadCategory(cat)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
                        uploadCategory === cat
                          ? 'bg-blue-600 text-white shadow'
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {cat === 'XRays' ? 'Radiographies (X-Rays)' : cat === 'Photos' ? 'Galerie Photos' : cat}
                    </button>
                  ))}
                </div>

                <div className="border border-dashed border-white/10 hover:border-blue-500/50 transition-all rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer relative bg-slate-950/20">
                  <UploadCloud className="w-8 h-8 text-slate-500" />
                  <span className="text-xxs text-slate-400 font-bold text-center">Déposez ou sélectionnez un fichier</span>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    disabled={uploading}
                  />
                  {uploading && <span className="text-[10px] text-blue-400 font-bold">Importation en cours...</span>}
                </div>
              </div>

              {/* Files library grid list */}
              <div className="md:col-span-2 p-5 rounded-2xl bg-slate-900/40 border border-white/5 flex flex-col gap-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Fichiers ({documents.length})</h4>
                
                {documents.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-10">Aucun fichier importé.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4 max-h-[350px] overflow-y-auto no-scrollbar pr-1">
                    {documents.map((doc) => (
                      <div key={doc._id} className="p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between gap-3 group relative">
                        <div className="flex gap-3.5 items-start">
                          <div className="p-2 bg-blue-600/10 rounded-lg text-blue-400">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-xs font-semibold text-white truncate">{doc.fileName}</h5>
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wide mt-1 block">
                              {doc.category} • {(doc.fileSize / 1024).toFixed(0)} KB
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end border-t border-white/5 pt-2">
                          <button
                            onClick={() => setPreviewFile(doc)}
                            className="p-1 hover:bg-white/5 text-slate-500 hover:text-white rounded transition-all cursor-pointer"
                            title="Aperçu"
                          >
                            <Eye className="w-4.5 h-4.5" />
                          </button>
                          <a
                            href={`${UPLOADS_URL}${doc.filePath}`}
                            download
                            className="p-1 hover:bg-white/5 text-slate-500 hover:text-white rounded transition-all cursor-pointer"
                            title="Télécharger"
                          >
                            <Download className="w-4.5 h-4.5" />
                          </a>
                          <button
                            onClick={() => handleDeleteFile(doc._id)}
                            className="p-1 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 rounded transition-all cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Direct preview panel if active */}
            {previewFile && (
              <div className="p-5 rounded-2xl bg-slate-900 border border-white/10 flex flex-col gap-3 relative select-none">
                <button
                  onClick={() => setPreviewFile(null)}
                  className="absolute right-3.5 top-3.5 p-1.5 bg-slate-950/60 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <XIcon />
                </button>
                <h4 className="text-xs font-bold text-white truncate max-w-md">Aperçu : {previewFile.fileName}</h4>
                <div className="w-full flex justify-center bg-slate-950 rounded-xl overflow-hidden p-4 max-h-[500px]">
                  {previewFile.fileType === 'Photo' || previewFile.fileType === 'XRay' ? (
                    <img
                      src={`${UPLOADS_URL}${previewFile.filePath}`}
                      alt={previewFile.fileName}
                      className="max-h-[450px] object-contain rounded-lg"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                      <FileDigit className="w-12 h-12 mb-3" />
                      <p className="text-xs">Aperçu non disponible pour les formats non-images.</p>
                      <a
                        href={`${UPLOADS_URL}${previewFile.filePath}`}
                        download
                        className="text-xs text-blue-400 hover:underline font-bold mt-2"
                      >
                        Télécharger pour visualiser
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-white/10 shadow-2xl p-6 flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-md font-bold text-white">Journaliser un Paiement</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <XIcon />
              </button>
            </div>

            <form onSubmit={handleLogPayment} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Montant du versement (DH)</label>
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  value={logPaymentAmount}
                  onChange={(e) => setLogPaymentAmount(e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm glass-input"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Mode de paiement</label>
                <select
                  value={logPaymentMethod}
                  onChange={(e: any) => setLogPaymentMethod(e.target.value)}
                  className="h-11 px-3 rounded-xl border border-white/5 bg-slate-950 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="espèces">Espèces</option>
                  <option value="chèque">Chèque</option>
                  <option value="carte">Carte Bancaire</option>
                  <option value="virement">Virement</option>
                  <option value="traites">Traites / Échéances</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Notes / Observations</label>
                <input
                  type="text"
                  placeholder="ex: Reçu acompte..."
                  value={logPaymentNotes}
                  onChange={(e) => setLogPaymentNotes(e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm glass-input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/5 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all cursor-pointer"
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
