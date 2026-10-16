import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { inventoryApi, StockLocationStat, StockItem } from '../api/inventoryApi'
import { Search, MapPin, AlertTriangle, Package, Warehouse, X, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

export default function InventoryStock() {
  const { hasRole } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [stockHealthFilter, setStockHealthFilter] = useState<'ALL' | 'HEALTHY' | 'LOW' | 'OUT'>('ALL')

  const { data: locations = [] } = useQuery({
    queryKey: ['inventory-stock-locations'],
    queryFn: () => inventoryApi.getStockByLocation(),
    select: (data: StockLocationStat[]) => data.map((l: StockLocationStat) => l.location),
  })

  const { data: stockResponse, isLoading } = useQuery({
    queryKey: ['inventory-stock', locationFilter],
    queryFn: async () => {
      return await inventoryApi.getStock(undefined, locationFilter || undefined)
    },
  })

  const items = stockResponse?.items || []

  const stockCounts = {
    all: items.length,
    healthy: items.filter((i: StockItem) => i.quantity > 5).length,
    low: items.filter((i: StockItem) => i.quantity > 0 && i.quantity <= 5).length,
    out: items.filter((i: StockItem) => i.quantity <= 0).length,
  }

  const filteredItems = items.filter((item: StockItem) => {
    const q = searchTerm.toLowerCase().trim()
    const matchesSearch = !q ||
      item.spare_name.toLowerCase().includes(q) ||
      (item.part_code && item.part_code.toLowerCase().includes(q))

    if (!matchesSearch) return false

    if (stockHealthFilter === 'HEALTHY') return item.quantity > 5
    if (stockHealthFilter === 'LOW') return item.quantity > 0 && item.quantity <= 5
    if (stockHealthFilter === 'OUT') return item.quantity <= 0
    return true
  })

  const showCost = hasRole(['ADMIN', 'DEALER'])

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Space-Efficient Stock Levels Container */}
      <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {/* Compact Integrated Toolbar */}
        <div className="p-3 sm:p-4 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          {/* Location Selector & Health Chips */}
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar text-xs">
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all shrink-0"
            >
              <option value="">All Locations ({locations.length})</option>
              {locations.map((loc: string) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" />

            <button
              onClick={() => setStockHealthFilter('ALL')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                stockHealthFilter === 'ALL'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              All
              <span className="font-mono text-[11px] opacity-70">({stockCounts.all})</span>
            </button>

            <button
              onClick={() => setStockHealthFilter('HEALTHY')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                stockHealthFilter === 'HEALTHY'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Healthy
              <span className="font-mono text-[11px] opacity-80">({stockCounts.healthy})</span>
            </button>

            <button
              onClick={() => setStockHealthFilter('LOW')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                stockHealthFilter === 'LOW'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              Low (≤5)
              <span className="font-mono text-[11px] opacity-80">({stockCounts.low})</span>
            </button>

            <button
              onClick={() => setStockHealthFilter('OUT')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                stockHealthFilter === 'OUT'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              Out of Stock
              <span className="font-mono text-[11px] opacity-80">({stockCounts.out})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search part name or code..."
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
          icon={Warehouse}
          title="No stock records found"
          description={
            searchTerm || locationFilter || stockHealthFilter !== 'ALL'
              ? 'No stock items match your filter criteria. Try clearing search or selecting a different status/location.'
              : 'No physical stock recorded in this location. Inward inventory via procurement or record movement.'
          }
          actionLabel={searchTerm || locationFilter || stockHealthFilter !== 'ALL' ? 'Reset All Filters' : undefined}
          onAction={
            searchTerm || locationFilter || stockHealthFilter !== 'ALL'
              ? () => {
                  setSearchTerm('')
                  setLocationFilter('')
                  setStockHealthFilter('ALL')
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
                <th>Spare Part Info</th>
                <th>Authoritative Code</th>
                <th>Location / Bin</th>
                <th>Tracking Mode</th>
                <th className="text-right">Available Qty</th>
                {showCost && <th className="text-right">Unit WAC Cost</th>}
                {showCost && <th className="text-right">Total Valuation</th>}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item: StockItem, idx: number) => {
                const isOutOfStock = item.quantity <= 0
                const isLowStock = item.quantity > 0 && item.quantity <= 5
                return (
                  <tr
                    key={`${item.spare_id}-${item.location}-${idx}`}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td>
                      <div className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">
                        {item.spare_name}
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60">
                        {item.part_code || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                        {item.location}
                      </span>
                    </td>
                    <td>
                      <Badge
                        variant={
                          item.tracking_mode === 'SERIALIZED'
                            ? 'info'
                            : item.tracking_mode === 'BATCH'
                            ? 'warning'
                            : 'neutral'
                        }
                      >
                        {item.tracking_mode}
                      </Badge>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/50">
                            <AlertTriangle className="w-3 h-3 text-rose-500" />
                            0 Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50"
                            title="Operational safety threshold (≤ 5 units). Per-part reorder level is not defined in backend schema."
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            {item.quantity} (Low ≤ 5)
                          </span>
                        ) : (
                          <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                            {item.quantity}
                          </span>
                        )}
                      </div>
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
