import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest, setCsrfToken } from '../services/apiClient';

export interface SellerPortalUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status?: string;
}

interface AuthContextValue {
  user: SellerPortalUser | null;
  sellerProfile: any | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<SellerPortalUser>;
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
  }, [refreshSession]);

  const login = async (email: string, password: string): Promise<SellerPortalUser> => {
    const data = await apiRequest<{ user: SellerPortalUser; sellerProfile?: any; csrfToken?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
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
    <AuthContext.Provider value={{ user, sellerProfile, loading, login, logout, refreshSession }}>
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

