import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { inventoryApi } from '../api/inventoryApi'
import { Search, MapPin, Calendar } from 'lucide-react'
import { SkeletonTable } from '@/components/ui/SkeletonTable'
import { useAuthStore } from '@/store/authStore'

export default function InventoryBatches() {
  const { hasRole } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')

  const { data: batchResponse, isLoading } = useQuery({
    queryKey: ['inventory-batches'],
    queryFn: async () => {
      return await inventoryApi.getBatches()
    }
  })

  const items = batchResponse?.items || []
  
  const filteredItems = items.filter((item: any) => 
    item.spare_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.batch_number.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const showCost = hasRole(['ADMIN', 'DEALER'])

  return (
    <div className="card bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="mb-6 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search batches by name or number..."
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
          No batches found.
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Batch Number</th>
                <th>Part</th>
                <th>Location</th>
                <th className="text-right">Quantity</th>
                <th>Expiry Date</th>
                {showCost && <th className="text-right">Unit Cost</th>}
                {showCost && <th className="text-right">Total Value</th>}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item: any) => (
                <tr key={`${item.batch_id}-${item.location}`}>
                  <td className="font-mono font-medium text-blue-600">{item.batch_number}</td>
                  <td className="font-medium text-gray-900">{item.spare_name}</td>
                  <td>
                    <span className="flex items-center gap-1 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      {item.location}
                    </span>
                  </td>
                  <td className="text-right font-bold text-gray-900">{item.quantity}</td>
                  <td>
                    {item.expiry_date ? (
                      <span className="flex items-center gap-1 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        {new Date(item.expiry_date).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
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
