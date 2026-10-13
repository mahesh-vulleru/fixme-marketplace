import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest, setCsrfToken } from '../services/apiClient';

export interface AdminPortalUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
}

interface AuthContextValue {
  user: AdminPortalUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AdminPortalUser>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminPortalUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const data = await apiRequest<{ user: AdminPortalUser; csrfToken?: string }>('/auth/me');
      setUser(data.user);
      if (data.csrfToken) {
        setCsrfToken(data.csrfToken);
      }
    } catch {
      setUser(null);
      setCsrfToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (email: string, password: string): Promise<AdminPortalUser> => {
    const data = await apiRequest<{ user: AdminPortalUser; csrfToken?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.csrfToken) {
      setCsrfToken(data.csrfToken);
    }
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setCsrfToken(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshSession }}>
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

