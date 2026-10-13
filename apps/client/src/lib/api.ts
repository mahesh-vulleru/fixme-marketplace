import { apiRequest, setCsrfToken, getCsrfToken, ApiClientError } from '../services/apiClient';

export const apiFetch = apiRequest;
export { apiRequest, setCsrfToken, getCsrfToken, ApiClientError };

export function formatINRFromPaise(paise: number | undefined | null): string {
  const safePaise = typeof paise === 'number' && !Number.isNaN(paise) ? paise : 0;
  return `₹${(safePaise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

