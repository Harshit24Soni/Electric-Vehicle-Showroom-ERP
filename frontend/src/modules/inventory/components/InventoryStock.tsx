import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { inventoryApi } from '../api/inventoryApi'
import { Search, MapPin } from 'lucide-react'
import { SkeletonTable } from '@/components/ui/SkeletonTable'
import { useAuthStore } from '@/store/authStore'

export default function InventoryStock() {
  const { hasRole } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [locationFilter, setLocationFilter] = useState('')

  const { data: locations = [] } = useQuery({
    queryKey: ['inventory-stock-locations'],
    queryFn: () => inventoryApi.getStockByLocation(),
    select: (data: any) => data.map((l: any) => l.location)
  })

  const { data: stockResponse, isLoading } = useQuery({
    queryKey: ['inventory-stock', locationFilter],
    queryFn: async () => {
      return await inventoryApi.getStock(undefined, locationFilter || undefined)
    }
  })

  const items = stockResponse?.items || []
  
  const filteredItems = items.filter((item: any) => 
    item.spare_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.part_code && item.part_code.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const showCost = hasRole(['ADMIN', 'DEALER'])

  return (
    <div className="card bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by part name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        
        <div className="w-full sm:w-64">
          <select 
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
            className="input"
          >
            <option value="">All Locations</option>
            {locations.map((loc: string) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={5} />
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No stock items found.
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Part</th>
                <th>Code</th>
                <th>Location</th>
                <th>Tracking</th>
                <th className="text-right">Quantity</th>
                {showCost && <th className="text-right">Unit Cost</th>}
                {showCost && <th className="text-right">Total Value</th>}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item: any, idx: number) => (
                <tr key={`${item.spare_id}-${item.location}-${idx}`}>
                  <td className="font-medium text-gray-900">{item.spare_name}</td>
                  <td className="text-gray-500">{item.part_code || '-'}</td>
                  <td>
                    <span className="flex items-center gap-1 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      {item.location}
                    </span>
                  </td>
                  <td>
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                      {item.tracking_mode}
                    </span>
                  </td>
                  <td className="text-right font-bold text-gray-900">{item.quantity}</td>
                  {showCost && (
                    <td className="text-right text-gray-600">
                      ₹{Number(item.unit_cost).toFixed(2)}
                    </td>
                  )}
                  {showCost && (
                    <td className="text-right font-medium text-gray-900">
                      ₹{Number(item.total_value).toFixed(2)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
