import { useQuery } from '@tanstack/react-query'
import { inventoryApi } from '../api/inventoryApi'
import { Package, MapPin, Activity, DollarSign } from 'lucide-react'
import { SkeletonTable } from '@/components/ui/SkeletonTable'
import { useAuthStore } from '@/store/authStore'

export default function InventoryDashboard() {
  const { hasRole } = useAuthStore()
  
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['inventory-dashboard-stats'],
    queryFn: async () => {
      return await inventoryApi.getDashboardStats()
    }
  })

  const { data: locations, isLoading: isLoadingLocations } = useQuery({
    queryKey: ['inventory-stock-locations'],
    queryFn: async () => {
      return await inventoryApi.getStockByLocation()
    }
  })

  if (isLoadingStats || isLoadingLocations) {
    return <SkeletonTable rows={4} />
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <Package className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Active Spares</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats?.total_active_spares || 0}</h3>
          </div>
        </div>
        
        {hasRole(['ADMIN', 'DEALER']) && (
          <div className="card bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Stock Value</p>
              <h3 className="text-2xl font-bold text-gray-900">
                ₹{Number(stats?.total_stock_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
        )}

        <div className="card bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-purple-50 p-4 rounded-lg">
            <Activity className="w-8 h-8 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Movements (30d)</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats?.total_movements_last_30d || 0}</h3>
          </div>
        </div>
      </div>

      <div className="card bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-gray-500" />
          Stock by Location
        </h3>
        {locations && locations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {locations.map((loc) => (
              <div key={loc.location} className="border border-gray-100 rounded-lg p-4 bg-gray-50 flex justify-between items-center">
                <span className="font-medium text-gray-700">{loc.location}</span>
                <span className="bg-white px-3 py-1 rounded-full text-sm font-bold shadow-sm">{loc.total_quantity}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No stock found in any location.</p>
        )}
      </div>
    </div>
  )
}
