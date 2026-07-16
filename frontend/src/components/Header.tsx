import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, AlertTriangle, User, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SearchResult {
  _id: string;
  name: string;
  phone: string;
  nationalId?: string;
}

export const Header: React.FC = () => {
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
    <header className="relative w-full h-20 px-8 flex items-center justify-between bg-slate-950/20 backdrop-blur-md border-b border-white/5 z-30 select-none">
      {/* Global Search Bar */}
      <div className="relative w-96" ref={dropdownRef}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher patient, telephone, CNIE..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl text-sm glass-input placeholder-slate-500"
          />
        </div>

        {/* Dynamic Search Results Dropdown */}
        {showDropdown && (
          <div className="absolute top-13 left-0 w-full glass-panel border border-white/10 rounded-xl overflow-hidden shadow-2xl py-1 z-50">
            {searchResults.map((patient) => (
              <button
                key={patient._id}
                type="button"
                onMouseDown={() => handleResultClick(patient._id)}
                className="block w-full text-left px-4 py-2.5 hover:bg-white/5 hover:bg-black/3 transition-all cursor-pointer border-none outline-none"
              >
                <div className="text-sm font-semibold text-white">{patient.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Tel : {patient.phone} {patient.nationalId ? `• CNIE : ${patient.nationalId}` : ''}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Utilities: Notifications, System Status */}
      <div className="flex items-center gap-6">
        {/* Connection health check lamp */}
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-xs font-semibold text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Système Prêt</span>
        </div>

        {/* Local time widget */}
        <div className="hidden sm:block text-right">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Heure locale</p>
          <p className="text-sm font-bold text-white tracking-tight">
            {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          type="button"
          className="p-2.5 rounded-xl border border-white/5 bg-slate-900/40 hover:bg-slate-900/80 text-slate-400 hover:text-white transition-all cursor-pointer flex items-center justify-center"
          title={theme === 'light' ? 'Mode Sombre' : 'Mode Clair'}
        >
          {theme === 'light' ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
        </button>

        {/* Notifications indicator */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2.5 rounded-xl border border-white/5 bg-slate-900/40 hover:bg-slate-900/80 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 glass-panel border border-white/10 rounded-xl overflow-hidden shadow-2xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Notifications</h4>
                <button
                  onClick={() => setNotifications([])}
                  className="text-xxs text-indigo-400 hover:underline"
                >
                  Tout effacer
                </button>
              </div>

              {notifications.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">Aucune nouvelle notification</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto no-scrollbar">
                  {notifications.map((notif, index) => (
                    <div key={index} className="flex gap-2.5 items-start p-2 rounded-lg bg-white/5 border border-white/5">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-300 leading-normal">{notif}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
