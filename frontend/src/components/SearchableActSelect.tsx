import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Sparkles, Tag, Plus } from 'lucide-react';
import { DentalAct } from '../types';

interface SearchableActSelectProps {
  acts: DentalAct[];
  selectedId?: string;
  onSelect: (act: DentalAct) => void;
  onClear?: () => void;
  onAddNewAct?: (queryText: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchableActSelect: React.FC<SearchableActSelectProps> = ({
  acts,
  selectedId,
  onSelect,
  onClear,
  onAddNewAct,
  placeholder = 'Tapez directement pour chercher (ex: ortho, détartrage, composite...)',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedAct = useMemo(() => {
    return acts.find((a) => a._id === selectedId);
  }, [acts, selectedId]);

  // Synchronize query with selected act name when selectedId changes or on initial mount
  useEffect(() => {
    if (selectedAct) {
      setQuery(selectedAct.name);
    } else if (!selectedId) {
      setQuery('');
    }
  }, [selectedAct, selectedId]);

  // Filter acts based on query
  const filteredActs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return acts;

    // If query matches exactly the selected act name, show all acts so user can still switch
    if (selectedAct && q === selectedAct.name.toLowerCase()) {
      return acts;
    }

    return acts.filter((act) => {
      const nameMatch = (act.name || '').toLowerCase().includes(q);
      const catMatch = (act.category || '').toLowerCase().includes(q);
      const codeMatch = (act.code || '').toLowerCase().includes(q);
      return nameMatch || catMatch || codeMatch;
    });
  }, [acts, query, selectedAct]);

  // Reset highlight index when filtered list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredActs]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // If query was partially typed but no act selected, revert to selected act or leave as is
        if (selectedAct) {
          setQuery(selectedAct.name);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedAct]);

  const handleSelect = (act: DentalAct) => {
    setQuery(act.name);
    onSelect(act);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuery('');
    if (onClear) onClear();
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        return;
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredActs.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredActs.length - 1));
    } else if (e.key === 'Enter') {
      if (isOpen && filteredActs[highlightedIndex]) {
        e.preventDefault();
        handleSelect(filteredActs[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* DIRECT EDITABLE INPUT CONTAINER */}
      <div
        className={`relative flex items-center w-full min-h-[46px] rounded-xl border transition-all ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white dark:bg-slate-900 shadow-md'
            : 'border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-white/20'
        }`}
      >
        {/* Search Icon */}
        <div className="pl-3.5 pr-2 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4 text-blue-500" />
        </div>

        {/* The Direct Search Input where the user can write directly */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium focus:outline-none py-2.5 pr-2"
        />

        {/* Selected Act Price Badge */}
        {selectedAct && (
          <div className="shrink-0 flex items-center mr-1">
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded-md">
              {(selectedAct.defaultPrice || 0).toFixed(2)} DH
            </span>
          </div>
        )}

        {/* Action icons on right: Clear button & Chevron */}
        <div className="pr-3 flex items-center gap-1 shrink-0 text-slate-400">
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Effacer la saisie"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setIsOpen(!isOpen);
              if (!isOpen) inputRef.current?.focus();
            }}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            title="Afficher la liste complète"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* DROPDOWN AUTOCOMPLETE LIST */}
      {isOpen && (
        <div className="absolute top-[calc(100%+6px)] left-0 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 flex flex-col animate-in fade-in zoom-in-95 duration-150 max-h-[310px]">
          {/* Header count info + Quick Add Button */}
          <div className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-950/70 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-1.5">
              <span>Catalogue des Actes ({filteredActs.length})</span>
              {query && <span className="lowercase font-normal text-slate-400 truncate max-w-[120px]">"{query}"</span>}
            </div>

            {onAddNewAct && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAddNewAct(query);
                  setIsOpen(false);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 normal-case px-2 py-0.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Ajouter modèle</span>
              </button>
            )}
          </div>

          {/* Acts List */}
          <div className="overflow-y-auto no-scrollbar py-1 divide-y divide-slate-100 dark:divide-white/5 flex flex-col max-h-[220px]">
            {filteredActs.length === 0 ? (
              <div className="py-6 px-4 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                <Tag className="w-6 h-6 opacity-30 text-blue-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Aucun acte trouvé pour "{query}"
                </span>
                {onAddNewAct ? (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onAddNewAct(query);
                      setIsOpen(false);
                    }}
                    className="mt-1 flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Créer l'acte "{query}" au catalogue</span>
                  </button>
                ) : (
                  <span className="text-[10px]">Vous pouvez continuer la saisie manuelle ci-dessous.</span>
                )}
              </div>
            ) : (
              filteredActs.map((act, idx) => {
                const isSelected = act._id === selectedId;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <button
                    key={act._id}
                    type="button"
                    onClick={() => handleSelect(act)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full text-left px-3.5 py-2.5 text-xs transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                      isHighlighted || isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100 font-bold'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors text-xs font-bold ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-blue-100 group-hover:text-blue-700 dark:group-hover:bg-blue-900/40 dark:group-hover:text-blue-300'
                        }`}
                      >
                        🦷
                      </span>

                      <div className="flex flex-col truncate">
                        <span className={`font-bold truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-900 dark:text-white'}`}>
                          {act.name}
                        </span>
                        <div className="text-[10px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                          {act.category && <span>{act.category}</span>}
                          {act.code && <span>• Réf: {act.code}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono text-xs bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/20">
                        {(act.defaultPrice || 0).toFixed(2)} DH
                      </span>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Bottom Action Footer if list has items */}
          {onAddNewAct && filteredActs.length > 0 && (
            <div className="p-2 border-t border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-slate-950/60">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAddNewAct(query);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs font-bold transition-all cursor-pointer border border-blue-200/60 dark:border-blue-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter un nouvel acte au catalogue dentaire</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
