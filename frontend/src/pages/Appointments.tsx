import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Calendar as CalendarIcon,
  Clock,
  User,
  Armchair,
  Trash2,
  Edit,
  Search,
  MessageSquare,
  CheckCircle2,
  Play,
  XCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Appointment, Patient } from '../types';
import { SearchablePatientSelect } from '../components/SearchablePatientSelect';

export const Appointments: React.FC = () => {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [selectedChair, setSelectedChair] = useState<'All' | 'Chair 1' | 'Chair 2'>('All');
  const [dateFilterMode, setDateFilterMode] = useState<'Today' | 'Week' | 'Month' | 'All'>('Today');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [searchQuery, setSearchQuery] = useState('');

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editApptId, setEditApptId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [duration, setDuration] = useState('30');
  const [chair, setChair] = useState('Chair 1');
  const [status, setStatus] = useState<'Scheduled' | 'Confirmed' | 'In Treatment' | 'Completed' | 'Cancelled' | 'No Show'>('Scheduled');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
  }, []);

  const fetchAppointments = () => {
    setLoading(true);
    fetch(`${API_URL}/appointments`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAppointments(data);
      })
      .catch((err) => console.error('Error fetching appointments:', err))
      .finally(() => setLoading(false));
  };

  const fetchPatients = () => {
    fetch(`${API_URL}/patients?limit=150`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setPatients(data.patients || (Array.isArray(data) ? data : [])))
      .catch((err) => console.error('Error fetching patients:', err));
  };

  const handleOpenCreateModal = () => {
    setEditApptId(null);
    setSelectedPatientId(patients[0]?._id || '');

    const now = new Date();
    now.setMinutes(0);
    const tzoffset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - tzoffset).toISOString().slice(0, 16);

    setDateTime(localISOTime);
    setDuration('30');
    setChair('Chair 1');
    setStatus('Scheduled');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (appt: Appointment) => {
    setEditApptId(appt._id);
    const patObj = appt.patientId && typeof appt.patientId === 'object' ? (appt.patientId as Patient) : null;
    setSelectedPatientId(patObj?._id || (typeof appt.patientId === 'string' ? appt.patientId : ''));

    const tzoffset = new Date(appt.dateTime).getTimezoneOffset() * 60000;
    const localISOTime = new Date(new Date(appt.dateTime).getTime() - tzoffset).toISOString().slice(0, 16);
    setDateTime(localISOTime);

    setDuration(appt.duration.toString());
    setChair(appt.chair);
    setStatus(appt.status);
    setNotes(appt.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmitAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !dateTime || !chair) return;

    setSubmitting(true);
    const payload = {
      patientId: selectedPatientId,
      dateTime,
      duration: parseInt(duration, 10),
      chair,
      notes,
      status,
    };

    const method = editApptId ? 'PUT' : 'POST';
    const url = editApptId ? `${API_URL}/appointments/${editApptId}` : `${API_URL}/appointments`;

    fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Error saving appointment');
        return res.json();
      })
      .then(() => {
        setIsModalOpen(false);
        fetchAppointments();
      })
      .catch((err) => console.error('Error saving appointment:', err))
      .finally(() => setSubmitting(false));
  };

  const handleUpdateStatus = (id: string, newStatus: string, e: React.MouseEvent) => {
    e.stopPropagation();
    fetch(`${API_URL}/appointments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    })
      .then(() => fetchAppointments())
      .catch((err) => console.error('Error updating status:', err));
  };

  const handleSendWhatsAppReminder = (appt: Appointment, e: React.MouseEvent) => {
    e.stopPropagation();
    const patientObj: any = appt.patientId;
    if (!patientObj || !patientObj.phone) {
      alert('Numéro de téléphone du patient introuvable.');
      return;
    }

    const apptDateStr = new Date(appt.dateTime).toLocaleDateString('fr-FR');
    const apptTimeStr = new Date(appt.dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const message = `Bonjour ${patientObj.name},\n\nRappel : Votre rendez-vous au Cabinet Dentaire Dr. Salma Tijini est prévu le ${apptDateStr} à ${apptTimeStr}.\n\nMerci de nous contacter en cas d'empêchement.`;

    fetch(`${API_URL}/notifications/send-manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        patientId: patientObj._id,
        appointmentId: appt._id,
        channel: 'WhatsApp',
        recipient: patientObj.phone,
        body: message,
      }),
    })
      .then((res) => res.json())
      .then(() => alert(`Rappel WhatsApp envoyé avec succès à ${patientObj.name} !`))
      .catch((err) => console.error('Error sending WhatsApp reminder:', err));
  };

  const handleDeleteAppointment = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Supprimer ce rendez-vous ?')) return;

    fetch(`${API_URL}/appointments/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => fetchAppointments())
      .catch((err) => console.error('Error deleting appointment:', err));
  };

  // Filtered appointments computation
  const filteredAppts = useMemo(() => {
    return appointments.filter((appt) => {
      // Chair filter
      if (selectedChair !== 'All' && appt.chair !== selectedChair) return false;

      // Search filter
      const patientObj = appt.patientId && typeof appt.patientId === 'object' ? (appt.patientId as Patient) : null;
      const patientName = patientObj?.name ? patientObj.name.toLowerCase() : '';
      const notesText = (appt.notes || '').toLowerCase();
      if (searchQuery && !patientName.includes(searchQuery.toLowerCase()) && !notesText.includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Date range mode filter
      const apptDate = new Date(appt.dateTime);
      const selDateObj = new Date(selectedDate);

      if (dateFilterMode === 'Today') {
        return apptDate.toDateString() === selDateObj.toDateString();
      }

      if (dateFilterMode === 'Week') {
        const startOfWeek = new Date(selDateObj);
        startOfWeek.setDate(selDateObj.getDate() - selDateObj.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        return apptDate >= startOfWeek && apptDate <= endOfWeek;
      }

      if (dateFilterMode === 'Month') {
        return apptDate.getMonth() === selDateObj.getMonth() && apptDate.getFullYear() === selDateObj.getFullYear();
      }

      return true;
    });
  }, [appointments, selectedChair, dateFilterMode, selectedDate, searchQuery]);

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 overflow-y-auto no-scrollbar max-h-[calc(100vh-80px)] text-white font-sans">
      
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Agenda Clinique & Rendez-vous</h1>
          <p className="text-xs text-slate-400 mt-1">
            Gérez le planning des consultations, l'attribution des fauteuils et l'envoi des rappels automatiques.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white transition-all shadow-lg shadow-blue-600/25 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Rendez-vous</span>
        </button>
      </div>

      {/* Control Toolbar (Date mode, Chair, Datepicker, Search) */}
      <div className="p-4 rounded-3xl bg-slate-900/60 border border-white/10 shadow-xl flex flex-wrap gap-4 items-center justify-between">
        
        {/* Date Mode Switcher & Date Picker */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-white/5">
            <button
              onClick={() => setDateFilterMode('Today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dateFilterMode === 'Today' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => setDateFilterMode('Week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateFilterMode === 'Week' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Semaine
            </button>
            <button
              onClick={() => setDateFilterMode('Month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateFilterMode === 'Month' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Mois
            </button>
            <button
              onClick={() => setDateFilterMode('All')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                dateFilterMode === 'All' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tout
            </button>
          </div>

          {/* Date Picker Input */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setDateFilterMode('Today');
            }}
            className="h-10 px-3 rounded-xl border border-white/10 bg-slate-950 text-xs text-white"
          />
        </div>

        {/* Chair Filter & Search Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-white/5">
            <button
              onClick={() => setSelectedChair('All')}
              className={`px-3 py-1.5 rounded-xl text-xxs font-bold transition-all cursor-pointer ${
                selectedChair === 'All' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tous Fauteuils
            </button>
            <button
              onClick={() => setSelectedChair('Chair 1')}
              className={`px-3 py-1.5 rounded-xl text-xxs font-bold transition-all cursor-pointer ${
                selectedChair === 'Chair 1' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Fauteuil 1
            </button>
            <button
              onClick={() => setSelectedChair('Chair 2')}
              className={`px-3 py-1.5 rounded-xl text-xxs font-bold transition-all cursor-pointer ${
                selectedChair === 'Chair 2' ? 'bg-white/15 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Fauteuil 2
            </button>
          </div>

          <div className="relative w-56">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Rechercher patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl text-xs glass-input"
            />
          </div>
        </div>

      </div>

      {/* Appointments List Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredAppts.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900/40 border border-white/5 text-center flex flex-col items-center justify-center gap-3">
          <CalendarIcon className="w-12 h-12 text-slate-600" />
          <h4 className="text-base font-bold text-white">Aucun rendez-vous consigné</h4>
          <p className="text-xs text-slate-400 max-w-sm">
            Aucune consultation ne correspond à la période ou au fauteuil sélectionné.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAppts.map((appt) => {
            const dateObj = new Date(appt.dateTime);
            const timeStr = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            const dateStr = dateObj.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
            const patientObj = appt.patientId && typeof appt.patientId === 'object' ? (appt.patientId as Patient) : null;
            const patientName = patientObj?.name || 'Patient';

            return (
              <div
                key={appt._id}
                className="rounded-3xl bg-slate-900/80 border border-white/10 hover:border-white/20 p-5 shadow-xl flex flex-col justify-between gap-4 transition-all group"
              >
                <div>
                  {/* Top Status & Date Header */}
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                      <CalendarIcon className="w-4 h-4 text-blue-400" />
                      {dateStr}
                    </span>

                    <span
                      className={`text-xxs font-extrabold uppercase px-2.5 py-1 rounded-full ${
                        appt.status === 'Completed'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : appt.status === 'Scheduled'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : appt.status === 'Confirmed'
                          ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                          : appt.status === 'In Treatment'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {appt.status}
                    </span>
                  </div>

                  {/* Patient Name */}
                  <h3 className="text-base font-extrabold text-white mb-2">{patientName}</h3>

                  {/* Time & Chair Details */}
                  <div className="flex flex-col gap-1.5 text-xs text-slate-300">
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <strong>{timeStr}</strong> ({appt.duration} min)
                    </span>
                    <span className="flex items-center gap-2">
                      <Armchair className="w-4 h-4 text-slate-500" />
                      {appt.chair === 'Chair 1' ? 'Fauteuil 1' : 'Fauteuil 2'}
                    </span>
                  </div>

                  {appt.notes && (
                    <p className="mt-3 text-xs leading-relaxed bg-white/5 p-3 rounded-2xl border border-white/5 text-slate-300">
                      {appt.notes}
                    </p>
                  )}
                </div>

                {/* Quick Action Transitions & WhatsApp Reminder Trigger */}
                <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-1">
                  
                  {/* Status Fast Switchers */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleUpdateStatus(appt._id, 'Confirmed', e)}
                      title="Marquer Confirmé"
                      className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleUpdateStatus(appt._id, 'In Treatment', e)}
                      title="Marquer En Soin"
                      className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleUpdateStatus(appt._id, 'Completed', e)}
                      title="Marquer Terminé"
                      className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* WhatsApp & Edit/Delete Action Icons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => handleSendWhatsAppReminder(appt, e)}
                      title="Rappel WhatsApp"
                      className="p-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 cursor-pointer flex items-center gap-1 text-xxs font-bold"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(appt)}
                      className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteAppointment(appt._id, e)}
                      className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* CREATE & EDIT APPOINTMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-white/10 shadow-2xl p-6 flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">
                {editApptId ? 'Modifier le Rendez-vous' : 'Planifier un Rendez-vous'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAppointment} className="flex flex-col gap-4">
              
              {/* Patient Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Patient</label>
                <SearchablePatientSelect
                  patients={patients}
                  selectedId={selectedPatientId}
                  onChange={(id) => setSelectedPatientId(id)}
                />
              </div>

              {/* Date & Time Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Date et Heure</label>
                <input
                  type="datetime-local"
                  required
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl text-xs glass-input text-white"
                />
              </div>

              {/* Duration and Chair Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Durée (min)</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-white/10 bg-slate-950 text-xs text-white"
                  >
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">60 min</option>
                    <option value="90">90 min</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Fauteuil</label>
                  <select
                    value={chair}
                    onChange={(e) => setChair(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-white/10 bg-slate-950 text-xs text-white"
                  >
                    <option value="Chair 1">Fauteuil 1</option>
                    <option value="Chair 2">Fauteuil 2</option>
                  </select>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Statut</label>
                <select
                  value={status}
                  onChange={(e: any) => setStatus(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-white/10 bg-slate-950 text-xs text-white"
                >
                  <option value="Scheduled">Planifié</option>
                  <option value="Confirmed">Confirmé</option>
                  <option value="In Treatment">En Soin</option>
                  <option value="Completed">Terminé</option>
                  <option value="Cancelled">Annulé</option>
                  <option value="No Show">Absence</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Motif / Acte Prévu</label>
                <input
                  type="text"
                  placeholder="ex: Consultation, Détartrage, Pose de couronne..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl text-xs glass-input"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-lg shadow-blue-600/20 cursor-pointer"
                >
                  {submitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
