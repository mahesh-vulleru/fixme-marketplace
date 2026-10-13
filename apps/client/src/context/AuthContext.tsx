import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { IUser, ISellerProfile, AuthSessionData } from '@fixme/api-contracts';
import { apiRequest, setCsrfToken } from '../services/apiClient';

interface AuthContextValue {
  user: IUser | null;
  sellerProfile: ISellerProfile | null;
  loading: boolean;
  login: (input: { email: string; password: string }) => Promise<IUser>;
  register: (input: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    confirmPassword: string;
    acceptTerms: boolean;
  }) => Promise<IUser>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [sellerProfile, setSellerProfile] = useState<ISellerProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshSession = useCallback(async () => {
    try {
      const data = await apiRequest<AuthSessionData>('/auth/me');
      setUser(data.user);
      setSellerProfile(data.sellerProfile || null);
      setCsrfToken(data.csrfToken);
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

  const login = async (input: { email: string; password: string }): Promise<IUser> => {
    const data = await apiRequest<AuthSessionData>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setUser(data.user);
    setSellerProfile(data.sellerProfile || null);
    setCsrfToken(data.csrfToken);
    return data.user;
  };

  const register = async (input: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    confirmPassword: string;
    acceptTerms: boolean;
  }): Promise<IUser> => {
    const data = await apiRequest<AuthSessionData>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setUser(data.user);
    setSellerProfile(null);
    setCsrfToken(data.csrfToken);
    return data.user;
  };

  const logout = async (): Promise<void> => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setSellerProfile(null);
      setCsrfToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        sellerProfile,
        loading,
        login,
        register,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return ctx;
}
