import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { AdminLayout } from '../layouts/AdminLayout';
import { LoginPage } from '../pages/LoginPage';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminUsersPage } from '../pages/admin/AdminUsersPage';
import { AdminCataloguePage } from '../pages/admin/AdminCataloguePage';
import { AdminModerationPage } from '../pages/admin/AdminModerationPage';
import { AdminOrdersPage } from '../pages/admin/AdminOrdersPage';
import { AdminDisputesPage } from '../pages/admin/AdminDisputesPage';
import { AdminFinancePage } from '../pages/admin/AdminFinancePage';
import { AdminAuditLogsPage } from '../pages/admin/AdminAuditLogsPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/admin/*" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="catalogue" element={<AdminCataloguePage />} />
            <Route path="moderation" element={<AdminModerationPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="disputes" element={<AdminDisputesPage />} />
            <Route path="finance" element={<AdminFinancePage />} />
            <Route path="audit-logs" element={<AdminAuditLogsPage />} />
            <Route path="*" element={<AdminDashboardPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
export default App;
