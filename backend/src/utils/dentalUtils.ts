export const mapActToToothStatus = (actName: string = '', category: string = ''): string => {
  const text = `${actName} ${category}`.toLowerCase();

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

  if (text.includes('absent') || text.includes('manqu') || text.includes('agénésie')) {
    return 'Missing';
  }

  if (text.includes('implant') || text.includes('pilier implant')) {
    return 'Implant';
  }

  if (text.includes('bridge') || text.includes('pont')) {
    return 'Bridge';
  }

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

  if (text.includes('sagesse')) {
    return 'Wisdom Tooth';
  }

  if (text.includes('fracture') || text.includes('fêlure') || text.includes('cassée')) {
    return 'Fracture';
  }

  if (text.includes('mobilit') || text.includes('mobile')) {
    return 'Mobile';
  }

  return 'Healthy';
};

export const parseToothNumbers = (toothInput: string | number | undefined): number[] => {
  if (toothInput === undefined || toothInput === null) return [];
  const str = String(toothInput).trim();
  if (!str || str === '-' || str === '0') return [];

  const tokens = str.split(/[\s,;/+&]+/).filter(Boolean);
  const results: number[] = [];

  for (const token of tokens) {
    const clean = token.replace(/[^0-9]/g, '');
    if (!clean) continue;
    const n = parseInt(clean, 10);
    if (isNaN(n)) continue;

    if (n >= 1 && n <= 8) {
      results.push(10 + n);
    } else if ((n >= 11 && n <= 48) || (n >= 51 && n <= 85)) {
      results.push(n);
    }
  }

  return Array.from(new Set(results));
};

export const matchesTooth = (toothInput: string | number | undefined, fdiNumber: number): boolean => {
  if (toothInput === undefined || toothInput === null) return false;
  const str = String(toothInput).trim();
  if (!str || str === '-' || str === '0') return false;

  if (str === String(fdiNumber)) return true;

  if (fdiNumber >= 11 && fdiNumber <= 18 && str === String(fdiNumber % 10)) {
    return true;
  }

  const parsed = parseToothNumbers(str);
  if (parsed.includes(fdiNumber)) return true;

  const regex = new RegExp(`\\b${fdiNumber}\\b`);
  return regex.test(str);
};
