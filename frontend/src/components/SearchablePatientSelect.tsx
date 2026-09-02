import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, User, Check, X, Phone, CreditCard } from 'lucide-react';
import { Patient } from '../types';

interface SearchablePatientSelectProps {
  patients: Patient[];
  selectedId: string;
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchablePatientSelect: React.FC<SearchablePatientSelectProps> = ({
  patients,
  selectedId,
  onChange,
  placeholder = 'Sélectionner ou rechercher un patient...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedPatient = useMemo(() => {
    return patients.find((p) => p._id === selectedId);
  }, [patients, selectedId]);

  // When opening dropdown, autofocus the search input
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter patients based on search query (name, phone, CNIE)
  const filteredPatients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return patients;

    return patients.filter((p) => {
      const nameMatch = (p.name || '').toLowerCase().includes(query);
      const phoneMatch = (p.phone || '').toLowerCase().includes(query);
      const cnieMatch = (p.nationalId || '').toLowerCase().includes(query);
      return nameMatch || phoneMatch || cnieMatch;
    });
  }, [patients, searchQuery]);

  const handleSelect = (patientId: string) => {
    onChange(patientId);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  const getInitials = (name: string) => {
    if (!name) return 'P';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full min-h-[46px] px-3.5 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-all cursor-pointer border ${
          isOpen
            ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-white dark:bg-slate-900 shadow-sm'
            : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 hover:border-slate-300 dark:hover:border-white/20'
        }`}
      >
        {selectedPatient ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-extrabold text-xxs flex items-center justify-center shrink-0 border border-emerald-300 dark:border-emerald-500/30">
              {getInitials(selectedPatient.name)}
            </div>
            <div className="flex flex-col text-left truncate">
              <span className="font-extrabold text-slate-900 dark:text-white truncate">
                {selectedPatient.name}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
                {selectedPatient.phone && <span>Tél : {selectedPatient.phone}</span>}
                {selectedPatient.nationalId && (
                  <span>• CNIE : {selectedPatient.nationalId}</span>
                )}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
            <User className="w-4 h-4" />
            <span className="font-medium">{placeholder}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
          {selectedPatient && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Désélectionner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-[calc(100%+6px)] left-0 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 flex flex-col animate-in fade-in zoom-in-95 duration-150 max-h-[320px]">
          
          {/* Search Bar inside dropdown */}
          <div className="p-2.5 border-b border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-slate-950/60 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Rechercher par nom, téléphone, CNIE..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Header count info */}
          <div className="px-3 py-1.5 bg-slate-100/50 dark:bg-white/3 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-white/5">
            <span>Liste des Patients</span>
            <span>{filteredPatients.length} patient(s)</span>
          </div>

          {/* Patients List */}
          <div className="overflow-y-auto no-scrollbar py-1 divide-y divide-slate-100 dark:divide-white/5 flex flex-col">
            {filteredPatients.length === 0 ? (
              <div className="py-6 px-4 text-center flex flex-col items-center justify-center gap-1.5 text-slate-400">
                <User className="w-8 h-8 opacity-30" />
                <span className="text-xs font-semibold">Aucun patient trouvé pour "{searchQuery}"</span>
                <span className="text-[10px]">Vérifiez l'orthographe ou le numéro de téléphone</span>
              </div>
            ) : (
              filteredPatients.map((patient) => {
                const isSelected = patient._id === selectedId;
                return (
                  <button
                    key={patient._id}
                    type="button"
                    onClick={() => handleSelect(patient._id)}
                    className={`w-full text-left px-3.5 py-2.5 text-xs transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                      isSelected
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full font-extrabold text-xs flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-emerald-100 group-hover:text-emerald-700'
                        }`}
                      >
                        {getInitials(patient.name)}
                      </div>

                      <div className="flex flex-col truncate">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold truncate ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-white'}`}>
                            {patient.name}
                          </span>
                          {patient.gender && (
                            <span className="text-[9px] font-semibold text-slate-400 px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800">
                              {patient.gender === 'Male' ? 'H' : 'F'}
                            </span>
                          )}
                        </div>

                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-2 mt-0.5 font-medium">
                          {patient.phone && (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-2.5 h-2.5 opacity-60" />
                              {patient.phone}
                            </span>
                          )}
                          {patient.nationalId && (
                            <span className="flex items-center gap-1">
                              <CreditCard className="w-2.5 h-2.5 opacity-60" />
                              {patient.nationalId}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

        </div>
      )}
    </div>
  );
};
