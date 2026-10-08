import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { inventoryApi } from '../api/inventoryApi'
import { SkeletonTable } from '@/components/ui/SkeletonTable'
import { useAuthStore } from '@/store/authStore'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'

export default function InventoryMovements() {
  const { hasRole } = useAuthStore()
  const [page, setPage] = useState(1)

  const { data: moveResponse, isLoading } = useQuery({
    queryKey: ['inventory-movements', page],
    queryFn: async () => {
      return await inventoryApi.getMovements(page, 20)
    }
  })

  const items = moveResponse?.items || []
  const showCost = hasRole(['ADMIN', 'DEALER'])

  const getTypeColor = (type: string) => {
    if (type.includes('INWARD') || type.includes('RECEIPT')) return 'text-green-600 bg-green-50'
    if (type.includes('OUTWARD') || type.includes('SALE') || type.includes('CONSUMPTION')) return 'text-red-600 bg-red-50'
    return 'text-blue-600 bg-blue-50'
  }

  return (
    <div className="card bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      {isLoading ? (
        <SkeletonTable rows={5} />
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No movements found.
        </div>
      ) : (
        <>
          <div className="table-container mb-4">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Part</th>
                  <th className="text-right">Qty</th>
                  <th>Location Flow</th>
                  <th>Tracking Ref</th>
                  <th>Source Ref</th>
                  {showCost && <th className="text-right">Unit Cost</th>}
                  {showCost && <th className="text-right">Total Cost</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((m: any) => (
                  <tr key={m.movement_id}>
                    <td className="whitespace-nowrap text-gray-600">
                      {new Date(m.movement_datetime).toLocaleString()}
                    </td>
                    <td>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium whitespace-nowrap ${getTypeColor(m.movement_type)}`}>
                        {m.movement_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="font-medium text-gray-900">{m.spare_name}</td>
                    <td className="text-right font-bold text-gray-900">{m.quantity}</td>
                    <td>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        {m.from_location ? <span>{m.from_location}</span> : <span className="text-gray-400">Ext</span>}
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                        {m.to_location ? <span>{m.to_location}</span> : <span className="text-gray-400">Ext</span>}
                      </div>
                    </td>
                    <td className="text-sm">
                      {m.batch_number && <div className="text-blue-600 font-mono">B: {m.batch_number}</div>}
                      {m.serial_number && <div className="text-purple-600 font-mono">S: {m.serial_number}</div>}
                      {!m.batch_number && !m.serial_number && <span className="text-gray-400">-</span>}
                    </td>
                    <td className="text-sm text-gray-600">
                      {m.reference_type ? `${m.reference_type}-${m.reference_id}` : '-'}
                    </td>
                    {showCost && (
                      <td className="text-right text-gray-600">
                        {m.unit_cost ? `₹${Number(m.unit_cost).toFixed(2)}` : '-'}
                      </td>
                    )}
                    {showCost && (
                      <td className="text-right font-medium text-gray-900">
                        {m.total_cost ? `₹${Number(m.total_cost).toFixed(2)}` : '-'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-sm text-gray-500">
              Page {moveResponse?.page} of {Math.ceil((moveResponse?.total || 0) / (moveResponse?.size || 1))}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="btn btn-outline p-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= Math.ceil((moveResponse?.total || 0) / (moveResponse?.size || 1))}
                onClick={() => setPage(p => p + 1)}
                className="btn btn-outline p-2"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
