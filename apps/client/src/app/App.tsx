import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { CustomerLayout } from '../layouts/CustomerLayout';
import { HomePage } from '../pages/HomePage';
import { WelcomeLandingPage } from '../pages/WelcomeLandingPage';
import { CompatibilityFinderPage } from '../pages/CompatibilityFinderPage';
import { PartDetailPage } from '../pages/PartDetailPage';
import { CartPage } from '../pages/CartPage';
import { WantedPartsPage } from '../pages/WantedPartsPage';
import { RegisterPage } from '../pages/RegisterPage';
import { LoginPage } from '../pages/LoginPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/ResetPasswordPage';
import { AccountOrdersPage } from '../pages/AccountOrdersPage';
import { PoliciesPage } from '../pages/PoliciesPage';

const HomeOrLandingRoute: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-slate-500 animate-pulse">
        Restoring secure session...
      </div>
    );
  }

  if (!user) {
    return <WelcomeLandingPage />;
  }

  return <HomePage />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<CustomerLayout />}>
            <Route path="/" element={<HomeOrLandingRoute />} />
            <Route
              path="/compatibility"
              element={
                <ProtectedRoute>
                  <CompatibilityFinderPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parts/:id"
              element={
                <ProtectedRoute>
                  <PartDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <CartPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wanted"
              element={
                <ProtectedRoute>
                  <WantedPartsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <AccountOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route path="/policies" element={<PoliciesPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="*" element={<HomeOrLandingRoute />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
export default App;
