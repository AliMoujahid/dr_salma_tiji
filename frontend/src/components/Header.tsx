import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, AlertTriangle, User, Sun, Moon, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NotificationCenter } from './NotificationCenter';

interface SearchResult {
  _id: string;
  name: string;
  phone: string;
  nationalId?: string;
}

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([
    'Rappel : Rendez-vous pour Amine El Amrani dans 30 min.',
    'Facture impayée : Nadia Bensouda (AXA Assurances).',
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Theme support: Default to light
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const delayDebounce = setTimeout(() => {
      fetch(`${API_URL}/patients?search=${encodeURIComponent(searchQuery)}&limit=5`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.patients) {
            setSearchResults(data.patients);
            setShowDropdown(data.patients.length > 0);
          }
        })
        .catch((err) => console.error('Error fetching search results:', err));
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, token]);

  // Click outside listener to close search results dropdown and notifications
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (id: string) => {
    setSearchQuery('');
    setShowDropdown(false);
    navigate(`/patients/${id}`);
  };

  return (
    <header className="relative w-full h-20 px-4 md:px-8 flex items-center justify-between bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/80 dark:border-white/5 z-30 select-none gap-3 print:hidden transition-colors">
      {/* Global Search & Mobile Toggle */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Mobile Menu toggle hamburger */}
        <button
          onClick={onMenuClick}
          type="button"
          className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/40 dark:hover:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer md:hidden flex items-center justify-center shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full max-w-[200px] xs:max-w-xs sm:max-w-md md:w-96" ref={dropdownRef}>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl text-sm bg-slate-100/90 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs transition-all"
            />
          </div>

          {/* Dynamic Search Results Dropdown */}
          {showDropdown && (
            <div className="absolute top-13 left-0 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-2xl py-1 z-50">
              {searchResults.map((patient) => (
                <button
                  key={patient._id}
                  type="button"
                  onMouseDown={() => handleResultClick(patient._id)}
                  className="block w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer border-none outline-none"
                >
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{patient.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Tel : {patient.phone} {patient.nationalId ? `• CNIE : ${patient.nationalId}` : ''}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Utilities: Notifications, System Status */}
      <div className="flex items-center gap-3 sm:gap-6 shrink-0">
        {/* Connection health check lamp */}
        <div className="hidden md:flex items-center gap-2 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-3.5 py-1.5 rounded-full text-xs font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Système Prêt</span>
        </div>

        {/* Local time widget */}
        <div className="hidden sm:block text-right">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Heure locale</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
            {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          type="button"
          className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/40 dark:hover:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer flex items-center justify-center"
          title={theme === 'light' ? 'Mode Sombre' : 'Mode Clair'}
        >
          {theme === 'light' ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
        </button>

        {/* Smart Notifications Widget */}
        <NotificationCenter />
      </div>
    </header>
  );
};
