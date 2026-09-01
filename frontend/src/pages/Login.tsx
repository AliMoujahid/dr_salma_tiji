import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Activity, Eye, EyeOff, Sparkles } from 'lucide-react';
import { AntigravityParticles } from '../components/AntigravityParticles';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const [clinicConfig, setClinicConfig] = useState<{ cabinetFr?: string; drFr?: string; logoUrl?: string } | null>(null);

  React.useEffect(() => {
    fetch(`${API_URL}/clinic/config`)
      .then((res) => res.json())
      .then((data) => setClinicConfig(data))
      .catch((err) => console.error('Error loading clinic branding on login:', err));
  }, []);

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

  const getLogoSrc = () => {
    if (!clinicConfig?.logoUrl) return null;
    if (clinicConfig.logoUrl.startsWith('/uploads') || clinicConfig.logoUrl.startsWith('uploads/')) {
      const baseUrl = API_URL.replace('/api', '');
      const cleanPath = clinicConfig.logoUrl.startsWith('/') ? clinicConfig.logoUrl : `/${clinicConfig.logoUrl}`;
      return `${baseUrl}${cleanPath}`;
    }
    return clinicConfig.logoUrl;
  };

  const logoSrc = getLogoSrc();

  return (
    <div className="login-page w-full min-h-screen flex items-center justify-center bg-[#050811] relative overflow-hidden select-none">
      
      {/* Interactive Google Antigravity Particle Canvas */}
      <AntigravityParticles />

      {/* Decorative ambient glowing circles */}
      <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="w-full max-w-md px-6 z-10">
        
        {/* Logo and Brand Heading */}
        <div className="flex flex-col items-center gap-3.5 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shadow-xl shadow-blue-500/15 overflow-hidden p-2">
            {logoSrc ? (
              <img src={logoSrc} alt="Logo Cabinet" className="w-full h-full object-contain" />
            ) : (
              <Activity className="w-8 h-8 text-blue-400 animate-pulse" />
            )}
          </div>
          <div className="text-center">
            <h2 className="login-brand-title text-2xl font-extrabold text-white tracking-tight">
              {clinicConfig?.cabinetFr || 'Cabinet Dentaire'}
            </h2>
            <p className="login-brand-subtitle text-xs text-slate-300 font-semibold mt-1 uppercase tracking-widest">
              {clinicConfig?.drFr || 'Gestion de Clinique Dentaire'}
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="login-card w-full rounded-3xl bg-slate-900/75 border border-white/15 backdrop-blur-2xl p-8 shadow-2xl flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-bold text-white tracking-tight">Connexion</h3>
            <p className="text-xs text-slate-300 font-medium">Renseignez vos identifiants pour accéder au tableau de bord</p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs font-semibold text-rose-300 leading-normal flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            
            {/* Email Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider pl-1">Email professionnel</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="nom@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl text-sm glass-input placeholder-slate-500"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider pl-1">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-12 rounded-xl text-sm glass-input placeholder-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white cursor-pointer transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-sm text-white transition-all shadow-lg shadow-blue-600/30 mt-2 cursor-pointer flex items-center justify-center disabled:opacity-60"
            >
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>

          {/* Security & Encryption Badge */}
          <div className="flex items-center justify-center gap-2 border-t border-white/10 pt-4 text-slate-400 text-[11px] font-medium">
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            <span>Connexion sécurisée & données chiffrées</span>
          </div>

        </div>

      </div>
    </div>
  );
};

