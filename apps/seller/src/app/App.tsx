import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { SellerLayout } from '../layouts/SellerLayout';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { SellerDashboardPage } from '../pages/seller/SellerDashboardPage';
import { SellerListingsPage } from '../pages/seller/SellerListingsPage';
import { SellerInventoryPage } from '../pages/seller/SellerInventoryPage';
import { SellerOrdersPage } from '../pages/seller/SellerOrdersPage';
import { SellerWantedPage } from '../pages/seller/SellerWantedPage';
import { SellerSettlementsPage } from '../pages/seller/SellerSettlementsPage';
import { SellerVerificationPage } from '../pages/seller/SellerVerificationPage';
import { SellerProfilePage } from '../pages/seller/SellerProfilePage';

import { SellerCreateListingPage } from '../pages/seller/SellerCreateListingPage';
import { SellerStockMovementsPage } from '../pages/seller/SellerStockMovementsPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<SellerLayout />}>
            <Route index element={<SellerDashboardPage />} />
            <Route path="listings" element={<SellerListingsPage />} />
            <Route path="listings/create" element={<SellerCreateListingPage />} />
            <Route path="inventory" element={<SellerInventoryPage />} />
            <Route path="movements" element={<SellerStockMovementsPage />} />
            <Route path="orders" element={<SellerOrdersPage />} />
            <Route path="wanted" element={<SellerWantedPage />} />
            <Route path="settlements" element={<SellerSettlementsPage />} />
            <Route path="verification" element={<SellerVerificationPage />} />
            <Route path="profile" element={<SellerProfilePage />} />
            <Route path="settings" element={<SellerProfilePage />} />
            <Route path="*" element={<SellerDashboardPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
export default App;
