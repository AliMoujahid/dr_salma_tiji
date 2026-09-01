import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Trash2, Printer, RefreshCw, Eye, ClipboardCopy, MessageSquare, Send } from 'lucide-react';
import { Invoice, Patient, ClinicConfig } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { InvoicePrintLayout } from '../components/InvoicePrintLayout';
import { SearchablePatientSelect } from '../components/SearchablePatientSelect';

export const InvoiceEditor: React.FC = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const location = useLocation();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [config, setConfig] = useState<ClinicConfig | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');
  const [loading, setLoading] = useState(true);

  // Editor states
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [discount, setDiscount] = useState('0');
  const [paymentMode, setPaymentMode] = useState<'espèces' | 'chèque' | 'carte' | 'virement' | 'traites'>('espèces');
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Partially Paid' | 'Unpaid'>('Unpaid');
  const [paidAmount, setPaidAmount] = useState('0');
  const [lineItems, setLineItems] = useState<any[]>([
    { date: '', tooth: '', description: '', amount: 0 },
  ]);

  // Edit / Duplicate ID target
  const [editInvoiceId, setEditInvoiceId] = useState<string | null>(null);
  const [printInvoiceData, setPrintInvoiceData] = useState<Invoice | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchInvoices();
    fetchPatients();
    fetchClinicConfig();
  }, []);

  // Listen to navigation state from other pages (e.g. from PatientProfile "Facturer" trigger)
  useEffect(() => {
    if (location.state) {
      const stateObj = location.state as any;
      if (stateObj.patientId) {
        handleNewInvoice(stateObj.patientId);
      }
      if (stateObj.printInvoiceId) {
        handlePrintOnly(stateObj.printInvoiceId);
      }
    }
  }, [location]);

  const fetchInvoices = () => {
    setLoading(true);
    fetch(`${API_URL}/invoices?limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setInvoices(data.invoices || []))
      .catch((err) => console.error('Error fetching invoices:', err))
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
      .catch((err) => console.error('Error fetching clinic configurations:', err));
  };

  const handleNewInvoice = (preSelectedPatientId = '') => {
    setEditInvoiceId(null);
    setSelectedPatientId(preSelectedPatientId || patients[0]?._id || '');
    setInvoiceNumber('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setDiscount('0');
    setPaymentMode('espèces');
    setPaymentStatus('Unpaid');
    setPaidAmount('0');
    
    // Set standard today date formatted as DD/MM
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    
    setLineItems([{ date: `${day}/${month}`, tooth: '', description: '', amount: 0 }]);
    setViewMode('edit');
  };

  const handleEditInvoice = (inv: Invoice) => {
    setEditInvoiceId(inv._id);
    setSelectedPatientId(inv.patientId?._id || (inv.patientId as any) || '');
    setInvoiceNumber(inv.invoiceNumber);
    setInvoiceDate(inv.date ? inv.date.split('T')[0] : '');
    setDiscount(inv.discount.toString());
    setPaymentMode(inv.paymentMode);
    setPaymentStatus(inv.paymentStatus as any);
    setPaidAmount(inv.paidAmount.toString());
    setLineItems(inv.items.map((it) => ({ ...it })));
    setViewMode('edit');
  };

  const handleDuplicateInvoice = (inv: Invoice) => {
    setEditInvoiceId(null); // Force creation on save
    setSelectedPatientId(inv.patientId?._id || (inv.patientId as any) || '');
    setInvoiceNumber(''); // Generate fresh number
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setDiscount(inv.discount.toString());
    setPaymentMode(inv.paymentMode);
    setPaymentStatus('Unpaid');
    setPaidAmount('0');
    setLineItems(inv.items.map((it) => ({ ...it })));
    setViewMode('edit');
  };

  const handleAddLineItem = () => {
    const lastItem = lineItems[lineItems.length - 1];
    setLineItems([...lineItems, { date: lastItem?.date || '', tooth: '', description: '', amount: 0 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, idx) => idx !== index));
    }
  };

  const handleLineItemChange = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index][field] = field === 'amount' ? parseFloat(value) || 0 : value;
    setLineItems(updated);
  };

  const calculateGrossTotal = () => {
    return lineItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  };

  const calculateNetToPay = () => {
    return Math.max(0, calculateGrossTotal() - (parseFloat(discount) || 0));
  };

  const handlePrintOnly = (invId: string) => {
    const inv = invoices.find((i) => i._id === invId);
    if (inv) {
      setPrintInvoiceData(inv);
      setTimeout(() => {
        window.print();
      }, 300);
    }
  };

  const handleSendInvoiceWhatsApp = async (inv: Invoice) => {
    try {
      const res = await fetch(`${API_URL}/notifications/send-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          invoiceId: inv._id,
          patientId: inv.patientId?._id || (inv.patientId as any),
          channel: 'WhatsApp',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Échec de l\'envoi');

      toast.success(
        'Facture transmise !',
        `La facture N° ${inv.invoiceNumber} a été envoyée avec succès au patient par WhatsApp.`
      );
    } catch (err: any) {
      console.error('Error sending invoice via WhatsApp:', err);
      toast.error('Erreur', err.message || 'Impossible d\'envoyer la facture.');
    }
  };

  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    const payload = {
      patientId: selectedPatientId,
      date: invoiceDate,
      items: lineItems.filter((it) => it.description && it.amount > 0),
      discount: parseFloat(discount) || 0,
      paymentMode,
      paymentStatus,
      paidAmount: paymentStatus === 'Paid' ? calculateNetToPay() : parseFloat(paidAmount) || 0,
    };

    const method = editInvoiceId ? 'PUT' : 'POST';
    const url = editInvoiceId ? `${API_URL}/invoices/${editInvoiceId}` : `${API_URL}/invoices`;

    fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then(() => {
        setViewMode('list');
        fetchInvoices();
      })
      .catch((err) => console.error('Error saving invoice:', err));
  };

  // Pre-load print target data for offscreen print template
  const getSelectedPatientName = () => {
    const pat = patients.find((p) => p._id === selectedPatientId);
    return pat ? pat.name : '.........';
  };

  const dummyPrintInvoice: Invoice = {
    _id: editInvoiceId || 'TEMP',
    invoiceNumber: invoiceNumber || 'FACT-TEMP',
    patientId: { name: getSelectedPatientName() } as Patient,
    date: invoiceDate,
    items: lineItems.filter((it) => it.description),
    totalAmount: calculateGrossTotal(),
    discount: parseFloat(discount) || 0,
    netAmount: calculateNetToPay(),
    paymentMode,
    paymentStatus,
    paidAmount: parseFloat(paidAmount) || 0,
    createdBy: { name: 'Dr. Salma Tijini' } as any,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="flex-1 p-8 flex flex-col gap-6 overflow-y-auto no-scrollbar max-h-[calc(100vh-80px)] select-none print:block print:p-0 print:max-h-none print:overflow-visible">
      
      {/* Offscreen Print Component */}
      <div className="hidden print:block">
        {config && (printInvoiceData ? (
          <InvoicePrintLayout invoice={printInvoiceData} config={config} />
        ) : (
          <InvoicePrintLayout invoice={dummyPrintInvoice} config={config} />
        ))}
      </div>

      {/* Screen Views */}
      <div className="print:hidden flex flex-col gap-6">
        
        {/* LIST VIEW */}
        {viewMode === 'list' && (
          <>
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Factures & Honoraires</h2>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">Créez et imprimez des factures détaillées pour vos patients.</p>
              </div>
              <button
                onClick={() => handleNewInvoice()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white transition-all shadow-md shadow-blue-600/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Créer une Facture</span>
              </button>
            </div>

            {loading ? (
              <div className="py-20 flex justify-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : invoices.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <ClipboardCopy className="w-12 h-12 text-slate-400" />
                <p className="text-sm font-semibold text-slate-500">Aucune facture émise.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {invoices.map((inv) => (
                  <div
                    key={inv._id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-sm flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-blue-50 text-blue-600 dark:bg-blue-600/10 dark:text-blue-400 rounded-xl border border-blue-200 dark:border-blue-500/15">
                        <FileTextIcon />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white font-mono">FAC-{inv.invoiceNumber}</h4>
                        <p className="text-xxs text-slate-500 dark:text-slate-400 mt-1">
                          Patient : <strong className="text-slate-800 dark:text-slate-200">{inv.patientId?.name || 'Inconnu'}</strong> • Date : {new Date(inv.date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right flex flex-col items-end gap-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">{inv.netAmount.toFixed(2)} DH</span>
                        <span className={`text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                          inv.paymentStatus === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                            : inv.paymentStatus === 'Partially Paid'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                        }`}>
                          {inv.paymentStatus === 'Paid' ? 'Payée' : inv.paymentStatus === 'Partially Paid' ? 'Partiel' : 'Impayée'}
                        </span>
                      </div>

                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all select-none">
                        <button
                          onClick={() => handleEditInvoice(inv)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-all shadow-xs"
                          title="Modifier"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => handleDuplicateInvoice(inv)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-all shadow-xs"
                          title="Dupliquer"
                        >
                          <ClipboardCopy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePrintOnly(inv._id)}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-600/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all cursor-pointer shadow-xs"
                          title="Imprimer A4"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSendInvoiceWhatsApp(inv)}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-600/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer shadow-xs"
                          title="Envoyer la Facture par WhatsApp"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* EDITOR / DUAL LAYOUT VIEW */}
        {viewMode === 'edit' && config && (
          <div className="flex flex-col xl:flex-row gap-8 items-start">
            
            {/* Left Side: Invoice Fields Editor */}
            <div className="flex-1 w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 p-6 shadow-sm flex flex-col gap-6">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Éditeur de Facture</h3>
                <button
                  onClick={() => setViewMode('list')}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer shadow-xs"
                >
                  Fermer
                </button>
              </div>

              <form onSubmit={handleSaveInvoice} className="flex flex-col gap-5">
                
                {/* Meta details row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 pl-0.5">Patient *</label>
                    <SearchablePatientSelect
                      patients={patients}
                      selectedId={selectedPatientId}
                      onChange={(id) => setSelectedPatientId(id)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 pl-0.5">N° de Facture (Optionnel)</label>
                    <input
                      type="text"
                      placeholder="Généré automatiquement"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 placeholder-slate-400 shadow-xs"
                      disabled
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 pl-0.5">Date d'émission</label>
                    <input
                      type="date"
                      required
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-xs"
                    />
                  </div>
                </div>

                {/* Grid Line Items Table */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-white/5 pb-2">Soins / Actes Cliniques</span>
                  <div className="max-h-60 overflow-y-auto pr-1 flex flex-col gap-3.5 no-scrollbar">
                    {lineItems.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-3.5 items-center">
                        <input
                          type="text"
                          placeholder="JJ/MM"
                          value={item.date}
                          onChange={(e) => handleLineItemChange(index, 'date', e.target.value)}
                          className="col-span-2 h-10 px-3 rounded-xl text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-center placeholder-slate-400 shadow-xs focus:outline-none focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Dent"
                          value={item.tooth}
                          onChange={(e) => handleLineItemChange(index, 'tooth', e.target.value)}
                          className="col-span-2 h-10 px-3 rounded-xl text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-center placeholder-slate-400 shadow-xs focus:outline-none focus:border-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Description de l'acte"
                          value={item.description}
                          onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                          className="col-span-5 h-10 px-4 rounded-xl text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 shadow-xs focus:outline-none focus:border-blue-500"
                        />
                        <input
                          type="number"
                          placeholder="Montant"
                          value={item.amount || ''}
                          onChange={(e) => handleLineItemChange(index, 'amount', e.target.value)}
                          className="col-span-2 h-10 px-3 rounded-xl text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-right font-mono shadow-xs focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(index)}
                          className="col-span-1 p-2 rounded-lg bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/10 hover:border-transparent transition-all flex items-center justify-center cursor-pointer shadow-xs"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="self-start mt-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    + Ajouter une ligne
                  </button>
                </div>

                {/* Summaries bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 dark:border-white/5 pt-5 mt-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-xxs font-semibold text-slate-500 dark:text-slate-400 uppercase">Total Brut</span>
                    <span className="text-md font-bold text-slate-900 dark:text-white font-mono">{calculateGrossTotal().toFixed(2)} DH</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xxs font-semibold text-slate-500 dark:text-slate-400 uppercase">Remise (DH)</label>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="h-9 px-3 rounded-xl text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white max-w-[130px] font-mono shadow-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xxs font-semibold text-slate-400 uppercase">Net à payer</span>
                    <span className="text-md font-extrabold text-blue-400 font-mono">{calculateNetToPay().toFixed(2)} DH</span>
                  </div>
                </div>

                {/* Payment Configuration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-5 mt-1">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400">Mode de Paiement</label>
                    <select
                      value={paymentMode}
                      onChange={(e: any) => setPaymentMode(e.target.value)}
                      className="h-11 px-3 rounded-xl border border-white/5 bg-slate-950 text-sm text-white focus:outline-none"
                    >
                      <option value="espèces">Espèces</option>
                      <option value="chèque">Chèque</option>
                      <option value="carte">Carte Bancaire</option>
                      <option value="virement">Virement</option>
                      <option value="traites">Traites / Échéances</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400">Statut Financier</label>
                    <select
                      value={paymentStatus}
                      onChange={(e: any) => setPaymentStatus(e.target.value)}
                      className="h-11 px-3 rounded-xl border border-white/5 bg-slate-950 text-sm text-white focus:outline-none"
                    >
                      <option value="Unpaid">Non Payée</option>
                      <option value="Partially Paid">Partiellement Payée</option>
                      <option value="Paid">Payée Intégralement</option>
                    </select>
                  </div>
                </div>

                {/* Save and Print triggers */}
                <div className="flex justify-end gap-3.5 border-t border-slate-100 dark:border-white/5 pt-5 mt-4 select-none flex-wrap">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs text-white transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                  >
                    Enregistrer la Facture
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white transition-all shadow-md shadow-blue-600/20 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimer (A4)</span>
                  </button>
                  {editInvoiceId && (
                    <button
                      type="button"
                      onClick={() => {
                        const inv = invoices.find((i) => i._id === editInvoiceId);
                        if (inv) handleSendInvoiceWhatsApp(inv);
                      }}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 font-semibold text-xs text-white transition-all shadow-md shadow-emerald-700/20 cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Envoyer par WhatsApp</span>
                    </button>
                  )}
                </div>

              </form>
            </div>

            {/* Right Side: Scaled Live A4 Print Preview Card */}
            <div className="w-[500px] shrink-0 border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col gap-3.5 p-4 bg-slate-950/20 sticky top-4 select-none">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest pl-1">Aperçu Avant Impression (A4)</h4>
              <div className="w-[466px] h-[650px] relative rounded-2xl overflow-y-auto no-scrollbar border border-white/10 bg-white">
                
                {/* Scale the InvoicePrintLayout inside preview card */}
                <div className="origin-top-left scale-[0.58] absolute top-0 left-0 w-[794px]">
                  <InvoicePrintLayout invoice={dummyPrintInvoice} config={config} />
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
      
    </div>
  );
};

const FileTextIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"></path>
  </svg>
);
