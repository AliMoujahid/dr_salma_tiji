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
export const API_URL = import.meta.env.VITE_API_URL || `${BASE_URL}/api`;
export const UPLOADS_URL = `${BASE_URL}/uploads`;

export const getUploadUrl = (path?: string | null): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.replace(/^(\.\.\/)+/, '').replace(/^\/?uploads\/?/, '');
  return `${UPLOADS_URL}/${cleanPath}`;
};
