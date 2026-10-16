import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { inventoryApi, BatchItem } from '../api/inventoryApi'
import { Search, MapPin, Calendar, Layers, AlertCircle, X } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

export default function InventoryBatches() {
  const { hasRole } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')

  const { data: batchResponse, isLoading } = useQuery({
    queryKey: ['inventory-batches'],
    queryFn: async () => {
      return await inventoryApi.getBatches()
    },
  })

  const items = batchResponse?.items || []

  const filteredItems = items.filter(
    (item: BatchItem) =>
      item.spare_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.batch_number.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const showCost = hasRole(['ADMIN', 'DEALER'])

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Space-Efficient Batches Container */}
      <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {/* Compact Integrated Toolbar */}
        <div className="p-3 sm:p-4 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Active Lots & Consignments
            </span>
            <span className="font-mono text-slate-400 text-[11px]">
              ({filteredItems.length} records)
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search batch number or part..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-6 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No batches found"
          description={
            searchTerm
              ? 'No batches match your search criteria. Try a different query.'
              : 'No batch-tracked inventory is registered yet. Inward batch stock through procurement.'
          }
          actionLabel={searchTerm ? 'Clear Search' : undefined}
          onAction={searchTerm ? () => setSearchTerm('') : undefined}
          className="py-14"
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Batch Number</th>
                <th>Spare Part</th>
                <th>Location</th>
                <th className="text-right">Quantity</th>
                <th>Expiry Date</th>
                {showCost && <th className="text-right">Unit Cost</th>}
                {showCost && <th className="text-right">Total Value</th>}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item: BatchItem) => {
                const isExpired = item.expiry_date && new Date(item.expiry_date) < new Date()
                return (
                  <tr
                    key={`${item.batch_id}-${item.location}`}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
                        {item.batch_number}
                      </span>
                    </td>
                    <td>
                      <div className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">
                        {item.spare_name}
                      </div>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                        {item.location}
                      </span>
                    </td>
                    <td className="text-right font-mono font-bold text-slate-900 dark:text-white text-sm">
                      {item.quantity}
                    </td>
                    <td>
                      {item.expiry_date ? (
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium ${
                            isExpired
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {isExpired ? (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                          ) : (
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          {new Date(item.expiry_date).toLocaleDateString()}
                          {isExpired && ' (Expired)'}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600 text-xs italic">
                          No Expiry
                        </span>
                      )}
                    </td>
                    {showCost && (
                      <td className="text-right font-mono text-xs text-slate-600 dark:text-slate-400">
                        ₹{Number(item.unit_cost || 0).toFixed(2)}
                      </td>
                    )}
                    {showCost && (
                      <td className="text-right font-mono font-bold text-xs text-slate-900 dark:text-white">
                        ₹{Number(item.total_value || 0).toFixed(2)}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  )
}
