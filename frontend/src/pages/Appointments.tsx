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

const WEEK_DAYS_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export const Appointments: React.FC = () => {
  const { token } = useAuth();
  const { toast, confirm } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  const todayDate = new Date();
  const [currentYear, setCurrentYear] = useState<number>(todayDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(todayDate.getMonth());

  const [dateFilterMode, setDateFilterMode] = useState<'Today' | 'Week' | 'Month' | 'All'>('Month');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [chairFilter, setChairFilter] = useState<string>('All');

  const [selectedDayDetail, setSelectedDayDetail] = useState<{ date: Date; dateStr: string; appts: Appointment[] } | null>(null);
  const [selectedApptDetail, setSelectedApptDetail] = useState<Appointment | null>(null);

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
    fetch(`${API_URL}/patients?limit=150`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setPatients(data.patients || (Array.isArray(data) ? data : [])))
      .catch((err) => console.error('Error fetching patients:', err));
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleGoToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDate(now.toISOString().slice(0, 10));
  };

  const handleOpenCreateModal = (prefillDate?: Date) => {
    setEditApptId(null);
    setSelectedPatientId(patients[0]?._id || '');

    const targetDate = prefillDate || new Date();
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const hours = '09';
    const minutes = '00';

    setDateTime(`${yyyy}-${mm}-${dd}T${hours}:${minutes}`);
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
    const message = `Bonjour ${patientObj.name},\n\nNous vous rappelons votre rendez-vous au Cabinet Dentaire Dr. Salma Tijini prévu le ${apptDateStr} à ${apptTimeStr}.\n\n🦷 Soin prévu : ${appt.notes || 'Consultation'}\n\nMerci de confirmer ou modifier votre présence en cas d'empêchement.`;

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

      if (viewMode === 'list') {
        const apptDate = new Date(appt.dateTime);
        const selDateObj = new Date(selectedDate);
        if (dateFilterMode === 'Today') return apptDate.toDateString() === selDateObj.toDateString();
        if (dateFilterMode === 'Month') return apptDate.getMonth() === currentMonth && apptDate.getFullYear() === currentYear;
      }
      return true;
    });
  }, [appointments, searchQuery, statusFilter, chairFilter, viewMode, dateFilterMode, selectedDate, currentMonth, currentYear]);

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

  const calendarGrid = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
    const cells: any[] = [];
    const todayStr = new Date().toDateString();

    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const dateObj = new Date(currentMonth === 0 ? currentYear - 1 : currentYear, currentMonth === 0 ? 11 : currentMonth - 1, dayNum);
      cells.push({ dayNumber: dayNum, isCurrentMonth: false, dateObj, dateKey: getApptDateKey(dateObj.toISOString()), isToday: false, appts: appointmentsByDate.get(getApptDateKey(dateObj.toISOString())) || [] });
    }
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const dateObj = new Date(currentYear, currentMonth, dayNum);
      cells.push({ dayNumber: dayNum, isCurrentMonth: true, dateObj, dateKey: getApptDateKey(dateObj.toISOString()), isToday: dateObj.toDateString() === todayStr, appts: appointmentsByDate.get(getApptDateKey(dateObj.toISOString())) || [] });
    }
    while (cells.length < 42) {
      const dayNum = cells.length - (adjustedFirstDay + daysInCurrentMonth) + 1;
      const dateObj = new Date(currentMonth === 11 ? currentYear + 1 : currentYear, currentMonth === 11 ? 0 : currentMonth + 1, dayNum);
      cells.push({ dayNumber: dayNum, isCurrentMonth: false, dateObj, dateKey: getApptDateKey(dateObj.toISOString()), isToday: false, appts: appointmentsByDate.get(getApptDateKey(dateObj.toISOString())) || [] });
    }
    return cells;
  }, [currentYear, currentMonth, appointmentsByDate]);

  const getStatusChipStyles = (apptStatus: string) => {
    switch (apptStatus) {
      case 'Completed': return 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300';
      case 'Confirmed': return 'bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-500/15 dark:text-teal-300';
      case 'In Treatment': return 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300';
      default: return 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-500/15 dark:text-blue-300';
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 flex flex-col gap-6 overflow-y-auto no-scrollbar max-h-[calc(100vh-80px)] font-sans select-none">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Agenda</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10">
            <button onClick={() => setViewMode('calendar')} className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold ${viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>
              <CalendarDays className="w-4 h-4" /> Grille
            </button>
            <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>
              <List className="w-4 h-4" /> Liste
            </button>
          </div>
          <button onClick={() => handleOpenCreateModal()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs">
            <Plus className="w-4 h-4" /> Nouveau
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🌟 1. CANVA-STYLE MONTHLY CALENDAR GRID VIEW                              */}
      {/* ========================================================================= */}
      {viewMode === 'calendar' && (
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col">
          
          {/* A. Canva-Inspired Header (Month Centered, Year on Right, Navigation on Left) */}
          <div className="px-6 py-6 md:px-8 md:py-8 bg-gradient-to-b from-amber-50/20 via-white to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Left: Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-all shadow-xs cursor-pointer"
                title="Mois Précédent"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={handleGoToday}
                className="px-4 py-2 rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Aujourd'hui</span>
              </button>

              <button
                onClick={handleNextMonth}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-all shadow-xs cursor-pointer"
                title="Mois Suivant"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Center: Large Aesthetic Month Typography (Canva Style) */}
            <div className="text-center">
              <h2 className="text-3xl md:text-5xl font-serif tracking-tight text-slate-900 dark:text-white capitalize">
                {MONTH_NAMES_FR[currentMonth]}
              </h2>
            </div>

            {/* Right: Year Typography + Month Select */}
            <div className="flex items-center gap-3">
              <span className="text-2xl md:text-4xl font-serif text-slate-800 dark:text-slate-200 font-normal">
                {currentYear}
              </span>
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(parseInt(e.target.value, 10))}
                className="h-9 px-3 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold cursor-pointer"
              >
                {MONTH_NAMES_FR.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* B. Weekday Names (7 Columns: Lundi -> Dimanche in Canva Italic Style) */}
          <div className="grid grid-cols-7 border-b border-slate-300 dark:border-white/10 bg-slate-50/90 dark:bg-slate-950/80 text-center">
            {WEEK_DAYS_FR.map((dayName, idx) => (
              <div
                key={dayName}
                className={`py-3 px-1 border-r border-slate-200 dark:border-white/10 last:border-r-0 ${
                  idx >= 5 ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="font-serif italic text-xs md:text-sm tracking-wide block">
                  {dayName}
                </span>
              </div>
            ))}
          </div>

          {/* C. Monthly Calendar Grid (Canva Style Boxed Cells) */}
          {loading ? (
            <div className="flex items-center justify-center py-28">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-7 bg-slate-300 dark:bg-white/10 gap-[1px]">
              {calendarGrid.map((cell, cellIdx) => {
                const isCellCurrentMonth = cell.isCurrentMonth;
                const hasAppts = cell.appts.length > 0;
                const displayAppts = cell.appts.slice(0, 3);
                const extraCount = cell.appts.length - displayAppts.length;

                return (
                  <div
                    key={`${cell.dateKey}-${cellIdx}`}
                    onClick={() => handleOpenCreateModal(cell.dateObj)}
                    className={`min-h-[115px] md:min-h-[140px] p-2 flex flex-col justify-between transition-all group relative cursor-pointer ${
                      isCellCurrentMonth
                        ? cell.isToday
                          ? 'bg-blue-50/60 dark:bg-blue-950/40 ring-2 ring-blue-500/50'
                          : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        : 'bg-slate-100/60 dark:bg-slate-950/40 text-slate-400 dark:text-slate-600 opacity-50'
                    }`}
                  >
                    
                    {/* Top Row: Day Number in Top Right (Canva Style) & Appt Count */}
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        {hasAppts && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 font-mono">
                            {cell.appts.length} RDV
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-xs md:text-sm font-serif font-semibold transition-all ${
                          cell.isToday
                            ? 'w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shadow-md shadow-blue-500/30'
                            : isCellCurrentMonth
                            ? 'text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                            : 'text-slate-400 dark:text-slate-600'
                        }`}
                      >
                        {String(cell.dayNumber).padStart(2, '0')}
                      </span>
                    </div>

                    {/* Middle: Appointment Pills */}
                    <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                      {displayAppts.map((appt: any) => {
                        const pat: any = appt.patientId;
                        const patName = pat?.name || 'Patient';

                        return (
                          <div
                            key={appt._id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedApptDetail(appt);
                            }}
                            className={`px-2 py-1 rounded-lg text-xxs font-semibold border flex items-center justify-between gap-1 shadow-2xs hover:scale-[1.02] hover:shadow-xs transition-all cursor-pointer truncate ${getStatusChipStyles(
                              appt.status
                            )}`}
                            title={`${formatTime(appt.dateTime)} - ${patName} (${appt.status})`}
                          >
                            <span className="font-mono font-bold shrink-0">{formatTime(appt.dateTime)}</span>
                            <span className="truncate flex-1 font-medium">{patName}</span>
                          </div>
                        );
                      })}

                      {/* "+X autres" Button */}
                      {extraCount > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDayDetail({
                              date: cell.dateObj,
                              dateStr: cell.dateKey,
                              appts: cell.appts,
                            });
                          }}
                          className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline text-left mt-0.5 px-1 cursor-pointer"
                        >
                          +{extraCount} autre{extraCount > 1 ? 's' : ''}...
                        </button>
                      )}
                    </div>

                    {/* Empty Day Indicator on Hover */}
                    {!hasAppts && isCellCurrentMonth && (
                      <div className="opacity-0 group-hover:opacity-40 text-center py-1 text-[10px] text-slate-400">
                        + Ajouter
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* 🌟 2. CARDS & LIST VIEW                                                   */}
      {/* ========================================================================= */}
      {viewMode === 'list' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredAppts.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 text-center flex flex-col items-center justify-center gap-3 shadow-sm">
              <CalendarIcon className="w-12 h-12 text-slate-300 dark:text-slate-600" />
              <h4 className="text-base font-bold text-slate-800 dark:text-white">Aucun rendez-vous trouvé</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                Aucune consultation ne correspond aux critères ou à la date sélectionnée.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAppts.map((appt) => {
                const patientObj = appt.patientId && typeof appt.patientId === 'object' ? (appt.patientId as Patient) : null;
                const patientName = patientObj?.name || 'Patient';

                return (
                  <div
                    key={appt._id}
                    className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 p-5 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500/30 flex flex-col justify-between gap-4 transition-all group"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 font-mono">
                          <CalendarIcon className="w-4 h-4 text-blue-500" />
                          {formatDate(appt.dateTime)}
                        </span>

                        <span
                          className={`text-xxs font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                            appt.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400'
                              : appt.status === 'Confirmed'
                              ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/20 dark:text-teal-400'
                              : appt.status === 'In Treatment'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400'
                              : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400'
                          }`}
                        >
                          {appt.status}
                        </span>
                      </div>

                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {patientName}
                      </h3>

                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <strong className="text-slate-800 dark:text-white font-mono">{formatTime(appt.dateTime)}</strong>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Durée : {appt.duration} min</span>
                      </div>

                      {appt.notes && (
                        <p className="mt-3 text-xs leading-relaxed bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-300">
                          {appt.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/10 pt-3 mt-1">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleUpdateStatus(appt._id, 'Confirmed', e)}
                          title="Marquer Confirmé"
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleUpdateStatus(appt._id, 'In Treatment', e)}
                          title="Marquer En Soin"
                          className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:text-amber-400 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleUpdateStatus(appt._id, 'Completed', e)}
                          title="Marquer Terminé"
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 dark:text-blue-400 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => handleSendWhatsAppReminder(appt, e)}
                          title="Rappel WhatsApp"
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-600/20 dark:hover:bg-emerald-600/30 dark:text-emerald-400 cursor-pointer flex items-center gap-1 text-xxs font-bold shadow-xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(appt)}
                          className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteAppointment(appt._id, e)}
                          className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 cursor-pointer"
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
        </>
      )}

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
                <span className={`px-2.5 py-1 rounded-full text-xxs font-extrabold uppercase border ${getStatusChipStyles(selectedApptDetail.status)}`}>
                  {selectedApptDetail.status}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-100 dark:border-white/5">
                <span className="font-semibold text-slate-500">Durée & Fauteuil :</span>
                <span className="font-bold text-slate-800 dark:text-white">
                  {selectedApptDetail.duration} min • {selectedApptDetail.chair || 'Fauteuil'}
                </span>
              </div>

              {selectedApptDetail.notes && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-100 dark:border-white/5">
                  <span className="font-semibold text-slate-500 block mb-1">Motif / Notes :</span>
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {selectedApptDetail.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Status Quick Toggles */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-white/10">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Changer le statut :</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedApptDetail._id, 'Confirmed')}
                  className={`py-2 px-1 rounded-xl text-xxs font-bold border transition-all cursor-pointer ${
                    selectedApptDetail.status === 'Confirmed'
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100 dark:bg-teal-500/10 dark:text-teal-300'
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
                      : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300'
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
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300'
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
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Modifier</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteAppointment(selectedApptDetail._id)}
                  className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 cursor-pointer"
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
      {/* 🌟 4. ALL DAY APPOINTMENTS MODAL (from "+X autres")                       */}
      {/* ========================================================================= */}
      {selectedDayDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl max-h-[85vh] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-serif font-bold text-slate-900 dark:text-white">
                  Consultations du {formatDate(selectedDayDetail.dateStr)}
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  {selectedDayDetail.appts.length} rendez-vous programmés ce jour
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenCreateModal(selectedDayDetail.date);
                    setSelectedDayDetail(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter</span>
                </button>
                <button
                  onClick={() => setSelectedDayDetail(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
              {selectedDayDetail.appts.map((appt) => {
                const pat: any = appt.patientId;
                const patName = pat?.name || 'Patient';

                return (
                  <div
                    key={appt._id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/5 flex items-center justify-between gap-3 hover:border-blue-400 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="px-2.5 py-1.5 rounded-xl bg-blue-600 text-white font-mono font-bold text-xs shrink-0 shadow-xs">
                        {formatTime(appt.dateTime)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">{patName}</h4>
                        <p className="text-[11px] text-slate-500 truncate max-w-xs">{appt.notes || 'Consultation'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xxs font-bold uppercase border ${getStatusChipStyles(appt.status)}`}>
                        {appt.status}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedApptDetail(appt);
                          setSelectedDayDetail(null);
                        }}
                        className="p-1.5 rounded-lg bg-slate-200/60 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                        title="Détails"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🌟 5. CREATE & EDIT APPOINTMENT MODAL                                     */}
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
              
              {/* Patient Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Patient *</label>
                <SearchablePatientSelect
                  patients={patients}
                  selectedId={selectedPatientId}
                  onChange={(id) => setSelectedPatientId(id)}
                />
              </div>

              {/* Date & Time Input with CustomDatePicker */}
              <CustomDatePicker
                label="Date et Heure du Rendez-vous *"
                required
                enableTime={true}
                value={dateTime}
                onChange={(val) => setDateTime(val)}
                placeholder="JJ/MM/AAAA à HH:MM"
              />

              {/* Duration, Chair and Status Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Durée</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full h-11 px-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white font-medium cursor-pointer"
                  >
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">60 min</option>
                    <option value="90">90 min</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Fauteuil</label>
                  <select
                    value={chair}
                    onChange={(e) => setChair(e.target.value)}
                    className="w-full h-11 px-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white font-medium cursor-pointer"
                  >
                    <option value="Fauteuil">Principal</option>
                    <option value="Fauteuil 1">Fauteuil 1</option>
                    <option value="Fauteuil 2">Fauteuil 2</option>
                    <option value="Chirurgie">Chirurgie</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Statut</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full h-11 px-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white font-medium cursor-pointer"
                  >
                    <option value="Scheduled">Planifié</option>
                    <option value="Confirmed">Confirmé</option>
                    <option value="In Treatment">En Soin</option>
                    <option value="Completed">Terminé</option>
                    <option value="Cancelled">Annulé</option>
                    <option value="No Show">Absence</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Motif / Acte Prévu</label>
                <input
                  type="text"
                  placeholder="ex: Consultation, Détartrage, Pose d'implant..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md shadow-blue-500/20 cursor-pointer"
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
