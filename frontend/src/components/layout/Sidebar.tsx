import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import {
  LayoutDashboard,
  Users,
  Car,
  ShoppingCart,
  Wrench,
  MessageSquare,
  Package,
  Settings,
  User,
  LogOut,
  ChevronDown,
  CalendarCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface MenuItem {
  path: string
  label: string
  icon: any
  roles: string[]
  children?: { path: string; label: string; roles: string[] }[]
}

const menuItems: MenuItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'DEALER', 'STAFF'] },
  { path: '/crm', label: 'Leads', icon: MessageSquare, roles: ['ADMIN', 'DEALER', 'STAFF'] },
  { path: '/followups', label: 'Follow-ups', icon: CalendarCheck, roles: ['ADMIN', 'DEALER', 'STAFF'] },
  { path: '/sales', label: 'Sales', icon: ShoppingCart, roles: ['ADMIN', 'DEALER', 'STAFF'] },
  { path: '/service', label: 'Service', icon: Wrench, roles: ['ADMIN', 'DEALER', 'STAFF'] },
  { path: '/procurement', label: 'Purchase', icon: ShoppingCart, roles: ['ADMIN', 'DEALER'] },
  { path: '/inventory', label: 'Inventory', icon: Package, roles: ['ADMIN', 'DEALER', 'STAFF'] },
  {
    path: '/master',
    label: 'Master Data',
    icon: Car,
    roles: ['ADMIN', 'DEALER', 'STAFF'],
    children: [
      { path: '/master/customers', label: 'Customers', roles: ['ADMIN', 'DEALER', 'STAFF'] },
      { path: '/master/vehicles', label: 'Vehicles', roles: ['ADMIN', 'DEALER', 'STAFF'] },
      { path: '/master/models', label: 'Vehicle Models', roles: ['ADMIN', 'DEALER'] },
      { path: '/master/vendors', label: 'Vendors', roles: ['ADMIN', 'DEALER'] },
    ]
  },

  { path: '/setup', label: 'Setup', icon: Settings, roles: ['ADMIN', 'DEALER'] },
]

export function Sidebar() {
  const location = useLocation()
  const { user, hasRole, clearAuth } = useAuthStore()
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])

  const toggleMenu = (path: string) => {
    setExpandedMenus(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    )
  }

  const filteredItems = menuItems.filter((item) => hasRole(item.roles as any))

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">EV Showroom</h1>
        <p className="text-sm text-gray-400 mt-1">Management System</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
          const hasChildren = item.children && item.children.length > 0
          const isExpanded = expandedMenus.includes(item.path)
          const filteredChildren = item.children?.filter(child => hasRole(child.roles as any))

          if (hasChildren) {
            return (
              <div key={item.path}>
                <button
                  onClick={() => toggleMenu(item.path)}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </div>
                  <ChevronDown className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-180')} />
                </button>
                {isExpanded && (
                  <div className="ml-4 mt-1 space-y-1">
                    {filteredChildren?.map(child => (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={cn(
                          'block px-4 py-2 rounded-lg text-sm transition-colors',
                          location.pathname === child.path
                            ? 'bg-primary-600 text-white'
                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          }

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
        <Link
          to="/staff/profile"
          className="flex items-center gap-3 px-4 py-3 mb-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <User className="w-5 h-5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-400 truncate">{user?.designation || user?.role}</p>
          </div>
        </Link>
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
