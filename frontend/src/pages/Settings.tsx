import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Settings as SettingsIcon, Save, UploadCloud, Database, Download, CheckCircle2, User, Camera, Key, Lock, Clock, RefreshCw } from 'lucide-react';
import { ClinicConfig } from '../types';

export const Settings: React.FC = () => {
  const { user, token, isAdmin, updateUser } = useAuth();
  const { toast, confirm } = useToast();
  
  const [config, setConfig] = useState<ClinicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // User Profile State
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profileRole, setProfileRole] = useState(user?.role || 'DOCTOR');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(user?.avatarUrl || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  // Backup files upload trigger
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [backupStatus, setBackupStatus] = useState<any>(null);
  const [runningBackup, setRunningBackup] = useState(false);

  // Professional Audit Logs history state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchClinicConfig();
    fetchBackupStatus();
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setProfileEmail(user.email);
      setProfileRole(user.role);
      setProfileAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  const getAvatarDisplaySrc = (avatarUrl?: string, name?: string) => {
    if (!avatarUrl) {
      return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'User')}`;
    }
    if (avatarUrl.startsWith('/uploads')) {
      const baseUrl = API_URL.replace('/api', '');
      return `${baseUrl}${avatarUrl}`;
    }
    return avatarUrl;
  };

  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('avatar', file);

    setUploadingAvatar(true);
    setProfileMessage('');

    try {
      const res = await fetch(`${API_URL}/auth/upload-avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Échec de l\'envoi de la photo');

      setProfileAvatarUrl(data.avatarUrl);
      updateUser({ avatarUrl: data.avatarUrl });
      toast.success('Photo mise à jour', 'Votre photo de profil a été mise à jour avec succès.');
    } catch (err: any) {
      toast.error('Erreur', err.message || 'Échec de l\'envoi de la photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          role: profileRole,
          avatarUrl: profileAvatarUrl,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur lors de la mise à jour');

      updateUser({
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        avatarUrl: data.user.avatarUrl,
      });

      setCurrentPassword('');
      setNewPassword('');
      toast.success('Profil mis à jour', 'Vos informations de profil ont été enregistrées.');
    } catch (err: any) {
      toast.error('Erreur', err.message || 'Impossible de mettre à jour le profil.');
    } finally {
      setSavingProfile(false);
    }
  };

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
    try {
      const res = await fetch(`${API_URL}/backup/run-now`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Sauvegarde créée', 'La sauvegarde manuelle a été effectuée avec succès.');
        fetchBackupStatus();
      } else {
        toast.error('Échec de la sauvegarde', data.message || 'Une erreur est survenue lors de la sauvegarde.');
      }
    } catch (err: any) {
      toast.error('Erreur', err.message || 'Impossible de créer la sauvegarde.');
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

    const confirmed = await confirm({
      title: 'Restaurer la base de données ?',
      message: 'Attention ! Importer cette sauvegarde écrasera TOUTES les données actuelles de la base de données. Voulez-vous continuer ?',
      variant: 'danger',
      confirmText: 'Écraser et Restaurer',
      cancelText: 'Annuler',
    });
    if (!confirmed) return;

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

      toast.success('Base de données restaurée', 'La base a été restaurée avec succès !');
      setBackupFile(null);
    } catch (err: any) {
      toast.error('Erreur d\'importation', err.message || 'Une erreur est survenue lors de l\'importation.');
    } finally {
      setImporting(false);
    }
  };

  const fetchAuditLogs = () => {
    if (!isAdmin) return;
    fetch(`${API_URL}/audit-logs`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAuditLogs(data);
      })
      .catch((err) => console.error('Error fetching audit logs:', err));
  };

  const handleRestorePatient = async (logId: string) => {
    const confirmed = await confirm({
      title: 'Restaurer le patient ?',
      message: 'Voulez-vous vraiment restaurer ce patient et toutes ses fiches associées ?',
      variant: 'info',
      confirmText: 'Restaurer',
      cancelText: 'Annuler',
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_URL}/audit-logs/restore/${logId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Restoration failed');
      toast.success('Patient restauré', data.message || 'Le patient a été restauré avec succès !');
      fetchAuditLogs();
    } catch (err: any) {
      toast.error('Erreur', err.message || 'Impossible de restaurer le patient.');
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
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Configuration de la Clinique</h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">Configurez les en-têtes d'impression, les mutuelles, et gérez vos sauvegardes.</p>
      </div>

      {message && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4.5 h-4.5" />
          <span>{message}</span>
        </div>
      )}

      {/* Practitioner Profile & Avatar Management Card */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 p-6 shadow-sm flex flex-col gap-6">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Profil Praticien & Compte</h3>
          </div>
          {profileMessage && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
              {profileMessage}
            </span>
          )}
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Avatar Image Picker */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-24 h-24 rounded-full border-2 border-indigo-500/40 p-1 shadow-lg group bg-slate-800">
              <img
                src={getAvatarDisplaySrc(profileAvatarUrl, profileName)}
                alt={profileName}
                className="w-full h-full object-cover rounded-full"
              />
              <label className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs cursor-pointer">
                <Camera className="w-6 h-6 mb-0.5" />
                <span>Changer</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileUpload}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
              </label>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {uploadingAvatar ? 'Envoi en cours...' : 'Survolez pour modifier'}
            </span>
          </div>

          {/* User Info Form */}
          <form onSubmit={handleSaveProfile} className="flex-1 w-full flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Nom du Praticien</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="ex: Dr. Salma Tijini"
                  className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 shadow-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Rôle / Titre</label>
                  {!isAdmin && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Admin Seul
                    </span>
                  )}
                </div>
                <select
                  value={profileRole}
                  onChange={(e) => setProfileRole(e.target.value as any)}
                  disabled={!isAdmin}
                  className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="DOCTOR">DOCTOR</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="ASSISTANT">ASSISTANT</option>
                  <option value="RECEPTIONIST">RECEPTIONIST</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Email de Connexion</label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 shadow-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">URL / Image d'Avatar (Optionnel)</label>
                <input
                  type="text"
                  value={profileAvatarUrl}
                  onChange={(e) => setProfileAvatarUrl(e.target.value)}
                  placeholder="https://... ou /uploads/..."
                  className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 shadow-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 dark:border-white/5 pt-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Mot de passe actuel (si modification)</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 shadow-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 shadow-xs"
                />
              </div>
            </div>

            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingProfile ? 'Mise à jour...' : 'Mettre à jour mon profil'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Columns: Config Form Fields */}
        <form onSubmit={handleSaveConfig} className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 p-6 shadow-sm flex flex-col gap-6">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Identité du Cabinet</h3>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/20 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Enregistrement...' : 'Enregistrer'}</span>
            </button>
          </div>

          <div className="flex flex-col gap-5">
            {/* FR & AR Name input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 pl-0.5">Nom du Cabinet (FR)</label>
                <input
                  type="text"
                  value={config.cabinetFr}
                  onChange={(e) => handleFieldChange('cabinetFr', e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5 text-right">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 pr-0.5">Nom du Cabinet (AR)</label>
                <input
                  type="text"
                  value={config.cabinetAr}
                  onChange={(e) => handleFieldChange('cabinetAr', e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-right focus:outline-none focus:border-blue-500 shadow-xs"
                  dir="rtl"
                />
              </div>
            </div>

            {/* FR & AR Doctor titles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 pl-0.5">Nom du Praticien & Titre (FR)</label>
                <input
                  type="text"
                  value={config.drFr}
                  onChange={(e) => handleFieldChange('drFr', e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5 text-right">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 pr-0.5">Nom du Praticien & Titre (AR)</label>
                <input
                  type="text"
                  value={config.drAr}
                  onChange={(e) => handleFieldChange('drAr', e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-right focus:outline-none focus:border-blue-500 shadow-xs"
                  dir="rtl"
                />
              </div>
            </div>

            {/* FR & AR Specialties Textarea */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 pl-0.5">Spécialités (FR) - retours à la ligne</label>
                <textarea
                  rows={3}
                  value={config.specsFr}
                  onChange={(e) => handleFieldChange('specsFr', e.target.value)}
                  className="p-4 rounded-xl text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white resize-none focus:outline-none focus:border-blue-500 shadow-xs"
                ></textarea>
              </div>

              <div className="flex flex-col gap-1.5 text-right">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 pr-0.5">Spécialités (AR)</label>
                <textarea
                  rows={3}
                  value={config.specsAr}
                  onChange={(e) => handleFieldChange('specsAr', e.target.value)}
                  className="p-4 rounded-xl text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white resize-none text-right focus:outline-none focus:border-blue-500 shadow-xs"
                  dir="rtl"
                ></textarea>
              </div>
            </div>

            {/* Address, phones and email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 pl-0.5">Adresse Physique du Cabinet</label>
              <input
                type="text"
                value={config.address}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-xs"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 pl-0.5">Téléphones</label>
                <input
                  type="text"
                  value={config.phones}
                  onChange={(e) => handleFieldChange('phones', e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 pl-0.5">Email du cabinet</label>
                <input
                  type="email"
                  value={config.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-xs"
                />
              </div>
            </div>

            {/* Tax IDs / ICE / IF */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 dark:border-white/5 pt-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 pl-0.5">ICE</label>
                <input
                  type="text"
                  value={config.ice || ''}
                  onChange={(e) => handleFieldChange('ice', e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 pl-0.5">INBE</label>
                <input
                  type="text"
                  value={config.inbe || ''}
                  onChange={(e) => handleFieldChange('inbe', e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 pl-0.5">IF (Identifiant Fiscal)</label>
                <input
                  type="text"
                  value={config.ifVal || ''}
                  onChange={(e) => handleFieldChange('ifVal', e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 shadow-xs"
                />
              </div>
            </div>

          </div>
        </form>

        {/* Right Column: Upload Assets & Backups */}
        <div className="flex flex-col gap-6">
          
          {/* Static image uploads (Logo, Signature, Stamp) */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 p-6 shadow-sm flex flex-col gap-4">
            <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-white/5 pb-3">Images Imprimées (A4)</h3>
            
            {/* Logo */}
            <div className="flex justify-between items-center gap-4 py-2 border-b border-slate-100 dark:border-white/5">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Logo du cabinet</span>
                <span className="text-[10px] text-slate-500 font-medium">Recommandé : PNG transparent</span>
              </div>
              <div className="relative">
                <button type="button" className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-all shadow-xs">
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
            <div className="flex justify-between items-center gap-4 py-2 border-b border-slate-100 dark:border-white/5">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Cachet du praticien</span>
                <span className="text-[10px] text-slate-500 font-medium">Affiché sur les factures imprimées</span>
              </div>
              <div className="relative">
                <button type="button" className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-all shadow-xs">
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
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 p-6 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                <h3 className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Sauvegardes & Résilience</h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Auto (23h00)
                </span>
              </div>

              {/* Automatic Backup Status Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-white/5 rounded-xl flex flex-col gap-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Dernière sauvegarde :</span>
                  <span className="font-semibold text-slate-900 dark:text-white font-mono text-[11px]">
                    {backupStatus?.lastBackupDate
                      ? new Date(backupStatus.lastBackupDate).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
                      : 'Initialisation...'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Points de restauration :</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold text-[11px]">
                    {backupStatus?.totalBackupsCount || 0} sauvegardes (30j)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleRunManualBackup}
                  disabled={runningBackup}
                  className="mt-1 w-full py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-600/20 dark:hover:bg-blue-600/30 border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {runningBackup ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Sauvegarde en cours...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Sauvegarder Maintenant</span>
                    </>
                  )}
                </button>
              </div>

              {/* Power Recovery Notification */}
              <div className="p-3.5 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/10 rounded-xl text-[11px] text-amber-800 dark:text-amber-300/80 leading-relaxed">
                ⚡ <strong className="text-amber-900 dark:text-amber-200">Tolérance aux coupures :</strong> En cas de coupure de courant, l'application et la base de données redémarrent automatiquement dès que le PC s'allume.
              </div>
              
              <div className="flex flex-col gap-3.5 mt-1">
                <button
                  type="button"
                  onClick={handleBackupExport}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <Database className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold">Exporter Archive JSON</span>
                  </div>
                  <Download className="w-4 h-4 text-slate-400" />
                </button>

                <form onSubmit={handleBackupImport} className="flex flex-col gap-3 border-t border-slate-100 dark:border-white/5 pt-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Importer une base (.json)</label>
                  <div className="relative border border-dashed border-slate-300 dark:border-white/10 hover:border-blue-500/50 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-950/20">
                    <UploadCloud className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold text-center">
                      {backupFile ? backupFile.name : 'Sélectionner le fichier JSON'}
                    </span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => e.target.files?.[0] && setBackupFile(e.target.files[0])}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  </div>
                  {backupFile && (
                    <button
                      type="submit"
                      disabled={importing}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      {importing ? 'Restauration...' : 'Restaurer la Base'}
                    </button>
                  )}
                </form>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Admin Professional Audit Logs & Soft-delete Restore Card */}
      {isAdmin && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 p-6 shadow-sm flex flex-col gap-4 mt-6">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Historique Professionnel & Restauration
              </h3>
            </div>
            <button
              type="button"
              onClick={fetchAuditLogs}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-white/5">
                <tr>
                  <th className="p-3">Praticien / Utilisateur</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Détails</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Restauration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      Aucune action enregistrée dans l'historique professionnel.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-white/3 transition-all">
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{log.userName}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.action === 'DELETE_PATIENT'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                        }`}>
                          {log.action === 'DELETE_PATIENT' ? 'Suppression Patient' : 'Restauration'}
                        </span>
                      </td>
                      <td className="p-3 max-w-xs truncate">{log.details}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {new Date(log.createdAt).toLocaleString('fr-FR')}
                      </td>
                      <td className="p-3 text-right">
                        {log.action === 'DELETE_PATIENT' && (
                          <button
                            type="button"
                            onClick={() => handleRestorePatient(log._id)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-600/20 dark:hover:bg-indigo-600/30 text-indigo-600 dark:text-indigo-400 text-xxs font-bold cursor-pointer transition-all border border-indigo-200/50"
                          >
                            Restaurer
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
      )}
    </div>
  );
};
