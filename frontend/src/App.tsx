import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { Layout } from './components/layout/Layout'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import LoginPage from './modules/auth/pages/LoginPage'
import ChangePinPage from './modules/auth/pages/ChangePinPage'
import DashboardPage from './modules/dashboard/pages/DashboardPage'
import CustomersPage from './modules/master/pages/CustomersPage'
import VehiclesPage from './modules/master/pages/VehiclesPage'
import VehicleModelsPage from './modules/master/pages/VehicleModelsPage'
import VendorsPage from './modules/master/pages/VendorsPage'
import SalesPage from './modules/sales/pages/SalesPage'
import SaleDetailPage from './modules/sales/pages/SaleDetailPage'
import InventoryPage from './modules/inventory/pages/InventoryPage'
import BillingPage from './modules/billing/pages/BillingPage'
import ServicePage from './modules/service/pages/ServicePage'
import WarrantyPage from './modules/warranty/pages/WarrantyPage'
import CrmPage from './modules/crm/pages/CrmPage'
import InsurancePage from './modules/insurance/pages/InsurancePage'
import ReportsPage from './modules/reports/pages/ReportsPage'
import StaffManagementPage from './modules/admin/pages/StaffManagementPage'
import StaffProfilePage from './modules/staff/pages/StaffProfilePage'
import FinancePage from './modules/finance/pages/FinancePage'

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
        <Route path="/change-pin" element={<ChangePinPage />} />
        
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
          
          {/* Master Data */}
          <Route path="master/customers" element={<CustomersPage />} />
          <Route path="master/vehicles" element={<VehiclesPage />} />
          <Route path="master/models" element={<ProtectedRoute allowedRoles={['ADMIN', 'DEALER']}><VehicleModelsPage /></ProtectedRoute>} />
          <Route path="master/vendors" element={<ProtectedRoute allowedRoles={['ADMIN', 'DEALER']}><VendorsPage /></ProtectedRoute>} />
          
          {/* Functional Modules */}
          <Route path="sales" element={<SalesPage />} />
          <Route path="sales/:saleId" element={<SaleDetailPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="service" element={<ServicePage />} />
          <Route path="warranty" element={<WarrantyPage />} />
          <Route path="crm" element={<CrmPage />} />
          <Route path="insurance" element={<InsurancePage />} />
          <Route path="finance" element={<FinancePage />} />
          <Route path="reports" element={<ProtectedRoute allowedRoles={['ADMIN', 'DEALER']}><ReportsPage /></ProtectedRoute>} />
          
          {/* Admin */}
          <Route path="admin/staff" element={<ProtectedRoute allowedRoles={['ADMIN']}><StaffManagementPage /></ProtectedRoute>} />
          
          {/* Staff */}
          <Route path="staff/profile" element={<StaffProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
