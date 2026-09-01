/**
 * Standardized Date Formatter Utility for Dr. Salma Tijini Dental Management System
 * Enforces unified Moroccan / French date formatting (JJ/MM/AAAA) with stylish badges across the app.
 */

/**
 * Standard date format: JJ/MM/AAAA (e.g. 14/05/2026)
 */
export const formatDate = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '—';
  }
};

/**
 * Date + Time format: JJ/MM/AAAA à HH:MM (e.g. 14/05/2026 à 10:30)
 */
export const formatDateTime = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '—';
    const datePart = formatDate(d);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${datePart} à ${hours}:${minutes}`;
  } catch {
    return '—';
  }
};

/**
 * Time only format: HH:MM (e.g. 10:30)
 */
export const formatTime = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '—';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '—';
  }
};

/**
 * Long readable date format (e.g. Mardi 14 Mai 2026)
 */
export const formatDateLong = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '—';
    const formatted = d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return '—';
  }
};

/**
 * Calculate age in years
 */
export const calculateAge = (birthDateInput: string | Date | undefined | null): number => {
  if (!birthDateInput) return 0;
  try {
    const birth = typeof birthDateInput === 'string' ? new Date(birthDateInput) : birthDateInput;
    if (isNaN(birth.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return Math.max(0, age);
  } catch {
    return 0;
  }
};

/**
 * Birth date + Age helper: "14/05/1992 (34 ans)"
 */
export const formatBirthDateWithAge = (birthDateInput: string | Date | undefined | null): string => {
  if (!birthDateInput) return '—';
  const formattedDate = formatDate(birthDateInput);
  const age = calculateAge(birthDateInput);
  if (formattedDate === '—') return '—';
  return `${formattedDate} (${age} ans)`;
};

/**
 * Relative or localized appointment date display:
 * "Aujourd'hui à 10:30", "Demain à 14:00", "Hier à 09:15", or "14/05/2026 à 10:30"
 */
export const formatRelativeDateTime = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '—';

    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow =
      d.getDate() === tomorrow.getDate() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getFullYear() === tomorrow.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();

    const timeStr = formatTime(d);

    if (isToday) return `Aujourd'hui à ${timeStr}`;
    if (isTomorrow) return `Demain à ${timeStr}`;
    if (isYesterday) return `Hier à ${timeStr}`;

    return `${formatDate(d)} à ${timeStr}`;
  } catch {
    return '—';
  }
};
