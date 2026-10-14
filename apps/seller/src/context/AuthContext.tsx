import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest, setCsrfToken } from '../services/apiClient';

export interface SellerPortalUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status?: string;
}

export interface SellerRegisterInput {
  fullName: string;
  email: string;
  password: string;
  confirmPassword?: string;
  phone?: string;
  storeName: string;
  businessAddress?: string;
  acceptTerms?: boolean;
}

interface AuthContextValue {
  user: SellerPortalUser | null;
  sellerProfile: any | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<SellerPortalUser>;
  register: (input: SellerRegisterInput) => Promise<SellerPortalUser>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SellerPortalUser | null>(null);
  const [sellerProfile, setSellerProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const data = await apiRequest<{ user: SellerPortalUser; sellerProfile?: any; csrfToken?: string }>('/auth/me');
      setUser(data.user);
      setSellerProfile(data.sellerProfile || null);
      if (data.csrfToken) {
        setCsrfToken(data.csrfToken);
      }
    } catch {
      setUser(null);
      setSellerProfile(null);
      setCsrfToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();

    // Re-synchronize verification state and credentials when tab gains focus (throttled to at most once per 5 seconds)
    let lastFocusRefresh = 0;
    const handleFocus = () => {
      const now = Date.now();
      if (now - lastFocusRefresh > 5000) {
        lastFocusRefresh = now;
        refreshSession();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshSession]);

  const login = async (email: string, password: string): Promise<SellerPortalUser> => {
    const data = await apiRequest<{ user: SellerPortalUser; sellerProfile?: any; csrfToken?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.csrfToken) {
      setCsrfToken(data.csrfToken);
    }
    setUser(data.user);
    setSellerProfile(data.sellerProfile || null);
    return data.user;
  };

  const register = async (input: SellerRegisterInput): Promise<SellerPortalUser> => {
    const data = await apiRequest<{ user: SellerPortalUser; sellerProfile?: any; csrfToken?: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        role: 'seller',
      }),
    });
    if (data.csrfToken) {
      setCsrfToken(data.csrfToken);
    }
    setUser(data.user);
    setSellerProfile(data.sellerProfile || null);
    return data.user;
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setSellerProfile(null);
      setCsrfToken(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, sellerProfile, loading, login, register, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
