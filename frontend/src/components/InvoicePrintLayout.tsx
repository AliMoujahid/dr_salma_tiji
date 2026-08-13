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

  const filledCount = invoice.items.length;
  const blankRowsNeeded = Math.max(0, 10 - filledCount);
  const blankRows = Array(blankRowsNeeded).fill(null);

  return (
    <div id="invoice-template" className="print-container text-black bg-white w-[794px] p-[57px] md:p-[76px] mx-auto font-sans leading-relaxed text-left block">
      
      {/* Clinic A4 Header */}
      <div className="print-header-pro flex justify-between items-start mb-6 border-b border-black/5 pb-6 text-[#1e3a5f]">
        
        {/* Left Side: French */}
        <div className="w-[33%] text-left text-[11px] leading-[1.4]">
          <h2 className="font-serif italic text-2xl font-normal mb-1.5 text-[#1e3a5f]">{config.cabinetFr}</h2>
          <div className="text-[10px] font-bold uppercase tracking-wider text-black mb-1.5">{config.drFr}</div>
          <div className="text-[10px] text-slate-700 whitespace-pre-line">{config.specsFr}</div>
        </div>

        {/* Center: Logo */}
        <div className="w-[33%] flex justify-center items-center">
          {config.logoUrl ? (
            <img src={`${UPLOADS_URL}${config.logoUrl}`} alt="Logo" className="h-[100px] object-contain block mx-auto" />
          ) : (
            <img src="/logo.png" alt="Logo" className="h-[100px] object-contain block mx-auto" onError={(e) => {
              (e.target as HTMLImageElement).src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='48' height='48' fill='none' stroke='%231e3a5f' stroke-width='2'><path d='M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'></path></svg>";
            }} />
          )}
        </div>

        {/* Right Side: Arabic */}
        <div className="w-[33%] text-right text-xs leading-[1.5] font-serif" dir="rtl">
          <h2 className="text-3xl font-bold mb-1 text-[#1e3a5f]">{config.cabinetAr}</h2>
          <div className="text-sm font-bold text-black mb-1.5">{config.drAr}</div>
          <div className="text-[11px] text-slate-700 whitespace-pre-line leading-normal">{config.specsAr}</div>
        </div>

      </div>

      {/* Info details under header */}
      <div className="w-full text-[10px] bg-slate-50 border border-slate-300 rounded-lg overflow-hidden flex flex-col items-center mb-8">
        <div className="w-full flex justify-center items-center gap-3 py-1.5 border-b border-slate-300 px-4">
          <span>📍 {config.address}</span>
        </div>
        <div className="w-full flex justify-center items-center gap-3 py-1.5 px-4 border-b border-slate-300 text-slate-800">
          <span>📱 {config.phones}</span>
          <span className="text-slate-300">|</span>
          <span>✉️ {config.email}</span>
        </div>
        <div className="w-full flex justify-center items-center gap-6 py-1 bg-slate-100 text-slate-700 font-medium">
          <span><strong>ICE:</strong> {config.ice || '28103818'}</span>
          <span>•</span>
          <span><strong>INBE:</strong> {config.inbe || '044215820'}</span>
          <span>•</span>
          <span><strong>IF:</strong> {config.ifVal || '28103818'}</span>
        </div>
      </div>

      {/* Invoice Title */}
      <h1 className="text-center font-bold text-xl uppercase tracking-widest underline mb-6 text-black">
        FACTURE
      </h1>

      {/* Metadata */}
      <div className="w-full flex justify-between text-xs font-semibold text-black mb-6">
        <div>
          N° : <span className="font-bold text-sm mr-6">{invoice.invoiceNumber}</span>
          Au nom de : <span className="font-bold text-sm bg-slate-100 px-2 py-0.5 rounded">{invoice.patientId?.name}</span>
        </div>
        <div>
          Fait le : <span className="font-bold text-sm">{formattedDate()}</span>
        </div>
      </div>

      {/* Table grid */}
      <table className="w-full border-collapse border border-black text-xs text-black text-center mb-6">
        <thead>
          <tr className="bg-slate-50">
            <th className="border border-black p-2 w-[15%] font-bold uppercase">Date</th>
            <th className="border border-black p-2 w-[15%] font-bold uppercase">Dent</th>
            <th className="border border-black p-2 w-[50%] font-bold uppercase text-left pl-4">Acte</th>
            <th className="border border-black p-2 w-[20%] font-bold uppercase">Montant (DH)</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, index) => (
            <tr key={item._id || index} className="h-7">
              <td className="border-l border-r border-black px-2">{item.date}</td>
              <td className="border-l border-r border-black px-2">{item.tooth || ''}</td>
              <td className="border-l border-r border-black px-4 text-left">{item.description}</td>
              <td className="border-l border-r border-black px-2 font-mono">
                {item.amount > 0 ? item.amount.toFixed(2).replace('.', ',') : ''}
              </td>
            </tr>
          ))}

          {/* Padding blank lines */}
          {blankRows.map((_, i) => (
            <tr key={`blank-${i}`} className="h-7">
              <td className="border-l border-r border-black"></td>
              <td className="border-l border-r border-black"></td>
              <td className="border-l border-r border-black"></td>
              <td className="border-l border-r border-black"></td>
            </tr>
          ))}
          {/* Border line separator */}
          <tr>
            <td colSpan={4} className="border-t border-black h-px p-0"></td>
          </tr>
        </tbody>
      </table>

      {/* Totals table aligned to right */}
      <div className="w-full flex justify-end mb-8">
        <table className="w-[260px] border border-black text-xs font-bold text-black">
          <tbody>
            <tr>
              <td className="border border-black p-2">Total Brut</td>
              <td className="border border-black p-2 text-right font-mono">
                {invoice.totalAmount.toFixed(2).replace('.', ',')} DH
              </td>
            </tr>
            <tr>
              <td className="border border-black p-2">Remise</td>
              <td className="border border-black p-2 text-right font-mono">
                {invoice.discount.toFixed(2).replace('.', ',')} DH
              </td>
            </tr>
            <tr className="bg-slate-50">
              <td className="border border-black p-2 uppercase">Net à payer [{invoice.paymentMode}]</td>
              <td className="border border-black p-2 text-right font-mono text-sm">
                {invoice.netAmount.toFixed(2).replace('.', ',')} DH
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Number to words text */}
      <div className="text-xs font-bold text-black uppercase tracking-wider mb-6 bg-slate-50 p-3.5 border border-slate-300 rounded-lg">
        Arrêtée la présente facture à la somme de :<br />
        <span className="text-sm font-extrabold text-[#1e3a5f] mt-1.5 block">
          {formatNumberToWordsWithCentimes(invoice.netAmount)}
        </span>
      </div>

      {/* Footer practitioner declaration */}
      <div className="w-full flex justify-between items-start text-[11px] text-black">
        <div className="w-[60%] leading-relaxed pt-2">
          Je, soussigné, certifie avoir effectué les actes attestés dans le<br />
          présent document et avoir perçu les honoraires y afférentes.
        </div>
        <div className="text-right pr-6 pt-2 font-semibold">
          Signature et Cachet du praticien
          {config.stampUrl && (
            <img src={`${UPLOADS_URL}${config.stampUrl}`} alt="Signature Stamp" className="h-20 object-contain block ml-auto mt-2 opacity-90" />
          )}
        </div>
      </div>

    </div>
  );
};
