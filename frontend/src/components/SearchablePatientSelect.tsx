import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { Patient } from '../types';

interface SearchablePatientSelectProps {
  patients: Patient[];
  selectedId: string;
  onChange: (id: string) => void;
  className?: string;
}

export const SearchablePatientSelect: React.FC<SearchablePatientSelectProps> = ({
  patients,
  selectedId,
  onChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize input value with current selection
  useEffect(() => {
    const selected = patients.find((p) => p._id === selectedId);
    if (selected) {
      setSearchTerm(selected.name);
    } else {
      setSearchTerm('');
    }
  }, [selectedId, patients]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset to original selected name on blur
        const selected = patients.find((p) => p._id === selectedId);
        if (selected) {
          setSearchTerm(selected.name);
        } else {
          setSearchTerm('');
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedId, patients]);

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.phone && p.phone.includes(searchTerm)) ||
    (p.nationalId && p.nationalId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelect = (patient: Patient) => {
    onChange(patient._id);
    setSearchTerm(patient.name);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          placeholder="Taper pour rechercher..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full h-11 pl-4 pr-10 rounded-xl text-sm glass-input placeholder-slate-600 cursor-pointer text-left"
        />
        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
      </div>

      {isOpen && (
        <div className="absolute top-12.5 left-0 w-full glass-panel border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 py-1 max-h-56 overflow-y-auto no-scrollbar">
          {filteredPatients.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-500 text-center">
              Aucun patient trouvé
            </div>
          ) : (
            filteredPatients.map((patient) => (
              <button
                key={patient._id}
                type="button"
                onClick={() => handleSelect(patient)}
                className={`w-full text-left px-4 py-2.5 text-xs hover:bg-white/5 transition-all flex flex-col ${
                  patient._id === selectedId ? 'bg-white/3 border-l-2 border-blue-500 pl-3.5' : 'text-slate-300 hover:text-white'
                }`}
              >
                <span className="font-semibold text-white">{patient.name}</span>
                <span className="text-[10px] text-slate-500 mt-0.5">
                  Tél : {patient.phone} {patient.nationalId ? `• CNIE : ${patient.nationalId}` : ''}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
