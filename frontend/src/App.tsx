import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';

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
import { ClinicConfig } from './types';

const queryClient = new QueryClient();

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
      <div className="print:hidden shrink-0">
        <Sidebar clinicNameFr={config?.cabinetFr} clinicLogo={config?.logoUrl} />
      </div>

      {/* Main Panel grid (Header + Content) */}
      <div className="flex-1 flex flex-col min-w-0 print:block">
        <div className="print:hidden">
          <Header />
        </div>
        
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
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
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
