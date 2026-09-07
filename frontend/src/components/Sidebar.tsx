import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Layers,
  FileText,
  CreditCard,
  BarChart3,
  MessageSquare,
  Settings,
  LogOut,
  FolderOpen,
  MonitorPlay,
  Heart,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  clinicNameFr?: string;
  clinicLogo?: string;
  isOpen?: boolean;
  isCollapsed?: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  clinicNameFr = 'Cabinet Tijini', 
  clinicLogo, 
  isOpen, 
  isCollapsed = false,
  onClose,
  onToggleCollapse 
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const UPLOADS_URL = API_URL.replace('/api', '/uploads');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Tableau de bord', path: '/', icon: LayoutDashboard },
    { name: 'Patients', path: '/patients', icon: Users },
    { name: 'Rendez-vous', path: '/appointments', icon: Calendar },
    { name: 'Salle d\'attente', path: '/waiting-room', icon: MonitorPlay },
    { name: 'Facturation & Paiements', path: '/invoices', icon: FileText },
    { name: 'Rapports & Stats', path: '/reports', icon: BarChart3 },
    { name: 'Notifications & Rappels', path: '/notifications', icon: MessageSquare },
    { name: 'Configuration', path: '/settings', icon: Settings },
  ];

  const getAvatarSrc = (avatarUrl?: string, name?: string) => {
    if (!avatarUrl) {
      return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'User')}`;
    }
    const cleanUrl = avatarUrl.replace(/^\.\.\//, '/').replace(/^uploads\//, '/uploads/');
    if (cleanUrl.startsWith('/uploads')) {
      const baseUrl = API_URL.replace('/api', '');
      return `${baseUrl}${cleanUrl}`;
    }
    return avatarUrl;
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-45 md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`fixed top-0 bottom-0 left-0 h-screen flex flex-col justify-between glass-panel border-r border-white/5 py-6 z-50 select-none transition-all duration-300 md:sticky md:top-0 md:translate-x-0 print:hidden shrink-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } ${
        isCollapsed ? 'w-72 md:w-20 px-2' : 'w-72 px-4'
      }`}>
        {/* Close Button for mobile view */}
        <div className="flex md:hidden justify-end mb-2">
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl cursor-pointer"
            title="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Header Clinic Details */}
        <div className="flex flex-col gap-8">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'md:justify-center' : ''}`}>
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-white/10 overflow-hidden shadow-lg p-1 shrink-0">
              {clinicLogo ? (
                <img src={`${UPLOADS_URL}${clinicLogo}`} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" onError={(e) => {
                  (e.target as HTMLImageElement).src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24' fill='none' stroke='%233b82f6' stroke-width='2'><path d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'></path></svg>";
                }} />
              )}
            </div>
            <div className={`transition-all duration-200 ${isCollapsed ? 'md:hidden' : 'block'}`}>
              <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">Cabinet Dentaire</span>
              <h1 className="text-lg font-bold text-white tracking-tight">{clinicNameFr}</h1>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                title={isCollapsed ? item.name : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                    isCollapsed ? 'md:justify-center md:px-0 px-4' : 'px-4'
                  } ${
                    isActive
                      ? 'nav-active bg-blue-600 text-white shadow-lg shadow-blue-500/25 translate-x-1'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className={`transition-all duration-200 ${isCollapsed ? 'md:hidden' : 'inline'}`}>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User profile card, toggle button and logout */}
        <div className="flex flex-col gap-4 border-t border-white/5 pt-4">
          {user && (
            <div className={`flex items-center gap-2 px-1 ${isCollapsed ? 'md:justify-center' : ''}`} title={isCollapsed ? `${user.name} (${user.role})` : undefined}>
              <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden bg-slate-800 shrink-0">
                <img src={getAvatarSrc(user.avatarUrl, user.name)} alt={user.name} className="w-full h-full object-cover" />
              </div>
              <div className={`flex-1 min-w-0 ${isCollapsed ? 'md:hidden' : 'block'}`}>
                <h4 className="text-sm font-semibold text-white truncate">{user.name}</h4>
                <p className="text-xs text-indigo-300 font-medium truncate uppercase tracking-wider">{user.role}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              title={isCollapsed ? 'Déconnexion' : undefined}
              className={`flex items-center w-full py-3 rounded-xl text-sm font-semibold text-rose-400 bg-rose-500/5 hover:bg-rose-500/15 transition-all duration-200 cursor-pointer border border-rose-500/10 ${
                isCollapsed ? 'md:justify-center md:px-0 px-4 justify-between' : 'justify-between px-4'
              }`}
            >
              <div className={`flex items-center gap-3 ${isCollapsed ? 'md:justify-center' : ''}`}>
                <LogOut className="w-5 h-5 shrink-0" />
                <span className={`${isCollapsed ? 'md:hidden' : 'inline'}`}>Déconnexion</span>
              </div>
            </button>

            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                type="button"
                title={isCollapsed ? 'Agrandir le menu' : 'Réduire le menu'}
                className="hidden md:flex p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer items-center justify-center shrink-0"
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
