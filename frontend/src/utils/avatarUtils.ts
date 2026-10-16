import { getUploadUrl } from '../config/api';

/**
 * Generates an offline, 100% local SVG Data-URI avatar with deterministic initials and gradient.
 * Works completely offline with ZERO network or internet requests.
 */
export const getLocalAvatar = (name?: string, prenom?: string, profilePictureUrl?: string): string => {
  if (profilePictureUrl && profilePictureUrl.trim()) {
    return getUploadUrl(profilePictureUrl);
  }

  const n = (name || '').trim();
  const p = (prenom || '').trim();
  const firstLetter = n.charAt(0).toUpperCase() || 'P';
  const secondLetter = p.charAt(0).toUpperCase() || (n.length > 1 ? n.charAt(1).toUpperCase() : '');
  const initials = `${firstLetter}${secondLetter}`.trim() || 'P';

  // Harmonious dental clinic color gradients based on character codes
  const gradients = [
    ['#2563EB', '#1D4ED8'], // Royal Blue
    ['#4F46E5', '#3730A3'], // Indigo
    ['#0891B2', '#0E7490'], // Cyan
    ['#0D9488', '#0F766E'], // Teal
    ['#7C3AED', '#5B21B6'], // Violet
    ['#0284C7', '#0369A1'], // Sky
  ];

  let sum = 0;
  for (let i = 0; i < n.length; i++) sum += n.charCodeAt(i);
  for (let i = 0; i < p.length; i++) sum += p.charCodeAt(i);

  const [color1, color2] = gradients[sum % gradients.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color1}"/>
        <stop offset="100%" stop-color="${color2}"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="url(#grad)" rx="50"/>
    <text x="50" y="58" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="38" font-weight="700" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
