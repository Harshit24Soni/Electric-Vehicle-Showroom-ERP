import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { inventoryApi, SerialItem } from '../api/inventoryApi'
import { Search, MapPin, Barcode, X } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

export default function InventorySerials() {
  const { hasRole } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data: serialResponse, isLoading } = useQuery({
    queryKey: ['inventory-serials'],
    queryFn: async () => {
      return await inventoryApi.getSerials()
    },
  })

  const items = serialResponse?.items || []

  const filteredItems = items.filter((item: SerialItem) => {
    const q = searchTerm.toLowerCase().trim()
    const matchesSearch =
      !q ||
      item.spare_name.toLowerCase().includes(q) ||
      item.serial_number.toLowerCase().includes(q)

    if (!matchesSearch) return false

    if (statusFilter && item.status !== statusFilter) {
      return false
    }

    return true
  })

  const showCost = hasRole(['ADMIN', 'DEALER'])

  const getStatusBadgeVariant = (status: string): 'success' | 'info' | 'neutral' | 'warning' => {
    switch (status) {
      case 'IN_STOCK':
        return 'success'
      case 'SOLD':
        return 'info'
      case 'CONSUMED':
        return 'warning'
      default:
        return 'neutral'
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Space-Efficient Serials Container */}
      <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {/* Compact Integrated Toolbar */}
        <div className="p-3 sm:p-4 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5 text-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shrink-0"
            >
              <option value="">All Lifecycle Statuses</option>
              <option value="IN_STOCK">In Stock (Available)</option>
              <option value="SOLD">Sold / Delivered</option>
              <option value="CONSUMED">Consumed in Service</option>
            </select>

            <span className="font-mono text-slate-400 text-[11px] hidden sm:inline">
              ({filteredItems.length} units)
            </span>
          </div>

          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search serial number or part..."
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
          icon={Barcode}
          title={searchTerm || statusFilter ? 'No matching serialized units' : 'No serialized units found'}
          description={
            searchTerm || statusFilter
              ? 'No serialized parts matched your filter criteria. Try resetting filters.'
              : 'No serialized parts have been registered in the system yet.'
          }
          actionLabel={searchTerm || statusFilter ? 'Reset Filters' : undefined}
          onAction={
            searchTerm || statusFilter
              ? () => {
                  setSearchTerm('')
                  setStatusFilter('')
                }
              : undefined
          }
          className="py-14"
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Serial Number</th>
                <th>Spare Part Info</th>
                <th>Location / Storage</th>
                <th>Lifecycle Status</th>
                {showCost && <th className="text-right">Unit Cost</th>}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item: SerialItem) => (
                <tr
                  key={item.serial_id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50">
                      {item.serial_number}
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
                  <td>
                    <Badge variant={getStatusBadgeVariant(item.status)}>
                      {item.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  {showCost && (
                    <td className="text-right font-mono text-xs text-slate-600 dark:text-slate-400">
                      ₹{Number(item.unit_cost || 0).toFixed(2)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  )
}
