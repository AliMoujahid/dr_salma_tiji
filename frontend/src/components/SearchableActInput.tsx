import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Check, Sparkles, X, Plus } from 'lucide-react';
import { DentalAct } from '../types';

interface SearchableActInputProps {
  value: string;
  onSelectAct: (name: string, price: number) => void;
  onChangeText: (text: string) => void;
  onAddNewAct?: (prefillName: string) => void;
  dentalActs: DentalAct[];
  placeholder?: string;
  colorScheme?: 'purple' | 'blue';
}

export const SearchableActInput: React.FC<SearchableActInputProps> = ({
  value,
  onSelectAct,
  onChangeText,
  onAddNewAct,
  dentalActs,
  placeholder = "Rechercher ou saisir un acte (ex: Couronne...)",
  colorScheme = 'purple',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Floating coordinates for Portal rendering (fixed in viewport)
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    openUpwards: boolean;
  }>({
    left: 0,
    width: 380,
    openUpwards: false,
  });

  // Filter acts based on search query in input
  const filteredActs = useMemo(() => {
    if (!value || !value.trim()) return dentalActs;
    const q = value.toLowerCase().trim();
    return dentalActs.filter(
      (act) =>
        act.name.toLowerCase().includes(q) ||
        (act.category && act.category.toLowerCase().includes(q))
    );
  }, [dentalActs, value]);

  const updatePosition = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const dropdownHeight = 280; // Estimated max height
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

    const width = Math.max(rect.width, 380);
    let left = rect.left;
    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - width - 12);
    }

    if (openUpwards) {
      setCoords({
        bottom: window.innerHeight - rect.top + 6,
        left,
        width,
        openUpwards: true,
      });
    } else {
      setCoords({
        top: rect.bottom + 6,
        left,
        width,
        openUpwards: false,
      });
    }
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScroll = () => updatePosition();
      window.addEventListener('resize', handleScroll);
      window.addEventListener('scroll', handleScroll, true);
      return () => {
        window.removeEventListener('resize', handleScroll);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (act: DentalAct) => {
    onSelectAct(act.name, act.defaultPrice);
    setIsOpen(false);
  };

  const isPurple = colorScheme === 'purple';
  const focusBorderClass = isPurple ? 'focus:border-purple-500' : 'focus:border-blue-500';
  const badgeColorClass = isPurple
    ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 border-purple-200/60 dark:border-purple-500/20'
    : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-200/60 dark:border-blue-500/20';

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChangeText(e.target.value);
            if (!isOpen) {
              setIsOpen(true);
            } else {
              updatePosition();
            }
          }}
          onFocus={() => {
            setIsOpen(true);
            updatePosition();
          }}
          placeholder={placeholder}
          className={`w-full pl-2.5 pr-8 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none ${focusBorderClass} shadow-2xs transition-all`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            if (!isOpen) {
              setIsOpen(true);
              updatePosition();
            } else {
              setIsOpen(false);
            }
            inputRef.current?.focus();
          }}
          className={`absolute right-1.5 p-1 text-slate-400 ${
            isPurple ? 'hover:text-purple-500' : 'hover:text-blue-500'
          } transition-colors cursor-pointer`}
          title="Rechercher et choisir un acte dans le catalogue"
        >
          <Search className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Portal Dropdown Menu attached to document.body (Never clipped by overflow or table cells) */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 99999,
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.85)] max-h-72 overflow-y-auto no-scrollbar py-1 animate-in fade-in duration-100 backdrop-blur-md flex flex-col"
          >
            {filteredActs.length === 0 ? (
              <div className="flex flex-col">
                <div className="p-4 text-center text-slate-400 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-200 block mb-0.5">
                    Aucun acte trouvé pour "{value}".
                  </span>
                  <span className="text-xxs text-slate-400">
                    Vous pouvez créer cet acte immédiatement dans le catalogue :
                  </span>
                </div>
                {onAddNewAct && (
                  <div className="p-2.5 pt-0">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setIsOpen(false);
                        onAddNewAct(value);
                      }}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs ${
                        isPurple
                          ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/25'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Ajouter "{value || 'Nouvel Acte'}" au catalogue</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col">
                {/* Header */}
                <div className="px-3.5 py-1.5 text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-400 tracking-wider border-b border-slate-100 dark:border-white/5 bg-slate-50/90 dark:bg-slate-950/80 flex justify-between items-center sticky top-0 backdrop-blur-sm z-10">
                  <span>Catalogue des Actes ({filteredActs.length})</span>
                  <span
                    className={
                      isPurple
                        ? 'text-purple-600 dark:text-purple-400 font-bold'
                        : 'text-blue-600 dark:text-blue-400 font-bold'
                    }
                  >
                    Tarif auto ⚡
                  </span>
                </div>

                {/* Items */}
                <div className="divide-y divide-slate-50 dark:divide-white/[0.03]">
                  {filteredActs.map((act) => {
                    const isSelected =
                      act.name.toLowerCase() === (value || '').toLowerCase().trim();
                    return (
                      <button
                        key={act._id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelect(act);
                        }}
                        className={`w-full text-left px-3.5 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? isPurple
                              ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-bold'
                              : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold'
                            : 'hover:bg-slate-100/80 dark:hover:bg-white/5 text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        <div className="min-w-0 pr-3">
                          <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            )}
                            <span>{act.name}</span>
                          </div>
                          {act.category && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                              {act.category}
                            </div>
                          )}
                        </div>
                        <span
                          className={`font-mono text-xs font-black shrink-0 px-2 py-0.5 rounded-md border ${badgeColorClass}`}
                        >
                          {act.defaultPrice} DH
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Bottom Quick Add Footer */}
                {onAddNewAct && (
                  <div className="p-2 border-t border-slate-100 dark:border-white/5 bg-slate-50/90 dark:bg-slate-950/90 sticky bottom-0 backdrop-blur-sm z-10 mt-auto">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setIsOpen(false);
                        onAddNewAct(value);
                      }}
                      className={`w-full py-1.5 px-3 rounded-xl border border-dashed text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        isPurple
                          ? 'border-purple-300 dark:border-purple-800/80 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                          : 'border-blue-300 dark:border-blue-800/80 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Ajouter un nouvel acte au catalogue {value ? `("${value}")` : ''}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
