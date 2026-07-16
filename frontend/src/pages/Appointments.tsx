import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, User, Armchair, Trash2, Edit } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Appointment, Patient } from '../types';
import { SearchablePatientSelect } from '../components/SearchablePatientSelect';


export const Appointments: React.FC = () => {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChair, setSelectedChair] = useState('All');

  // Form states for creating/editing appointment
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editApptId, setEditApptId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [duration, setDuration] = useState('30');
  const [chair, setChair] = useState('Chair 1');
  const [status, setStatus] = useState<'Scheduled' | 'Confirmed' | 'In Treatment' | 'Completed' | 'Cancelled' | 'No Show'>('Scheduled');
  const [notes, setNotes] = useState('');

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
      .then((data) => setAppointments(data))
      .catch((err) => console.error('Error fetching appointments:', err))
      .finally(() => setLoading(false));
  };

  const fetchPatients = () => {
    fetch(`${API_URL}/patients?limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setPatients(data.patients || []))
      .catch((err) => console.error('Error fetching patients:', err));
  };

  const handleOpenCreateModal = () => {
    setEditApptId(null);
    setSelectedPatientId(patients[0]?._id || '');
    // Pre-fill local date-time string matching YYYY-MM-DDTHH:MM
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
    setSelectedPatientId(typeof appt.patientId === 'object' ? appt.patientId._id : appt.patientId);
    
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

    // Standard dummy doctorId (the logged in user or first user, backend resolves)
    const mockDoctorId = '65b4c10c14b98c1998f48df2'; // standard placeholder, backend updates with req.user

    const payload = {
      patientId: selectedPatientId,
      doctorId: mockDoctorId,
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
        if (!res.ok) throw new Error('Failed to save appointment');
        return res.json();
      })
      .then(() => {
        setIsModalOpen(false);
        fetchAppointments();
      })
      .catch((err) => console.error('Error saving appointment:', err));
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

  const filteredAppts = selectedChair === 'All'
    ? appointments
    : appointments.filter((a) => a.chair === selectedChair);

  return (
    <div className="flex-1 p-8 flex flex-col gap-6 overflow-y-auto no-scrollbar max-h-[calc(100vh-80px)] select-none">
      
      {/* Title & Add button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Agenda Clinique</h2>
          <p className="text-xs text-slate-400 mt-1">Gérez le planning des consultations et l'attribution des fauteuils dentaires.</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white transition-all shadow-lg shadow-blue-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Rendez-vous</span>
        </button>
      </div>

      {/* Filters panel */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 p-4 rounded-2xl bg-slate-900/40 border border-white/5 shadow">
        <div className="flex gap-2 items-center">
          <Armchair className="w-4.5 h-4.5 text-slate-500" />
          <span className="text-xs font-semibold text-slate-400 mr-2">Filtrer par Fauteuil :</span>
          {['All', 'Chair 1', 'Chair 2'].map((c) => (
            <button
              key={c}
              onClick={() => setSelectedChair(c)}
              className={`px-3 py-1.5 rounded-lg text-xxs font-bold transition-all cursor-pointer border ${
                selectedChair === c
                  ? 'bg-blue-600/10 border-blue-500/30 text-blue-400'
                  : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {c === 'All' ? 'Tous' : c === 'Chair 1' ? 'Fauteuil 1' : 'Fauteuil 2'}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar List */}
      {loading ? (
        <div className="flex-grow flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredAppts.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center gap-3 py-20">
          <Calendar className="w-12 h-12 text-slate-600" />
          <p className="text-sm font-semibold text-slate-400">Aucun rendez-vous consigné.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAppts.map((appt) => {
            const dateObj = new Date(appt.dateTime);
            const timeStr = dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            const dateStr = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
            
            return (
              <div
                key={appt._id}
                className="rounded-2xl glass-card hover:bg-slate-900/60 p-5 shadow-lg border border-white/5 flex flex-col justify-between gap-4 group"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-extrabold text-blue-400 capitalize tracking-wider flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {dateStr}
                    </span>
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      appt.status === 'Completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : appt.status === 'Scheduled'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : appt.status === 'In Treatment'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {appt.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {typeof appt.patientId === 'object' ? appt.patientId.name : 'Patient'}
                  </h3>

                  <div className="flex flex-col gap-1.5 mt-3 text-xs text-slate-400">
                    <span className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <strong>{timeStr}</strong> ({appt.duration} min)
                    </span>
                    <span className="flex items-center gap-2">
                      <Armchair className="w-3.5 h-3.5 text-slate-500" />
                      {appt.chair === 'Chair 1' ? 'Fauteuil 1' : 'Fauteuil 2'}
                    </span>
                  </div>

                  {appt.notes && (
                    <p className="mt-3.5 text-xxs leading-relaxed bg-white/3 p-2.5 rounded-xl border border-white/5 text-slate-300">
                      {appt.notes}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-all select-none">
                  <button
                    onClick={() => handleOpenEditModal(appt)}
                    className="p-1.5 rounded bg-white/5 border border-white/5 hover:border-white/10 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteAppointment(appt._id, e)}
                    className="p-1.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* CREATE & EDIT SCHEDULER DIALOG MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-white/10 shadow-2xl p-6 flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-md font-bold text-white">
                {editApptId ? 'Modifier le Rendez-vous' : 'Prendre un Rendez-vous'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <XIcon />
              </button>
            </div>

            <form onSubmit={handleSubmitAppointment} className="flex flex-col gap-4">
              
              {/* Patient Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Patient</label>
                <SearchablePatientSelect
                  patients={patients}
                  selectedId={selectedPatientId}
                  onChange={(id) => setSelectedPatientId(id)}
                />
              </div>

              {/* Date & Time Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Date et Heure</label>
                <input
                  type="datetime-local"
                  required
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm glass-input text-slate-300"
                />
              </div>

              {/* Duration and Chair Grid */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Durée (min)</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="h-11 px-3 rounded-xl border border-white/5 bg-slate-950 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">60 min</option>
                    <option value="90">90 min</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-400">Fauteuil</label>
                  <select
                    value={chair}
                    onChange={(e) => setChair(e.target.value)}
                    className="h-11 px-3 rounded-xl border border-white/5 bg-slate-950 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Chair 1">Fauteuil 1</option>
                    <option value="Chair 2">Fauteuil 2</option>
                  </select>
                </div>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Statut</label>
                <select
                  value={status}
                  onChange={(e: any) => setStatus(e.target.value)}
                  className="h-11 px-3 rounded-xl border border-white/5 bg-slate-950 text-sm text-white focus:outline-none focus:border-blue-500"
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
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Motif / Notes</label>
                <input
                  type="text"
                  placeholder="ex: Détartrage..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-11 px-4 rounded-xl text-sm glass-input"
                />
              </div>

              {/* Submit triggers */}
              <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/5 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all cursor-pointer"
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
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
