import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, UserPlus, Heart, Trash2, Archive, UserCheck, Eye, Calendar } from 'lucide-react';
import { Patient } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDate, formatBirthDateWithAge, calculateAge } from '../utils/dateUtils';


export const Patients: React.FC = () => {
  const { token } = useAuth();
  const { toast, confirm } = useToast();
  const navigate = useNavigate();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Modal Trigger States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editPatientId, setEditPatientId] = useState<string | null>(null);

  // Form Fields State
  const [name, setName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [bloodType, setBloodType] = useState('O+');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insurancePolicy, setInsurancePolicy] = useState('');
  const [medicalHistoryInput, setMedicalHistoryInput] = useState('');
  const [allergiesInput, setAllergiesInput] = useState('');
  const [medicationsInput, setMedicationsInput] = useState('');
  const [notes, setNotes] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchPatients();
  }, [currentPage, debouncedSearch, showArchived, showFavoritesOnly]);

  const fetchPatients = () => {
    setLoading(true);
    let url = `${API_URL}/patients?page=${currentPage}&limit=8&archived=${showArchived}`;
    if (showFavoritesOnly) url += '&favorite=true';
    if (debouncedSearch.trim()) url += `&search=${encodeURIComponent(debouncedSearch.trim())}`;

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setPatients(data.patients || []);
        setTotal(data.total || 0);
        setPages(data.pages || 1);
      })
      .catch((err) => console.error('Error fetching patients:', err))
      .finally(() => setLoading(false));
  };

  const handleOpenCreateModal = () => {
    setEditPatientId(null);
    setName('');
    setNationalId('');
    setPhone('');
    setEmail('');
    setAddress('');
    setBirthDate('');
    setGender('Male');
    setBloodType('O+');
    setEmergencyName('');
    setEmergencyPhone('');
    setEmergencyRelation('');
    setInsuranceProvider('');
    setInsurancePolicy('');
    setMedicalHistoryInput('');
    setAllergiesInput('');
    setMedicationsInput('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (patient: Patient) => {
    setEditPatientId(patient._id);
    setName(patient.name);
    setNationalId(patient.nationalId || '');
    setPhone(patient.phone);
    setEmail(patient.email || '');
    setAddress(patient.address || '');
    // Format Date string to YYYY-MM-DD
    const dateFormatted = patient.birthDate ? patient.birthDate.split('T')[0] : '';
    setBirthDate(dateFormatted);
    setGender(patient.gender);
    setBloodType(patient.bloodType || 'O+');
    setEmergencyName(patient.emergencyContact?.name || '');
    setEmergencyPhone(patient.emergencyContact?.phone || '');
    setEmergencyRelation(patient.emergencyContact?.relationship || '');
    setInsuranceProvider(patient.insurance?.provider || '');
    setInsurancePolicy(patient.insurance?.policyNumber || '');
    setMedicalHistoryInput(patient.medicalHistory.join(', '));
    setAllergiesInput(patient.allergies.join(', '));
    setMedicationsInput(patient.currentMedications.join(', '));
    setNotes(patient.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmitPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !birthDate) return;

    const payload = {
      name,
      nationalId,
      phone,
      email,
      address,
      birthDate,
      gender,
      bloodType,
      emergencyContact: {
        name: emergencyName,
        phone: emergencyPhone,
        relationship: emergencyRelation,
      },
      insurance: {
        provider: insuranceProvider,
        policyNumber: insurancePolicy,
      },
      medicalHistory: medicalHistoryInput ? medicalHistoryInput.split(',').map((s) => s.trim()) : [],
      allergies: allergiesInput ? allergiesInput.split(',').map((s) => s.trim()) : [],
      currentMedications: medicationsInput ? medicationsInput.split(',').map((s) => s.trim()) : [],
      notes,
    };

    const method = editPatientId ? 'PUT' : 'POST';
    const url = editPatientId ? `${API_URL}/patients/${editPatientId}` : `${API_URL}/patients`;

    fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to save patient');
        return res.json();
      })
      .then(() => {
        setIsModalOpen(false);
        fetchPatients();
      })
      .catch((err) => console.error('Error saving patient:', err));
  };

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    fetch(`${API_URL}/patients/${id}/favorite`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => fetchPatients())
      .catch((err) => console.error('Error in favorite action:', err));
  };

  const handleToggleArchive = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    fetch(`${API_URL}/patients/${id}/archive`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => fetchPatients())
      .catch((err) => console.error('Error in archive action:', err));
  };

  const handleDeletePatient = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: 'Supprimer définitivement ce patient ?',
      message: 'Attention : Toutes les données médicales, interventions et historiques liés à ce patient seront inaccessibles.',
      variant: 'danger',
      confirmText: 'Supprimer définitivement',
      cancelText: 'Annuler',
    });
    if (!confirmed) return;

    fetch(`${API_URL}/patients/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => {
        toast.success('Patient supprimé', 'Le dossier du patient a été supprimé.');
        fetchPatients();
      })
      .catch((err) => {
        console.error('Error deleting patient:', err);
        toast.error('Erreur', 'Impossible de supprimer ce patient.');
      });
  };

  // Helper age calculation
  const calculateAge = (dateStr: string) => {
    if (!dateStr) return 0;
    const birth = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 overflow-y-auto no-scrollbar max-h-[calc(100vh-80px)] select-none">
      
      {/* Title & Add button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Fichier Patients</h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">Créez, modifiez, archivez et explorez les dossiers de vos patients.</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white transition-all shadow-md shadow-blue-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un Patient</span>
        </button>
      </div>

      {/* Search & filters bar */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, téléphone, CNI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl text-sm bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowFavoritesOnly(!showFavoritesOnly);
              setCurrentPage(1);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 ${
              showFavoritesOnly
                ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400'
                : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${showFavoritesOnly ? 'fill-rose-500' : ''}`} />
            <span>Favoris</span>
          </button>
          
          <button
            onClick={() => {
              setShowArchived(!showArchived);
              setCurrentPage(1);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 ${
              showArchived
                ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400'
                : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>Archivés</span>
          </button>
        </div>
      </div>

      {/* Loading & Empty state */}
      {loading ? (
        <div className="flex-1 py-20 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : patients.length === 0 ? (
        <div className="flex-1 py-20 flex flex-col items-center justify-center gap-3">
          <UserPlus className="w-12 h-12 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Aucun patient trouvé.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Patients grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {patients.map((patient) => (
              <div
                key={patient._id}
                onClick={() => navigate(`/patients/${patient._id}`)}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 p-5 shadow-sm hover:shadow-md transition-all group relative cursor-pointer flex flex-col justify-between min-h-[220px]"
              >
                {/* Favorite & Profile details */}
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 shrink-0">
                      <img
                        src={patient.profilePictureUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${patient.name}`}
                        alt={patient.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      onClick={(e) => handleToggleFavorite(patient._id, e)}
                      className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent transition-all cursor-pointer ${
                        patient.isFavorite ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'
                      }`}
                    >
                      <Heart className={`w-4.5 h-4.5 ${patient.isFavorite ? 'fill-rose-500' : ''}`} />
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-normal truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all">
                    {patient.name}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md text-[10px] font-bold border border-slate-200/80 dark:border-white/5">
                      {patient.gender === 'Male' ? 'Homme' : patient.gender === 'Female' ? 'Femme' : patient.gender}
                    </span>
                    <span className="bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-md text-[10px] font-bold border border-blue-200/80 dark:border-blue-500/20 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatBirthDateWithAge(patient.birthDate)}</span>
                    </span>
                  </div>

                  <div className="mt-3.5 flex flex-col gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                    <span>📱 Tél : <strong className="text-slate-800 dark:text-slate-200 font-mono">{patient.phone}</strong></span>
                    {patient.nationalId && <span>🪪 CNIE : <strong className="text-slate-800 dark:text-slate-200 font-mono">{patient.nationalId}</strong></span>}
                    {patient.insurance?.provider && (
                      <span className="text-indigo-600 dark:text-indigo-300">🛡️ Mutuelle : <strong>{patient.insurance.provider}</strong></span>
                    )}
                  </div>

                </div>

                {/* Operations overlay */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-white/5 flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditModal(patient);
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                    title="Modifier"
                  >
                    <UserCheck className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleToggleArchive(patient._id, e)}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-all cursor-pointer"
                    title={patient.isArchived ? 'Désarchiver' : 'Archiver'}
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePatient(patient._id, e);
                    }}
                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-500 dark:bg-rose-500/10 dark:hover:bg-rose-500 border border-rose-200 dark:border-rose-500/20 text-rose-600 hover:text-white dark:text-rose-400 dark:hover:text-white transition-all cursor-pointer"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex justify-between items-center border-t border-slate-200/80 dark:border-white/5 pt-4">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Page {currentPage} sur {pages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed bg-white dark:bg-transparent"
                >
                  Précédent
                </button>
                <button
                  disabled={currentPage === pages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed bg-white dark:bg-transparent"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE & EDIT DIALOG MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {editPatientId ? 'Modifier le Dossier Patient' : 'Créer un Nouveau Patient'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Remplissez les informations démographiques et médicales</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              >
                <XIcon />
              </button>
            </div>

            {/* Form Fields (Scrollable) */}
            <form onSubmit={handleSubmitPatient} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 no-scrollbar">
              
              {/* Core Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 pl-0.5">Nom Complet *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 pl-0.5">Téléphone *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 pl-0.5">Date de naissance *</label>
                  <input
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 pl-0.5">National ID (CNIE)</label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 pl-0.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 pl-0.5">Genre</label>
                  <select
                    value={gender}
                    onChange={(e: any) => setGender(e.target.value)}
                    className="h-11 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="Male">Masculin</option>
                    <option value="Female">Féminin</option>
                    <option value="Other">Autre</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 pl-0.5">Groupe Sanguin</label>
                  <input
                    type="text"
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 pl-0.5">Adresse</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="h-11 px-4 rounded-xl text-sm border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Collapsible / Sections for emergency contact & insurance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Emergency Contact Card */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex flex-col gap-4">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Contact d'urgence</h4>
                  <div className="grid grid-cols-2 gap-3.5">
                    <input
                      type="text"
                      placeholder="Nom du contact"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      className="h-10 px-3 rounded-xl text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950"
                    />
                    <input
                      type="text"
                      placeholder="Téléphone contact"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      className="h-10 px-3 rounded-xl text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950"
                    />
                    <input
                      type="text"
                      placeholder="Relation (ex: Conjoint)"
                      value={emergencyRelation}
                      onChange={(e) => setEmergencyRelation(e.target.value)}
                      className="h-10 px-3 rounded-xl text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 col-span-2"
                    />
                  </div>
                </div>

                {/* Insurance Provider Card */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 flex flex-col gap-4">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Couverture Mutuelle</h4>
                  <div className="grid grid-cols-2 gap-3.5">
                    <input
                      type="text"
                      placeholder="Organisme (ex: CNOPS, CNSS)"
                      value={insuranceProvider}
                      onChange={(e) => setInsuranceProvider(e.target.value)}
                      className="h-10 px-3 rounded-xl text-xs border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950"
                    />
                    <input
                      type="text"
                      placeholder="N° Affiliation / Police"
                      value={insurancePolicy}
                      onChange={(e) => setInsurancePolicy(e.target.value)}
                      className="h-10 px-3 rounded-xl text-xs glass-input"
                    />
                  </div>
                </div>

              </div>

              {/* Medical History chips */}
              <div className="flex flex-col gap-4 border-t border-white/5 pt-5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Données Médicales (Séparer par des virgules)</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400 pl-0.5">Antécédents Médicaux</label>
                    <input
                      type="text"
                      placeholder="ex: Diabète, Asthme"
                      value={medicalHistoryInput}
                      onChange={(e) => setMedicalHistoryInput(e.target.value)}
                      className="h-11 px-4 rounded-xl text-sm glass-input"
                    />
                  </div>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400 pl-0.5">Allergies</label>
                    <input
                      type="text"
                      placeholder="ex: Pénicilline, Latex"
                      value={allergiesInput}
                      onChange={(e) => setAllergiesInput(e.target.value)}
                      className="h-11 px-4 rounded-xl text-sm glass-input"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-400 pl-0.5">Traitements en cours</label>
                    <input
                      type="text"
                      placeholder="ex: Insuline, Aspirine"
                      value={medicationsInput}
                      onChange={(e) => setMedicationsInput(e.target.value)}
                      className="h-11 px-4 rounded-xl text-sm glass-input"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-xs font-semibold text-slate-400 pl-0.5">Observations Cliniques / Notes Générales</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="p-4 rounded-xl text-sm glass-input resize-none"
                    placeholder="Observations diverses sur la dentition ou le comportement du patient..."
                  ></textarea>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3.5 border-t border-white/5 pt-5 mt-4 select-none">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-white/5 text-sm font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-sm text-white transition-all shadow-lg shadow-blue-600/25 cursor-pointer"
                >
                  Enregistrer
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
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
