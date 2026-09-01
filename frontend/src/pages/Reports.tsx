import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart3, TrendingUp, Download, CheckSquare, Users, CreditCard } from 'lucide-react';
import { formatDate, calculateAge } from '../utils/dateUtils';




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
          csvContent += 'Nom,Telephone,Email,CNIE,Genre,Date_Naissance,Age\n';
          const list = data.patients || [];
          list.forEach((p: any) => {
            const bDate = formatDate(p.birthDate);
            const age = calculateAge(p.birthDate);
            csvContent += `"${p.name}","${p.phone}","${p.email || ''}","${p.nationalId || ''}","${p.gender}","${bDate}",${age}\n`;
          });
        } else if (type === 'invoices') {
          csvContent += 'Numero,Patient,Date,Total,Remise,Net,Statut\n';
          const list = data.invoices || [];
          list.forEach((i: any) => {
            csvContent += `"${i.invoiceNumber}","${i.patientId?.name || ''}","${formatDate(i.date)}",${i.totalAmount},${i.discount},${i.netAmount},"${i.paymentStatus}"\n`;
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
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 overflow-y-auto no-scrollbar max-h-[calc(100vh-80px)] select-none">
      
      {/* Title */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Rapports & Statistiques</h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">Consultez la santé financière, la répartition des actes et exportez vos bases de données.</p>
      </div>

      {/* Grid reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left side: Revenue graph */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 p-6 shadow-sm flex flex-col gap-6">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Recettes de l'Année</h3>
            <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>

          {/* Bar Chart Canvas with Gridlines */}
          <div className="relative h-56 w-full pt-4 flex flex-col justify-between">
            {/* Background Grid lines */}
            <div className="absolute inset-0 top-4 bottom-7 flex flex-col justify-between pointer-events-none opacity-40">
              <div className="border-b border-dashed border-slate-200 dark:border-white/10 w-full"></div>
              <div className="border-b border-dashed border-slate-200 dark:border-white/10 w-full"></div>
              <div className="border-b border-dashed border-slate-200 dark:border-white/10 w-full"></div>
            </div>

            {/* Bars Column */}
            <div className="flex-1 w-full flex items-end justify-between gap-1.5 sm:gap-3 md:gap-4 relative z-10">
              {financials.monthlyRevenue.map((item: any, i: number) => {
                const heightPct = maxRevenue > 0 ? Math.max(8, (item.revenue / maxRevenue) * 100) : 8;
                const isCurrentMonth = new Date().getMonth() === i;
                const hasRevenue = item.revenue > 0;

                return (
                  <div key={i} className="flex-1 h-full flex flex-col justify-end items-center group/bar cursor-pointer relative">
                    {/* Floating tooltip */}
                    <div className="absolute -top-10 scale-0 group-hover/bar:scale-100 transition-all duration-200 pointer-events-none z-30 whitespace-nowrap">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-white bg-slate-900 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-700 shadow-xl font-mono">
                          {item.revenue.toLocaleString('fr-FR')} DH
                        </span>
                        <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 -mt-0.5"></div>
                      </div>
                    </div>

                    {/* Bar Column */}
                    <div className="w-full flex justify-center items-end h-full">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full max-w-[28px] rounded-t-xl transition-all duration-500 group-hover/bar:scale-y-105 origin-bottom relative overflow-hidden ${
                          isCurrentMonth
                            ? 'bg-gradient-to-t from-blue-600 via-indigo-500 to-cyan-400 shadow-md shadow-indigo-500/25 ring-2 ring-cyan-400/40'
                            : hasRevenue
                            ? 'bg-gradient-to-t from-blue-700 via-indigo-600 to-blue-400 dark:from-indigo-900/80 dark:via-blue-600/70 dark:to-cyan-400/80 hover:from-blue-500 hover:to-cyan-400'
                            : 'bg-slate-200 dark:bg-slate-800/60'
                        }`}
                      >
                        {hasRevenue && (
                          <div className="absolute top-0 inset-x-0 h-1.5 bg-white/50 rounded-t-xl"></div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-Axis Labels */}
            <div className="flex w-full justify-between items-center pt-2 border-t border-slate-200/80 dark:border-white/10 mt-1">
              {financials.monthlyRevenue.map((item: any, i: number) => {
                const isCurrentMonth = new Date().getMonth() === i;
                return (
                  <span
                    key={i}
                    className={`flex-1 text-center text-[10px] font-bold tracking-tight ${
                      isCurrentMonth
                        ? 'text-blue-600 dark:text-cyan-400 font-extrabold underline underline-offset-4 decoration-cyan-400'
                        : 'text-slate-500 dark:text-slate-400 group-hover/bar:text-slate-900 dark:group-hover/bar:text-slate-200'
                    }`}
                  >
                    {item.month}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right side: Exports */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 p-6 shadow-sm flex flex-col gap-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-white/5 pb-3">Exporter les données</h3>
          
          <div className="flex flex-col gap-3.5 mt-2">
            <button
              onClick={() => handleExportCSV('patients')}
              className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white cursor-pointer transition-all shadow-xs"
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold">Fiche Patients (.csv)</span>
              </div>
              <Download className="w-4 h-4 text-slate-500" />
            </button>

            <button
              onClick={() => handleExportCSV('invoices')}
              className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white cursor-pointer transition-all shadow-xs"
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
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
