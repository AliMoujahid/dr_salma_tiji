import { ToothStatusType } from '../types';

/**
 * Intelligent Act-to-Tooth Status mapper
 * Analyzes procedure names and categories to determine realistic clinical tooth status.
 */
export const mapActToToothStatus = (actName: string = '', category: string = ''): ToothStatusType => {
  const text = `${actName} ${category}`.toLowerCase();

  // Extraction / Avulsion / Dent arrachée
  if (
    text.includes('extraction') ||
    text.includes('exo') ||
    text.includes('avulsion') ||
    text.includes('extraire') ||
    text.includes('arrach') ||
    text.includes('dent extraite')
  ) {
    return 'Extracted';
  }

  // Absente / Manquante / Agénésie
  if (text.includes('absent') || text.includes('manqu') || text.includes('agénésie')) {
    return 'Missing';
  }

  // Implant dentaire
  if (text.includes('implant') || text.includes('pilier implant')) {
    return 'Implant';
  }

  // Pont (Bridge)
  if (text.includes('bridge') || text.includes('pont')) {
    return 'Bridge';
  }

  // Couronne, Inlay, Onlay, Facette
  if (
    text.includes('couronne') ||
    text.includes('zircone') ||
    text.includes('céramique') ||
    text.includes('prothèse fixe') ||
    text.includes('facette') ||
    text.includes('veneer') ||
    text.includes('inlay') ||
    text.includes('onlay')
  ) {
    return 'Crown';
  }

  // Dévitalisation / Endodontie / Traitement de canal / Pulpotomie
  if (
    text.includes('endo') ||
    text.includes('dévitalis') ||
    text.includes('pulpo') ||
    text.includes('reconstitution') ||
    text.includes('racine') ||
    text.includes('canal') ||
    text.includes('inlay-core')
  ) {
    return 'Root Canal';
  }

  // Carie / Composite / Obturation / Plombage
  if (
    text.includes('composite') ||
    text.includes('carie') ||
    text.includes('plombage') ||
    text.includes('obturation') ||
    text.includes('résine') ||
    text.includes('restauration') ||
    text.includes('soin conservateur')
  ) {
    return 'Filling';
  }

  // Sagesse
  if (text.includes('sagesse')) {
    return 'Wisdom Tooth';
  }

  // Fracture
  if (text.includes('fracture') || text.includes('fêlure') || text.includes('cassée')) {
    return 'Fracture';
  }

  // Mobilité dentaire
  if (text.includes('mobilit') || text.includes('mobile')) {
    return 'Mobile';
  }

  return 'Healthy';
};

/**
 * Extracts and normalizes tooth numbers from user input strings.
 * E.g.: "1" -> [11] (Incisive centrale sup. droite in 1-8 quadrant notation)
 *       "11" -> [11]
 *       "16, 26" -> [16, 26]
 *       "Dent 21" -> [21]
 */
export const parseToothNumbers = (toothInput: string | number | undefined): number[] => {
  if (toothInput === undefined || toothInput === null) return [];
  const str = String(toothInput).trim();
  if (!str || str === '-' || str === '0') return [];

  // Split on punctuation, whitespace, commas, slashes, dashes
  const tokens = str.split(/[\s,;/+&]+/).filter(Boolean);
  const results: number[] = [];

  for (const token of tokens) {
    const clean = token.replace(/[^0-9]/g, '');
    if (!clean) continue;
    const n = parseInt(clean, 10);
    if (isNaN(n)) continue;

    // Single digit notation 1-8 (Palmer / Quadrant 1 default):
    // 1 -> 11, 2 -> 12, 3 -> 13, 4 -> 14, 5 -> 15, 6 -> 16, 7 -> 17, 8 -> 18
    if (n >= 1 && n <= 8) {
      results.push(10 + n);
    } else if ((n >= 11 && n <= 48) || (n >= 51 && n <= 85)) {
      results.push(n);
    }
  }

  return Array.from(new Set(results));
};

/**
 * Checks whether a tooth input string or number matches a specific FDI tooth number.
 * Allows matching "1" to 11, "11" to 11, "16, 26" to 16 and 26, etc.
 */
export const matchesTooth = (toothInput: string | number | undefined, fdiNumber: number): boolean => {
  if (toothInput === undefined || toothInput === null) return false;
  const str = String(toothInput).trim();
  if (!str || str === '-' || str === '0') return false;

  // Exact number match or string match
  if (str === String(fdiNumber)) return true;

  // Single digit shorthand (e.g. "1" matches tooth 11)
  if (fdiNumber >= 11 && fdiNumber <= 18 && str === String(fdiNumber % 10)) {
    return true;
  }

  // Parse list of teeth in string
  const parsed = parseToothNumbers(str);
  if (parsed.includes(fdiNumber)) return true;

  // Also check if raw string literally contains the tooth number
  const regex = new RegExp(`\\b${fdiNumber}\\b`);
  return regex.test(str);
};

/**
 * Human-friendly tooth label (French / FDI)
 */
export const getToothLabel = (fdiNumber: number): string => {
  const quadrant = Math.floor(fdiNumber / 10);
  const digit = fdiNumber % 10;

  const names: Record<number, string> = {
    1: 'Incisive Centrale',
    2: 'Incisive Latérale',
    3: 'Canine',
    4: '1ère Prémolaire',
    5: '2ème Prémolaire',
    6: '1ère Molaire (6 ans)',
    7: '2ème Molaire (12 ans)',
    8: 'Dent de Sagesse',
  };

  const jawSide: Record<number, string> = {
    1: 'Sup. Droite',
    2: 'Sup. Gauche',
    3: 'Inf. Gauche',
    4: 'Inf. Droite',
  };

  const name = names[digit] || `Dent ${digit}`;
  const side = jawSide[quadrant] || '';
  return `Dent ${fdiNumber} - ${name} (${side})`;
};
