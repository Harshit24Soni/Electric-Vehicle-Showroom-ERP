import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import {
  Users, Car, ShoppingCart, Wrench,
  PlusCircle, Phone, FileText, Settings
} from 'lucide-react'
import FollowupDashboard from '@/modules/crm/components/FollowupDashboard'
import PinResetRequests from '@/modules/admin/components/PinResetRequests'
import { Skeleton } from '@/components/ui/Skeleton'

interface DashboardStats {
  totalLeads: number
  pendingSales: number
  deliveredToday: number
  openServices: number
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  // Real API call would be here
  try {
    const [leads, sales] = await Promise.all([
      api.get<any[]>('/crm/leads').catch(() => []),
      api.get<any[]>('/sales').catch(() => [])
    ])
    return {
      totalLeads: Array.isArray(leads) ? leads.length : 0,
      pendingSales: Array.isArray(sales) ? sales.filter((s: any) => s.sale_status === 'PENDING').length : 0,
      deliveredToday: 0,
      openServices: 0,
    }
  } catch {
    return { totalLeads: 0, pendingSales: 0, deliveredToday: 0, openServices: 0 }
  }
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isDealer = user?.role === 'DEALER' || user?.role === 'ADMIN'

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  })

  const quickActions = [
    { label: 'New Lead', icon: PlusCircle, path: '/crm?action=new', color: 'bg-blue-600 hover:bg-blue-700' },
    { label: 'New Sale', icon: ShoppingCart, path: '/sales?action=new', color: 'bg-green-600 hover:bg-green-700' },
    { label: 'Follow-up', icon: Phone, path: '/crm', color: 'bg-purple-600 hover:bg-purple-700' },
    { label: 'New Service', icon: Wrench, path: '/service?action=new', color: 'bg-orange-600 hover:bg-orange-700' },
  ]

  const statCards = [
    { title: 'Active Leads', value: stats?.totalLeads || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Pending Sales', value: stats?.pendingSales || 0, icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Delivered Today', value: stats?.deliveredToday || 0, icon: Car, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Open Services', value: stats?.openServices || 0, icon: Wrench, color: 'text-orange-600', bg: 'bg-orange-50' },
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
                    {isLoading ? <Skeleton className="h-8 w-16" /> : stat.value}
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

      {/* Follow-up Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[450px]">
          <FollowupDashboard />
        </div>

        {/* Recent Activity Placeholder */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500" />
            Recent Activity
          </h2>
          <div className="space-y-3">
            <p className="text-gray-500 text-sm text-center py-8">
              Activity log will appear here
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
