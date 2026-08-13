import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, Save, UploadCloud, Database, Download, CheckCircle2 } from 'lucide-react';
import { ClinicConfig } from '../types';

export const Settings: React.FC = () => {
  const { token, isAdmin } = useAuth();
  
  const [config, setConfig] = useState<ClinicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Backup files upload trigger
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [backupStatus, setBackupStatus] = useState<any>(null);
  const [runningBackup, setRunningBackup] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchClinicConfig();
    fetchBackupStatus();
  }, []);

  const fetchBackupStatus = () => {
    fetch(`${API_URL}/backup/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setBackupStatus(data))
      .catch((err) => console.error('Error loading backup status:', err));
  };

  const handleRunManualBackup = async () => {
    setRunningBackup(true);
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/backup/run-now`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage('Sauvegarde manuelle effectuée avec succès !');
        fetchBackupStatus();
        setTimeout(() => setMessage(''), 4000);
      } else {
        alert(data.message || 'Échec de la sauvegarde.');
      }
    } catch (err: any) {
      alert(`Erreur : ${err.message}`);
    } finally {
      setRunningBackup(false);
    }
  };

  const fetchClinicConfig = () => {
    setLoading(true);
    fetch(`${API_URL}/clinic/config`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch((err) => console.error('Error loading config:', err))
      .finally(() => setLoading(false));
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setSaving(true);
    setMessage('');

    fetch(`${API_URL}/clinic/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(config),
    })
      .then((res) => res.json())
      .then((data) => {
        setConfig(data);
        setMessage('Configuration enregistrée avec succès.');
        // Clear message after 3 seconds
        setTimeout(() => setMessage(''), 3000);
      })
      .catch((err) => console.error('Error saving config:', err))
      .finally(() => setSaving(false));
  };

  const handleFieldChange = (field: string, value: any) => {
    if (config) {
      setConfig({ ...config, [field]: value });
    }
  };

  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'logo' | 'stamp' | 'signature') => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append(fieldName, file);

    try {
      const res = await fetch(`${API_URL}/clinic/config/upload-asset`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error('Asset upload failed');
      const data = await res.json();
      setConfig(data);
      setMessage(`Image (${fieldName}) mise à jour.`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error uploading asset:', err);
    }
  };

  const handleBackupExport = () => {
    // Trigger direct file download
    window.open(`${API_URL}/backup/export?token=${token}`, '_blank');
  };

  const handleBackupImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupFile) return;

    if (!confirm('Attention ! Importer cette sauvegarde écrasera TOUTES les données actuelles de la base de données. Continuer ?')) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('file', backupFile);

    try {
      const res = await fetch(`${API_URL}/backup/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Import failed');

      setMessage('Base de données restaurée avec succès ! Rechargez l\'application.');
      setBackupFile(null);
    } catch (err: any) {
      alert(err.message || 'Une erreur est survenue lors de l\'importation.');
    } finally {
      setImporting(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 flex flex-col gap-6 overflow-y-auto no-scrollbar max-h-[calc(100vh-80px)] select-none">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Configuration de la Clinique</h2>
        <p className="text-xs text-slate-400 mt-1">Configurez les en-têtes d'impression, les mutuelles, et gérez vos sauvegardes.</p>
      </div>

      {message && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4.5 h-4.5" />
          <span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Columns: Config Form Fields */}
        <form onSubmit={handleSaveConfig} className="lg:col-span-2 rounded-3xl bg-slate-900/40 border border-white/5 p-6 shadow-2xl flex flex-col gap-6">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Identité du Cabinet</h3>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow shadow-blue-500/10 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer</span>
            </button>
          </div>

          <div className="flex flex-col gap-5">
            {/* FR & AR Name input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 pl-0.5">Nom du Cabinet (FR)</label>
                <input
                  type="text"
                  value={config.cabinetFr}
                  onChange={(e) => handleFieldChange('cabinetFr', e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm glass-input"
                />
              </div>

              <div className="flex flex-col gap-1.5 text-right">
                <label className="text-xs font-semibold text-slate-400 pr-0.5">Nom du Cabinet (AR)</label>
                <input
                  type="text"
                  value={config.cabinetAr}
                  onChange={(e) => handleFieldChange('cabinetAr', e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm glass-input text-right"
                  dir="rtl"
                />
              </div>
            </div>

            {/* FR & AR Doctor titles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 pl-0.5">Nom du Praticien & Titre (FR)</label>
                <input
                  type="text"
                  value={config.drFr}
                  onChange={(e) => handleFieldChange('drFr', e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm glass-input"
                />
              </div>

              <div className="flex flex-col gap-1.5 text-right">
                <label className="text-xs font-semibold text-slate-400 pr-0.5">Nom du Praticien & Titre (AR)</label>
                <input
                  type="text"
                  value={config.drAr}
                  onChange={(e) => handleFieldChange('drAr', e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm glass-input text-right"
                  dir="rtl"
                />
              </div>
            </div>

            {/* FR & AR Specialties Textarea */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 pl-0.5">Spécialités (FR) - retours à la ligne</label>
                <textarea
                  rows={3}
                  value={config.specsFr}
                  onChange={(e) => handleFieldChange('specsFr', e.target.value)}
                  className="p-4 rounded-xl text-xs glass-input resize-none"
                ></textarea>
              </div>

              <div className="flex flex-col gap-1.5 text-right">
                <label className="text-xs font-semibold text-slate-400 pr-0.5">Spécialités (AR)</label>
                <textarea
                  rows={3}
                  value={config.specsAr}
                  onChange={(e) => handleFieldChange('specsAr', e.target.value)}
                  className="p-4 rounded-xl text-xs glass-input resize-none text-right"
                  dir="rtl"
                ></textarea>
              </div>
            </div>

            {/* Address, phones and email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 pl-0.5">Adresse Physique du Cabinet</label>
              <input
                type="text"
                value={config.address}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                className="h-11 px-4 rounded-xl text-sm glass-input"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 pl-0.5">Téléphones</label>
                <input
                  type="text"
                  value={config.phones}
                  onChange={(e) => handleFieldChange('phones', e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm glass-input"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 pl-0.5">Email du cabinet</label>
                <input
                  type="email"
                  value={config.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm glass-input"
                />
              </div>
            </div>

            {/* Tax IDs / ICE / IF */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/5 pt-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 pl-0.5">ICE</label>
                <input
                  type="text"
                  value={config.ice || ''}
                  onChange={(e) => handleFieldChange('ice', e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm glass-input"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 pl-0.5">INBE</label>
                <input
                  type="text"
                  value={config.inbe || ''}
                  onChange={(e) => handleFieldChange('inbe', e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm glass-input"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 pl-0.5">IF (Identifiant Fiscal)</label>
                <input
                  type="text"
                  value={config.ifVal || ''}
                  onChange={(e) => handleFieldChange('ifVal', e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm glass-input"
                />
              </div>
            </div>

          </div>
        </form>

        {/* Right Column: Upload Assets & Backups */}
        <div className="flex flex-col gap-6">
          
          {/* Static image uploads (Logo, Signature, Stamp) */}
          <div className="rounded-3xl bg-slate-900/40 border border-white/5 p-6 shadow-2xl flex flex-col gap-4">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest border-b border-white/5 pb-3">Images Imprimées (A4)</h3>
            
            {/* Logo */}
            <div className="flex justify-between items-center gap-4 py-2 border-b border-white/5">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Logo du cabinet</span>
                <span className="text-[10px] text-slate-500 font-medium">Recommandé : PNG transparent</span>
              </div>
              <div className="relative">
                <button type="button" className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white cursor-pointer transition-all">
                  <UploadCloud className="w-5 h-5" />
                </button>
                <input
                  type="file"
                  onChange={(e) => handleAssetUpload(e, 'logo')}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
              </div>
            </div>

            {/* Stamp */}
            <div className="flex justify-between items-center gap-4 py-2 border-b border-white/5">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Cachet du praticien</span>
                <span className="text-[10px] text-slate-500 font-medium">Affiché sur les factures imprimées</span>
              </div>
              <div className="relative">
                <button type="button" className="p-2 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white cursor-pointer transition-all">
                  <UploadCloud className="w-5 h-5" />
                </button>
                <input
                  type="file"
                  onChange={(e) => handleAssetUpload(e, 'stamp')}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Backup Database Manager */}
          {isAdmin && (
            <div className="rounded-3xl bg-slate-900/40 border border-white/5 p-6 shadow-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Sauvegardes & Résilience</h3>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Auto (23h00)
                </span>
              </div>

              {/* Automatic Backup Status Card */}
              <div className="p-3.5 bg-slate-950/40 border border-white/5 rounded-2xl flex flex-col gap-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Dernière sauvegarde :</span>
                  <span className="font-semibold text-white font-mono text-[11px]">
                    {backupStatus?.lastBackupDate
                      ? new Date(backupStatus.lastBackupDate).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
                      : 'Initialisation...'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Points de restauration :</span>
                  <span className="text-blue-400 font-bold text-[11px]">
                    {backupStatus?.totalBackupsCount || 0} sauvegardes (30j)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleRunManualBackup}
                  disabled={runningBackup}
                  className="mt-1 w-full py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {runningBackup ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Sauvegarde en cours...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-3.5 h-3.5 text-blue-400" />
                      <span>Sauvegarder Maintenant</span>
                    </>
                  )}
                </button>
              </div>

              {/* Power Recovery Notification */}
              <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl text-[11px] text-amber-300/80 leading-relaxed">
                ⚡ <strong className="text-amber-200">Tolérance aux coupures :</strong> En cas de coupure de courant, l'application et la base de données redémarrent automatiquement dès que le PC s'allume.
              </div>
              
              <div className="flex flex-col gap-3.5 mt-1">
                <button
                  type="button"
                  onClick={handleBackupExport}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Database className="w-4.5 h-4.5 text-blue-400" />
                    <span className="text-xs font-bold">Exporter Archive JSON</span>
                  </div>
                  <Download className="w-4 h-4 text-slate-500" />
                </button>

                <form onSubmit={handleBackupImport} className="flex flex-col gap-3 border-t border-white/5 pt-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Importer une base (.json)</label>
                  <div className="relative border border-dashed border-white/10 hover:border-blue-500/50 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-950/20">
                    <UploadCloud className="w-6 h-6 text-slate-500" />
                    <span className="text-[10px] text-slate-400 font-semibold text-center">
                      {backupFile ? backupFile.name : 'Sélectionner le fichier JSON'}
                    </span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => e.target.files?.[0] && setBackupFile(e.target.files[0])}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                  {backupFile && (
                    <button
                      type="submit"
                      disabled={importing}
                      className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-xxs text-white transition-all cursor-pointer shadow-lg shadow-rose-600/10"
                    >
                      {importing ? 'Restauration...' : 'Écraser & Restaurer la Base'}
                    </button>
                  )}
                </form>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
