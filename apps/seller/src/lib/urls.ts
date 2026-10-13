export const CLIENT_URL = (import.meta.env.VITE_CLIENT_URL as string) || 'http://localhost:5173';
export const ADMIN_URL = (import.meta.env.VITE_ADMIN_URL as string) || 'http://localhost:5174';
export const SELLER_URL = (import.meta.env.VITE_SELLER_URL as string) || 'http://localhost:5175';

export function getCrossAppUrlForRole(role: string): string | null {
  if (role === 'customer') {
    return CLIENT_URL;
  }
  if (
    role === 'administrator' ||
    role === 'super_administrator' ||
    role === 'catalogue_manager' ||
    role === 'support_staff'
  ) {
    return ADMIN_URL;
  }
  return null;
}

