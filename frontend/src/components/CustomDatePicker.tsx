import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Clock,
  Sparkles,
} from 'lucide-react';
import { calculateAge, formatDate, formatTime } from '../utils/dateUtils';

interface CustomDatePickerProps {
  value: string; // 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm' or ISO string
  onChange: (dateStr: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  showAge?: boolean;
  enableTime?: boolean;
  align?: 'left' | 'right' | 'auto';
  maxDate?: string;
  minDate?: string;
  className?: string;
}

const MONTH_NAMES = [
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

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const HOURS = Array.from({ length: 14 }, (_, i) => String(i + 8).padStart(2, '0')); // 08:00 to 21:00
const MINUTES = ['00', '15', '30', '45'];

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder,
  required = false,
  showAge = false,
  enableTime = false,
  align = 'auto',
  maxDate,
  minDate,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');

  // Default placeholder
  const effectivePlaceholder = placeholder || (enableTime ? 'JJ/MM/AAAA à HH:MM' : 'JJ/MM/AAAA');

  // Current view states for calendar navigation
  const [viewYear, setViewYear] = useState<number>(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d.getFullYear();
    }
    return new Date().getFullYear();
  });

  const [viewMonth, setViewMonth] = useState<number>(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d.getMonth();
    }
    return new Date().getMonth();
  });

  // Time state (Hour and Minute)
  const [selectedHour, setSelectedHour] = useState<string>('09');
  const [selectedMinute, setSelectedMinute] = useState<string>('00');

  const [quickAge, setQuickAge] = useState('');
  const [computedAlign, setComputedAlign] = useState<'left' | 'right'>('left');

  // Compute smart popup alignment (left or right)
  useEffect(() => {
    if (isOpen && containerRef.current) {
      if (align === 'right') {
        setComputedAlign('right');
      } else if (align === 'left') {
        setComputedAlign('left');
      } else {
        const rect = containerRef.current.getBoundingClientRect();
        const screenWidth = window.innerWidth;
        if (rect.right + 260 > screenWidth || rect.left > screenWidth / 2) {
          setComputedAlign('right');
        } else {
          setComputedAlign('left');
        }
      }
    }
  }, [isOpen, align]);

  // Safe date parser to avoid UTC timezone shifts
  const parseDateSafely = (val: string) => {
    if (!val) return null;
    if (val.includes('-')) {
      const [datePart, timePart] = val.split('T');
      const [y, m, d] = datePart.split('-').map(Number);
      let hour = '09';
      let minute = '00';
      if (timePart) {
        const [h, min] = timePart.split(':');
        if (h) hour = h.padStart(2, '0');
        if (min) minute = min.slice(0, 2).padStart(2, '0');
      }
      if (y && m && d) {
        return {
          year: y,
          month: m - 1, // 0-indexed for JS Date
          day: d,
          hour,
          minute,
        };
      }
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return {
        year: d.getFullYear(),
        month: d.getMonth(),
        day: d.getDate(),
        hour: String(d.getHours()).padStart(2, '0'),
        minute: String(d.getMinutes()).padStart(2, '0'),
      };
    }
    return null;
  };

  // Sync formatted text input value when prop `value` changes
  useEffect(() => {
    if (value) {
      const parsed = parseDateSafely(value);
      if (parsed) {
        const dd = String(parsed.day).padStart(2, '0');
        const mm = String(parsed.month + 1).padStart(2, '0');
        const yyyy = parsed.year;

        setSelectedHour(parsed.hour);
        setSelectedMinute(parsed.minute);

        if (enableTime) {
          setInputValue(`${dd}/${mm}/${yyyy} à ${parsed.hour}:${parsed.minute}`);
        } else {
          setInputValue(`${dd}/${mm}/${yyyy}`);
        }

        setViewYear(yyyy);
        setViewMonth(parsed.month);
        return;
      }
    }
    setInputValue('');
  }, [value, enableTime]);


  // Click outside to close popup
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate Year options (from 1920 to currentYear + 10)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1920 + 15 }, (_, i) => currentYear + 10 - i);

  // Month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Helper to emit date / datetime
  const emitValue = (year: number, month: number, day: number, hour?: string, min?: string) => {
    const yyyy = year;
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const h = hour || selectedHour;
    const m = min || selectedMinute;

    if (enableTime) {
      onChange(`${yyyy}-${mm}-${dd}T${h}:${m}`);
    } else {
      onChange(`${yyyy}-${mm}-${dd}`);
    }
  };

  // Select day
  const handleSelectDay = (day: number) => {
    emitValue(viewYear, viewMonth, day);
    if (!enableTime) {
      setIsOpen(false);
    }
  };

  // Time changes
  const handleHourChange = (newHour: string) => {
    setSelectedHour(newHour);
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        emitValue(d.getFullYear(), d.getMonth(), d.getDate(), newHour, selectedMinute);
        return;
      }
    }
    emitValue(viewYear, viewMonth, new Date().getDate(), newHour, selectedMinute);
  };

  const handleMinuteChange = (newMin: string) => {
    setSelectedMinute(newMin);
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        emitValue(d.getFullYear(), d.getMonth(), d.getDate(), selectedHour, newMin);
        return;
      }
    }
    emitValue(viewYear, viewMonth, new Date().getDate(), selectedHour, newMin);
  };

  // Quick Age input helper
  const handleApplyAge = (e: React.FormEvent) => {
    e.preventDefault();
    const ageNum = parseInt(quickAge, 10);
    if (!isNaN(ageNum) && ageNum > 0 && ageNum < 120) {
      const birthYear = currentYear - ageNum;
      const defaultMonth = 5; // June mid-year
      const defaultDay = 15;
      const yyyy = birthYear;
      const mm = String(defaultMonth + 1).padStart(2, '0');
      const dd = String(defaultDay).padStart(2, '0');
      onChange(`${yyyy}-${mm}-${dd}`);
      setViewYear(birthYear);
      setViewMonth(defaultMonth);
      setQuickAge('');
      setIsOpen(false);
    }
  };

  // Set today
  const handleSetToday = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = today.getMonth();
    const dd = today.getDate();
    emitValue(yyyy, mm, dd);
    setViewYear(yyyy);
    setViewMonth(mm);
    if (!enableTime) {
      setIsOpen(false);
    }
  };

  // Direct manual input typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    setInputValue(raw);

    // If pure date mode, parse DD/MM/YYYY
    if (!enableTime) {
      const parts = raw.split('/');
      if (parts.length === 3 && parts[2].length === 4) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);

        if (d >= 1 && d <= 31 && m >= 0 && m <= 11 && y >= 1900 && y <= 2100) {
          const parsedDate = new Date(y, m, d);
          if (!isNaN(parsedDate.getTime())) {
            const yyyy = parsedDate.getFullYear();
            const mm = String(parsedDate.getMonth() + 1).padStart(2, '0');
            const dd = String(parsedDate.getDate()).padStart(2, '0');
            onChange(`${yyyy}-${mm}-${dd}`);
            setViewYear(yyyy);
            setViewMonth(m);
          }
        }
      }
    }
  };

  // Clear date
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setInputValue('');
  };

  // Build calendar matrix (Days of previous month, current month, next month)
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
  const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Selected date comparison
  const selectedDateObj = value ? new Date(value) : null;
  const isSelectedDay = (day: number) => {
    if (!selectedDateObj || isNaN(selectedDateObj.getTime())) return false;
    return (
      selectedDateObj.getDate() === day &&
      selectedDateObj.getMonth() === viewMonth &&
      selectedDateObj.getFullYear() === viewYear
    );
  };

  const isTodayDay = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === viewMonth &&
      today.getFullYear() === viewYear
    );
  };

  const calculatedAge = showAge && value ? calculateAge(value) : null;

  return (
    <div ref={containerRef} className={`relative flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 pl-0.5 flex justify-between items-center">
          <span>{label}</span>
          {showAge && calculatedAge !== null && (
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-500/20">
              🎂 {calculatedAge} ans
            </span>
          )}
        </label>
      )}

      {/* Main Trigger Input Field */}
      <div
        onClick={() => setIsOpen(true)}
        className={`h-11 px-3.5 rounded-xl text-sm border flex items-center justify-between cursor-pointer transition-all ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white dark:bg-slate-900 shadow-md'
            : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 hover:border-slate-300 dark:hover:border-white/20'
        }`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {enableTime ? (
            <Clock
              className={`w-4 h-4 shrink-0 transition-colors ${
                isOpen ? 'text-blue-500' : 'text-slate-400'
              }`}
            />
          ) : (
            <CalendarIcon
              className={`w-4 h-4 shrink-0 transition-colors ${
                isOpen ? 'text-blue-500' : 'text-slate-400'
              }`}
            />
          )}
          <input
            type="text"
            required={required}
            placeholder={effectivePlaceholder}
            value={inputValue}
            onChange={handleInputChange}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(true);
            }}
            className="w-full bg-transparent text-xs sm:text-sm font-semibold font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none cursor-pointer truncate"
          />
        </div>

        {value && (
          <div className="flex items-center gap-1 shrink-0 ml-1.5">
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Effacer la date"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>


      {/* POPUP CALENDAR MODAL / DROPDOWN */}
      {isOpen && (
        <div
          className={`absolute top-[calc(100%+6px)] ${
            computedAlign === 'right' ? 'right-0' : 'left-0'
          } z-50 w-76 sm:w-84 max-w-[calc(100vw-32px)] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl p-4 flex flex-col gap-3.5 animate-in fade-in zoom-in-95 duration-150 select-none`}
        >
          {/* Header Controls: Month + Year Selectors */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
            {/* Prev month button */}
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shadow-xs"
              title="Mois précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Quick Month & Year Dropdowns */}
            <div className="flex items-center gap-1.5 flex-1 justify-center">
              {/* Month Select */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="h-8 px-2.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 focus:outline-none focus:border-blue-500 cursor-pointer shadow-xs"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Year Select (Fast jump without scrolling 50 times!) */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="h-8 px-2.5 rounded-lg text-xs font-bold font-mono bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 focus:outline-none focus:border-blue-500 cursor-pointer shadow-xs"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Next month button */}
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shadow-xs"
              title="Mois suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 text-center">
            {DAY_NAMES.map((d, i) => (
              <span
                key={i}
                className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider py-1"
              >
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Empty slots for previous month days */}
            {Array.from({ length: adjustedFirstDay }).map((_, i) => {
              const prevDayNum = daysInPrevMonth - adjustedFirstDay + i + 1;
              return (
                <span
                  key={`prev-${i}`}
                  className="h-8 flex items-center justify-center text-xs text-slate-300 dark:text-slate-700 font-medium select-none"
                >
                  {prevDayNum}
                </span>
              );
            })}

            {/* Current month active days */}
            {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isSelected = isSelectedDay(dayNum);
              const isToday = isTodayDay(dayNum);

              return (
                <button
                  key={dayNum}
                  type="button"
                  onClick={() => handleSelectDay(dayNum)}
                  className={`h-8 w-8 mx-auto rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30 scale-105'
                      : isToday
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-500/30'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{dayNum}</span>
                  {isToday && !isSelected && (
                    <span className="w-1 h-1 rounded-full bg-blue-500 absolute bottom-1"></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* TIME SELECTOR (IF enableTime = true) */}
          {enableTime && (
            <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-white/5 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span>Heure du Rendez-vous :</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {/* Hour dropdown */}
                  <select
                    value={selectedHour}
                    onChange={(e) => handleHourChange(e.target.value)}
                    className="h-8 px-2 rounded-lg text-xs font-bold font-mono bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 focus:outline-none focus:border-blue-500 cursor-pointer shadow-xs"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {h} h
                      </option>
                    ))}
                  </select>
                  <span className="font-bold text-slate-400">:</span>
                  {/* Minute dropdown */}
                  <select
                    value={selectedMinute}
                    onChange={(e) => handleMinuteChange(e.target.value)}
                    className="h-8 px-2 rounded-lg text-xs font-bold font-mono bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 focus:outline-none focus:border-blue-500 cursor-pointer shadow-xs"
                  >
                    {MINUTES.map((m) => (
                      <option key={m} value={m}>
                        {m} min
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Time Chips */}
              <div className="flex items-center gap-1.5 justify-center flex-wrap pt-1">
                {['09:00', '10:30', '14:30', '16:00', '17:30'].map((timeStr) => {
                  const [h, m] = timeStr.split(':');
                  const isCurrentTime = selectedHour === h && selectedMinute === m;
                  return (
                    <button
                      key={timeStr}
                      type="button"
                      onClick={() => {
                        handleHourChange(h);
                        handleMinuteChange(m);
                      }}
                      className={`px-2 py-0.5 rounded-md text-[10.5px] font-mono font-bold transition-all cursor-pointer ${
                        isCurrentTime
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {timeStr}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Shortcuts & Age Input Footer */}
          <div className="flex flex-col gap-2.5 border-t border-slate-100 dark:border-white/5 pt-3 mt-1">
            {showAge && (
              <div className="flex items-center justify-between gap-1.5 bg-slate-50 dark:bg-slate-950/60 p-1.5 rounded-xl border border-slate-100 dark:border-white/5">
                <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap pl-1">
                  Âge direct :
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="Ex: 34"
                    value={quickAge}
                    onChange={(e) => setQuickAge(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyAge(e)}
                    className="h-7 w-16 px-2 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={handleApplyAge}
                    className="h-7 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold transition-all cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    Appliquer
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={handleSetToday}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Aujourd'hui</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Valider</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
