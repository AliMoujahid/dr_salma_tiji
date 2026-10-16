import React from 'react';
import { Patient, ClinicConfig } from '../types';
import { formatDate } from '../utils/dateUtils';
import clinicLogo from '../assets/logo.png';

interface PatientLedgerPrintLayoutProps {
  patient: Patient;
  config: ClinicConfig | null;
  acts: any[];
  payments: any[];
  summary: {
    totalActsAmount: number;
    totalPaidAmount: number;
    remainingBalance: number;
  };
}

export const PatientLedgerPrintLayout: React.FC<PatientLedgerPrintLayoutProps> = ({
  patient,
  config,
  acts,
  payments,
}) => {
  // Extract patient info: name is Nom de famille, prenom is Prénom
  const lastName = (patient.name || '').trim();
  const firstName = (patient.prenom || '').trim();

  // Calculate age
  const birthDateObj = patient.birthDate ? new Date(patient.birthDate) : null;
  const ageStr = birthDateObj && !isNaN(birthDateObj.getTime())
    ? `${Math.floor((Date.now() - birthDateObj.getTime()) / (365.25 * 24 * 3600 * 1000))}`
    : '';

  const isFemale = patient.gender === 'Female';
  const isMale = patient.gender === 'Male';

  // Merge acts and payments into chronological entries with running balance
  const entries: any[] = [
    ...acts.map((a) => {
      const actAdvance = Number(a.paidAmount) || Number(a.advance) || 0;
      return {
        rawDate: a.date,
        date: formatDate(a.date),
        tooth: a.tooth && a.tooth !== '-' ? a.tooth : '',
        description: a.description || a.actName,
        aPayer: Number(a.amount) || Number(a.cost) || 0,
        avance: actAdvance > 0 ? actAdvance : null,
      };
    }),
    ...payments
      .filter((p) => !p.treatmentId)
      .map((p) => ({
        rawDate: p.date,
        date: formatDate(p.date),
        tooth: '',
        description: `Versement (${p.paymentMethod || 'Espèces'})${p.notes ? ' - ' + p.notes : ''}`,
        aPayer: null,
        avance: Number(p.amount) || 0,
      })),
  ].sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());

  let running = 0;
  const entriesWithRunning = entries.map((e) => {
    if (e.aPayer) running += e.aPayer;
    if (e.avance) running -= e.avance;
    return {
      ...e,
      reste: Math.max(0, running),
    };
  });

  // Exactly 14 rows fill the bottom half of the A4 page to replicate the physical card
  const TOTAL_ROWS = 14;
  const pageItems = entriesWithRunning.slice(0, TOTAL_ROWS);
  const emptyRowsCount = Math.max(0, TOTAL_ROWS - pageItems.length);
  const emptyRows = Array.from({ length: emptyRowsCount });

  return (
    <div id="patient-carnet-template" className="print-container text-black bg-white w-full max-w-[760px] mx-auto font-sans text-left block box-border select-none">
      <div
        className="print-page w-full p-6 pb-4 box-border flex flex-col justify-between min-h-[1050px] bg-white text-slate-900"
        style={{
          pageBreakAfter: 'auto',
          breakAfter: 'auto',
        }}
      >
        {/* --- TOP SECTION (2 Columns: Left Patient Info + Odontogram, Right Clinic Box) --- */}
        <div className="w-full flex justify-between items-start gap-4 mb-2">
          
          {/* LEFT COLUMN: Patient Information & Dental Odontogram Diagram */}
          <div className="w-[50%] flex flex-col justify-between">
            {/* Patient Lines with Dotted Leaders */}
            <div className="flex flex-col gap-1 text-[11px] text-slate-800 leading-normal">
              
              {/* Line 1: Dossier N° + Nom */}
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="bg-[#5c246e] carnet-pill !text-white font-black text-[10.5px] px-3 py-0.5 rounded-full uppercase tracking-wider shrink-0"
                    style={{ color: '#ffffff', backgroundColor: '#5c246e' }}
                  >
                    Dossier N° :
                  </span>
                  <span className="font-black text-xs text-[#5c246e] tracking-wider ml-1">
                    {patient.nationalId || (patient as any).customId || patient._id.slice(-6).toUpperCase()}
                  </span>
                </div>
                <div className="flex items-baseline flex-1 ml-2.5 min-w-0">
                  <span className="font-bold text-slate-700 w-13 shrink-0 text-[11px]">Nom :</span>
                  <span className="font-black uppercase text-slate-900 px-1 text-[11.5px] truncate">{lastName}</span>
                  <span className="flex-1 border-b border-dotted border-[#5c246e]/40 min-w-3"></span>
                </div>
              </div>

              {/* Line 2: Prénom */}
              <div className="flex items-baseline">
                <span className="font-bold text-slate-700 w-16 shrink-0">Prénom :</span>
                <span className="font-bold text-slate-900 px-1">{firstName}</span>
                <span className="flex-1 border-b border-dotted border-[#5c246e]/40 min-w-8"></span>
              </div>

              {/* Line 3: Né(e) le */}
              <div className="flex items-baseline">
                <span className="font-bold text-slate-700 w-16 shrink-0">Né(e) le :</span>
                <span className="font-bold text-slate-900 px-1">
                  {birthDateObj ? formatDate(patient.birthDate) : ''}
                </span>
                <span className="flex-1 border-b border-dotted border-[#5c246e]/40 min-w-8"></span>
              </div>

              {/* Line 4: Age & Sexe */}
              <div className="flex items-baseline">
                <span className="font-bold text-slate-700 w-16 shrink-0">Age :</span>
                <span className="font-bold text-slate-900 px-1">{ageStr}</span>
                <span className="flex-1 border-b border-dotted border-[#5c246e]/40 min-w-4"></span>
                <span className="font-bold text-slate-700 ml-2">Sex :</span>
                <span className="inline-flex items-center gap-1 font-bold text-slate-900 ml-1.5">
                  <span>F</span>
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-700 inline-flex items-center justify-center text-[9px] font-bold">
                    {isFemale ? '●' : ''}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 font-bold text-slate-900 ml-1.5">
                  <span>M</span>
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-700 inline-flex items-center justify-center text-[9px] font-bold">
                    {isMale ? '●' : ''}
                  </span>
                </span>
              </div>

              {/* Line 5: Adresse */}
              <div className="flex items-baseline">
                <span className="font-bold text-slate-700 w-16 shrink-0">Adresse :</span>
                <span className="font-semibold text-slate-900 px-1 truncate max-w-[210px]">{patient.address || ''}</span>
                <span className="flex-1 border-b border-dotted border-[#5c246e]/40 min-w-4"></span>
              </div>

              {/* Line 6: Tel */}
              <div className="flex items-baseline">
                <span className="font-bold text-slate-700 w-16 shrink-0">Tel :</span>
                <span className="font-black text-slate-900 px-1">{patient.phone || ''}</span>
                <span className="flex-1 border-b border-dotted border-[#5c246e]/40 min-w-4"></span>
              </div>

              {/* Line 7: Mutuelle */}
              <div className="flex items-baseline">
                <span className="font-bold text-slate-700 w-16 shrink-0">Mutuelle :</span>
                <span className="font-black text-[#5c246e] px-1">
                  {patient.insurance?.provider || (patient as any).mutuelle || ''}
                </span>
                <span className="flex-1 border-b border-dotted border-[#5c246e]/40 min-w-4"></span>
              </div>
            </div>

            {/* Anatomical Dental Cross Diagram Box */}
            <div className="border-2 border-[#5c246e] rounded-xs p-1.5 flex flex-col items-center justify-center mt-2.5 bg-white h-[165px] box-border">
              <DentalOdontogramCross acts={acts} />
            </div>
          </div>

          {/* RIGHT COLUMN: Official Purple Clinic Box with Logo from Asset, Specialties & Address */}
          <div className="w-[49%] border-2 border-[#5c246e] rounded-xs p-3 flex flex-col justify-between bg-white text-center min-h-[305px] box-border">
            {/* Top Logo & Title */}
            <div className="border-b border-[#5c246e]/30 pb-1.5 mb-1 flex items-center justify-between">
              <div className="flex items-center">
                <img
                  src={clinicLogo}
                  alt="Cabinet Tijini"
                  className="h-12 max-h-[50px] w-auto object-contain shrink-0"
                />
              </div>

              <div className="text-right">
                <h2
                  className="italic font-bold text-2xl text-[#5c246e] leading-none"
                  style={{ fontFamily: "'Segoe Script', 'Brush Script MT', 'Great Vibes', cursive, serif" }}
                >
                  Cabinet Tijini
                </h2>
                <div className="text-[9.5px] font-black uppercase tracking-[0.16em] text-slate-900 border-b-2 border-[#5c246e] pb-0.5 inline-block mt-1">
                  CHIRURGIENNE DENTISTE
                </div>
              </div>
            </div>

            {/* Specialties List (Bilingual with Hexagonal Purple Bullets) */}
            <div className="flex flex-col gap-0.5 py-1 text-[10px] text-slate-800">
              <SpecialtyRow fr="Implantologie" ar="زراعة الأسنان" />
              <SpecialtyRow fr="Esthétique dentaire" ar="تجميل الأسنان" />
              <SpecialtyRow fr="Chirurgie buccale" ar="جراحة الفم" />
              <SpecialtyRow fr="Orthodontie" ar="تقويم الأسنان" />
              <SpecialtyRow fr="Soins" ar="علاج الأسنان" />
              <SpecialtyRow fr="Prothèse" ar="تركيب الأسنان" />
              <SpecialtyRow fr="Blanchiment" ar="تبييض الأسنان" />
              <SpecialtyRow fr="Radio Panoramique" ar="راديو بانوراميك" />
            </div>

            {/* Clinic Contact & Address Footer (Comfortably Padded Inside Box) */}
            <div className="border-t border-[#5c246e]/30 pt-1.5 mt-auto text-[8px] text-slate-700 leading-tight pb-0.5">
              <div className="flex items-center justify-center gap-1 font-medium">
                <span className="text-rose-500 text-[9px]">📍</span>
                <span className="truncate">
                  {config?.address || 'Av Hassan II, lot AIN AL HAYAT 1, N° 235 , APPT N° 3, 1er Étage - SKHIRAT TEMARA'}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 mt-0.5 text-slate-900 font-bold">
                <span className="text-rose-600 text-[9px]">📞</span>
                <span>{config?.phones || '+212 7 19 55 66 37 / +212 6 54 23 10 76'}</span>
                <span>•</span>
                <span className="text-blue-500 text-[9px]">✉️</span>
                <span>{config?.email || 'dr.salmatijini@gmail.com'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* --- BOTTOM TABLE (Exact reproduction of Dr. Tijini's 6-column physical sheet) --- */}
        <div className="w-full border-2 border-[#5c246e] rounded-2xl overflow-hidden bg-white mt-1">
          <table className="w-full border-collapse text-xs text-slate-900 text-center">
            <thead>
              <tr className="border-b-2 border-[#5c246e] bg-white h-10">
                {/* Date */}
                <th className="border-r-2 border-[#5c246e] p-1.5 w-[14%]">
                  <div
                    className="bg-[#5c246e] carnet-pill !text-white font-black text-[11px] py-1 px-3 rounded-full uppercase tracking-wider inline-block min-w-[70px]"
                    style={{ color: '#ffffff', backgroundColor: '#5c246e' }}
                  >
                    DATE
                  </div>
                </th>
                {/* Dent */}
                <th className="border-r-2 border-[#5c246e] p-1.5 w-[9%]">
                  <div
                    className="bg-[#5c246e] carnet-pill !text-white font-black text-[11px] py-1 px-2.5 rounded-full uppercase tracking-wider inline-block min-w-[45px]"
                    style={{ color: '#ffffff', backgroundColor: '#5c246e' }}
                  >
                    DENT
                  </div>
                </th>
                {/* Acte */}
                <th className="border-r-2 border-[#5c246e] p-1.5 w-[41%]">
                  <div
                    className="bg-[#5c246e] carnet-pill !text-white font-black text-[11px] py-1 px-5 rounded-full uppercase tracking-wider inline-block min-w-[130px]"
                    style={{ color: '#ffffff', backgroundColor: '#5c246e' }}
                  >
                    ACTE
                  </div>
                </th>
                {/* A payer */}
                <th className="border-r-2 border-[#5c246e] p-1.5 w-[12%]">
                  <div
                    className="bg-[#5c246e] carnet-pill !text-white font-black text-[11px] py-1 px-2 rounded-full uppercase tracking-wider inline-block min-w-[65px]"
                    style={{ color: '#ffffff', backgroundColor: '#5c246e' }}
                  >
                    A PAYER
                  </div>
                </th>
                {/* Avance */}
                <th className="border-r-2 border-[#5c246e] p-1.5 w-[12%]">
                  <div
                    className="bg-[#5c246e] carnet-pill !text-white font-black text-[11px] py-1 px-2 rounded-full uppercase tracking-wider inline-block min-w-[65px]"
                    style={{ color: '#ffffff', backgroundColor: '#5c246e' }}
                  >
                    AVANCE
                  </div>
                </th>
                {/* Reste */}
                <th className="p-1.5 w-[12%]">
                  <div
                    className="bg-[#5c246e] carnet-pill !text-white font-black text-[11px] py-1 px-2 rounded-full uppercase tracking-wider inline-block min-w-[65px]"
                    style={{ color: '#ffffff', backgroundColor: '#5c246e' }}
                  >
                    RESTE
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Rendered Treatment & Payment Rows */}
              {pageItems.map((item, idx) => (
                <tr
                  key={`item-${idx}`}
                  className="border-b border-dotted border-[#b486c4] h-[37px] text-[11.5px] leading-tight"
                >
                  <td className="border-r-2 border-[#5c246e] px-2 text-center tabular-nums font-semibold text-slate-800">
                    {item.date}
                  </td>
                  <td className="border-r-2 border-[#5c246e] px-1 text-center font-bold text-slate-900">
                    {item.tooth || '—'}
                  </td>
                  <td className="border-r-2 border-[#5c246e] px-3 text-left font-semibold text-slate-900 truncate max-w-[260px]">
                    {item.description}
                  </td>
                  <td className="border-r-2 border-[#5c246e] px-2.5 text-right tabular-nums font-bold text-slate-900">
                    {item.aPayer ? `${item.aPayer.toFixed(2).replace('.', ',')}` : '—'}
                  </td>
                  <td className="border-r-2 border-[#5c246e] px-2.5 text-right tabular-nums font-bold text-[#5c246e]">
                    {item.avance ? `${item.avance.toFixed(2).replace('.', ',')}` : '—'}
                  </td>
                  <td className="px-2.5 text-right tabular-nums font-black text-slate-900">
                    {item.reste !== undefined && item.reste !== null
                      ? `${item.reste.toFixed(2).replace('.', ',')}`
                      : '—'}
                  </td>
                </tr>
              ))}

              {/* Empty Dotted Rows filling the full height of the sheet */}
              {emptyRows.map((_, emptyIdx) => (
                <tr
                  key={`empty-${emptyIdx}`}
                  className={`border-b border-dotted border-[#b486c4] h-[37px] ${
                    emptyIdx === emptyRowsCount - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="border-r-2 border-[#5c246e]"></td>
                  <td className="border-r-2 border-[#5c246e]"></td>
                  <td className="border-r-2 border-[#5c246e]"></td>
                  <td className="border-r-2 border-[#5c246e]"></td>
                  <td className="border-r-2 border-[#5c246e]"></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Specialty Row with Purple Hexagon Bullet
const SpecialtyRow: React.FC<{ fr: string; ar: string }> = ({ fr, ar }) => (
  <div className="flex items-center justify-between px-1 py-0.2">
    <span className="w-[42%] text-left font-bold text-slate-800 text-[9.5px] leading-tight">{fr}</span>
    <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-[#5c246e] shrink-0" fill="currentColor">
      <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" />
    </svg>
    <span className="w-[42%] text-right font-black text-slate-900 text-[10.5px] font-serif leading-tight" dir="rtl">{ar}</span>
  </div>
);

// Tooth Line Art Logo SVG Fallback
const ToothLogoSvg = () => (
  <svg viewBox="0 0 40 40" className="w-10 h-10 text-[#5c246e]" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M20 5 C15 5 11 9 11 15 C11 20 14 26 16 33 C17 35 19 35 20 31 C21 35 23 35 24 33 C26 26 29 20 29 15 C29 9 25 5 20 5 Z" />
    <circle cx="28" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" />
    <line x1="32" y1="8" x2="36" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// High-Fidelity Anatomical Odontogram Diagram matching the physical sheet drawing
const DentalOdontogramCross: React.FC<{ acts: any[] }> = ({ acts }) => {
  const treatedTeeth = new Set(
    acts.map((a) => String(a.tooth || '').trim()).filter((t) => t && t !== '-')
  );

  return (
    <div className="relative w-full flex justify-center py-0.5">
      <svg viewBox="0 0 220 155" className="w-full max-w-[215px] h-[145px] text-[#5c246e]">
        <defs>
          <marker id="arr-up" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
            <path d="M 0 10 L 5 0 L 10 10 z" fill="#5c246e" />
          </marker>
          <marker id="arr-down" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
            <path d="M 0 0 L 5 10 L 10 0 z" fill="#5c246e" />
          </marker>
          <marker id="arr-left" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
            <path d="M 10 0 L 0 5 L 10 10 z" fill="#5c246e" />
          </marker>
          <marker id="arr-right" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#5c246e" />
          </marker>
        </defs>

        {/* Central Axes Cross */}
        <line x1="110" y1="18" x2="110" y2="138" stroke="#5c246e" strokeWidth="1.6" markerStart="url(#arr-up)" markerEnd="url(#arr-down)" />
        <line x1="18" y1="78" x2="202" y2="78" stroke="#5c246e" strokeWidth="1.6" markerStart="url(#arr-left)" markerEnd="url(#arr-right)" />

        {/* Direction Letters: H (Haut), B (Bas), D (Droite), G (Gauche) */}
        <text x="110" y="11" textAnchor="middle" fill="#5c246e" fontSize="11" fontWeight="bold">H</text>
        <text x="110" y="152" textAnchor="middle" fill="#5c246e" fontSize="11" fontWeight="bold">B</text>
        <text x="7" y="81.5" textAnchor="middle" fill="#5c246e" fontSize="11" fontWeight="bold">D</text>
        <text x="213" y="81.5" textAnchor="middle" fill="#5c246e" fontSize="11" fontWeight="bold">G</text>

        {/* --- QUADRANT 1: Upper Right on Patient (Top-Left on diagram: teeth 18 to 11) --- */}
        {[
          { num: '8', tId: '18', cx: 34, cy: 68 },
          { num: '7', tId: '17', cx: 39, cy: 54 },
          { num: '6', tId: '16', cx: 46, cy: 42 },
          { num: '5', tId: '15', cx: 55, cy: 32 },
          { num: '4', tId: '14', cx: 66, cy: 24 },
          { num: '3', tId: '13', cx: 78, cy: 19 },
          { num: '2', tId: '12', cx: 90, cy: 17 },
          { num: '1', tId: '11', cx: 102, cy: 17 },
        ].map((tooth) => {
          const isTreated = treatedTeeth.has(tooth.tId) || treatedTeeth.has(tooth.num);
          return (
            <g key={tooth.tId}>
              {/* Anatomical tooth contour */}
              <circle
                cx={tooth.cx}
                cy={tooth.cy}
                r="4.8"
                fill={isTreated ? '#5c246e' : '#ffffff'}
                stroke="#5c246e"
                strokeWidth="1.2"
              />
              <text
                x={tooth.cx}
                y={tooth.cy + 2.8}
                textAnchor="middle"
                fontSize="6.5"
                fontWeight="bold"
                fill={isTreated ? '#ffffff' : '#5c246e'}
              >
                {tooth.num}
              </text>
            </g>
          );
        })}

        {/* --- QUADRANT 2: Upper Left on Patient (Top-Right on diagram: teeth 21 to 28) --- */}
        {[
          { num: '1', tId: '21', cx: 118, cy: 17 },
          { num: '2', tId: '22', cx: 130, cy: 17 },
          { num: '3', tId: '23', cx: 142, cy: 19 },
          { num: '4', tId: '24', cx: 154, cy: 24 },
          { num: '5', tId: '25', cx: 165, cy: 32 },
          { num: '6', tId: '26', cx: 174, cy: 42 },
          { num: '7', tId: '27', cx: 181, cy: 54 },
          { num: '8', tId: '28', cx: 186, cy: 68 },
        ].map((tooth) => {
          const isTreated = treatedTeeth.has(tooth.tId) || treatedTeeth.has(tooth.num);
          return (
            <g key={tooth.tId}>
              <circle
                cx={tooth.cx}
                cy={tooth.cy}
                r="4.8"
                fill={isTreated ? '#5c246e' : '#ffffff'}
                stroke="#5c246e"
                strokeWidth="1.2"
              />
              <text
                x={tooth.cx}
                y={tooth.cy + 2.8}
                textAnchor="middle"
                fontSize="6.5"
                fontWeight="bold"
                fill={isTreated ? '#ffffff' : '#5c246e'}
              >
                {tooth.num}
              </text>
            </g>
          );
        })}

        {/* --- QUADRANT 4: Lower Right on Patient (Bottom-Left on diagram: teeth 48 to 41) --- */}
        {[
          { num: '8', tId: '48', cx: 34, cy: 88 },
          { num: '7', tId: '47', cx: 39, cy: 102 },
          { num: '6', tId: '46', cx: 46, cy: 114 },
          { num: '5', tId: '45', cx: 55, cy: 124 },
          { num: '4', tId: '44', cx: 66, cy: 132 },
          { num: '3', tId: '43', cx: 78, cy: 137 },
          { num: '2', tId: '42', cx: 90, cy: 139 },
          { num: '1', tId: '41', cx: 102, cy: 139 },
        ].map((tooth) => {
          const isTreated = treatedTeeth.has(tooth.tId) || treatedTeeth.has(tooth.num);
          return (
            <g key={tooth.tId}>
              <circle
                cx={tooth.cx}
                cy={tooth.cy}
                r="4.8"
                fill={isTreated ? '#5c246e' : '#ffffff'}
                stroke="#5c246e"
                strokeWidth="1.2"
              />
              <text
                x={tooth.cx}
                y={tooth.cy + 2.8}
                textAnchor="middle"
                fontSize="6.5"
                fontWeight="bold"
                fill={isTreated ? '#ffffff' : '#5c246e'}
              >
                {tooth.num}
              </text>
            </g>
          );
        })}

        {/* --- QUADRANT 3: Lower Left on Patient (Bottom-Right on diagram: teeth 31 to 38) --- */}
        {[
          { num: '1', tId: '31', cx: 118, cy: 139 },
          { num: '2', tId: '32', cx: 130, cy: 139 },
          { num: '3', tId: '33', cx: 142, cy: 137 },
          { num: '4', tId: '34', cx: 154, cy: 132 },
          { num: '5', tId: '35', cx: 165, cy: 124 },
          { num: '6', tId: '36', cx: 174, cy: 114 },
          { num: '7', tId: '37', cx: 181, cy: 102 },
          { num: '8', tId: '38', cx: 186, cy: 88 },
        ].map((tooth) => {
          const isTreated = treatedTeeth.has(tooth.tId) || treatedTeeth.has(tooth.num);
          return (
            <g key={tooth.tId}>
              <circle
                cx={tooth.cx}
                cy={tooth.cy}
                r="4.8"
                fill={isTreated ? '#5c246e' : '#ffffff'}
                stroke="#5c246e"
                strokeWidth="1.2"
              />
              <text
                x={tooth.cx}
                y={tooth.cy + 2.8}
                textAnchor="middle"
                fontSize="6.5"
                fontWeight="bold"
                fill={isTreated ? '#ffffff' : '#5c246e'}
              >
                {tooth.num}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
