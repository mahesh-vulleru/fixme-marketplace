import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { CustomerLayout } from '../layouts/CustomerLayout';
import { HomePage } from '../pages/HomePage';
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

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<CustomerLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/compatibility" element={<CompatibilityFinderPage />} />
            <Route path="/parts/:id" element={<PartDetailPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/wanted" element={<WantedPartsPage />} />
            <Route path="/policies" element={<PoliciesPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <AccountOrdersPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<HomePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
export default App;
