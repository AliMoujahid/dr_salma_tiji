import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Activity, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Identifiants invalides');
      }

      login(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('password123');
    setError('');
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-[#050811] relative overflow-hidden select-none">
      
      {/* Decorative ambient glowing circles */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[140px]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[140px]"></div>

      <div className="w-full max-w-md px-6 z-10">
        
        {/* Logo and Brand Heading */}
        <div className="flex flex-col items-center gap-3.5 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/15 border border-blue-500/25 flex items-center justify-center shadow-lg shadow-blue-500/10">
            <Activity className="w-8 h-8 text-blue-500 animate-pulse" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white tracking-tight">Cabinet Dr. Salma Tijini</h2>
            <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-widest">Gestion de Clinique Dentaire</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="w-full rounded-3xl bg-slate-900/40 border border-white/5 backdrop-blur-xl p-8 shadow-2xl flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold text-white">Connexion</h3>
            <p className="text-xs text-slate-400">Renseignez vos identifiants pour accéder au tableau de bord</p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-400 leading-normal">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            
            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Email professionnel</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  placeholder="nom@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl text-sm glass-input placeholder-slate-600"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-12 rounded-xl text-sm glass-input placeholder-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-sm text-white transition-all shadow-lg shadow-blue-600/20 mt-2 cursor-pointer flex items-center justify-center"
            >
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>

          {/* Quick-fill helper test accounts */}
          <div className="flex flex-col gap-2.5 border-t border-white/5 pt-5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Comptes de test (Raccourcis)</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('doctor@tijini.com')}
                className="py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] font-semibold text-slate-300 text-center cursor-pointer transition-all"
              >
                Médecin / Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('assistant@tijini.com')}
                className="py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] font-semibold text-slate-300 text-center cursor-pointer transition-all"
              >
                Assistant
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('receptionist@tijini.com')}
                className="py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] font-semibold text-slate-300 text-center cursor-pointer transition-all col-span-2"
              >
                Réceptionniste
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
