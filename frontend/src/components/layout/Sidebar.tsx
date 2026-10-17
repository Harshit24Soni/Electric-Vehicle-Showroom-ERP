import { Link, useLocation } from 'react-router-dom'
import { useAuthStore, UserRole } from '@/store/authStore'
import {
  LayoutDashboard,
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
  Receipt,
  Landmark,
  ShieldCheck,
  BarChart3,
  Truck,
  ShieldAlert,
  Zap,
  LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/Badge'

interface MenuItem {
  path: string
  label: string
  icon: LucideIcon
  roles: UserRole[]
  badge?: string
  children?: { path: string; label: string; roles: UserRole[] }[]
}

interface MenuGroup {
  groupTitle?: string
  items: MenuItem[]
}

const menuGroups: MenuGroup[] = [
  {
    groupTitle: 'Core Operations',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'DEALER', 'STAFF'] },
      { path: '/crm', label: 'Leads', icon: MessageSquare, roles: ['ADMIN', 'DEALER', 'STAFF'] },
      { path: '/followups', label: 'Follow-ups', icon: CalendarCheck, roles: ['ADMIN', 'DEALER', 'STAFF'] },
      {
        path: '/sales',
        label: 'Sales',
        icon: ShoppingCart,
        roles: ['ADMIN', 'DEALER', 'STAFF'],
        children: [
          { path: '/sales', label: 'Vehicle Sales', roles: ['ADMIN', 'DEALER', 'STAFF'] },
          { path: '/spare-sales', label: 'Spare Sales', roles: ['ADMIN', 'DEALER', 'STAFF'] },
        ],
      },
      { path: '/service', label: 'Service', icon: Wrench, roles: ['ADMIN', 'DEALER', 'STAFF'] },
    ],
  },
  {
    groupTitle: 'Inventory & Procurement',
    items: [
      {
        path: '/inventory',
        label: 'Inventory',
        icon: Package,
        roles: ['ADMIN', 'DEALER', 'STAFF'],
        children: [
          { path: '/inventory', label: 'Stock & Spares', roles: ['ADMIN', 'DEALER', 'STAFF'] },
          { path: '/inventory/master-sheet', label: 'Master Spreadsheet', roles: ['ADMIN', 'DEALER', 'STAFF'] },
          { path: '/inventory/import', label: 'Worksheet Import (Mail Merge)', roles: ['ADMIN', 'DEALER', 'STAFF'] },
        ],
      },
      {
        path: '/procurement',
        label: 'Procurement',
        icon: Truck,
        roles: ['ADMIN', 'DEALER'],
        children: [
          { path: '/procurement', label: 'Purchase Orders', roles: ['ADMIN', 'DEALER'] },
          { path: '/procurement/spares/new', label: 'New Spare PO', roles: ['ADMIN', 'DEALER'] },
          { path: '/procurement/temporary-items', label: 'Temporary Items', roles: ['ADMIN', 'DEALER'] },
        ],
      },
    ],
  },
  {
    groupTitle: 'Finance & Coverage',
    items: [
      { path: '/billing', label: 'Billing & Invoices', icon: Receipt, roles: ['ADMIN', 'DEALER', 'STAFF'] },
      { path: '/finance', label: 'Finance', icon: Landmark, roles: ['ADMIN', 'DEALER', 'STAFF'] },
      {
        path: '/insurance-warranty',
        label: 'Insurance & Warranty',
        icon: ShieldCheck,
        roles: ['ADMIN', 'DEALER', 'STAFF'],
        children: [
          { path: '/insurance', label: 'Insurance Policies', roles: ['ADMIN', 'DEALER', 'STAFF'] },
          { path: '/warranty', label: 'Warranty Claims', roles: ['ADMIN', 'DEALER', 'STAFF'] },
        ],
      },
    ],
  },
  {
    groupTitle: 'Management & System',
    items: [
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
        ],
      },
      { path: '/reports', label: 'Reports & Registers', icon: BarChart3, roles: ['ADMIN', 'DEALER', 'STAFF'] },
      {
        path: '/admin',
        label: 'Administration',
        icon: ShieldAlert,
        roles: ['ADMIN', 'DEALER'],
        children: [
          { path: '/admin/staff', label: 'Staff & Dealers', roles: ['ADMIN', 'DEALER'] },
        ],
      },
      { path: '/setup', label: 'Setup', icon: Settings, roles: ['ADMIN', 'DEALER'] },
    ],
  },
]

