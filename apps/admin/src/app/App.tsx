import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { SellerLayout } from '../layouts/SellerLayout';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminCataloguePage } from '../pages/admin/AdminCataloguePage';
import { SellerDashboardPage } from '../pages/seller/SellerDashboardPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/admin/*" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="catalogue" element={<AdminCataloguePage />} />
          <Route path="*" element={<AdminDashboardPage />} />
        </Route>
        <Route path="/seller/*" element={<SellerLayout />}>
          <Route index element={<SellerDashboardPage />} />
          <Route path="*" element={<SellerDashboardPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
export default App;

