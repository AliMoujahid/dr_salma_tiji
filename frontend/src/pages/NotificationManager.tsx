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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NotificationLog, MessageTemplate, NotificationSettings, Patient } from '../types';

export const NotificationManager: React.FC = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'Logs' | 'Templates' | 'Send' | 'Settings' | 'FollowUp'>('Logs');

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

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchLogs();
    fetchTemplates();
    fetchSettings();
    fetchPatients();
  }, [token]);

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

  const fetchPatients = () => {
    fetch(`${API_URL}/patients`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setPatients(data); })
      .catch((err) => console.error('Error fetching patients:', err));
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    fetch(`${API_URL}/notifications/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(settings),
    })
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        alert('Paramètres de notification enregistrés !');
      })
      .catch((err) => console.error('Error saving settings:', err));
  };

  const handleSendBulk = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPatients.length === 0) return alert('Veuillez sélectionner au moins un patient.');

    setBroadcasting(true);
    fetch(`${API_URL}/notifications/send-bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        patientIds: selectedPatients,
        channel: sendChannel,
        subject: sendSubject,
        body: sendBody,
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        alert(res.message || 'Diffusion envoyée !');
        fetchLogs();
        setSelectedPatients([]);
      })
      .catch((err) => console.error('Error sending bulk message:', err))
      .finally(() => setBroadcasting(false));
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
    <div className="p-6 md:p-8 space-y-6 text-white font-sans">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-white">Centre de Notifications & Rappels IA</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestion automatisée multi-canal (WhatsApp, SMS, SMTP, In-App) avec confirmation interactive.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-white/10 no-scrollbar overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('Logs')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'Logs' ? 'border-blue-500 text-blue-400 bg-white/5' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" /> Journal & Historique
        </button>
        <button
          onClick={() => setActiveTab('Send')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'Send' ? 'border-blue-500 text-blue-400 bg-white/5' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Send className="w-4 h-4" /> Envoi Manuel / Broadcast
        </button>
        <button
          onClick={() => setActiveTab('Templates')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'Templates' ? 'border-blue-500 text-blue-400 bg-white/5' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" /> Modèles de Messages
        </button>
        <button
          onClick={() => setActiveTab('Settings')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'Settings' ? 'border-blue-500 text-blue-400 bg-white/5' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" /> Configuration APIs & Canaux
        </button>
      </div>

      {/* TAB 1: LOGS & HISTORY */}
      {activeTab === 'Logs' && (
        <div className="flex flex-col gap-4">
          
          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-64">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Rechercher patient, tel, corps..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
                  className="w-full h-10 pl-9 pr-4 rounded-xl text-xs glass-input"
                />
              </div>

              <select
                value={logFilterChannel}
                onChange={(e) => setLogFilterChannel(e.target.value)}
                className="h-10 px-3 rounded-xl border border-white/10 bg-slate-950 text-xs text-white"
              >
                <option value="">Tous les canaux</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="SMS">SMS</option>
                <option value="Email">Email</option>
              </select>

              <select
                value={logFilterStatus}
                onChange={(e) => setLogFilterStatus(e.target.value)}
                className="h-10 px-3 rounded-xl border border-white/10 bg-slate-950 text-xs text-white"
              >
                <option value="">Tous les états</option>
                <option value="Sent">Envoyé</option>
                <option value="Delivered">Délivré</option>
                <option value="Failed">Échec</option>
              </select>

              <button
                onClick={fetchLogs}
                className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white cursor-pointer"
              >
                Filtrer
              </button>
            </div>

            <button
              onClick={fetchLogs}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Logs Table */}
          <div className="rounded-2xl bg-slate-900/60 border border-white/5 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-bold border-b border-white/5">
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
                <tbody className="divide-y divide-white/5">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        Aucune notification trouvée.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log._id} className="hover:bg-white/3 transition-all">
                        <td className="p-4 font-bold text-white">
                          {log.patientId?.name || log.recipient}
                          <span className="block text-xxs font-normal text-slate-400">{log.recipient}</span>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-xxs font-semibold">
                            {log.channel === 'WhatsApp' && <MessageSquare className="w-3 h-3 text-emerald-400" />}
                            {log.channel === 'SMS' && <Smartphone className="w-3 h-3 text-blue-400" />}
                            {log.channel === 'Email' && <Mail className="w-3 h-3 text-amber-400" />}
                            {log.provider}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-indigo-400">{log.messageType}</td>
                        <td className="p-4 max-w-xs truncate text-slate-300">{log.body}</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xxs font-bold ${
                              log.status === 'Sent' || log.status === 'Delivered'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="p-4 text-slate-400 text-xxs font-mono">
                          {new Date(log.createdAt).toLocaleString('fr-FR')}
                        </td>
                        <td className="p-4 text-right">
                          {log.status === 'Failed' && (
                            <button
                              onClick={() => handleRetry(log._id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xxs font-bold cursor-pointer"
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

      {/* TAB 2: MANUAL & BULK SENDER */}
      {activeTab === 'Send' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Form */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-white/5 flex flex-col gap-5">
            <h3 className="text-base font-bold text-white border-b border-white/5 pb-3">Envoyer un Message / Diffusion</h3>
            
            <form onSubmit={handleSendBulk} className="flex flex-col gap-4">
              
              {/* Channel Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Canal de Transmission</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setSendChannel('WhatsApp')}
                    className={`h-11 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold cursor-pointer ${
                      sendChannel === 'WhatsApp' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-white/5 border-white/5 text-slate-400'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" /> WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendChannel('SMS')}
                    className={`h-11 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold cursor-pointer ${
                      sendChannel === 'SMS' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/5 text-slate-400'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" /> SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendChannel('Email')}
                    className={`h-11 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold cursor-pointer ${
                      sendChannel === 'Email' ? 'bg-amber-600 border-amber-500 text-white' : 'bg-white/5 border-white/5 text-slate-400'
                    }`}
                  >
                    <Mail className="w-4 h-4" /> Email SMTP
                  </button>
                </div>
              </div>

              {/* Subject (for Email) */}
              {sendChannel === 'Email' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Sujet de l'Email</label>
                  <input
                    type="text"
                    placeholder="Sujet de la communication..."
                    value={sendSubject}
                    onChange={(e) => setSendSubject(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl text-xs glass-input"
                  />
                </div>
              )}

              {/* Message Body */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Corps du Message (Variables disponibles: {"{{patient_name}}"})</label>
                <textarea
                  rows={6}
                  placeholder="Bonjour {{patient_name}}, nous vous rappelons votre consultation..."
                  value={sendBody}
                  onChange={(e) => setSendBody(e.target.value)}
                  className="w-full p-4 rounded-xl text-xs glass-input resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={broadcasting}
                className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white transition-all shadow-lg shadow-blue-600/20 cursor-pointer"
              >
                {broadcasting ? 'Diffusion en cours...' : `Envoyer à ${selectedPatients.length} patient(s)`}
              </button>
            </form>
          </div>

          {/* Right Patient Picker */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/5 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h4 className="text-sm font-bold text-white">Sélectionner Patients ({selectedPatients.length})</h4>
              <button
                onClick={() => setSelectedPatients(patients.map((p) => p._id))}
                className="text-xxs font-bold text-blue-400 hover:underline cursor-pointer"
              >
                Tous Sélectionner
              </button>
            </div>

            <div className="flex-1 max-h-96 overflow-y-auto no-scrollbar flex flex-col gap-2">
              {patients.map((p) => {
                const isSelected = selectedPatients.includes(p._id);
                return (
                  <div
                    key={p._id}
                    onClick={() => {
                      if (isSelected) setSelectedPatients(selectedPatients.filter((id) => id !== p._id));
                      else setSelectedPatients([...selectedPatients, p._id]);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                      isSelected ? 'bg-blue-600/20 border-blue-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div>
                      <h5 className="text-xs font-bold text-slate-200">{p.name}</h5>
                      <span className="text-xxs text-slate-400">{p.phone}</span>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: SETTINGS & APIS */}
      {activeTab === 'Settings' && (
        <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* WhatsApp Config */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
              <MessageSquare className="w-4 h-4 text-emerald-400" /> WhatsApp Cloud API & Twilio
            </h3>

            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-300 font-semibold">Activer WhatsApp</span>
              <input
                type="checkbox"
                checked={settings.enableWhatsApp}
                onChange={(e) => setSettings({ ...settings, enableWhatsApp: e.target.checked })}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xxs font-semibold text-slate-400 mb-1">Provider WhatsApp</label>
              <select
                value={settings.whatsAppProvider || 'MetaCloud'}
                onChange={(e) => setSettings({ ...settings, whatsAppProvider: e.target.value as any })}
                className="w-full h-10 px-3 rounded-xl border border-white/10 bg-slate-950 text-xs text-white"
              >
                <option value="MetaCloud">Meta WhatsApp Business Cloud API</option>
                <option value="TwilioWhatsApp">Twilio WhatsApp API</option>
              </select>
            </div>

            <div>
              <label className="block text-xxs font-semibold text-slate-400 mb-1">Meta Access Token</label>
              <input
                type="password"
                placeholder="EAA..."
                value={settings.metaCloud?.accessToken || ''}
                onChange={(e) => setSettings({ ...settings, metaCloud: { ...settings.metaCloud, accessToken: e.target.value } as any })}
                className="w-full h-10 px-3 rounded-xl text-xs glass-input"
              />
            </div>

            <div>
              <label className="block text-xxs font-semibold text-slate-400 mb-1">Phone Number ID</label>
              <input
                type="text"
                placeholder="10059..."
                value={settings.metaCloud?.phoneNumberId || ''}
                onChange={(e) => setSettings({ ...settings, metaCloud: { ...settings.metaCloud, phoneNumberId: e.target.value } as any })}
                className="w-full h-10 px-3 rounded-xl text-xs glass-input"
              />
            </div>
          </div>

          {/* SMTP Config */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
              <Mail className="w-4 h-4 text-amber-400" /> Configuration Serveur SMTP Email
            </h3>

            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-300 font-semibold">Activer Email</span>
              <input
                type="checkbox"
                checked={settings.enableEmail}
                onChange={(e) => setSettings({ ...settings, enableEmail: e.target.checked })}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xxs font-semibold text-slate-400 mb-1">Hôte SMTP</label>
                <input
                  type="text"
                  value={settings.smtp?.host || ''}
                  onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp, host: e.target.value } as any })}
                  className="w-full h-10 px-3 rounded-xl text-xs glass-input"
                />
              </div>
              <div>
                <label className="block text-xxs font-semibold text-slate-400 mb-1">Port</label>
                <input
                  type="number"
                  value={settings.smtp?.port || 587}
                  onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp, port: Number(e.target.value) } as any })}
                  className="w-full h-10 px-3 rounded-xl text-xs glass-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-xxs font-semibold text-slate-400 mb-1">Utilisateur SMTP / Email</label>
              <input
                type="text"
                value={settings.smtp?.username || ''}
                onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp, username: e.target.value } as any })}
                className="w-full h-10 px-3 rounded-xl text-xs glass-input"
              />
            </div>

            <div>
              <label className="block text-xxs font-semibold text-slate-400 mb-1">Mot de passe SMTP</label>
              <input
                type="password"
                value={settings.smtp?.password || ''}
                onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp, password: e.target.value } as any })}
                className="w-full h-10 px-3 rounded-xl text-xs glass-input"
              />
            </div>

            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white transition-all shadow-lg shadow-blue-600/20 cursor-pointer mt-2"
            >
              Enregistrer tous les paramètres API
            </button>
          </div>

        </form>
      )}

    </div>
  );
};
