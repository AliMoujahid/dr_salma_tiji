import { ToothSurface } from '../components/dental3d/dental3dTypes';
export type { ToothSurface };

/**
 * Surface detection and formatting utility
 * Extracts affected dental surfaces from clinical procedures and notes
 */
export const detectToothSurface = (
  procedureName?: string,
  notes?: string
): ToothSurface => {
  const combined = `${procedureName || ''} ${notes || ''}`.toLowerCase();

  if (combined.includes('mod') || combined.includes('mésio-occluso-distal') || combined.includes('mesio-occluso-distal')) {
    return 'MOD';
  }
  if (
    combined.includes('occlusal') ||
    combined.includes('occlusale') ||
    combined.includes('incisif') ||
    combined.includes('incisive') ||
    combined.includes('(o)') ||
    combined.includes('face o')
  ) {
    return 'Occlusal';
  }
  if (
    combined.includes('mésial') ||
    combined.includes('mésiale') ||
    combined.includes('mesial') ||
    combined.includes('mesiale') ||
    combined.includes('(m)') ||
    combined.includes('face m')
  ) {
    return 'Mesial';
  }
  if (
    combined.includes('distal') ||
    combined.includes('distale') ||
    combined.includes('(d)') ||
    combined.includes('face d')
  ) {
    return 'Distal';
  }
  if (
    combined.includes('vestibulaire') ||
    combined.includes('buccal') ||
    combined.includes('buccale') ||
    combined.includes('labial') ||
    combined.includes('labiale') ||
    combined.includes('(v)') ||
    combined.includes('face v')
  ) {
    return 'Buccal';
  }
  if (
    combined.includes('lingual') ||
    combined.includes('linguale') ||
    combined.includes('palatin') ||
    combined.includes('palatine') ||
    combined.includes('(l)') ||
    combined.includes('face l')
  ) {
    return 'Lingual';
  }

  return 'Global';
};

export const SURFACE_OPTIONS: { value: ToothSurface; label: string; code: string }[] = [
  { value: 'Global', label: 'Dent entière (Globale)', code: 'ALL' },
  { value: 'Occlusal', label: 'Face Occlusale / Biting (O)', code: 'O' },
  { value: 'Mesial', label: 'Face Mésiale (M)', code: 'M' },
  { value: 'Distal', label: 'Face Distale (D)', code: 'D' },
  { value: 'Buccal', label: 'Face Vestibulaire / Labiale (V)', code: 'V' },
  { value: 'Lingual', label: 'Face Linguale / Palatine (L)', code: 'L' },
  { value: 'MOD', label: 'Mésio-Occluso-Distale (MOD)', code: 'MOD' },
];
