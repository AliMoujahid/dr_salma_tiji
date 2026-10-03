/**
 * Central API configuration for Local & Network Multi-Poste Deployments
 * Dynamically resolves to current host IP/domain so that any PC/Tablet on the LAN works seamlessly!
 */

const getBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    // If running in production or network, origin will be http://localhost:5000 or http://192.168.1.X:5000
    const origin = window.location.origin;
    if (origin.includes(':5173') || origin.includes(':3000')) {
      // In Vite dev mode, fallback to port 5000 on the same host
      const hostname = window.location.hostname;
      return `http://${hostname}:5000`;
    }
    return origin;
  }
  return 'http://localhost:5000';
};

export const BASE_URL = getBaseUrl();
export const API_URL = import.meta.env.VITE_API_URL || `${BASE_URL}/api`;
export const UPLOADS_URL = `${BASE_URL}/uploads`;

export const getUploadUrl = (path?: string | null): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.replace(/^(\.\.\/)+/, '').replace(/^\/?uploads\/?/, '');
  return `${UPLOADS_URL}/${cleanPath}`;
};
