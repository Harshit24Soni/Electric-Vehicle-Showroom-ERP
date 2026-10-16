import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { inventoryApi, MovementHistoryItem } from '../api/inventoryApi'
import { useAuthStore } from '@/store/authStore'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  History,
  Plus,
  ArrowLeftRight,
  Search,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

interface InventoryMovementsProps {
  onOpenRecordMovement?: () => void
}

export default function InventoryMovements({ onOpenRecordMovement }: InventoryMovementsProps) {
  const { hasRole } = useAuthStore()
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const { data: moveResponse, isLoading } = useQuery({
    queryKey: ['inventory-movements', page],
    queryFn: async () => {
      return await inventoryApi.getMovements(page, 20)
    },
  })

  const rawItems = moveResponse?.items || []
  const showCost = hasRole(['ADMIN', 'DEALER'])

  const filteredItems = rawItems.filter((m: MovementHistoryItem) => {
    const q = searchTerm.toLowerCase().trim()
    const matchesSearch =
      !q ||
      m.spare_name.toLowerCase().includes(q) ||
      (m.part_code && m.part_code.toLowerCase().includes(q)) ||
      (m.batch_number && m.batch_number.toLowerCase().includes(q)) ||
      (m.serial_number && m.serial_number.toLowerCase().includes(q)) ||
      (m.reference_type && m.reference_type.toLowerCase().includes(q))

    if (!matchesSearch) return false

    if (typeFilter && !m.movement_type.includes(typeFilter)) {
      return false
    }

    return true
  })

  const getTypeBadgeClass = (type: string) => {
    if (type.includes('INWARD') || type.includes('PURCHASE') || type.includes('RECEIPT')) {
      return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60'
    }
    if (type.includes('OUTWARD') || type.includes('SALE') || type.includes('CONSUMPTION')) {
      return 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60'
    }
    return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60'
  }

  const totalPages = Math.max(1, Math.ceil((moveResponse?.total || 0) / (moveResponse?.size || 1)))

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Space-Efficient Movements Container */}
      <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {/* Compact Integrated Toolbar */}
        <div className="p-3 sm:p-4 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          {/* Movement Type Filter */}
          <div className="flex items-center gap-2 text-xs">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shrink-0"
            >
              <option value="">All Movement Types</option>
              <option value="PURCHASE">Receipts / Purchases</option>
              <option value="SALE">Sales Outward</option>
              <option value="CONSUMPTION">Service Consumption</option>
              <option value="ADJUSTMENT">Adjustments</option>
              <option value="TRANSFER">Transfers</option>
            </select>

            <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
              Page {page} of {totalPages}
            </span>
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search part, code, serial, or lot..."
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
          icon={ArrowLeftRight}
          title={searchTerm || typeFilter ? 'No matching stock movements' : 'No stock movements recorded'}
          description={
            searchTerm || typeFilter
              ? 'No movements match your search query or type filter. Try resetting filters.'
              : 'Stock movements will appear here once inventory is received, adjusted, or issued to service.'
          }
          actionLabel={searchTerm || typeFilter ? 'Reset Filters' : onOpenRecordMovement ? 'Record Movement' : undefined}
          onAction={
            searchTerm || typeFilter
              ? () => {
                  setSearchTerm('')
                  setTypeFilter('')
                }
              : onOpenRecordMovement
          }
          className="py-14"
        />
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Movement Type</th>
                  <th>Part Info</th>
                  <th className="text-right">Qty</th>
                  <th>Location Route</th>
                  <th>Batch / Serial</th>
                  <th>Reference</th>
                  {showCost && <th className="text-right">Unit Cost</th>}
                  {showCost && <th className="text-right">Total Cost</th>}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((m: MovementHistoryItem) => {
                  const isInward =
                    m.quantity > 0 ||
                    m.movement_type.includes('INWARD') ||
                    m.movement_type.includes('PURCHASE') ||
                    m.movement_type.includes('RECEIPT')
                  const isOutward =
                    m.quantity < 0 ||
                    m.movement_type.includes('OUTWARD') ||
                    m.movement_type.includes('SALE') ||
                    m.movement_type.includes('CONSUMPTION')

                  return (
                    <tr
                      key={m.movement_id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {new Date(m.movement_datetime).toLocaleString()}
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getTypeBadgeClass(
                            m.movement_type
                          )}`}
                        >
                          {m.movement_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">
                          {m.spare_name}
                        </div>
                        {m.part_code && (
                          <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {m.part_code}
                          </div>
                        )}
                      </td>
                      <td className="text-right">
                        <span
                          className={`font-mono font-bold text-sm ${
                            isInward && !isOutward
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isOutward
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {isInward && !isOutward && m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                        </span>
                      </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {m.from_location || 'External'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {m.to_location || 'External'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="text-xs">
                        {m.batch_number && (
                          <div className="font-mono text-blue-600 dark:text-blue-400 font-medium">
                            Lot: {m.batch_number}
                          </div>
                        )}
                        {m.serial_number && (
                          <div className="font-mono text-purple-600 dark:text-purple-400 font-medium">
                            SN: {m.serial_number}
                          </div>
                        )}
                        {!m.batch_number && !m.serial_number && (
                          <span className="text-slate-400 dark:text-slate-600 italic">Standard</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                        {m.reference_type ? `${m.reference_type} #${m.reference_id}` : '—'}
                      </span>
                    </td>
                    {showCost && (
                      <td className="text-right font-mono text-xs text-slate-600 dark:text-slate-400">
                        {m.unit_cost !== null && m.unit_cost !== undefined
                          ? `₹${Number(m.unit_cost).toFixed(2)}`
                          : '—'}
                      </td>
                    )}
                    {showCost && (
                      <td className="text-right font-mono font-bold text-xs text-slate-900 dark:text-white">
                        {m.total_cost !== null && m.total_cost !== undefined
                          ? `₹${Number(m.total_cost).toFixed(2)}`
                          : '—'}
                      </td>
                    )}
                  </tr>
                )
              })}
              </tbody>
            </table>
          </div>

          {/* Pagination Toolbar */}
          <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
            <div>
              Showing Page <span className="font-bold text-slate-900 dark:text-white">{page}</span> of{' '}
              <span className="font-bold text-slate-900 dark:text-white">{totalPages}</span> (
              {moveResponse?.total ?? 0} total movements)
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  )
}
