import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import {
  Users,
  Car,
  ShoppingCart,
  Wrench,
  UserPlus,
  PhoneCall,
  Settings,
  AlertTriangle,
  Calendar,
  RefreshCw,
  Landmark,
  TrendingUp,
  Truck,
  Package,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react'
import FollowupDashboard from '@/modules/crm/components/FollowupDashboard'
import PinResetRequests from '@/modules/admin/components/PinResetRequests'
import { MetricCard } from '@/components/ui/MetricCard'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency, formatDate } from '@/lib/utils'

interface DashboardStats {
  revenue: number
  active_leads: number
  conversion_ratio: number
  in_stock_inventory: number
}

interface AgingInventoryAlert {
  chassis_no: string
  model_name: string
  days_in_stock: number
  age_category: string
}

interface UpcomingRenewalAlert {
  chassis_no: string
  type: string
  due_date: string
  details: string
}

interface DashboardAlerts {
  aging_inventory: AgingInventoryAlert[]
  upcoming_renewals: UpcomingRenewalAlert[]
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  try {
    const response = await api.get<DashboardStats>('/reports/dashboard-stats')
    return response
  } catch {
    return { revenue: 0, active_leads: 0, conversion_ratio: 0, in_stock_inventory: 0 }
  }
}

async function fetchDashboardAlerts(): Promise<DashboardAlerts> {
  try {
    const response = await api.get<DashboardAlerts>('/reports/alerts')
    return response
  } catch {
    return { aging_inventory: [], upcoming_renewals: [] }
  }
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isDealer = user?.role === 'DEALER' || user?.role === 'ADMIN'
  const [isRefreshing, setIsRefreshing] = useState(false)

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  })

  const {
    data: alerts,
    isLoading: alertsLoading,
    refetch: refetchAlerts,
  } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: fetchDashboardAlerts,
  })

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([refetchStats(), refetchAlerts()])
    } finally {
      setIsRefreshing(false)
    }
  }

  // Quick Action deck with permission awareness
  const baseActions = [
    {
      label: 'New Lead',
      description: 'Register customer enquiry',
      icon: UserPlus,
      path: '/crm?action=new',
      accent: 'border-l-sky-500 hover:border-sky-500',
      iconBg: 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400',
    },
    {
      label: 'Vehicle Sale',
      description: 'Initiate vehicle booking',
      icon: ShoppingCart,
      path: '/sales?action=new',
      accent: 'border-l-emerald-500 hover:border-emerald-500',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Log Follow-up',
      description: 'Record customer interaction',
      icon: PhoneCall,
      path: '/crm',
      accent: 'border-l-purple-500 hover:border-purple-500',
      iconBg: 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400',
    },
    {
      label: 'New Job Card',
      description: 'Open service ticket',
      icon: Wrench,
      path: '/service?action=new',
      accent: 'border-l-amber-500 hover:border-amber-500',
      iconBg: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400',
    },
  ]

  const dealerActions = isDealer
    ? [
        {
          label: 'Create PO',
          description: 'Procure spare parts',
          icon: Truck,
          path: '/procurement/spares/new',
          accent: 'border-l-cyan-500 hover:border-cyan-500',
          iconBg: 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400',
        },
        {
          label: 'Master Inventory',
          description: 'Full stock spreadsheet',
          icon: Package,
          path: '/inventory/master-sheet',
          accent: 'border-l-blue-500 hover:border-blue-500',
          iconBg: 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',
        },
      ]
    : []

  const allQuickActions = [...baseActions, ...dealerActions]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Page Header & Operations Telemetry Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Operations Console
            </h1>
            <Badge variant="cyan" size="sm" pulse>
              Live Telemetry
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Welcome back, <span className="font-semibold text-slate-700 dark:text-slate-200">{user?.name || user?.designation || 'Staff'}</span> • Showroom Telemetry & Active Pipeline
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={isRefreshing}
            leftIcon={RefreshCw}
            className="text-xs"
            title="Refresh dashboard metrics and alerts"
          >
            Refresh
          </Button>

          {isDealer && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/admin/staff')}
              leftIcon={Settings}
              className="text-xs"
            >
              Staff Management
            </Button>
          )}
        </div>
      </div>

      {/* 2. Business KPI Telemetry Grid (Using MetricCard Primitives) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Current Month Revenue"
          value={stats?.revenue ? formatCurrency(stats.revenue) : '₹0'}
          subtitle="Billed vehicle & spare sales"
          icon={Landmark}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/50 dark:border-emerald-800/40"
          isLoading={statsLoading}
          onClick={() => navigate('/sales')}
        />

        <MetricCard
          title="Active Leads Pipeline"
          value={stats?.active_leads ?? 0}
          subtitle="Open customer enquiries"
          icon={Users}
          iconColor="text-sky-600 dark:text-sky-400"
          iconBg="bg-sky-50 dark:bg-sky-950/50 border border-sky-200/50 dark:border-sky-800/40"
          isLoading={statsLoading}
          onClick={() => navigate('/crm')}
        />

        <MetricCard
          title="Conversion Ratio"
          value={stats?.conversion_ratio !== undefined ? `${stats.conversion_ratio}%` : '0%'}
          subtitle="Lead-to-sale closing performance"
          icon={TrendingUp}
          iconColor="text-purple-600 dark:text-purple-400"
          iconBg="bg-purple-50 dark:bg-purple-950/50 border border-purple-200/50 dark:border-purple-800/40"
          isLoading={statsLoading}
          onClick={() => navigate('/reports')}
        />

        <MetricCard
          title="In-Stock Fleet"
          value={stats?.in_stock_inventory ?? 0}
          subtitle="Vehicles ready for delivery"
          icon={Car}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-50 dark:bg-amber-950/50 border border-amber-200/50 dark:border-amber-800/40"
          isLoading={statsLoading}
          onClick={() => navigate('/inventory')}
        />
      </div>

      {/* 3. Quick Actions Ribbon */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Showroom Quick Operations
          </h2>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {allQuickActions.length} Workflows Available
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {allQuickActions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.label}
                type="button"
                onClick={() => navigate(action.path)}
                className={`group flex flex-col items-start p-3 rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm dark:hover:shadow-glow-sm hover:border-primary-500/40 border-l-4 ${action.accent} transition-all duration-150 text-left`}
              >
                <div className={`p-2 rounded-lg ${action.iconBg} mb-2.5 transition-transform group-hover:scale-105`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {action.label}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate w-full mt-0.5">
                  {action.description}
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      {/* 4. PIN Reset Requests (Admin/Dealer Security Gateway) */}
      {isDealer && <PinResetRequests />}

      {/* 5. Core Operations Grid: Follow-ups Central & Showroom Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Follow-up Central (6 cols) */}
        <div className="lg:col-span-6 h-[480px]">
          <FollowupDashboard />
        </div>

        {/* Right Column: Priority Operational Alerts (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Aging Inventory Alerts */}
          <Card className="p-5">
            <CardHeader className="p-0 pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  Aging Inventory Alerts
                </CardTitle>
              </div>
              <Badge variant={alerts?.aging_inventory?.length ? 'danger' : 'neutral'} size="sm" pulse={Boolean(alerts?.aging_inventory?.length)}>
                {alerts?.aging_inventory?.length || 0} Alert{alerts?.aging_inventory?.length === 1 ? '' : 's'}
              </Badge>
            </CardHeader>

            <div className="pt-3 max-h-52 overflow-y-auto pr-1">
              {alertsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              ) : !alerts?.aging_inventory || alerts.aging_inventory.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="Optimal Fleet Turnover"
                  description="No showroom vehicles exceed 30 days in stock."
                  className="py-6"
                />
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {alerts.aging_inventory.map((vehicle) => (
                    <div
                      key={vehicle.chassis_no}
                      onClick={() => navigate('/inventory')}
                      className="py-2.5 flex justify-between items-center hover:bg-slate-50/80 dark:hover:bg-slate-800/40 px-2 rounded-lg cursor-pointer transition-colors group"
                      title="Click to view in Inventory"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {vehicle.model_name}
                        </p>
                        <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 truncate">
                          VIN: {vehicle.chassis_no}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <Badge
                            variant={vehicle.age_category === '>60 Days' ? 'danger' : 'warning'}
                            size="sm"
                          >
                            {vehicle.age_category}
                          </Badge>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {vehicle.days_in_stock} days
                          </p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Upcoming Renewals (Insurance & Service) */}
          <Card className="p-5">
            <CardHeader className="p-0 pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60">
                  <Calendar className="w-4 h-4" />
                </div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  Upcoming Renewals & Schedules
                </CardTitle>
              </div>
              <Badge variant={alerts?.upcoming_renewals?.length ? 'info' : 'neutral'} size="sm">
                {alerts?.upcoming_renewals?.length || 0} Schedule{alerts?.upcoming_renewals?.length === 1 ? '' : 's'}
              </Badge>
            </CardHeader>

            <div className="pt-3 max-h-52 overflow-y-auto pr-1">
              {alertsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              ) : !alerts?.upcoming_renewals || alerts.upcoming_renewals.length === 0 ? (
                <EmptyState
                  icon={ShieldCheck}
                  title="All Coverage Current"
                  description="No insurance policies or service schedules due in the next 30 days."
                  className="py-6"
                />
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {alerts.upcoming_renewals.map((renewal, index) => (
                    <div
                      key={`${renewal.chassis_no}-${index}`}
                      onClick={() => navigate(renewal.type === 'INSURANCE' ? '/insurance' : '/service')}
                      className="py-2.5 flex justify-between items-center hover:bg-slate-50/80 dark:hover:bg-slate-800/40 px-2 rounded-lg cursor-pointer transition-colors group"
                      title="Click to view details"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={renewal.type === 'INSURANCE' ? 'cyan' : 'info'}
                            size="sm"
                            className="text-[10px] py-0 px-1.5"
                          >
                            {renewal.type === 'INSURANCE' ? 'Insurance' : 'Service'}
                          </Badge>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {renewal.details}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                          Chassis: {renewal.chassis_no}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Due {formatDate(renewal.due_date)}
                          </span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
