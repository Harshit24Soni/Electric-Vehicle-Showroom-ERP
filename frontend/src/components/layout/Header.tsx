import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ThemeToggle } from './ThemeToggle'
import {
  ChevronRight,
  Clock,
  ShieldCheck,
  UserCheck,
  Building2,
  Calendar,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

// Breadcrumb lookup map for clean, human-readable route labels
const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  crm: 'Leads & Enquiries',
  followups: 'Follow-up Central',
  sales: 'Vehicle Sales',
  'spare-sales': 'Spare Sales',
  inventory: 'Stock & Spares',
  'master-sheet': 'Master Spreadsheet',
  import: 'Worksheet Import',
  service: 'Service & Job Cards',
  procurement: 'Procurement & POs',
  spares: 'Spares',
  new: 'Create New',
  'temporary-items': 'Temporary Items',
  billing: 'Billing & Invoices',
  finance: 'Finance & Payments',
  insurance: 'Insurance Policies',
  warranty: 'Warranty Claims',
  master: 'Master Data',
  customers: 'Customer Master',
  vehicles: 'Vehicle Master',
  models: 'Vehicle Models',
  vendors: 'Vendor Master',
  reports: 'Reports & Analytics',
  admin: 'Administration',
  staff: 'Staff & Dealers',
  profile: 'Staff Profile',
  setup: 'Dealership Setup',
}

export function Header() {
  const { user } = useAuthStore()
  const location = useLocation()
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Build breadcrumbs from current location
  const pathSegments = location.pathname.split('/').filter(Boolean)
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/')
    const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
    return { path, label, isLast: index === pathSegments.length - 1 }
  })

  // Format time and date
  const timeStr = currentTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
  const dateStr = currentTime.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  const roleVariant =
    user?.role === 'ADMIN' ? 'cyan' : user?.role === 'DEALER' ? 'success' : 'info'

  return (
    <header className="sticky top-0 z-20 backdrop-blur-md bg-white/85 dark:bg-slate-900/85 border-b border-slate-200/90 dark:border-slate-800/90 transition-colors duration-200">
      <div className="px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Left: Dynamic Breadcrumb / Page Context */}
        <div className="flex flex-col min-w-0">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Link
              to="/dashboard"
              className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>EV Showroom</span>
            </Link>
            {breadcrumbs.map((crumb) => (
              <div key={crumb.path} className="flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-600 shrink-0" />
                {crumb.isLast ? (
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    to={crumb.path}
                    className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate"
                  >
                    {crumb.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>
          <div className="flex items-center gap-2 mt-0.5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
              {breadcrumbs.length > 0
                ? breadcrumbs[breadcrumbs.length - 1].label
                : 'Dashboard Overview'}
            </h2>
          </div>
        </div>

        {/* Right: Telemetry, Theme Toggle, Staff Identity */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Real-time Clock Widget */}
          <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span>{dateStr}</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
            <div className="flex items-center gap-1.5 font-mono font-medium text-slate-800 dark:text-slate-200">
              <Clock className="w-3.5 h-3.5 text-primary-500" />
              <span>{timeStr}</span>
            </div>
          </div>

          {/* Theme Mode Selector */}
          <ThemeToggle variant="compact" />

          {/* User Account / Profile Badge */}
          <Link
            to="/staff/profile"
            className="flex items-center gap-2.5 pl-2 pr-3 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 transition-all group"
            title="View Staff Profile"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-600 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            </div>
            <div className="hidden sm:block text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors leading-tight">
                  {user?.name || 'Authorized Staff'}
                </span>
                <Badge variant={roleVariant} size="sm" className="text-[10px] uppercase font-bold py-0 px-1.5">
                  {user?.role || 'STAFF'}
                </Badge>
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 block leading-tight">
                {user?.designation || `ID: #${user?.staff_id || 0}`}
              </span>
            </div>
          </Link>
        </div>
      </div>
    </header>
  )
}
