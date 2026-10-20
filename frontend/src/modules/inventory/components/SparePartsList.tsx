import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Settings2,
  PackageSearch,
  DollarSign,
  Package,
  Layers,
  Barcode,
  CheckCircle2,
  Tag,
  X,
  Receipt,
  Trash2,
  RotateCcw,
  History,
  AlertCircle,
} from 'lucide-react'
import { AxiosError } from 'axios'
import { inventoryApi, SpareMasterItem, SpareMasterCreate } from '../api/inventoryApi'
import { SparePartForm } from './SparePartForm'
import SparePricingModal from './SparePricingModal'
import PartPurchaseHistoryModal from './PartPurchaseHistoryModal'
import { toast } from 'react-hot-toast'
import { MetricCard } from '@/components/ui/MetricCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuthStore } from '@/store/authStore'

interface SparePartsListProps {
  onOpenRecordMovement?: () => void
}

export function SparePartsList({ onOpenRecordMovement }: SparePartsListProps) {
  const { hasRole } = useAuthStore()
  const canManageSpares = hasRole(['ADMIN', 'DEALER'])
  const canViewPricing = hasRole(['ADMIN', 'DEALER'])

  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)
  const [deletingSpare, setDeletingSpare] = useState<SpareMasterItem | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [pricingSpare, setPricingSpare] = useState<SpareMasterItem | null>(null)
  const [purchaseHistoryItem, setPurchaseHistoryItem] = useState<{
    part_code: string
    description?: string
    category?: string
    stock_quantity?: number
  } | null>(null)

  const { data: spares = [], isLoading } = useQuery({
    queryKey: ['spares-inventory', showDeleted],
    queryFn: async () => {
      return await inventoryApi.getSpares(showDeleted)
    },
  })

  const queryClient = useQueryClient()
  const createSpareMutation = useMutation({
    mutationFn: (data: SpareMasterCreate) => inventoryApi.createSpare(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spares-inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['master-sheet-items'] })
      toast.success('Spare part registered successfully')
      setIsAdding(false)
    },
    onError: (error: unknown) => {
      const axiosErr = error as AxiosError<{ detail?: string }>
      toast.error(axiosErr?.response?.data?.detail || 'Failed to add spare part')
    },
  })

  const handleCreateSpare = (data: SpareMasterCreate) => {
    createSpareMutation.mutate(data)
  }

  const deactivateSpareMutation = useMutation({
    mutationFn: (spareId: number) => inventoryApi.deactivateSpare(spareId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spares-inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['master-sheet-items'] })
      toast.success('Spare part soft-deleted successfully')
      setDeletingSpare(null)
    },
    onError: (error: unknown) => {
      const axiosErr = error as AxiosError<{ detail?: string }>
      toast.error(axiosErr?.response?.data?.detail || 'Failed to soft delete spare part')
    },
  })

  const restoreSpareMutation = useMutation({
    mutationFn: (spareId: number) => inventoryApi.restoreSpare(spareId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spares-inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['master-sheet-items'] })
      toast.success('Spare part restored successfully')
    },
    onError: (error: unknown) => {
      const axiosErr = error as AxiosError<{ detail?: string }>
      toast.error(axiosErr?.response?.data?.detail || 'Failed to restore spare part')
    },
  })

  // Derive unique categories
  const categories = useMemo(() => {
    const set = new Set<string>()
    spares.forEach((s) => {
      if (s.category) set.add(s.category)
    })
    return Array.from(set).sort()
  }, [spares])

  const [trackingFilter, setTrackingFilter] = useState<string>('')

  const filteredSpares = useMemo(() => {
    return spares.filter((spare: SpareMasterItem) => {
      const term = searchTerm.toLowerCase().trim()
      const currentCode = spare.spare_code?.toLowerCase() || ''
      const matchesSearch =
        !term ||
        spare.spare_name.toLowerCase().includes(term) ||
        currentCode.includes(term) ||
        (spare.category && spare.category.toLowerCase().includes(term))
      const matchesCategory = !categoryFilter || spare.category === categoryFilter
      const matchesTracking = !trackingFilter || spare.tracking_mode === trackingFilter
      return matchesSearch && matchesCategory && matchesTracking
    })
  }, [spares, searchTerm, categoryFilter, trackingFilter])
  const stats = useMemo(() => {
    return {
      total: spares.length,
      active: spares.filter((s) => s.is_active).length,
      serialized: spares.filter((s) => s.tracking_mode === 'SERIALIZED').length,
      batch: spares.filter((s) => s.tracking_mode === 'BATCH').length,
    }
  }, [spares])

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Space-Efficient Spare Parts Catalog Container */}
      <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {/* Compact Integrated Toolbar */}
        <div className="p-3 sm:p-4 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          {/* Tracking Mode Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar text-xs">
            <button
              onClick={() => setTrackingFilter('')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                trackingFilter === ''
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              All Modes
              <span className="font-mono text-[11px] opacity-70">({stats.total})</span>
            </button>

            <button
              onClick={() => setTrackingFilter(trackingFilter === 'QUANTITY' ? '' : 'QUANTITY')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                trackingFilter === 'QUANTITY'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              Standard
            </button>

            <button
              onClick={() => setTrackingFilter(trackingFilter === 'BATCH' ? '' : 'BATCH')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                trackingFilter === 'BATCH'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              Batch Lots
              <span className="font-mono text-[11px] opacity-80">({stats.batch})</span>
            </button>

            <button
              onClick={() => setTrackingFilter(trackingFilter === 'SERIALIZED' ? '' : 'SERIALIZED')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                trackingFilter === 'SERIALIZED'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
              Serialized
              <span className="font-mono text-[11px] opacity-80">({stats.serialized})</span>
            </button>
          </div>

          {/* Search, Category & Add Part Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-56">
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

            {categories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}

            {/* Soft-Delete / Archive Filter Toggle */}
            <button
              type="button"
              onClick={() => setShowDeleted((prev) => !prev)}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition border shrink-0 ${
                showDeleted
                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 ring-1 ring-rose-300 dark:ring-rose-800'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
              title="Toggle viewing soft-deleted / archived spares"
            >
              <History className="w-3 h-3" />
              <span>{showDeleted ? 'Showing Soft-Deleted' : 'Show Soft-Deleted'}</span>
            </button>

            {canManageSpares && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-1.5 h-8 text-xs shrink-0 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Part
              </Button>
            )}
          </div>
        </div>

        {/* Content Table */}
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : filteredSpares.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="No spare parts found"
            description={
              searchTerm || categoryFilter
                ? 'No catalog items match your search or category filter.'
                : 'No spare parts have been registered yet. Add your first part or import via the Ingestion Studio.'
            }
            actionLabel={searchTerm || categoryFilter ? 'Reset Filters' : 'Add New Part'}
            onAction={
              searchTerm || categoryFilter
                ? () => {
                    setSearchTerm('')
                    setCategoryFilter('')
                  }
                : () => setIsAdding(true)
            }
            className="py-14"
          />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Authoritative Code</th>
                  <th>Part Name & Category</th>
                  <th>Tracking Mode</th>
                  <th>Type Status</th>
                  <th>Active Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSpares.map((spare: SpareMasterItem) => {
                  const currentCode = spare.spare_code || '—'
                  const isDeleted = Boolean(spare.is_deleted || !spare.is_active)
                  return (
                    <tr
                      key={spare.spare_id}
                      className={`transition-colors ${
                        isDeleted
                          ? 'bg-rose-50/20 dark:bg-rose-950/20 opacity-75'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <td>
                        {spare.spare_code ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPurchaseHistoryItem({
                                part_code: spare.spare_code,
                                description: spare.spare_name,
                                category: spare.category,
                              })
                            }
                            className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/60 dark:border-blue-800/60 transition-colors inline-flex items-center gap-1.5 cursor-pointer text-left"
                            title="Click to view purchase bills, quantities & rates history"
                          >
                            <span>{currentCode}</span>
                            <Receipt className="w-3 h-3 opacity-60 hover:opacity-100" />
                          </button>
                        ) : (
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60">
                            {currentCode}
                          </span>
                        )}
                      </td>
                      <td>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">
                            {spare.spare_name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Tag className="w-3 h-3 text-slate-400" />
                            {spare.category || 'Standard Replacement'}
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge
                          variant={
                            spare.tracking_mode === 'SERIALIZED'
                              ? 'info'
                              : spare.tracking_mode === 'BATCH'
                              ? 'warning'
                              : 'neutral'
                          }
                        >
                          {spare.tracking_mode}
                        </Badge>
                      </td>
                      <td>
                        {spare.is_temporary ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50">
                            Temporary / Pending Verification
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
                            Verified Master
                          </span>
                        )}
                      </td>
                      <td>
                        {spare.is_deleted ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/50">
                            Soft-Deleted
                          </span>
                        ) : (
                          <Badge variant={spare.is_active ? 'success' : 'neutral'}>
                            {spare.is_active ? 'Active' : 'Archived'}
                          </Badge>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {spare.spare_code && (
                            <button
                              onClick={() =>
                                setPurchaseHistoryItem({
                                  part_code: spare.spare_code,
                                  description: spare.spare_name,
                                  category: spare.category,
                                })
                              }
                              className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors border border-transparent hover:border-blue-200/50"
                              title="View Inward Bills, Rates & Quantity Summary"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                          )}
                          {canViewPricing && (
                            <button
                              onClick={() => setPricingSpare(spare)}
                              className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors border border-transparent hover:border-emerald-200/50"
                              title="Manage Pricing, MRP & Margins"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                          )}
                          {canManageSpares && (
                            isDeleted ? (
                              <button
                                type="button"
                                onClick={() => restoreSpareMutation.mutate(spare.spare_id)}
                                disabled={restoreSpareMutation.isPending}
                                className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors border border-transparent hover:border-emerald-200/50"
                                title="Restore Spare Part"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeletingSpare(spare)}
                                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors border border-transparent hover:border-rose-200/50"
                                title="Soft Delete Spare Part"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAdding && (
        <SparePartForm
          onSubmit={handleCreateSpare}
          onClose={() => setIsAdding(false)}
          isLoading={createSpareMutation.isPending}
        />
      )}

      {pricingSpare && (
        <SparePricingModal
          spare={pricingSpare}
          onClose={() => setPricingSpare(null)}
        />
      )}

      {purchaseHistoryItem && (
        <PartPurchaseHistoryModal
          item={purchaseHistoryItem}
          onClose={() => setPurchaseHistoryItem(null)}
        />
      )}

      {/* SOFT DELETE CONFIRMATION MODAL */}
      {deletingSpare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Soft Delete Spare Part</h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">Strict Soft Delete • Safely Reversible</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to soft delete spare{' '}
              <strong className="text-slate-900 dark:text-white">{deletingSpare.spare_name}</strong>
              {deletingSpare.spare_code ? ` (${deletingSpare.spare_code})` : ''}?
            </p>

            <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 rounded-xl border border-amber-200/60 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Audit Compliance Notice
              </p>
              <p>
                In accordance with ERP data integrity policy, records are never permanently purged. This part will be archived and can be restored at any time via <strong>Show Soft-Deleted</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingSpare(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deactivateSpareMutation.mutate(deletingSpare.spare_id)}
                disabled={deactivateSpareMutation.isPending}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm rounded-xl shadow-md shadow-rose-200 dark:shadow-rose-950/50 disabled:opacity-50"
              >
                {deactivateSpareMutation.isPending ? 'Soft Deleting...' : 'Confirm Soft Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
