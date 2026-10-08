import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { inventoryApi } from '../api/inventoryApi'
import { Search, MapPin } from 'lucide-react'
import { SkeletonTable } from '@/components/ui/SkeletonTable'
import { useAuthStore } from '@/store/authStore'

export default function InventorySerials() {
  const { hasRole } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')

  const { data: serialResponse, isLoading } = useQuery({
    queryKey: ['inventory-serials'],
    queryFn: async () => {
      return await inventoryApi.getSerials()
    }
  })

  const items = serialResponse?.items || []
  
  const filteredItems = items.filter((item: any) => 
    item.spare_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.serial_number.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const showCost = hasRole(['ADMIN', 'DEALER'])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_STOCK': return 'bg-green-100 text-green-700'
      case 'SOLD': return 'bg-blue-100 text-blue-700'
      case 'CONSUMED': return 'bg-purple-100 text-purple-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="card bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="mb-6 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search serials by name or number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={5} />
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No serials found.
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Serial Number</th>
                <th>Part</th>
                <th>Location</th>
                <th>Status</th>
                {showCost && <th className="text-right">Unit Cost</th>}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item: any) => (
                <tr key={item.serial_id}>
                  <td className="font-mono font-medium text-blue-600">{item.serial_number}</td>
                  <td className="font-medium text-gray-900">{item.spare_name}</td>
                  <td>
                    <span className="flex items-center gap-1 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      {item.location}
                    </span>
                  </td>
                  <td>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusBadge(item.status)}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                  {showCost && (
                    <td className="text-right text-gray-600">
                      ₹{Number(item.unit_cost).toFixed(2)}
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
