import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { masterApi, SparePriceHistoryResponse, SparePriceUpdate } from '@/modules/master/api/masterApi'
import { SpareMasterItem } from '../api/inventoryApi'
import { X, DollarSign, History, Plus, CheckCircle2 } from 'lucide-react'
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'

interface SparePricingModalProps {
  spare: SpareMasterItem
  onClose: () => void
}

export default function SparePricingModal({ spare, onClose }: SparePricingModalProps) {
  const { hasRole } = useAuthStore()
  const canRevisePrice = hasRole(['ADMIN'])

  const queryClient = useQueryClient()
  const [newPrice, setNewPrice] = useState<string>('')
  const [newMargin, setNewMargin] = useState<string>('0')
  const [effectiveFrom, setEffectiveFrom] = useState<string>('')

  const { data: priceHistory = [], isLoading } = useQuery({
    queryKey: ['spare-pricing-history', spare.spare_id],
    queryFn: () => masterApi.getSparePriceHistory(spare.spare_id),
  })

  const updatePriceMutation = useMutation({
    mutationFn: (data: SparePriceUpdate) =>
      masterApi.updateSparePrice(spare.spare_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spare-pricing-history', spare.spare_id] })
      queryClient.invalidateQueries({ queryKey: ['spares-inventory'] })
      queryClient.invalidateQueries({ queryKey: ['master-sheet-items'] })
      toast.success('Spare part pricing updated successfully')
      setNewPrice('')
      setNewMargin('0')
      setEffectiveFrom('')
    },
     
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to update spare part pricing'
      toast.error(msg)
    },
  })

  const handleUpdatePrice = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canRevisePrice) {
      toast.error('Unauthorized: Price revisions are restricted to Administrators')
      return
    }
    const priceNum = parseFloat(newPrice)
    const marginNum = parseFloat(newMargin || '0')
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error('Please enter a valid positive price')
      return
    }
    if (isNaN(marginNum) || marginNum < 0 || marginNum > 100) {
      toast.error('Please enter a valid margin between 0% and 100%')
      return
    }

    const payload: SparePriceUpdate = {
      price: priceNum,
      margin: marginNum,
      effective_from: effectiveFrom ? new Date(effectiveFrom).toISOString() : undefined,
    }

    updatePriceMutation.mutate(payload)
  }

  const latestPrice = priceHistory[0]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-heading">
                Spare Part Pricing — {spare.spare_name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Code: {spare.spare_code || '—'} | Tracking: {spare.tracking_mode}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Price */}
        <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              Current Selling Price
            </span>
            <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-0.5 font-mono">
              {latestPrice !== undefined ? formatCurrency(latestPrice.price) : 'Not Configured'}
            </div>
            {latestPrice && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 font-medium">
                Configured Margin: {latestPrice.margin}%
              </p>
            )}
          </div>
          {latestPrice?.effective_from && (
            <div className="text-right text-xs text-emerald-700 dark:text-emerald-400 font-mono">
              Effective: {formatDate(latestPrice.effective_from)}
            </div>
          )}
        </div>

        {/* Add/Revise Price Form (Admin Only) or Read-Only Banner */}
        {canRevisePrice ? (
          <form
            onSubmit={handleUpdatePrice}
            className="bg-slate-50/70 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-4"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
              Revise / Authorize Part Selling Price
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  New Price (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="e.g. 750"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Margin (%) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  required
                  placeholder="e.g. 15.0"
                  value={newMargin}
                  onChange={(e) => setNewMargin(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Effective From
                </label>
                <input
                  type="datetime-local"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={updatePriceMutation.isPending}
                disabled={updatePriceMutation.isPending}
                className="flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Save Revised Price
              </Button>
            </div>
          </form>
        ) : (
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-300">
              Price revisions and margin authorizations are restricted to Administrator accounts.
            </span>
            <span className="font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              Read Only
            </span>
          </div>
        )}

        {/* Price History Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-slate-400" />
            Audit Ledger of Price Revisions
          </h3>
          {isLoading ? (
            <div className="text-center py-6 text-slate-400 text-xs">Loading price history...</div>
          ) : priceHistory.length === 0 ? (
            <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              No historical price revisions found.
            </div>
          ) : (
            <div className="table-container max-h-52 overflow-y-auto">
              <table className="table text-xs">
                <thead>
                  <tr>
                    <th>Price</th>
                    <th>Margin</th>
                    <th>Effective From</th>
                    <th>Effective To</th>
                    <th>Recorded At</th>
                  </tr>
                </thead>
                <tbody>
                  {priceHistory.map((item: SparePriceHistoryResponse) => (
                    <tr key={item.history_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                      <td className="font-semibold text-slate-900 dark:text-white font-mono">
                        {formatCurrency(item.price)}
                      </td>
                      <td>{item.margin}%</td>
                      <td className="font-mono text-slate-500 dark:text-slate-400">
                        {formatDateTime(item.effective_from)}
                      </td>
                      <td className="font-mono text-slate-500 dark:text-slate-400">
                        {item.effective_to ? (
                          formatDateTime(item.effective_to)
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            Present
                          </span>
                        )}
                      </td>
                      <td className="font-mono text-slate-500 dark:text-slate-400">
                        {formatDate(item.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
