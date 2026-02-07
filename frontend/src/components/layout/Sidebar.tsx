import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import {
  LayoutDashboard,
  Users,
  Car,
  Package,
  ShoppingCart,
  FileText,
  Wrench,
  Shield,
  MessageSquare,
  DollarSign,
  BarChart3,
  Settings,
  User,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'DEALER', 'STAFF'] },
  { path: '/master/customers', label: 'Customers', icon: Users, roles: ['ADMIN', 'DEALER', 'STAFF'] },
  { path: '/master/vehicles', label: 'Vehicles', icon: Car, roles: ['ADMIN', 'DEALER', 'STAFF'] },
  { path: '/master/models', label: 'Vehicle Models', icon: Car, roles: ['ADMIN', 'DEALER'] },
  { path: '/master/vendors', label: 'Vendors', icon: Package, roles: ['ADMIN', 'DEALER'] },
  { path: '/sales', label: 'Sales', icon: ShoppingCart, roles: ['ADMIN', 'DEALER', 'STAFF'] },
  { path: '/inventory', label: 'Inventory', icon: Package, roles: ['ADMIN', 'DEALER', 'STAFF'] },
  { path: '/billing', label: 'Billing', icon: FileText, roles: ['ADMIN', 'DEALER', 'STAFF'] },
  { path: '/service', label: 'Service', icon: Wrench, roles: ['ADMIN', 'DEALER', 'STAFF'] },
  { path: '/warranty', label: 'Warranty', icon: Shield, roles: ['ADMIN', 'DEALER', 'STAFF'] },
  { path: '/crm', label: 'CRM', icon: MessageSquare, roles: ['ADMIN', 'DEALER', 'STAFF'] },
  { path: '/insurance', label: 'Insurance', icon: Shield, roles: ['ADMIN', 'DEALER', 'STAFF'] },
  { path: '/finance', label: 'Finance', icon: DollarSign, roles: ['ADMIN', 'DEALER', 'STAFF'] },
  { path: '/reports', label: 'Reports', icon: BarChart3, roles: ['ADMIN', 'DEALER'] },
  { path: '/admin/staff', label: 'Staff Management', icon: Settings, roles: ['ADMIN'] },
]

export function Sidebar() {
  const location = useLocation()
  const { user, hasRole, clearAuth } = useAuthStore()

  const filteredItems = menuItems.filter((item) => hasRole(item.roles as any))

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">EV Showroom ERP</h1>
        <p className="text-sm text-gray-400 mt-1">Management System</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname.startsWith(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <User className="w-5 h-5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.staff_id}</p>
            <p className="text-xs text-gray-400 truncate">{user?.designation}</p>
          </div>
        </div>
        <button
          onClick={clearAuth}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}
