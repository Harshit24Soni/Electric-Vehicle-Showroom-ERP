import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { inventoryApi } from '../api/inventoryApi'
import {
  Package,
  MapPin,
  Activity,
  Coins,
  Table as TableIcon,
  FileSpreadsheet,
  Car,
  Warehouse,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import { MetricCard } from '@/components/ui/MetricCard'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/store/authStore'

interface InventoryDashboardProps {
  onNavigateTab?: (tab: 'vehicles' | 'spares' | 'stock' | 'movements') => void
  onOpenRecordMovement?: () => void
}

export default function InventoryDashboard({ onNavigateTab, onOpenRecordMovement }: InventoryDashboardProps) {
  const { hasRole } = useAuthStore()
  const canViewCost = hasRole(['ADMIN', 'DEALER'])

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['inventory-dashboard-stats'],
    queryFn: () => inventoryApi.getDashboardStats(),
  })

  const { data: locations = [], isLoading: isLoadingLocations } = useQuery({
    queryKey: ['inventory-stock-locations'],
    queryFn: () => inventoryApi.getStockByLocation(),
  })

  const totalStockQuantity = locations.reduce((acc, curr) => acc + (curr.total_quantity || 0), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Spares Catalog"
          value={stats?.total_active_spares ?? 0}
          icon={Package}
          subtitle="Registered active spare parts"
          iconBg="bg-blue-50 dark:bg-blue-950/50 border border-blue-200/50 dark:border-blue-800/40"
          iconColor="text-blue-600 dark:text-blue-400"
          isLoading={isLoadingStats}
        />

        {canViewCost ? (
          <MetricCard
            title="Total Stock Value"
            value={`₹${Number(stats?.total_stock_value || 0).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            icon={Coins}
            subtitle="Valuation at weighted average cost"
            iconBg="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/50 dark:border-emerald-800/40"
            iconColor="text-emerald-600 dark:text-emerald-400"
            isLoading={isLoadingStats}
          />
        ) : (
          <MetricCard
            title="Total Units in Stock"
            value={totalStockQuantity}
            icon={Warehouse}
            subtitle="Aggregate physical quantity"
            iconBg="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/50 dark:border-emerald-800/40"
            iconColor="text-emerald-600 dark:text-emerald-400"
            isLoading={isLoadingLocations}
          />
        )}

        <MetricCard
          title="Stock Movements (30d)"
          value={stats?.total_movements_last_30d ?? 0}
          icon={Activity}
          subtitle="Inward, outward & adjustment cycles"
          iconBg="bg-purple-50 dark:bg-purple-950/50 border border-purple-200/50 dark:border-purple-800/40"
          iconColor="text-purple-600 dark:text-purple-400"
          isLoading={isLoadingStats}
        />

        <MetricCard
          title="Warehouse Locations"
          value={locations.length}
          icon={MapPin}
          subtitle="Storage zones & showroom bays"
          iconBg="bg-amber-50 dark:bg-amber-950/50 border border-amber-200/50 dark:border-amber-800/40"
          iconColor="text-amber-600 dark:text-amber-400"
          isLoading={isLoadingLocations}
        />
      </div>

      {/* Quick Launchpad & Location Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Warehouse Location Distribution */}
        <div className="lg:col-span-2">
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-200/50 dark:border-primary-800/50">
                  <Warehouse className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                    Stock Distribution by Location
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Inventory allocation across showrooms, service centers, and warehouses
                  </p>
                </div>
              </div>
              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('stock')}
                  className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 font-semibold flex items-center gap-1 transition-colors"
                >
                  View Details <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {isLoadingLocations ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[1, 2, 3].map((n) => (
                  <Skeleton key={n} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : locations.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {locations.map((loc) => (
                  <div
                    key={loc.location}
                    className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-slate-50/60 dark:bg-slate-950/50 flex flex-col justify-between hover:border-primary-500/40 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                        {loc.location}
                      </span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-slate-700/60">
                        {loc.total_quantity} units
                      </span>
                    </div>
                    {canViewCost && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Value:{' '}
                        <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                          ₹{Number(loc.total_value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
                No active stock recorded across locations.
              </div>
            )}
          </Card>
        </div>

        {/* Right Col: Operational Summary & Fast Actions */}
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <div className="border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-heading flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                Operational Summary
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Key inventory controls and daily warehouse operations
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Active Catalog Items
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Registered parts across all categories
                  </span>
                </div>
                <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                  {stats?.total_active_spares ?? 0}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    30-Day Movement Activity
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Inward, outward & transfer cycles
                  </span>
                </div>
                <span className="text-sm font-bold font-mono text-primary-600 dark:text-primary-400">
                  {stats?.total_movements_last_30d ?? 0}
                </span>
              </div>

              {onOpenRecordMovement && (
                <button
                  type="button"
                  onClick={onOpenRecordMovement}
                  className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold bg-primary-600 hover:bg-primary-500 text-white shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Activity className="w-3.5 h-3.5" />
                  Record Stock Movement
                </button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
