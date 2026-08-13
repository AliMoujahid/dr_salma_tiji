import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart3, TrendingUp, Download, CheckSquare, Users, CreditCard } from 'lucide-react';

export const Reports: React.FC = () => {
  const { token } = useAuth();
  const [financials, setFinancials] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    fetchFinancials();
  }, []);

  const fetchFinancials = () => {
    setLoading(true);
    fetch(`${API_URL}/reports/financials`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setFinancials(data))
      .catch((err) => console.error('Error fetching financial reports:', err))
      .finally(() => setLoading(false));
  };

  const handleExportCSV = (type: 'patients' | 'invoices' | 'payments') => {
    const headers = { Authorization: `Bearer ${token}` };
    let fetchUrl = '';
    
    if (type === 'patients') fetchUrl = `${API_URL}/patients?limit=1000`;
    if (type === 'invoices') fetchUrl = `${API_URL}/invoices?limit=1000`;
    if (type === 'payments') fetchUrl = `${API_URL}/payments/patient/all`; // standard mockup helper

    // Standard client side mock CSV exporter
    fetch(fetchUrl, { headers })
      .then((res) => res.json())
      .then((data) => {
        let csvContent = 'data:text/csv;charset=utf-8,';
        
        if (type === 'patients') {
          csvContent += 'Nom,Telephone,Email,CNIE,Genre,Age\n';
          const list = data.patients || [];
          list.forEach((p: any) => {
            const age = p.birthDate ? new Date().getFullYear() - new Date(p.birthDate).getFullYear() : '';
            csvContent += `"${p.name}","${p.phone}","${p.email || ''}","${p.nationalId || ''}","${p.gender}",${age}\n`;
          });
        } else if (type === 'invoices') {
          csvContent += 'Numero,Patient,Total,Remise,Net,Statut\n';
          const list = data.invoices || [];
          list.forEach((i: any) => {
            csvContent += `"${i.invoiceNumber}","${i.patientId?.name || ''}",${i.totalAmount},${i.discount},${i.netAmount},"${i.paymentStatus}"\n`;
          });
        }

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `export_${type}_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch((err) => console.error('Export CSV error:', err));
  };

  if (loading || !financials) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const maxRevenue = financials.monthlyRevenue.reduce((max: number, m: any) => Math.max(max, m.revenue), 0) || 1;

  return (
    <div className="flex-1 p-8 flex flex-col gap-6 overflow-y-auto no-scrollbar max-h-[calc(100vh-80px)] select-none">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Rapports & Statistiques</h2>
        <p className="text-xs text-slate-400 mt-1">Consultez la santé financière, la répartition des actes et exportez vos bases.</p>
      </div>

      {/* Grid reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left side: Revenue graph */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900/40 border border-white/5 p-6 shadow-xl flex flex-col gap-6">
          <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recettes de l'Année</h3>
            <BarChart3 className="w-5 h-5 text-indigo-400" />
          </div>

          <div className="flex gap-1 md:gap-4 h-56 items-end justify-between px-1 md:px-2 pt-4">
            {financials.monthlyRevenue.map((item: any, i: number) => {
              const heightPct = Math.max(4, (item.revenue / maxRevenue) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group/bar cursor-pointer">
                  <div className="w-full relative flex justify-center">
                    <span className="absolute -top-7 scale-0 group-hover/bar:scale-100 transition-all duration-200 text-xxs font-bold text-emerald-400 bg-slate-950/80 px-2 py-0.5 rounded border border-white/10 z-10 font-mono">
                      {item.revenue.toFixed(0)} DH
                    </span>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full max-w-[24px] rounded-t bg-gradient-to-t from-blue-600 to-indigo-400 hover:from-emerald-500 hover:to-teal-400 transition-all duration-300 group-hover/bar:shadow-lg shadow-indigo-500/20"
                    ></div>
                  </div>
                  <span className="text-[9px] md:text-[10px] font-bold text-slate-500 tracking-tighter block sm:hidden">
                    {item.month.charAt(0).toUpperCase()}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 tracking-tighter hidden sm:block">
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right side: Exports */}
        <div className="rounded-2xl bg-slate-900/40 border border-white/5 p-6 shadow-xl flex flex-col gap-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-3">Exporter les données</h3>
          
          <div className="flex flex-col gap-3.5 mt-2">
            <button
              onClick={() => handleExportCSV('patients')}
              className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-slate-300 hover:text-white cursor-pointer transition-all"
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-bold">Fiche Patients (.csv)</span>
              </div>
              <Download className="w-4 h-4 text-slate-500" />
            </button>

            <button
              onClick={() => handleExportCSV('invoices')}
              className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-slate-300 hover:text-white cursor-pointer transition-all"
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
                <span className="text-xs font-bold">Factures Honoraires (.csv)</span>
              </div>
              <Download className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
