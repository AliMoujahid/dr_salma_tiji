import React from 'react';
import { Devis, ClinicConfig } from '../types';
import { getUploadUrl } from '../config/api';
import clinicLogo from '../assets/logo.png';
import { formatNumberToWordsWithCentimes } from './InvoicePrintLayout';

interface DevisPrintLayoutProps {
  devis: Devis;
  config: ClinicConfig;
}

export const DevisPrintLayout: React.FC<DevisPrintLayoutProps> = ({ devis, config }) => {
  const formattedDate = (d?: string) => {
    if (!d) return '.........';
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return d;
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const rawItems = devis.items && devis.items.length > 0 ? devis.items : [
    { date: formattedDate(devis.date).slice(0, 5), tooth: '-', description: 'Consultation & Plan de Traitement', amount: devis.totalAmount || 0 }
  ];

  // Dynamic Chunking for Multi-Page Printing (same responsive algorithm as Facture)
  const calculatePages = () => {
    const SINGLE_PAGE_MAX = 8;
    const PAGE_1_MULTI_MAX = 11;
    const LAST_PAGE_MAX = 7;
    const MIDDLE_PAGE_MAX = 13;

    if (rawItems.length <= SINGLE_PAGE_MAX) {
      return [rawItems];
    }

    const pages: any[][] = [];
    const remaining = [...rawItems];

    // Page 1
    pages.push(remaining.splice(0, PAGE_1_MULTI_MAX));

    // Remaining pages
    while (remaining.length > 0) {
      if (remaining.length <= LAST_PAGE_MAX) {
        pages.push(remaining.splice(0, remaining.length));
        break;
      } else if (remaining.length <= MIDDLE_PAGE_MAX + LAST_PAGE_MAX) {
        const half = Math.ceil(remaining.length / 2);
        pages.push(remaining.splice(0, half));
        pages.push(remaining.splice(0, remaining.length));
        break;
      } else {
        pages.push(remaining.splice(0, MIDDLE_PAGE_MAX));
      }
    }

    return pages;
  };

  const pages = calculatePages();
  const totalPages = pages.length;

  return (
    <div id="devis-template" className="print-container text-black bg-white w-full max-w-[760px] mx-auto font-sans text-left block box-border">
      {pages.map((pageItems, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isLastPage = pageIndex === totalPages - 1;

        return (
          <div
            key={`page-${pageIndex}`}
            className="print-page w-full p-6 box-border flex flex-col justify-between min-h-[1050px]"
            style={{
              pageBreakAfter: isLastPage ? 'auto' : 'always',
              breakAfter: isLastPage ? 'auto' : 'page',
            }}
          >
            {/* TOP CONTENT WRAPPER */}
            <div className="w-full">
              {/* --- HEADER --- */}
              {isFirstPage ? (
                <>
                  <div className="flex justify-between items-start mb-3 border-b border-black/10 pb-3 text-[#1e3a5f]">
                    {/* Left: French */}
                    <div className="w-[34%] text-left text-[11px] leading-[1.35]">
                      <h2 className="font-serif italic text-xl font-bold mb-1 text-[#1e3a5f]">
                        {config.cabinetFr || 'Cabinet Dentaire Dr. Salma Tijini'}
                      </h2>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-black mb-1">
                        {config.drFr || 'DR. SALMA TIJINI'}
                      </div>
                      <div className="text-[10px] text-slate-700 whitespace-pre-line leading-tight">
                        {config.specsFr || 'Chirurgien Dentiste\nImplantologie - Esthétique Dentaire'}
                      </div>
                    </div>

                    {/* Center: Logo */}
                    <div className="w-[30%] flex justify-center items-center">
                      <img
                        src={config.logoUrl ? getUploadUrl(config.logoUrl) : clinicLogo}
                        alt="Logo"
                        className="h-16 max-w-[120px] object-contain block mx-auto"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = clinicLogo;
                        }}
                      />
                    </div>

                    {/* Right: Arabic */}
                    <div className="w-[34%] text-right text-xs leading-[1.4] font-serif" dir="rtl">
                      <h2 className="text-2xl font-bold mb-1 text-[#1e3a5f]">
                        {config.cabinetAr || 'عيادة الدكتورة سلمى التيجيني'}
                      </h2>
                      <div className="text-sm font-bold text-black mb-1">
                        {config.drAr || 'طبيبة جراحة الأسنان'}
                      </div>
                      <div className="text-[10px] text-slate-700 whitespace-pre-line leading-tight">
                        {config.specsAr || 'علاج وتجميل الأسنان - زراعة الأسنان'}
                      </div>
                    </div>
                  </div>

                  {/* Info details box */}
                  <div className="w-full text-[10px] bg-slate-50 border border-slate-300 rounded-lg overflow-hidden flex flex-col items-center mb-4">
                    <div className="w-full flex justify-center items-center gap-3 py-1 border-b border-slate-300 px-3">
                      <span>📍 {config.address || 'Angle Av. Hassan II & Rue Al Qods, Imm. Al Andalous, 1er Étage, Skhirat'}</span>
                    </div>
                    <div className="w-full flex justify-center items-center gap-3 py-1 px-3 border-b border-slate-300 text-slate-800">
                      <span>📱 {config.phones || '+212 6 13 11 71 31'}</span>
                      <span className="text-slate-300">|</span>
                      <span>✉️ {config.email || 'dr.salmatijini@gmail.com'}</span>
                    </div>
                    <div className="w-full flex justify-center items-center gap-6 py-0.5 bg-slate-100 text-slate-700 font-medium text-[9.5px]">
                      <span><strong>ICE:</strong> {config.ice || '003291823000045'}</span>
                      <span>•</span>
                      <span><strong>INBE:</strong> {config.inbe || '102938475'}</span>
                      <span>•</span>
                      <span><strong>IF:</strong> {config.ifVal || '54321098'}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="font-serif italic font-bold text-base text-[#1e3a5f]">{config.cabinetFr || 'Cabinet Tijini'}</span>
                    <span className="text-xs font-bold text-slate-600">— Devis N° {devis.devisNumber} (Suite)</span>
                  </div>
                  <div className="text-xs font-semibold text-black">
                    Patient : <span className="font-bold uppercase">{devis.patientId?.name || 'Patient'}</span>{devis.patientId?.prenom ? ` ${devis.patientId.prenom}` : ''}
                  </div>
                </div>
              )}

              {/* Title & Patient Information */}
              {isFirstPage && (
                <>
                  <div className="text-center mb-3">
                    <h1 className="font-bold text-xl uppercase tracking-widest text-[#1e3a5f] inline-block border-b-2 border-[#1e3a5f] pb-1">
                      DEVIS ESTIMATIF
                    </h1>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                      Proposition Thérapeutique & Honoraires Prévisionnels
                    </p>
                  </div>

                  <div className="w-full flex justify-between items-center text-xs font-semibold text-black mb-3 p-2.5 bg-slate-50 border border-slate-300 rounded-lg">
                    <div>
                      <span className="text-slate-500 font-medium">Devis N° :</span>{' '}
                      <span className="font-extrabold text-sm mr-4 text-[#1e3a5f] font-mono">{devis.devisNumber}</span>
                      <span className="text-slate-500 font-medium">Au nom de :</span>{' '}
                      <span className="font-bold text-sm uppercase px-1.5 py-0.5 rounded bg-white border border-slate-200">
                        {devis.patientId?.name || 'Patient'}
                      </span>
                      {devis.patientId?.prenom ? (
                        <span className="font-bold text-sm uppercase px-1.5 py-0.5 rounded bg-white border border-slate-200 ml-1">
                          {devis.patientId.prenom}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className="text-slate-500 font-medium">Fait le :</span>{' '}
                        <span className="font-bold text-xs font-mono">{formattedDate(devis.date)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Valable jusqu'au :</span>{' '}
                        <span className="font-bold text-xs text-rose-700 font-mono">{formattedDate(devis.validUntil)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Line Items Table */}
              <table className="w-full border-collapse border-2 border-black text-xs text-black text-center mb-4">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b-2 border-black">
                    <th className="border-r border-black p-2 w-[14%] uppercase">Date</th>
                    <th className="border-r border-black p-2 w-[10%] uppercase">Dent</th>
                    <th className="border-r border-black p-2 w-[56%] uppercase text-left pl-3">Acte / Soin Estimé</th>
                    <th className="p-2 w-[20%] uppercase text-right pr-3">Montant (DH)</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item, index) => (
                    <tr key={item._id || index} className={index < pageItems.length - 1 ? 'border-b border-black' : ''}>
                      <td className="border-r border-black p-2 text-center font-mono">{item.date || formattedDate(devis.date).slice(0, 5)}</td>
                      <td className="border-r border-black p-2 text-center font-bold">{item.tooth && item.tooth !== '-' ? item.tooth : '—'}</td>
                      <td className="border-r border-black p-2 text-left pl-3 font-medium">{item.description}</td>
                      <td className="p-2 text-right pr-3 font-mono font-semibold">
                        {(Number(item.amount) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!isLastPage && (
                <div className="text-right text-[11px] italic font-semibold text-slate-600 mb-2">
                  ... Suite du devis sur la page suivante ({pageIndex + 2}/{totalPages})
                </div>
              )}

              {isLastPage && (
                <>
                  {/* Totals Table */}
                  <div className="w-full flex justify-end mb-3">
                    <table className="w-[320px] border-2 border-black text-xs font-bold text-black border-collapse">
                      <tbody>
                        {devis.discount > 0 && (
                          <>
                            <tr className="border-b border-black">
                              <td className="border-r border-black p-2 pl-3 uppercase text-[11px] text-slate-700">
                                Total Brut
                              </td>
                              <td className="p-2 pr-3 text-right font-mono">
                                {(devis.totalAmount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                              </td>
                            </tr>
                            <tr className="border-b border-black text-rose-700">
                              <td className="border-r border-black p-2 pl-3 uppercase text-[11px]">
                                Remise Accordée
                              </td>
                              <td className="p-2 pr-3 text-right font-mono">
                                - {(devis.discount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                              </td>
                            </tr>
                          </>
                        )}
                        <tr className="bg-slate-100 font-extrabold">
                          <td className="border-r border-black p-2.5 pl-3 uppercase text-xs text-black">
                            TOTAL DU DEVIS
                          </td>
                          <td className="p-2.5 pr-3 text-right font-mono text-base text-[#1e3a5f]">
                            {(devis.netAmount !== undefined ? devis.netAmount : devis.totalAmount || 0)
                              .toLocaleString('fr-FR', { minimumFractionDigits: 2 })}{' '}
                            DH
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Amount in French Words */}
                  <div className="text-[11px] font-bold text-black uppercase tracking-wider mb-3 bg-slate-50 p-2.5 border border-black rounded-md">
                    Arrêté le présent devis à la somme de :<br />
                    <span className="text-xs font-extrabold text-[#1e3a5f] mt-1 block tracking-normal">
                      {formatNumberToWordsWithCentimes(devis.netAmount !== undefined ? devis.netAmount : devis.totalAmount || 0)}
                    </span>
                  </div>

                  {devis.notes ? (
                    <div className="text-[11px] text-slate-700 p-2 border border-dashed border-slate-300 rounded mb-3 bg-slate-50/50">
                      <strong>Remarques / Conditions :</strong> {devis.notes}
                    </div>
                  ) : null}
                </>
              )}
            </div>

            {/* FOOTER & SIGNATURES */}
            <div className="w-full pt-2 border-t border-black/10 mt-auto">
              {isLastPage ? (
                <div className="w-full flex justify-between items-start text-[11px] text-black mb-3">
                  {/* Left: Patient signature */}
                  <div className="w-[45%] border border-slate-300 rounded-lg p-2.5 min-h-[90px] flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-xs text-black">
                        Bon pour Accord (Le Patient) :
                      </div>
                      <div className="text-[9.5px] text-slate-500 mt-0.5">
                        Lu et approuvé avant commencement des soins.
                      </div>
                    </div>
                    <div className="text-[9px] text-slate-400 italic">Signature :</div>
                  </div>

                  {/* Right: Praticien cachet */}
                  <div className="w-[48%] border border-slate-300 rounded-lg p-2.5 min-h-[90px] text-right flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-xs text-black">
                        Signature et Cachet du Praticien :
                      </div>
                      <div className="text-[9.5px] text-slate-500 mt-0.5">
                        {config.drFr || 'Dr. Salma Tijini'}
                      </div>
                    </div>
                    <div className="h-10"></div>
                  </div>
                </div>
              ) : null}

              {/* Bottom metadata */}
              <div className="w-full flex justify-between items-center text-[10px] text-slate-500 pt-1">
                <span>
                  {config.cabinetFr || 'Cabinet Dentaire Dr. Salma Tijini'} • Devis N° {devis.devisNumber} • Validité 30 jours
                </span>
                {totalPages > 1 && (
                  <span className="font-bold text-black">Page {pageIndex + 1} / {totalPages}</span>
                )}
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
};
