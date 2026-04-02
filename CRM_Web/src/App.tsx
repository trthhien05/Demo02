import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import MenuManagement from './pages/MenuManagement';
import TableMap from './pages/TableMap';
import POS from './pages/POS';
import KitchenDisplay from './pages/KitchenDisplay';
import Billing from './pages/Billing';
import Inventory from './pages/Inventory';
import RecipeManagement from './pages/RecipeManagement';
import StaffManagement from './pages/StaffManagement';
import ShiftManagement from './pages/ShiftManagement';
import Reports from './pages/Reports';
import Reservations from './pages/Reservations';
import Vouchers from './pages/Vouchers';
import './styles/global.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="customers" element={<Customers />} />
            <Route path="tables" element={<TableMap />} />
            <Route path="menu" element={<MenuManagement />} />
            <Route path="pos" element={<POS />} />
            <Route path="kitchen" element={<KitchenDisplay />} />
            <Route path="billing" element={<Billing />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="recipes" element={<RecipeManagement />} />
            <Route path="staff" element={<StaffManagement />} />
            <Route path="shifts" element={<ShiftManagement />} />
            <Route path="reports" element={<Reports />} />
            <Route path="reservations" element={<Reservations />} />
            <Route path="vouchers" element={<Vouchers />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
