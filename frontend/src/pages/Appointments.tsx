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
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  CalendarDays,
  List,
  Eye,
  X,
  Sparkles,
  Users,
  CheckSquare,
  Volume2,
  ArrowRight,
  UserCheck,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Appointment, Patient } from '../types';
import { SearchablePatientSelect } from '../components/SearchablePatientSelect';
import { CustomDatePicker } from '../components/CustomDatePicker';
import { formatDate, formatTime } from '../utils/dateUtils';

const MONTH_NAMES_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

const WEEK_DAYS_SHORT_FR = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];
const WEEK_DAYS_FULL_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const TIME_SLOTS = [
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
];

interface WaitingPatient {
  id: string;
  name: string;
  arrivedAt: string;
  act: string;
  chair?: string;
}

interface ClinicTask {
  id: string;
  text: string;
  done: boolean;
}

export const Appointments: React.FC = () => {
  const { token, user } = useAuth();
  const { toast, confirm } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  // View modes: 'week' (Dentisto Style), 'day', 'month', 'list'
  const [viewMode, setViewMode] = useState<'week' | 'day' | 'month' | 'list'>('week');

  // Active Date for week navigation
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [chairFilter, setChairFilter] = useState<string>('All');
  const [doctorFilter, setDoctorFilter] = useState<string>('All');

  // Waiting Room State
  const [waitingRoom, setWaitingRoom] = useState<WaitingPatient[]>([
    { id: 'w1', name: 'Kawtar Fattane', arrivedAt: '10:15', act: 'Consultation & Soins' },
    { id: 'w2', name: 'Omar Bennani', arrivedAt: '10:35', act: 'Contrôle Ortho' },
  ]);
  const [isWaitingModalOpen, setIsWaitingModalOpen] = useState(false);
  const [waitingPatientId, setWaitingPatientId] = useState('');
  const [waitingPatientName, setWaitingPatientName] = useState('');
  const [waitingPatientAct, setWaitingPatientAct] = useState('Consultation');

  // Daily Tasks State
  const [dailyTasks, setDailyTasks] = useState<ClinicTask[]>([
    { id: 't1', text: 'Stérilisation des plateaux & turbines', done: true },
    { id: 't2', text: 'Vérifier livraisons prothèses laboratoire', done: true },
    { id: 't3', text: 'Rappels WhatsApp 24H envoyés aux patients', done: true },
    { id: 't4', text: 'Commander composite & anesthésiques', done: false },
  ]);
  const [newTaskText, setNewTaskText] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Modal Detail & Editing
  const [selectedDayDetail, setSelectedDayDetail] = useState<{ date: Date; dateStr: string; appts: Appointment[] } | null>(null);
  const [selectedApptDetail, setSelectedApptDetail] = useState<Appointment | null>(null);

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editApptId, setEditApptId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [duration, setDuration] = useState('30');
  const [chair, setChair] = useState('Fauteuil');
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
    fetch(`${API_URL}/patients?limit=200`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setPatients(data.patients || (Array.isArray(data) ? data : [])))
      .catch((err) => console.error('Error fetching patients:', err));
  };

  // Helper to get Monday of any week
  const getMonday = (d: Date) => {
    const dt = new Date(d);
    const day = dt.getDay();
    const diff = dt.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(dt.setDate(diff));
  };

  // 7 Days of the active week
  const activeWeekDays = useMemo(() => {
    const monday = getMonday(currentDate);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      days.push(nextDay);
    }
    return days;
  }, [currentDate]);

  // Formatted date range: e.g. "31/08/2026 - 06/09/2026"
  const weekRangeString = useMemo(() => {
    if (activeWeekDays.length < 7) return '';
    const start = activeWeekDays[0];
    const end = activeWeekDays[6];
    const formatD = (d: Date) =>
      `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    return `${formatD(start)} - ${formatD(end)}`;
  }, [activeWeekDays]);

  // Navigation handlers
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  const handleGoToday = () => {
    setCurrentDate(new Date());
  };

  const getApptDateKey = (dateTimeStr: string) => {
    if (!dateTimeStr) return '';
    if (dateTimeStr.includes('T')) return dateTimeStr.split('T')[0];
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const filteredAppts = useMemo(() => {
    return appointments.filter((appt) => {
      const patientObj = appt.patientId && typeof appt.patientId === 'object' ? (appt.patientId as Patient) : null;
      const patientName = patientObj?.name ? patientObj.name.toLowerCase() : '';
      const notesText = (appt.notes || '').toLowerCase();
      if (searchQuery && !patientName.includes(searchQuery.toLowerCase()) && !notesText.includes(searchQuery.toLowerCase())) return false;
      if (statusFilter !== 'All' && appt.status !== statusFilter) return false;
      if (chairFilter !== 'All' && appt.chair !== chairFilter) return false;
      return true;
    });
  }, [appointments, searchQuery, statusFilter, chairFilter]);

  // Group appointments by date string YYYY-MM-DD
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const appt of filteredAppts) {
      const key = getApptDateKey(appt.dateTime);
      if (key) {
        const existing = map.get(key) || [];
        existing.push(appt);
        existing.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
        map.set(key, existing);
      }
    }
    return map;
  }, [filteredAppts]);

  // Dentisto Solid Card Colors based on Dental Act / Specialty
  const getDentistoCardColor = (appt: Appointment) => {
    const notesLower = (appt.notes || '').toLowerCase();
    const patName = typeof appt.patientId === 'object' ? (appt.patientId as any)?.name || '' : '';

    if (notesLower.includes('chirurg') || notesLower.includes('implant') || notesLower.includes('greffe')) {
      return 'bg-[#881337] hover:bg-[#700f2b] text-white border-[#4c0519]'; // Dark Burgundy
    }
    if (notesLower.includes('ortho') || notesLower.includes('bague') || notesLower.includes('arc')) {
      return 'bg-[#1d4ed8] hover:bg-[#1e40af] text-white border-[#1e3a8a]'; // Royal Blue
    }
    if (notesLower.includes('soin') || notesLower.includes('carie') || notesLower.includes('composite')) {
      return 'bg-[#e11d48] hover:bg-[#be123c] text-white border-[#9f1239]'; // Rose / Coral
    }
    if (notesLower.includes('détartr') || notesLower.includes('detartrage') || notesLower.includes('hygi')) {
      return 'bg-[#eab308] hover:bg-[#ca8a04] text-slate-950 font-bold border-[#a16207]'; // Vibrant Yellow
    }
    if (notesLower.includes('endo') || notesLower.includes('dévital') || notesLower.includes('racine')) {
      return 'bg-[#7c3aed] hover:bg-[#6d28d9] text-white border-[#5b21b6]'; // Purple / Violet
    }
    if (notesLower.includes('contrôle') || notesLower.includes('controle') || notesLower.includes('consult')) {
      return 'bg-[#06b6d4] hover:bg-[#0891b2] text-white border-[#0e7490]'; // Cyan / Mint
    }
    if (notesLower.includes('extract') || notesLower.includes('arrach')) {
      return 'bg-[#ea580c] hover:bg-[#c2410c] text-white border-[#9a3412]'; // Orange
    }

    // Deterministic palette fallback
    const palettes = [
      'bg-[#2563eb] hover:bg-[#1d4ed8] text-white border-[#1e40af]',
      'bg-[#d97706] hover:bg-[#b45309] text-white border-[#92400e]',
      'bg-[#059669] hover:bg-[#047857] text-white border-[#065f46]',
      'bg-[#9333ea] hover:bg-[#7e22ce] text-white border-[#6b21a8]',
      'bg-[#0284c7] hover:bg-[#0369a1] text-white border-[#075985]',
      'bg-[#db2777] hover:bg-[#be185d] text-white border-[#9d174d]',
    ];
    let hash = 0;
    for (let i = 0; i < patName.length; i++) hash += patName.charCodeAt(i);
    return palettes[hash % palettes.length];
  };

  const handleOpenCreateModal = (prefillDate?: Date, timeStr?: string) => {
    setEditApptId(null);
    setSelectedPatientId('');

    const targetDate = prefillDate || new Date();
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const [h, m] = (timeStr || '09:00').split(':');

    setDateTime(`${yyyy}-${mm}-${dd}T${h || '09'}:${m || '00'}`);
    setDuration('30');
    setChair('Fauteuil');
    setStatus('Scheduled');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (appt: Appointment) => {
    setEditApptId(appt._id);
    const patObj = appt.patientId && typeof appt.patientId === 'object' ? (appt.patientId as Patient) : null;
    setSelectedPatientId(patObj?._id || (typeof appt.patientId === 'string' ? appt.patientId : ''));

    const d = new Date(appt.dateTime);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      setDateTime(`${yyyy}-${mm}-${dd}T${hours}:${minutes}`);
    } else {
      setDateTime(appt.dateTime);
    }

    setDuration(appt.duration.toString());
    setChair(appt.chair || 'Fauteuil');
    setStatus(appt.status);
    setNotes(appt.notes || '');
    setIsModalOpen(true);
    setSelectedApptDetail(null);
  };

  const handleSubmitAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      toast.warning('Patient requis', 'Veuillez sélectionner un patient dans la liste.');
      return;
    }
    if (!dateTime) {
      toast.warning('Date requise', 'Veuillez définir la date et l\'heure du rendez-vous.');
      return;
    }

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
        toast.success(editApptId ? 'Rendez-vous mis à jour' : 'Rendez-vous planifié', 'La consultation a été enregistrée avec succès.');
        fetchAppointments();
      })
      .catch((err) => {
        console.error('Error saving appointment:', err);
        toast.error('Erreur', 'Impossible d\'enregistrer le rendez-vous.');
      })
      .finally(() => setSubmitting(false));
  };

  const handleUpdateStatus = (id: string, newStatus: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    fetch(`${API_URL}/appointments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    })
      .then(() => {
        toast.success('Statut actualisé', `Rendez-vous marqué comme "${newStatus}".`);
        fetchAppointments();
        if (selectedApptDetail && selectedApptDetail._id === id) {
          setSelectedApptDetail({ ...selectedApptDetail, status: newStatus as any });
        }
      })
      .catch((err) => console.error('Error updating status:', err));
  };

  const handleSendWhatsAppReminder = (appt: Appointment, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const patientObj: any = appt.patientId;
    if (!patientObj || !patientObj.phone) {
      toast.warning('Numéro introuvable', 'Le patient ne possède pas de numéro de téléphone valide.');
      return;
    }

    const apptDateStr = formatDate(appt.dateTime);
    const apptTimeStr = formatTime(appt.dateTime);
    const message = `Bonjour ${patientObj.name},\n\nNous vous rappelons votre rendez-vous au Cabinet Dentaire Dr. Salma Tijini prévu le ${apptDateStr} à ${apptTimeStr}.\n\n🦷 Soin prévu : ${appt.notes || 'Consultation'}\n\nMerci de confirmer votre présence.`;

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
      .then(() => toast.success('Rappel WhatsApp envoyé', `Message envoyé avec succès à ${patientObj.name} !`))
      .catch((err) => {
        console.error('Error sending WhatsApp reminder:', err);
        toast.error('Erreur d\'envoi', err.message || 'Impossible d\'envoyer le rappel.');
      });
  };

  const handleDeleteAppointment = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirmed = await confirm({
      title: 'Supprimer ce rendez-vous ?',
      message: 'Voulez-vous vraiment annuler et supprimer ce rendez-vous du planning ?',
      variant: 'danger',
      confirmText: 'Supprimer',
    });
    if (!confirmed) return;

    fetch(`${API_URL}/appointments/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => {
        toast.success('Rendez-vous supprimé', 'Le rendez-vous a été retiré de l\'agenda.');
        setSelectedApptDetail(null);
        fetchAppointments();
      })
      .catch((err) => {
        console.error('Error deleting appointment:', err);
        toast.error('Erreur', 'Impossible de supprimer le rendez-vous.');
      });
  };

  // Waiting Room Handlers
  const handleAddWaitingPatient = () => {
    const selectedPat = patients.find((p) => p._id === waitingPatientId);
    const patName = selectedPat?.name || waitingPatientName.trim();
    if (!patName) {
      toast.warning('Patient requis', 'Veuillez sélectionner un patient dans la liste.');
      return;
    }
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newEntry: WaitingPatient = {
      id: `w-${Date.now()}`,
      name: patName,
      arrivedAt: timeStr,
      act: waitingPatientAct || 'Consultation',
    };
    setWaitingRoom([...waitingRoom, newEntry]);
    setWaitingPatientName('');
    setWaitingPatientId('');
    setIsWaitingModalOpen(false);
    toast.success('Patient en salle d\'attente', `${newEntry.name} ajouté(e) avec succès.`);
  };

  const handleCallPatient = (wPatient: WaitingPatient) => {
    setWaitingRoom(waitingRoom.filter((p) => p.id !== wPatient.id));
    toast.info('Entrée au fauteuil', `${wPatient.name} passe en salle de soins.`);
  };

  // Task Toggle Handler
  const handleToggleTask = (id: string) => {
    setDailyTasks(dailyTasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const handleAddTask = () => {
    if (!newTaskText.trim()) return;
    const newTask: ClinicTask = {
      id: `task-${Date.now()}`,
      text: newTaskText.trim(),
      done: false,
    };
    setDailyTasks([...dailyTasks, newTask]);
    setNewTaskText('');
    setIsTaskModalOpen(false);
  };

  // Helper to test if a slot has an appointment starting
  const getApptsForSlot = (dateObj: Date, timeSlotStr: string) => {
    const dateKey = getApptDateKey(dateObj.toISOString());
    const dayAppts = appointmentsByDate.get(dateKey) || [];
    return dayAppts.filter((appt) => {
      const apptTime = formatTime(appt.dateTime);
      return apptTime.startsWith(timeSlotStr);
    });
  };

  return (
    <div className="flex-1 p-3 md:p-6 flex flex-col gap-4 overflow-y-auto no-scrollbar max-h-[calc(100vh-80px)] font-sans select-none bg-slate-100/70 dark:bg-slate-950">
      
      {/* ========================================================================= */}
      {/* 🌟 1. TOP HEADER & FILTER BAR (Dentisto Style)                            */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Rendez-Vous
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white font-extrabold text-xxs tracking-wider uppercase shadow-xs">
              Agenda V4
            </span>
          </div>

          <button
            onClick={() => handleOpenCreateModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau RDV</span>
          </button>
        </div>

        {/* Dentisto Sub-Bar: Navigation + Date Range + Filters */}
        <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Navigation Buttons + Date Range Pill */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleGoToday}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-bold text-xs hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
            >
              Aujourd'hui
            </button>

            <button
              onClick={handlePrev}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
              title="Précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={handleNext}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
              title="Suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="h-8 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 flex items-center gap-2 text-xs font-mono font-bold text-slate-700 dark:text-slate-200 shadow-2xs">
              <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>{weekRangeString}</span>
            </div>
          </div>

          {/* Right: Dropdowns Filters (Praticien, Vue, Statut) */}
          <div className="flex items-center gap-2">
            {/* Praticien Filter */}
            <select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="h-8 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer"
            >
              <option value="All">Praticien : Dr. Salma Tijini</option>
              <option value="All">Tous les praticiens</option>
            </select>

            {/* View Mode Selector (Semaine / Jour / Mois / Liste) */}
            <select
              value={viewMode}
              onChange={(e: any) => setViewMode(e.target.value)}
              className="h-8 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 font-bold cursor-pointer text-emerald-700 dark:text-emerald-400"
            >
              <option value="week">Vue : Semaine</option>
              <option value="day">Vue : Jour</option>
              <option value="month">Vue : Mois (Grille)</option>
              <option value="list">Vue : Liste</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer"
            >
              <option value="All">Statut : Tous</option>
              <option value="Confirmed">Confirmé</option>
              <option value="In Treatment">En Soin</option>
              <option value="Completed">Terminé</option>
              <option value="Scheduled">Planifié</option>
            </select>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🌟 2. MAIN SPLIT: AGENDA GRID (LEFT 78%) + CLINIC PANEL (RIGHT 22%)        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* ======================================================================= */}
        {/* A. DENTISTO WEEKLY TIMETABLE MATRIX (lg:col-span-9)                     */}
        {/* ======================================================================= */}
        <div className="lg:col-span-9 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-sm overflow-hidden flex flex-col">
          
          {viewMode === 'week' && (
            <div className="overflow-x-auto">
              <div className="min-w-[760px] flex flex-col">
                
                {/* 1. Header Row (7 Days: LUN. 31 (16) -> DIM. 6 (0)) */}
                <div className="grid grid-cols-8 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/60 sticky top-0 z-20">
                  {/* Empty Corner for Time column */}
                  <div className="p-2 border-r border-slate-200 dark:border-white/10 text-center text-slate-400 text-xxs font-bold uppercase tracking-wider flex items-center justify-center">
                    Heure
                  </div>

                  {/* 7 Days Columns */}
                  {activeWeekDays.map((dayObj, idx) => {
                    const isToday = dayObj.toDateString() === new Date().toDateString();
                    const dayKey = getApptDateKey(dayObj.toISOString());
                    const dayApptCount = (appointmentsByDate.get(dayKey) || []).length;
                    const shortName = WEEK_DAYS_SHORT_FR[idx];
                    const dayNum = dayObj.getDate();

                    return (
                      <div
                        key={dayKey}
                        onClick={() => handleOpenCreateModal(dayObj)}
                        className={`py-2.5 px-1 border-r border-slate-200 dark:border-white/10 last:border-r-0 text-center transition-colors cursor-pointer ${
                          isToday ? 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold' : 'hover:bg-slate-100/50'
                        }`}
                      >
                        <span className="text-xs uppercase font-extrabold tracking-tight">
                          {shortName}. {dayNum}{' '}
                          <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                            ({dayApptCount})
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* 2. Grid Body: Time Slots (08:30 -> 19:30) */}
                <div className="relative flex flex-col">
                  {TIME_SLOTS.map((timeStr) => (
                    <div key={timeStr} className="grid grid-cols-8 border-b border-slate-100 dark:border-white/5 min-h-[50px]">
                      
                      {/* Left Time Label */}
                      <div className="border-r border-slate-200 dark:border-white/10 p-1.5 text-center text-[11px] font-mono font-bold text-slate-400 dark:text-slate-500 bg-slate-50/40 dark:bg-slate-950/30 flex items-start justify-center">
                        {timeStr}
                      </div>

                      {/* 7 Day Slot Cells */}
                      {activeWeekDays.map((dayObj) => {
                        const cellAppts = getApptsForSlot(dayObj, timeStr);
                        const isToday = dayObj.toDateString() === new Date().toDateString();

                        return (
                          <div
                            key={`${dayObj.toISOString()}-${timeStr}`}
                            onClick={() => handleOpenCreateModal(dayObj, timeStr)}
                            className={`border-r border-slate-100 dark:border-white/5 last:border-r-0 p-1 transition-all group relative min-h-[50px] flex flex-col gap-1 ${
                              isToday ? 'bg-blue-50/15 dark:bg-blue-950/10' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            {cellAppts.map((appt) => {
                              const patObj = appt.patientId && typeof appt.patientId === 'object' ? (appt.patientId as Patient) : null;
                              const patName = patObj?.name || 'Patient';
                              const colorStyle = getDentistoCardColor(appt);

                              return (
                                <div
                                  key={appt._id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedApptDetail(appt);
                                  }}
                                  className={`p-1.5 rounded-lg text-xxs border transition-all transform hover:scale-[1.02] shadow-xs cursor-pointer leading-tight flex flex-col justify-center ${colorStyle}`}
                                  title={`${formatTime(appt.dateTime)} - ${patName} (${appt.notes || 'Consultation'})`}
                                >
                                  <div className="font-extrabold uppercase truncate tracking-tight">
                                    {formatTime(appt.dateTime)} {patName}
                                  </div>
                                  <div className="opacity-90 text-[9px] truncate font-medium mt-0.5">
                                    ({appt.notes || 'Soins'})
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}

                    </div>
                  ))}
                </div>

              </div>
            </div>
          )}

          {/* Fallback View: Monthly Grid (Canva Style) */}
          {viewMode === 'month' && (
            <div className="p-4">
              <div className="grid grid-cols-7 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 text-center font-bold text-xs py-2">
                {WEEK_DAYS_FULL_FR.map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 mt-2">
                {Array.from({ length: 35 }).map((_, i) => {
                  const dayNum = i + 1;
                  return (
                    <div
                      key={i}
                      onClick={() => handleOpenCreateModal()}
                      className="min-h-[90px] p-2 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-white/5 hover:border-emerald-500 cursor-pointer"
                    >
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{dayNum <= 31 ? dayNum : ''}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fallback View: List Mode */}
          {viewMode === 'list' && (
            <div className="p-4 flex flex-col gap-2">
              {filteredAppts.slice(0, 20).map((appt) => {
                const patObj = appt.patientId && typeof appt.patientId === 'object' ? (appt.patientId as Patient) : null;
                return (
                  <div
                    key={appt._id}
                    onClick={() => setSelectedApptDetail(appt)}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 flex items-center justify-between cursor-pointer hover:border-blue-400"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-xs bg-blue-600 text-white px-2 py-1 rounded-lg">
                        {formatTime(appt.dateTime)}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">{patObj?.name || 'Patient'}</h4>
                        <p className="text-[11px] text-slate-500">{formatDate(appt.dateTime)} • {appt.notes || 'Consultation'}</p>
                      </div>
                    </div>
                    <span className="text-xxs font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10">
                      {appt.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* ======================================================================= */}
        {/* B. DENTISTO RIGHT CLINIC PANEL (lg:col-span-3)                          */}
        {/* ======================================================================= */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          
          {/* 1. Doctor Profile Pill */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-xs shadow-2xs">
                ST
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Dr. Salma Tijini
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  En consultation
                </span>
              </div>
            </div>
          </div>

          {/* 2. Salle d'attente (Waiting Room Widget - Exact Dentisto Look) */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2">
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Salle d'attente</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 text-[10px] font-bold">
                  {waitingRoom.length}
                </span>
              </h3>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsWaitingModalOpen(true)}
                  className="p-1 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 cursor-pointer"
                  title="Ajouter un patient"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => waitingRoom[0] && handleCallPatient(waitingRoom[0])}
                  className="p-1 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 cursor-pointer"
                  title="Faire entrer le prochain patient"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Waiting List */}
            <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto no-scrollbar pr-1">
              {waitingRoom.length === 0 ? (
                <div className="py-4 text-center text-[11px] text-slate-400">
                  Salle d'attente vide
                </div>
              ) : (
                waitingRoom.map((wPatient) => (
                  <div
                    key={wPatient.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-white/5 flex items-center justify-between gap-2 hover:border-emerald-300 transition-all"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {wPatient.name}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Arrivé(e) à {wPatient.arrivedAt} • {wPatient.act}
                      </span>
                    </div>

                    <button
                      onClick={() => handleCallPatient(wPatient)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xxs font-bold flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                    >
                      <span>Faire Entrer</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Dentisto Quick Add Button */}
            <button
              type="button"
              onClick={() => setIsWaitingModalOpen(true)}
              className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ajouter au salle d'attente</span>
            </button>
          </div>

          {/* 3. Tâches du Jour Widget (Exact Dentisto Look) */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2">
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>Tâches auj.</span>
              </h3>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsTaskModalOpen(true)}
                  className="p-1 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 cursor-pointer"
                  title="Ajouter tâche"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] text-slate-400 font-semibold">Mes tâches</span>
              </div>
            </div>

            {/* Tasks List */}
            <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto no-scrollbar">
              {dailyTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                      task.done
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-300 dark:border-white/20'
                    }`}
                  >
                    {task.done && <Check className="w-3 h-3" />}
                  </div>
                  <span
                    className={`text-xs truncate ${
                      task.done ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200 font-medium'
                    }`}
                  >
                    {task.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Big Dentisto Checkmark Circle Widget */}
            <div className="pt-2 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-2 border-emerald-500/30 flex items-center justify-center bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600">
                <Check className="w-6 h-6" />
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 🌟 3. SELECTED APPOINTMENT QUICK ACTION MODAL                             */}
      {/* ========================================================================= */}
      {selectedApptDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl p-6 flex flex-col gap-5 animate-in zoom-in-95 duration-150">
            
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-white/10 pb-4">
              <div>
                <span className="text-xxs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest font-mono">
                  {formatDate(selectedApptDetail.dateTime)} à {formatTime(selectedApptDetail.dateTime)}
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {typeof selectedApptDetail.patientId === 'object' ? (selectedApptDetail.patientId as any)?.name : 'Patient'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedApptDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-100 dark:border-white/5">
                <span className="font-semibold text-slate-500">Statut actuel :</span>
                <span className="px-2.5 py-1 rounded-full text-xxs font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                  {selectedApptDetail.status}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-100 dark:border-white/5">
                <span className="font-semibold text-slate-500">Durée de la consultation :</span>
                <span className="font-bold text-slate-800 dark:text-white font-mono">
                  {selectedApptDetail.duration} minutes
                </span>
              </div>

              {selectedApptDetail.notes && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-100 dark:border-white/5">
                  <span className="font-semibold text-slate-500 block mb-1">Motif / Soin Prévu :</span>
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {selectedApptDetail.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Quick Status Toggles */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Changer le statut :</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedApptDetail._id, 'Confirmed')}
                  className={`py-2 px-1 rounded-xl text-xxs font-bold border transition-all cursor-pointer ${
                    selectedApptDetail.status === 'Confirmed'
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
                  }`}
                >
                  ✓ Confirmé
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedApptDetail._id, 'In Treatment')}
                  className={`py-2 px-1 rounded-xl text-xxs font-bold border transition-all cursor-pointer ${
                    selectedApptDetail.status === 'In Treatment'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  ⏳ En Soin
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedApptDetail._id, 'Completed')}
                  className={`py-2 px-1 rounded-xl text-xxs font-bold border transition-all cursor-pointer ${
                    selectedApptDetail.status === 'Completed'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  ✅ Terminé
                </button>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
              <button
                type="button"
                onClick={() => handleSendWhatsAppReminder(selectedApptDetail)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Rappel WhatsApp</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(selectedApptDetail)}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Modifier</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteAppointment(selectedApptDetail._id)}
                  className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🌟 4. CREATE / EDIT APPOINTMENT MODAL                                     */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl p-6 flex flex-col gap-5 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/10 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editApptId ? 'Modifier le Rendez-vous' : 'Planifier un Rendez-vous'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAppointment} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Patient *</label>
                <SearchablePatientSelect
                  patients={patients}
                  selectedId={selectedPatientId}
                  onChange={(id) => setSelectedPatientId(id)}
                />
              </div>

              <CustomDatePicker
                label="Date et Heure du Rendez-vous *"
                required
                enableTime={true}
                value={dateTime}
                onChange={(val) => setDateTime(val)}
                placeholder="JJ/MM/AAAA à HH:MM"
              />

              {/* Duration and Status Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Durée Prévue</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white font-medium cursor-pointer"
                  >
                    <option value="15">15 min</option>
                    <option value="30">30 min (Standard)</option>
                    <option value="45">45 min</option>
                    <option value="60">60 min (1 heure)</option>
                    <option value="90">90 min (1h30)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Statut du RDV</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white font-medium cursor-pointer"
                  >
                    <option value="Scheduled">Planifié</option>
                    <option value="Confirmed">Confirmé</option>
                    <option value="In Treatment">En Soin</option>
                    <option value="Completed">Terminé</option>
                    <option value="Cancelled">Annulé</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Motif / Acte Prévu</label>
                <input
                  type="text"
                  placeholder="ex: Soins, Orthodontie, Détartrage, Chirurgie..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  {submitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🌟 5. ADD TO WAITING ROOM MODAL                                           */}
      {/* ========================================================================= */}
      {isWaitingModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/10 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Ajouter un Patient en Salle d'Attente
              </h3>
              <button
                onClick={() => setIsWaitingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Sélectionner un Patient *
                </label>
                <SearchablePatientSelect
                  patients={patients}
                  selectedId={waitingPatientId}
                  onChange={(id) => {
                    setWaitingPatientId(id);
                    const p = patients.find((pat) => pat._id === id);
                    if (p) setWaitingPatientName(p.name);
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Motif / Soin Prévu
                </label>
                <input
                  type="text"
                  placeholder="ex: Consultation, Détartrage, Urgence, Contrôle..."
                  value={waitingPatientAct}
                  onChange={(e) => setWaitingPatientAct(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-white/10 text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
              <button
                onClick={() => setIsWaitingModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleAddWaitingPatient}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🌟 6. ADD TASK MODAL                                                      */}
      {/* ========================================================================= */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl p-6 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Nouvelle Tâche Clinique
            </h3>

            <input
              type="text"
              placeholder="Description de la tâche..."
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border text-xs bg-slate-50 dark:bg-slate-950"
            />

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="px-3 py-1.5 rounded-xl border text-xs text-slate-600"
              >
                Annuler
              </button>
              <button
                onClick={handleAddTask}
                className="px-4 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
