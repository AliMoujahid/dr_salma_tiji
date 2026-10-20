/**
 * Central API configuration for Local & Network Multi-Poste Deployments
 * Dynamically resolves to current host IP/domain so that any PC/Tablet on the LAN works seamlessly!
 */

const getBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    // Dynamically uses current host & port (e.g., http://172.20.10.3:5173 or http://172.20.10.3:5000)
    // Works with Vite dev proxy on 5173 and Express prod on 5000
    return window.location.origin;
  }
  return '';
};

export const BASE_URL = getBaseUrl();
export const API_URL = `${BASE_URL}/api`;
export const UPLOADS_URL = `${BASE_URL}/uploads`;

export const getUploadUrl = (path?: string | null): string => {
  if (!path) return '';
  // Fix accidental duplicate /uploads/uploads/ in full URLs
  if (path.includes('/uploads/uploads/')) {
    path = path.replace(/\/uploads\/uploads\//g, '/uploads/');
  }
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  // Strip any sequences of ../, /uploads/, uploads/, leading slashes and backslashes
  const cleanPath = path
    .replace(/^(\.\.[\/\\])+/, '')
    .replace(/^(\/?uploads[\/\\]+)+/i, '')
    .replace(/^[\/\\]+/, '')
    .replace(/\\/g, '/');
  return `${UPLOADS_URL}/${cleanPath}`;
};

