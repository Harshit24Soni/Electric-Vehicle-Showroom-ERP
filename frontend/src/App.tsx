import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore, useAuthHydration } from './store/authStore'
import { Layout } from './components/layout/Layout'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { Toaster } from 'react-hot-toast'

// Auth
import LoginPage from './modules/auth/pages/LoginPage'
import ChangePinPage from './modules/auth/pages/ChangePinPage'

// Core Pages
import DashboardPage from './modules/dashboard/pages/DashboardPage'
import CrmPage from './modules/crm/pages/CrmPage'
import SalesPage from './modules/sales/pages/SalesPage'
import SaleDetailPage from './modules/sales/pages/SaleDetailPage'
import InventoryPage from './modules/inventory/pages/InventoryPage'
import ServicePage from './modules/service/pages/ServicePage'
import FollowupDashboardPage from './modules/followup/pages/FollowupDashboardPage'

// Master Data
import CustomersPage from './modules/master/pages/CustomersPage'
import VehiclesPage from './modules/master/pages/VehiclesPage'
import VehicleModelsPage from './modules/master/pages/VehicleModelsPage'
import VendorsPage from './modules/master/pages/VendorsPage'

// Procurement
import ProcurementPage from './modules/procurement/pages/ProcurementPage'
import SparePurchasePage from './modules/procurement/pages/SparePurchasePage'
import TemporaryItemPage from './modules/procurement/pages/TemporaryItemPage'

// Admin

import DealerManagementPage from './modules/admin/pages/DealerManagementPage'
import StaffProfilePage from './modules/staff/pages/StaffProfilePage'
import SetupPage from './modules/setup/pages/SetupPage'

// Print Views
import PrintInvoicePage from './modules/sales/pages/print/PrintInvoicePage'
import PrintChallanPage from './modules/sales/pages/print/PrintChallanPage'
import PrintSchedulePage from './modules/sales/pages/print/PrintSchedulePage'

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const hydrated = useAuthHydration()

  // Wait for auth state to hydrate from localStorage before rendering routes
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/change-pin" element={<ChangePinPage />} />

        {/* Main Application */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />

          {/* Core Workflow */}
          <Route path="crm" element={<CrmPage />} />
          <Route path="followups" element={<FollowupDashboardPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="sales/:saleId" element={<SaleDetailPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="service" element={<ServicePage />} />

          {/* Procurement */}
          <Route path="procurement" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'DEALER']}>
              <ProcurementPage />
            </ProtectedRoute>
          } />
          <Route path="procurement/spares/new" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'DEALER']}>
              <SparePurchasePage />
            </ProtectedRoute>
          } />
          <Route path="procurement/temporary-items" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'DEALER']}>
              <TemporaryItemPage />
            </ProtectedRoute>
          } />

          {/* Master Data */}
          <Route path="master/customers" element={<CustomersPage />} />
          <Route path="master/vehicles" element={<VehiclesPage />} />
          <Route path="master/models" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'DEALER']}>
              <VehicleModelsPage />
            </ProtectedRoute>
          } />
          <Route path="master/vendors" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'DEALER']}>
              <VendorsPage />
            </ProtectedRoute>
          } />

          {/* Admin & Profile */}
          <Route path="admin/dealers" element={<Navigate to="/admin/staff" replace />} />

          <Route path="staff/profile" element={<StaffProfilePage />} />
          <Route path="setup" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'DEALER']}>
              <SetupPage />
            </ProtectedRoute>
          } />
        </Route>

        {/* Print Views - Outside Layout */}
        <Route path="/print/sale/:saleId/invoice" element={<PrintInvoicePage />} />
        <Route path="/print/sale/:saleId/challan" element={<PrintChallanPage />} />
        <Route path="/print/sale/:saleId/schedule" element={<PrintSchedulePage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
