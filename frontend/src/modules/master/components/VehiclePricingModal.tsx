import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { masterApi, VehicleModel, VehiclePriceHistoryResponse, VehiclePriceUpdate } from '../api/masterApi'
import { X, DollarSign, History, Plus } from 'lucide-react'
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

interface VehiclePricingModalProps {
  model: VehicleModel
  onClose: () => void
}

export default function VehiclePricingModal({ model, onClose }: VehiclePricingModalProps) {
  const queryClient = useQueryClient()
  const [newPrice, setNewPrice] = useState<string>('')
  const [effectiveFrom, setEffectiveFrom] = useState<string>('')

  const { data: priceHistory = [], isLoading } = useQuery({
    queryKey: ['vehicle-pricing-history', model.vehicle_model_id],
    queryFn: () => masterApi.getVehiclePriceHistory(model.vehicle_model_id),
  })

  const updatePriceMutation = useMutation({
    mutationFn: (data: VehiclePriceUpdate) =>
      masterApi.updateVehiclePrice(model.vehicle_model_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-pricing-history', model.vehicle_model_id] })
      toast.success('Vehicle model price updated successfully')
      setNewPrice('')
      setEffectiveFrom('')
    },
     
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to update vehicle price'
      toast.error(msg)
    },
  })

  const handleUpdatePrice = (e: React.FormEvent) => {
    e.preventDefault()
    const priceNum = parseFloat(newPrice)
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error('Please enter a valid positive price')
      return
    }

    const payload: VehiclePriceUpdate = {
      price: priceNum,
      effective_from: effectiveFrom ? new Date(effectiveFrom).toISOString() : undefined,
    }
    updatePriceMutation.mutate(payload)
  }

  const currentPrice = priceHistory[0]?.price

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Pricing — {model.model_name}
              </h2>
              <p className="text-xs text-gray-500">
                Brand: {model.brand_name} | Material: {model.material_number}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Price */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Current Active Price</span>
            <div className="text-2xl font-black text-emerald-900 mt-1">
              {currentPrice !== undefined ? formatCurrency(currentPrice) : 'Not Configured'}
            </div>
          </div>
          {priceHistory[0]?.effective_from && (
            <div className="text-right text-xs text-emerald-700">
              Effective Since: {formatDate(priceHistory[0].effective_from)}
            </div>
          )}
        </div>

        {/* Add/Revise Price Form */}
        <form onSubmit={handleUpdatePrice} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary-600" /> Revise / Set New Price
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                New Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="e.g. 125000"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="input text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Effective From (Optional)
              </label>
              <input
                type="datetime-local"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="input text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={updatePriceMutation.isPending}
              className="btn btn-primary text-sm flex items-center gap-2"
            >
              {updatePriceMutation.isPending ? 'Updating...' : 'Apply New Price'}
            </button>
          </div>
        </form>

        {/* Price History Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <History className="w-4 h-4 text-gray-500" /> Price History
          </h3>
          {isLoading ? (
            <div className="text-center py-6 text-gray-500 text-sm">Loading price history...</div>
          ) : priceHistory.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-lg">
              No historical price records found.
            </div>
          ) : (
            <div className="table-container max-h-52 overflow-y-auto">
              <table className="table text-sm">
                <thead>
                  <tr>
                    <th>Price</th>
                    <th>Effective From</th>
                    <th>Effective To</th>
                    <th>Recorded At</th>
                  </tr>
                </thead>
                <tbody>
                  {priceHistory.map((item: VehiclePriceHistoryResponse) => (
                    <tr key={item.history_id}>
                      <td className="font-semibold text-gray-900">{formatCurrency(item.price)}</td>
                      <td>{formatDateTime(item.effective_from)}</td>
                      <td>{item.effective_to ? formatDateTime(item.effective_to) : <span className="text-emerald-600 font-medium">Present</span>}</td>
                      <td>{formatDate(item.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t">
          <button onClick={onClose} className="btn btn-secondary text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
