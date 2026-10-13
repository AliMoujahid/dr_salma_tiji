import jsPDF from 'jspdf';

export interface NanoPixPDFOptions {
  patient: {
    chartNo: string;
    name: string;
    gender: string;
    birthDate: string;
    age: number;
  };
  studyUrl?: string;
  tooth?: number;
  timestamp?: string;
  diagnosis?: string;
  date?: string;
  action?: 'download' | 'print' | 'preview';
  orientation?: 'portrait' | 'landscape';
  paperSize?: string;
  showHeader?: boolean;
  showFooter?: boolean;
}

/**
 * Converts image URL to base64 Data URL for robust vector PDF embedding
 */
async function getBase64Image(url: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 800;
          canvas.height = img.naturalHeight || img.height || 600;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          resolve({ dataUrl, width: canvas.width, height: canvas.height });
        } catch (err) {
          console.warn('Canvas conversion error:', err);
          resolve(null);
        }
      };
      img.onerror = () => {
        console.warn('Image load error for PDF:', url);
        resolve(null);
      };
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

/**
 * Generates an authentic, pixel-perfect, vector A4 PDF matching the Eighteeth NanoPix Desktop software
 */
export async function generateNanoPixPDF(options: NanoPixPDFOptions): Promise<jsPDF> {
  const orientation = options.orientation || 'portrait';
  const paperFormat = (options.paperSize || 'a4').toLowerCase();
  const showHeader = options.showHeader !== false;
  const showFooter = options.showFooter !== false;

  // 1. Initialize Document
  const doc = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: paperFormat,
    compress: true,
  });

  const pageWidth = orientation === 'landscape' ? 297 : 210;
  const pageHeight = orientation === 'landscape' ? 210 : 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // Eighteeth NanoPix signature green color: #00ea00 -> RGB(0, 234, 0)
  const greenR = 0;
  const greenG = 234;
  const greenB = 0;

  const dateStr = options.date || new Date().toISOString().split('T')[0];

  // Helper: Draw Header / Footer Box
  const drawMetadataBox = (yPos: number) => {
    const boxHeight = 14.5;
    const dateBoxWidth = 24;
    const infoBoxWidth = contentWidth - dateBoxWidth - 2;

    doc.setDrawColor(greenR, greenG, greenB);
    doc.setLineWidth(0.35);

    // Left Date Box
    doc.rect(margin, yPos, dateBoxWidth, boxHeight);
    doc.setFont('courier', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    doc.text(dateStr, margin + dateBoxWidth / 2, yPos + boxHeight / 2 + 1.2, { align: 'center' });

    // Right Info Box
    const infoX = margin + dateBoxWidth + 2;
    doc.rect(infoX, yPos, infoBoxWidth, boxHeight);

    const line1 = `Chart No.: ${options.patient.chartNo}   Gender: ${options.patient.gender}`;
    const line2 = `Name: ${options.patient.name.toLowerCase()}`;
    const line3 = `Date of Birth: ${options.patient.birthDate}   Age: ${options.patient.age}Y`;

    const centerX = infoX + infoBoxWidth / 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(line1, centerX, yPos + 4.2, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(line2, centerX, yPos + 8.2, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(line3, centerX, yPos + 12.2, { align: 'center' });
  };

  // 1. DRAW TOP HEADER BOX (if enabled)
  let currentY = 16;
  if (showHeader) {
    drawMetadataBox(currentY);
    currentY += 18; // 34mm
  }

  // 2. DRAW IMAGE BOX
  const imageBoxY = currentY;
  const imageBoxHeight = orientation === 'landscape' ? 75 : 105;
  doc.setDrawColor(greenR, greenG, greenB);
  doc.setLineWidth(0.35);
  doc.rect(margin, imageBoxY, contentWidth, imageBoxHeight);

  if (options.studyUrl) {
    const imgData = await getBase64Image(options.studyUrl);
    if (imgData) {
      const maxW = contentWidth - 12; // 170mm
      const maxH = imageBoxHeight - 14;
      const aspect = imgData.width / imgData.height;

      let finalW = maxW;
      let finalH = finalW / aspect;

      if (finalH > maxH) {
        finalH = maxH;
        finalW = finalH * aspect;
      }

      const imgX = margin + (contentWidth - finalW) / 2;
      const imgY = imageBoxY + 3;

      doc.addImage(imgData.dataUrl, 'JPEG', imgX, imgY, finalW, finalH);

      // Label under radiograph
      const rawTs = options.timestamp || '20260904_191429';
      const cleanTs = rawTs.replace(/[^0-9]/g, '');
      const label = `IO_${options.tooth || 18}_${cleanTs}`;

      doc.setFont('courier', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      doc.text(label, margin + contentWidth / 2, imageBoxY + imageBoxHeight - 3, { align: 'center' });
    }
  }

  // 3. DRAW TEXT BOX (Observations / Diagnostic or 100% Blank for Handwriting)
  const textBoxY = imageBoxY + imageBoxHeight + 3.5;
  const remainingSpace = pageHeight - textBoxY - (showFooter ? 22 : 14);
  const textBoxHeight = Math.max(50, remainingSpace);

  doc.setDrawColor(greenR, greenG, greenB);
  doc.setLineWidth(0.35);
  doc.rect(margin, textBoxY, contentWidth, textBoxHeight);

  if (options.diagnosis && options.diagnosis.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    const splitLines = doc.splitTextToSize(options.diagnosis, contentWidth - 6);
    doc.text(splitLines, margin + 3, textBoxY + 6);
  }
  // When empty: Completely blank white box with green border (NO "Text" word written!)

  // 4. DRAW BOTTOM FOOTER BOX (if enabled)
  if (showFooter) {
    const footerY = textBoxY + textBoxHeight + 3.5;
    drawMetadataBox(footerY);
  }

  // 5. Handle Action
  if (options.action === 'download') {
    doc.save(`NanoPix_Report_${options.patient.chartNo || 'patient'}.pdf`);
  } else if (options.action === 'print') {
    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    const win = window.open(blobUrl, '_blank');
    if (win) {
      win.focus();
    }
  } else if (options.action === 'preview') {
    const blobUrl = doc.output('bloburl');
    window.open(blobUrl, '_blank');
  }

  return doc;
}

