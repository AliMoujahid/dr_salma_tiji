import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Printer,
  Download,
  FileDown,
  ZoomIn,
  ZoomOut,
  FileSpreadsheet,
  Info,
} from 'lucide-react';
import { ClinicConfig } from '../types';
import { PatientLedgerPrintLayout } from './PatientLedgerPrintLayout';
import { useToast } from '../context/ToastContext';

interface EmptyCarnetModalProps {
  isOpen: boolean;
  onClose: () => void;
  config?: ClinicConfig | null;
}

export const EmptyCarnetModal: React.FC<EmptyCarnetModalProps> = ({
  isOpen,
  onClose,
  config = null,
}) => {
  const { toast } = useToast();
  const [scale, setScale] = useState<number>(0.72);

  // Esc key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Print or Save as PDF with strict isolation (Hides entire application #root)
  const handlePrintOrSavePdf = (isDownload = false) => {
    const originalTitle = document.title;
    // Set document title so Chrome/Edge uses this name when saving as PDF
    document.title = 'Carnet_Financier_Vierge_Cabinet_Tijini';
    document.body.classList.add('printing-carnet-vierge');

    if (isDownload) {
      toast.info(
        'Téléchargement PDF',
        'La destination est sur "Enregistrer au format PDF". Cliquez sur "Enregistrer" pour sauvegarder le Carnet Financier.'
      );
    }

    const cleanup = () => {
      document.body.classList.remove('printing-carnet-vierge');
      document.title = originalTitle;
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);

    setTimeout(() => {
      window.print();
      // Fallback cleanup in case afterprint does not fire
      setTimeout(cleanup, 2000);
    }, 120);
  };

  // Direct standalone HTML file download
  const handleDownloadStandaloneHtml = () => {
    const printEl = document.getElementById('preview-empty-carnet-sheet');
    if (!printEl) return;

    const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Carnet_Financier_Vierge_Cabinet_Tijini</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    html, body { margin: 0; padding: 0; background: #ffffff; color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .print-container { width: 100%; max-width: 760px; margin: 0 auto; background: white; }
    .carnet-pill { color: #ffffff !important; background-color: #5c246e !important; }
    @media print {
      .no-print { display: none !important; }
    }
  </style>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css">
</head>
<body style="padding: 20px;">
  <div style="text-align: center; margin-bottom: 15px;" class="no-print">
    <button onclick="window.print()" style="background: #5c246e; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px;">
      🖨️ Imprimer / Enregistrer en PDF (A4)
    </button>
  </div>
  ${printEl.innerHTML}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Carnet_Financier_Vierge_Cabinet_Tijini.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Fichier téléchargé', 'Le modèle hors-ligne a été enregistré.');
  };

  return (
    <>
      {/* Offscreen Print Portal: STRICTLY isolated, rendered at body level */}
      {createPortal(
        <div id="print-carnet-vierge-portal" className="hidden">
          <PatientLedgerPrintLayout
            config={config}
            isEmptyCarnet={true}
            acts={[]}
            payments={[]}
            summary={{ totalActsAmount: 0, totalPaidAmount: 0, remainingBalance: 0 }}
          />
        </div>,
        document.body
      )}

      {/* Main Modal Overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs select-none animate-in fade-in duration-150">
        <div className="w-full max-w-5xl max-h-[96vh] bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
          
          {/* Header Toolbar */}
          <div className="p-3.5 px-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 shrink-0 flex-wrap">
            
            {/* Title & Badge */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-[#5c246e] dark:text-purple-300 shrink-0 border border-purple-200/60 dark:border-purple-800/60">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    Carnet Financier Vierge (A4)
                  </h3>
                  <span className="bg-purple-100 dark:bg-purple-900/50 text-[#5c246e] dark:text-purple-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Modèle Vide
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  Cabinet Tijini • Imprimez ou téléchargez des fiches vierges sans données pour vos dossiers physiques
                </p>
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setScale((prev) => Math.max(0.45, Number((prev - 0.08).toFixed(2))))}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Zoom Arrière (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 w-10 text-center select-none">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setScale((prev) => Math.min(1.2, Number((prev + 0.08).toFixed(2))))}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Zoom Avant (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="h-4 w-px bg-slate-300 dark:bg-white/10 mx-0.5" />
              <button
                type="button"
                onClick={() => setScale(0.72)}
                className="px-2 py-1 text-[11px] font-bold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Ajuster à l'écran"
              >
                Ajuster
              </button>
              <button
                type="button"
                onClick={() => setScale(1)}
                className="px-2 py-1 text-[11px] font-bold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Taille Réelle 100%"
              >
                100%
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Télécharger PDF Button */}
              <button
                type="button"
                onClick={() => handlePrintOrSavePdf(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition-all cursor-pointer"
                title="Télécharger et enregistrer au format PDF"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger PDF</span>
              </button>

              {/* Direct Print Button */}
              <button
                type="button"
                onClick={() => handlePrintOrSavePdf(false)}
                className="flex items-center gap-2 px-3.5 py-2 bg-[#5c246e] hover:bg-[#4a1c59] text-white rounded-xl text-xs font-bold shadow-md shadow-[#5c246e]/25 transition-all cursor-pointer"
                title="Imprimer directement sur votre imprimante papier (A4)"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer (A4)</span>
              </button>

              {/* Offline File Download */}
              <button
                type="button"
                onClick={handleDownloadStandaloneHtml}
                className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Télécharger le modèle HTML hors-ligne"
              >
                <FileDown className="w-4.5 h-4.5" />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-1"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body: Scaled Full-Page A4 Sheet View */}
          <div className="flex-1 overflow-auto p-4 md:p-6 flex justify-center items-start bg-slate-950/70">
            <div
              style={{
                width: `${760 * scale}px`,
                height: `${1060 * scale}px`,
              }}
              className="relative shrink-0 shadow-2xl transition-all duration-150 my-auto"
            >
              <div
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  width: '760px',
                  height: '1060px',
                }}
                className="absolute top-0 left-0 bg-white rounded-xs overflow-hidden border border-slate-300 shadow-2xl"
              >
                <div id="preview-empty-carnet-sheet">
                  <PatientLedgerPrintLayout
                    config={config}
                    isEmptyCarnet={true}
                    acts={[]}
                    payments={[]}
                    summary={{ totalActsAmount: 0, totalPaidAmount: 0, remainingBalance: 0 }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Info Banner */}
          <div className="p-2.5 px-5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                Format A4 portrait officiel. Cliquez sur <strong>« Télécharger PDF »</strong> ou <strong>« Imprimer (A4) »</strong> pour obtenir votre carnet vierge 1 page.
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Dr. Salma Tijini • Cabinet Dentaire
            </span>
          </div>

        </div>
      </div>
    </>
  );
};