export function Sidebar({ onItemClick }: { onItemClick?: () => void } = {}) {
  const location = useLocation()
  const { user, hasRole, clearAuth } = useAuthStore()
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])

  // Auto-expand parent menu if current location matches any child
  useEffect(() => {
    menuGroups.forEach((group) => {
      group.items.forEach((item) => {
        if (item.children) {
          const hasActiveChild = item.children.some(
            (child) => location.pathname === child.path || location.pathname.startsWith(child.path + '/')
          )
          if (hasActiveChild) {
            setExpandedMenus((prev) => (prev.includes(item.path) ? prev : [...prev, item.path]))
          }
        }
      })
    })
  }, [location.pathname])

  const toggleMenu = (path: string) => {
    setExpandedMenus((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    )
  }

  const roleVariant =
    user?.role === 'ADMIN' ? 'cyan' : user?.role === 'DEALER' ? 'success' : 'info'

  return (
    <aside className="w-64 bg-slate-900 dark:bg-[#0B0F19] text-slate-100 h-screen max-h-screen flex flex-col border-r border-slate-800 dark:border-slate-800/90 select-none transition-colors duration-200">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 bg-slate-950/40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 via-primary-500 to-cyan-400 p-[1.5px] shadow-glow-sm">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-cyan-400 fill-cyan-400/20" />
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-tight text-white text-base">VOLT MOTORS</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary-500/20 text-primary-400 border border-primary-500/30">
                ERP
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate tracking-wide">
              EV Dealership Platform
            </p>
          </div>
        </div>

        {/* Live System Indicator */}
        <div className="mt-3.5 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-slate-300 font-medium">Dealership Active</span>
          </div>
          <span className="text-slate-400 font-mono text-[10px]">v2.1</span>
        </div>
      </div>

      {/* Nav Menu Groups */}
      <nav className="flex-1 min-h-0 p-3 space-y-4 overflow-y-auto overscroll-contain no-scrollbar">
        {menuGroups.map((group, groupIdx) => {
          const visibleItems = group.items.filter((item) => hasRole(item.roles))
          if (visibleItems.length === 0) return null

          return (
            <div key={groupIdx} className="space-y-1">
              {group.groupTitle && (
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {group.groupTitle}
                </div>
              )}

              {visibleItems.map((item) => {
                const Icon = item.icon
                const hasChildren = item.children && item.children.length > 0
                const isExpanded = expandedMenus.includes(item.path)
                const filteredChildren = item.children?.filter((child) => hasRole(child.roles))

                // Determine if parent is strictly or prefix active
                const isItemActive =
                  location.pathname === item.path ||
                  (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'))

                if (hasChildren) {
                  const hasActiveChild = filteredChildren?.some(
                    (child) => location.pathname === child.path
                  )

                  return (
                    <div key={item.path} className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => toggleMenu(item.path)}
                        className={cn(
                          'w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all group',
                          hasActiveChild || isItemActive
                            ? 'bg-slate-800/90 text-white shadow-sm'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            className={cn(
                              'w-4 h-4 transition-colors',
                              hasActiveChild || isItemActive
                                ? 'text-primary-400'
                                : 'text-slate-400 group-hover:text-slate-200'
                            )}
                          />
                          <span>{item.label}</span>
                        </div>
                        <ChevronDown
                          className={cn(
                            'w-3.5 h-3.5 text-slate-400 transition-transform duration-200',
                            isExpanded && 'rotate-180'
                          )}
                        />
                      </button>

                      {isExpanded && (
                        <div className="ml-4 pl-3 border-l border-slate-800/80 space-y-0.5 pt-0.5">
                          {filteredChildren?.map((child) => {
                            const isChildActive = location.pathname === child.path
                            return (
                              <Link
                                key={child.path}
                                to={child.path}
                                onClick={onItemClick}
                                className={cn(
                                  'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all',
                                  isChildActive
                                    ? 'bg-primary-600/90 text-white font-semibold shadow-glow-sm'
                                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                                )}
                              >
                                <span>{child.label}</span>
                                {isChildActive && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
                                )}
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onItemClick}
                    className={cn(
                      'flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group',
                      isItemActive
                        ? 'bg-primary-600/90 text-white font-semibold shadow-glow-sm'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          'w-4 h-4 transition-colors',
                          isItemActive
                            ? 'text-white'
                            : 'text-slate-400 group-hover:text-slate-200'
                        )}
                      />
                      <span>{item.label}</span>
                    </div>
                    {isItemActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
                    )}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Staff Account & Logout Section */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/50 space-y-2 shrink-0 mt-auto">
        <Link
          to="/staff/profile"
          onClick={onItemClick}
          className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors group"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-primary-400 group-hover:text-white transition-colors">
            <User className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {user?.name || 'Staff User'}
              </p>
              <Badge variant={roleVariant} size="sm" className="text-[9px] py-0 px-1 font-bold">
                {user?.role || 'STAFF'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {user?.designation || `Staff #${user?.staff_id || 0}`}
            </p>
          </div>
        </Link>

        <button
          type="button"
          onClick={clearAuth}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/40 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
