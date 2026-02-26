import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import {
  Users, Car, ShoppingCart, Wrench,
  PlusCircle, Phone, FileText, Settings,
  AlertTriangle, Calendar
} from 'lucide-react'
import FollowupDashboard from '@/modules/crm/components/FollowupDashboard'
import PinResetRequests from '@/modules/admin/components/PinResetRequests'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatDate } from '@/lib/utils'

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

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  })

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: fetchDashboardAlerts,
  })

  const quickActions = [
    { label: 'New Lead', icon: PlusCircle, path: '/crm?action=new', color: 'bg-blue-600 hover:bg-blue-700' },
    { label: 'New Sale', icon: ShoppingCart, path: '/sales?action=new', color: 'bg-green-600 hover:bg-green-700' },
    { label: 'Follow-up', icon: Phone, path: '/crm', color: 'bg-purple-600 hover:bg-purple-700' },
    { label: 'New Service', icon: Wrench, path: '/service?action=new', color: 'bg-orange-600 hover:bg-orange-700' },
  ]

  const statCards = [
    { title: 'Current Month Revenue', value: stats?.revenue ? `₹${stats.revenue.toLocaleString()}` : '₹0', icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Active Leads', value: stats?.active_leads || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Conversion Ratio', value: stats?.conversion_ratio ? `${stats.conversion_ratio}%` : '0%', icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Available Inventory', value: stats?.in_stock_inventory || 0, icon: Car, color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome back, {user?.name || user?.designation || 'User'}
          </p>
        </div>
        {isDealer && (
          <button
            onClick={() => navigate('/admin/staff')}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Staff Management
          </button>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className={`${action.color} text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors`}
              >
                <Icon className="w-5 h-5" />
                {action.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.title} className="card">
              <div className="flex items-center gap-3">
                <div className={`${stat.bg} p-3 rounded-lg`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {statsLoading ? <Skeleton className="h-8 w-16" /> : stat.value}
                  </div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* PIN Reset Requests - Admin/Dealer only */}
      {isDealer && <PinResetRequests />}

      {/* Follow-up Dashboard & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[450px]">
          <FollowupDashboard />
        </div>

        {/* Alerts Section */}
        <div className="space-y-6">
          <div className="card shadow-sm border border-red-100">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Aging Inventory Alerts
            </h2>
            <div className="space-y-3">
              {alertsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : alerts?.aging_inventory.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">No aging inventory to display.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {alerts?.aging_inventory.map((vehicle) => (
                    <li key={vehicle.chassis_no} className="py-2 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{vehicle.model_name}</p>
                        <p className="text-xs text-gray-500">{vehicle.chassis_no}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${vehicle.age_category === '>60 Days' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                          {vehicle.age_category}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">{vehicle.days_in_stock} days</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="card shadow-sm border border-blue-100">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-700">
              <Calendar className="w-5 h-5" />
              Upcoming Renewals
            </h2>
            <div className="space-y-3">
              {alertsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : alerts?.upcoming_renewals.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">No upcoming renewals.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {alerts?.upcoming_renewals.map((renewal, index) => (
                    <li key={`${renewal.chassis_no}-${index}`} className="py-2 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {renewal.type === 'INSURANCE' ? 'Insurance' : 'Service Schedule'}
                        </p>
                        <p className="text-xs text-gray-500">{renewal.details}</p>
                        <p className="text-xs text-gray-400 mt-1">Chassis: {renewal.chassis_no}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          Due: {formatDate(renewal.due_date)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

