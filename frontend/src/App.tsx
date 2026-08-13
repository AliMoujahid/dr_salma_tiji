import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LicenseActivationModal } from './components/LicenseActivationModal';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Patients } from './pages/Patients';
import { PatientProfile } from './pages/PatientProfile';
import { Appointments } from './pages/Appointments';
import { WaitingRoom } from './pages/WaitingRoom';
import { InvoiceEditor } from './pages/InvoiceEditor';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { NotificationManager } from './pages/NotificationManager';
import { ClinicConfig } from './types';

const queryClient = new QueryClient();

interface LicenseStatusData {
  active: boolean;
  machineId: string;
  clientName?: string;
  type?: string;
  validUntil?: string;
  daysRemaining?: number;
  message?: string;
}

// Route guard for authenticated pages
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050811] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Layout Shell wrapping sidebar, header and page content
const AppLayout: React.FC = () => {
  const { token } = useAuth();
  const [config, setConfig] = useState<ClinicConfig | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetch(`${API_URL}/clinic/config`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch((err) => console.error('Error fetching clinic configs:', err));
  }, [token]);

  return (
    <div className="flex bg-[var(--bg-app)] text-[var(--text-primary)] min-h-screen font-sans selection:bg-blue-500/30 print:bg-white print:text-black print:block print:min-h-0 transition-colors duration-300">
      {/* Sidebar Layout */}
      <Sidebar 
        clinicNameFr={config?.cabinetFr} 
        clinicLogo={config?.logoUrl} 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Main Panel grid (Header + Content) */}
      <div className="flex-1 flex flex-col min-w-0 print:block">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative print:block print:p-0">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/patients/:id" element={<PatientProfile />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/waiting-room" element={<WaitingRoom />} />
            <Route path="/invoices" element={<InvoiceEditor />} />
            <Route path="/payments" element={<InvoiceEditor />} /> {/* Linked view */}
            <Route path="/reports" element={<Reports />} />
            <Route path="/notifications" element={<NotificationManager />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatusData | null>(null);
  const [checkingLicense, setCheckingLicense] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const checkLicense = async () => {
    try {
      const res = await fetch(`${API_URL}/license/status`);
      const data = await res.json();
      setLicenseStatus(data);
    } catch (err) {
      console.error('Error checking license status:', err);
      // If server unreachable, allow offline checking state
      setLicenseStatus({
        active: false,
        machineId: 'Connexion au serveur...',
        message: 'Impossible de contacter le serveur de licence local.',
      });
    } finally {
      setCheckingLicense(false);
    }
  };

  useEffect(() => {
    checkLicense();
  }, []);

  if (checkingLicense) {
    return (
      <div className="min-h-screen bg-[#050811] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-400">Vérification de la licence du cabinet...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {/* If license is not active, display the locking modal */}
      {licenseStatus && !licenseStatus.active && (
        <LicenseActivationModal
          machineId={licenseStatus.machineId}
          message={licenseStatus.message}
          validUntil={licenseStatus.validUntil}
          onActivated={() => {
            checkLicense();
          }}
        />
      )}

      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
