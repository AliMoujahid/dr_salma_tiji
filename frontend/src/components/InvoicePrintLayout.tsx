import React from 'react';
import { Invoice, ClinicConfig } from '../types';

interface InvoicePrintLayoutProps {
  invoice: Invoice;
  config: ClinicConfig;
}

// Grammatically correct French translation function for numbers
export function NumberToFrenchWords(num: number): string {
  if (num === 0) return 'ZÉRO';

  const unites = [
    '', 'UN', 'DEUX', 'TROIS', 'QUATRE', 'CINQ', 'SIX', 'SEPT', 'HUIT', 'NEUF',
    'DIX', 'ONZE', 'DOUZE', 'TREIZE', 'QUATORZE', 'QUINZE', 'SEIZE',
    'DIX-SEPT', 'DIX-HUIT', 'DIX-NEUF',
  ];
  const dizaines = [
    '', 'DIX', 'VINGT', 'TRENTE', 'QUARANTE', 'CINQUANTE', 'SOIXANTE',
    'SOIXANTE-DIX', 'QUATRE-VINGT', 'QUATRE-VINGT-DIX',
  ];

  function convertUnderThousand(n: number, isFollowed: boolean): string {
    let str = '';
    const c = Math.floor(n / 100);
    n = n % 100;

    if (c > 0) {
      if (c === 1) {
        str += 'CENT ';
      } else {
        if (n === 0 && !isFollowed) {
          str += unites[c] + ' CENTS ';
        } else {
          str += unites[c] + ' CENT ';
        }
      }
    }

    if (n > 0) {
      if (n < 20) {
        str += unites[n] + ' ';
      } else {
        const d = Math.floor(n / 10);
        const u = n % 10;

        if (d === 7) {
          if (u === 1) {
            str += 'SOIXANTE ET ONZE ';
          } else {
            str += 'SOIXANTE-' + unites[10 + u] + ' ';
          }
        } else if (d === 9) {
          str += 'QUATRE-VINGT-' + unites[10 + u] + ' ';
        } else if (d === 8) {
          if (u === 0) {
            if (!isFollowed) {
              str += 'QUATRE-VINGTS ';
            } else {
              str += 'QUATRE-VINGT ';
            }
          } else {
            str += 'QUATRE-VINGT-' + unites[u] + ' ';
          }
        } else {
          if (u === 1) {
            str += dizaines[d] + ' ET UN ';
          } else if (u > 0) {
            str += dizaines[d] + '-' + unites[u] + ' ';
          } else {
            str += dizaines[d] + ' ';
          }
        }
      }
    }
    return str;
  }

  let result = '';
  const millions = Math.floor(num / 1000000);
  const temp = num % 1000000;
  const milliers = Math.floor(temp / 1000);
  const rest = temp % 1000;

  if (millions > 0) {
    result += convertUnderThousand(millions, true) + 'MILLION' + (millions > 1 ? 'S ' : ' ');
  }
  if (milliers > 0) {
    if (milliers === 1) {
      result += 'MILLE ';
    } else {
      result += convertUnderThousand(milliers, true) + 'MILLE ';
    }
  }
  if (rest > 0 || result === '') {
    result += convertUnderThousand(rest, false);
  }

  return result.replace(/\s+/g, ' ').trim();
}

export function formatNumberToWordsWithCentimes(netVal: number): string {
  const netValInt = Math.floor(netVal);
  const netValDec = Math.round((netVal - netValInt) * 100);

  let words = NumberToFrenchWords(netValInt);
  if (words === 'UN') {
    words += ' DIRHAM';
  } else {
    words += ' DIRHAMS';
  }

  if (netValDec > 0) {
    const decWords = NumberToFrenchWords(netValDec);
    if (decWords === 'UN') {
      words += ' ET UN CENTIME';
    } else {
      words += ' ET ' + decWords + ' CENTIMES';
    }
  }

  return words;
}

