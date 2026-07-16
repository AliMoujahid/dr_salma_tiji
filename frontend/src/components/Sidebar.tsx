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
  Settings,
  LogOut,
  FolderOpen,
  MonitorPlay,
  Heart
} from 'lucide-react';

interface SidebarProps {
  clinicNameFr?: string;
  clinicLogo?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ clinicNameFr = 'Cabinet Tijini', clinicLogo }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Tableau de bord', path: '/', icon: LayoutDashboard },
    { name: 'Patients', path: '/patients', icon: Users },
    { name: 'Rendez-vous', path: '/appointments', icon: Calendar },
    { name: 'Salle d\'attente', path: '/waiting-room', icon: MonitorPlay },
    { name: 'Factures & Soins', path: '/invoices', icon: FileText },
    { name: 'Paiements', path: '/payments', icon: CreditCard },
    { name: 'Rapports & Stats', path: '/reports', icon: BarChart3 },
    { name: 'Configuration', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-72 h-screen sticky top-0 flex flex-col justify-between glass-panel border-r border-white/5 p-6 z-20 select-none">
      {/* Header Clinic Details */}
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-white/10 overflow-hidden shadow-lg p-1">
            {clinicLogo ? (
              <img src={`http://localhost:5000/uploads${clinicLogo}`} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" onError={(e) => {
                // If logo.png fails, use a placeholder icon
                (e.target as HTMLImageElement).src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24' fill='none' stroke='%233b82f6' stroke-width='2'><path d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'></path></svg>";
              }} />
            )}
          </div>
          <div>
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
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'nav-active bg-blue-600 text-white shadow-lg shadow-blue-500/25 translate-x-1'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User profile card and logout */}
      <div className="flex flex-col gap-4 border-t border-white/5 pt-4">
        {user && (
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden bg-slate-800">
              <img src={user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} alt={user.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-white truncate">{user.name}</h4>
              <p className="text-xs text-indigo-300 font-medium truncate uppercase tracking-wider">{user.role}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-semibold text-rose-400 bg-rose-500/5 hover:bg-rose-500/15 transition-all duration-200 cursor-pointer border border-rose-500/10"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-5 h-5" />
            <span>Déconnexion</span>
          </div>
        </button>
      </div>
    </aside>
  );
};
