import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCrossAppUrlForRole } from '../lib/urls';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-slate-500 animate-pulse">
        Restoring secure session...
      </div>
    );
  }

  if (!user) {
    const redirectTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectTo}`} replace />;
  }

  if (user.role !== 'customer') {
    const crossUrl = getCrossAppUrlForRole(user.role);
    if (crossUrl) {
      window.location.href = crossUrl;
      return (
        <div className="py-12 text-center text-sm text-slate-500">
          Redirecting to your workspace...
        </div>
      );
    }
  }

  return <>{children}</>;
};