export const InvoicePrintLayout: React.FC<InvoicePrintLayoutProps> = ({ invoice, config }) => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const UPLOADS_URL = API_URL.replace('/api', '/uploads');

  const formattedDate = () => {
    if (!invoice.date) return '.........';
    const dateObj = new Date(invoice.date);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const rawItems = invoice.items && invoice.items.length > 0 ? invoice.items : [
    { date: formattedDate().slice(0, 5), tooth: '-', description: 'Consultation & Soins', amount: invoice.totalAmount || 0 }
  ];

  // Dynamic Chunking for Multi-Page Invoices
  // If items <= 8, fits on 1 page with header + totals + signature
  // If items > 8, splits smartly across pages
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
    <div id="invoice-template" className="print-container text-black bg-white w-full max-w-[760px] mx-auto font-sans text-left block box-border">
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
                /* Full Header on Page 1 */
                <>
                  <div className="flex justify-between items-start mb-3 border-b border-black/10 pb-3 text-[#1e3a5f]">
                    {/* Left: French */}
                    <div className="w-[34%] text-left text-[11px] leading-[1.35]">
                      <h2 className="font-serif italic text-xl font-bold mb-1 text-[#1e3a5f]">
                        {config.cabinetFr || 'Cabinet Tijini'}
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
                      {config.logoUrl ? (
                        <img
                          src={`${UPLOADS_URL}${config.logoUrl}`}
                          alt="Logo"
                          className="h-16 max-w-[120px] object-contain block mx-auto"
                        />
                      ) : (
                        <img
                          src="/logo.png"
                          alt="Logo"
                          className="h-16 max-w-[120px] object-contain block mx-auto"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='40' height='40' fill='none' stroke='%231e3a5f' stroke-width='2'><path d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'></path></svg>";
                          }}
                        />
                      )}
                    </div>

                    {/* Right: Arabic */}
                    <div className="w-[34%] text-right text-xs leading-[1.4] font-serif" dir="rtl">
                      <h2 className="text-2xl font-bold mb-1 text-[#1e3a5f]">
                        {config.cabinetAr || 'عيادة التيجيني'}
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
                      <span>📍 {config.address || 'Résidence Al Manar, Bd Al Qods, Casablanca'}</span>
                    </div>
                    <div className="w-full flex justify-center items-center gap-3 py-1 px-3 border-b border-slate-300 text-slate-800">
                      <span>📱 {config.phones || '+212 5 22 00 00 00'}</span>
                      <span className="text-slate-300">|</span>
                      <span>✉️ {config.email || 'dr.salma.tijini@gmail.com'}</span>
                    </div>
                    <div className="w-full flex justify-center items-center gap-6 py-0.5 bg-slate-100 text-slate-700 font-medium text-[9.5px]">
                      <span><strong>ICE:</strong> {config.ice || '28103818'}</span>
                      <span>•</span>
                      <span><strong>INBE:</strong> {config.inbe || '044215820'}</span>
                      <span>•</span>
                      <span><strong>IF:</strong> {config.ifVal || '28103818'}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="font-serif italic font-bold text-base text-[#1e3a5f]">{config.cabinetFr || 'Cabinet Tijini'}</span>
                    <span className="text-xs font-bold text-slate-600">— Facture N° {invoice.invoiceNumber} (Suite)</span>
                  </div>
                  <div className="text-xs font-semibold text-black">Patient : <span className="font-bold uppercase">{invoice.patientId?.name || 'Patient'}</span></div>
                </div>
              )}

              {isFirstPage && (
                <>
                  <h1 className="text-center font-bold text-lg uppercase tracking-widest underline mb-3 text-black">FACTURE</h1>
                  <div className="w-full flex justify-between text-xs font-semibold text-black mb-3">
                    <div>N° : <span className="font-bold text-sm mr-6">{invoice.invoiceNumber}</span> Au nom de : <span className="font-bold text-sm bg-slate-100 px-2 py-0.5 rounded">{invoice.patientId?.name || 'Patient'}</span></div>
                    <div>Fait le : <span className="font-bold text-sm">{formattedDate()}</span></div>
                  </div>
                </>
              )}

              <table className="w-full border-collapse border-2 border-black text-xs text-black text-center mb-4">
                <thead>
                  <tr className="bg-slate-100 font-bold border-b-2 border-black">
                    <th className="border-r border-black p-2 w-[12%] uppercase">Date</th>
                    <th className="border-r border-black p-2 w-[10%] uppercase">Dent</th>
                    <th className="border-r border-black p-2 w-[42%] uppercase text-left pl-3">Acte / Soin</th>
                    <th className="border-r border-black p-2 w-[12%] uppercase text-right pr-2">À payer</th>
                    <th className="border-r border-black p-2 w-[12%] uppercase text-right pr-2">Avance</th>
                    <th className="p-2 w-[12%] uppercase text-right pr-2">Reste</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item, index) => (
                    <tr key={item._id || index} className={index < pageItems.length - 1 ? 'border-b border-black' : ''}>
                      <td className="border-r border-black p-2 text-center">{item.date}</td>
                      <td className="border-r border-black p-2 text-center">{item.tooth || '-'}</td>
                      <td className="border-r border-black p-2 text-left pl-3 font-medium">{item.description}</td>
                      <td className="border-r border-black p-2 text-right pr-2 font-mono font-semibold">{item.amount > 0 ? item.amount.toFixed(2).replace('.', ',') : '0,00'}</td>
                      <td className="border-r border-black p-2 text-right pr-2 font-mono font-semibold text-emerald-800">{item.advance > 0 ? item.advance.toFixed(2).replace('.', ',') : '0,00'}</td>
                      <td className="p-2 text-right pr-2 font-mono font-bold text-rose-700">{item.remaining > 0 ? item.remaining.toFixed(2).replace('.', ',') : '0,00'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!isLastPage && <div className="text-right text-[11px] italic font-semibold text-slate-600 mb-2">... Suite des soins sur la page suivante ({pageIndex + 2}/{totalPages})</div>}

              {isLastPage && (
                <>
                  <div className="w-full flex justify-end mb-3">
                    <table className="w-[320px] border-2 border-black text-xs font-bold text-black border-collapse">
                      <tbody>
                        <tr className="border-b border-black"><td className="border-r border-black p-1.5 pl-2.5">Total Brut</td><td className="p-1.5 pr-2.5 text-right font-mono">{invoice.totalAmount.toFixed(2).replace('.', ',')} DH</td></tr>
                        <tr className="border-b border-black"><td className="border-r border-black p-1.5 pl-2.5">Remise</td><td className="p-1.5 pr-2.5 text-right font-mono">{invoice.discount.toFixed(2).replace('.', ',')} DH</td></tr>
                        <tr className="border-b border-black bg-slate-100"><td className="border-r border-black p-1.5 pl-2.5 uppercase text-xs">Net à Payer [{invoice.paymentMode || 'espèces'}]</td><td className="p-1.5 pr-2.5 text-right font-mono text-[#1e3a5f]">{invoice.netAmount.toFixed(2).replace('.', ',')} DH</td></tr>
                        <tr className="border-b border-black"><td className="border-r border-black p-1.5 pl-2.5 text-emerald-800">Total Versé</td><td className="p-1.5 pr-2.5 text-right font-mono text-emerald-800">{(invoice.paidAmount || 0).toFixed(2).replace('.', ',')} DH</td></tr>
                        <tr className="bg-slate-100 font-extrabold text-sm"><td className="border-r border-black p-1.5 pl-2.5 uppercase text-xs text-rose-900">Reste à Payer</td><td className="p-1.5 pr-2.5 text-right font-mono text-rose-700">{Math.max(0, invoice.netAmount - (invoice.paidAmount || 0)).toFixed(2).replace('.', ',')} DH</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="text-[11px] font-bold text-black uppercase tracking-wider mb-4 bg-slate-50 p-2.5 border border-black rounded-md">Arrêtée la présente facture à la somme de :<br /><span className="text-xs font-extrabold text-[#1e3a5f] mt-1 block tracking-normal">{formatNumberToWordsWithCentimes(invoice.netAmount)}</span></div>
                </>
              )}
            </div>
            <div className="w-full pt-2 border-t border-black/10 mt-auto">
              {isLastPage ? (
                <div className="w-full flex justify-between items-start text-[11px] text-black mb-3">
                  <div className="w-[50%] leading-relaxed pt-1">
                    Je, soussigné, certifie avoir effectué les actes attestés dans le<br />
                    présent document et avoir perçu les honoraires y afférentes.
                  </div>

                  {/* Espace blanc naturel pour la signature et le cachet physique de la docteure */}
                  <div className="w-[45%] text-right pr-2">
                    <div className="font-bold text-xs text-black mb-1">
                      Signature et Cachet du praticien
                    </div>
                    <div className="h-16"></div>
                  </div>
                </div>
              ) : null}

              {/* Page Numbering Footer on every page */}
              <div className="w-full flex justify-between items-center text-[10px] text-slate-500 pt-1">
                <span>Cabinet Dentaire Dr. Salma Tijini • Facture N° {invoice.invoiceNumber}</span>
                <span className="font-bold text-black">Page {pageIndex + 1} / {totalPages}</span>
              </div>
            </div>

          </div>
        );
      })}
    </div>
  );
};
