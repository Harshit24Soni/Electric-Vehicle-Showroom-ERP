import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'
import { Users, Car, ShoppingCart, Package, Wrench, TrendingUp } from 'lucide-react'

interface DashboardStats {
  totalCustomers: number
  totalVehicles: number
  totalSales: number
  totalInventory: number
  openJobCards: number
  pendingWarrantyClaims: number
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  // This would be a real API call in production
  // For now, return mock data
  return {
    totalCustomers: 0,
    totalVehicles: 0,
    totalSales: 0,
    totalInventory: 0,
    openJobCards: 0,
    pendingWarrantyClaims: 0,
  }
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  })

  const statCards = [
    {
      title: 'Total Customers',
      value: stats?.totalCustomers || 0,
      icon: Users,
      color: 'bg-blue-500',
      link: '/master/customers',
    },
    {
      title: 'Total Vehicles',
      value: stats?.totalVehicles || 0,
      icon: Car,
      color: 'bg-green-500',
      link: '/master/vehicles',
    },
    {
      title: 'Total Sales',
      value: stats?.totalSales || 0,
      icon: ShoppingCart,
      color: 'bg-purple-500',
      link: '/sales',
    },
    {
      title: 'Inventory Items',
      value: stats?.totalInventory || 0,
      icon: Package,
      color: 'bg-orange-500',
      link: '/inventory',
    },
    {
      title: 'Open Job Cards',
      value: stats?.openJobCards || 0,
      icon: Wrench,
      color: 'bg-red-500',
      link: '/service',
    },
    {
      title: 'Pending Warranty',
      value: stats?.pendingWarrantyClaims || 0,
      icon: TrendingUp,
      color: 'bg-yellow-500',
      link: '/warranty',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back, {user?.designation}</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <a
                key={stat.title}
                href={stat.link}
                className="card hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value.toLocaleString()}</p>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Recent Activities</h2>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">No recent activities</p>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <a href="/sales" className="btn btn-primary text-center">New Sale</a>
            <a href="/service" className="btn btn-secondary text-center">New Service</a>
            <a href="/crm" className="btn btn-secondary text-center">New Lead</a>
            <a href="/master/customers" className="btn btn-secondary text-center">New Customer</a>
          </div>
        </div>
      </div>
    </div>
  )
}
