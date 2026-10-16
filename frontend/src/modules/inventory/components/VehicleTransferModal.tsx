import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, ArrowLeftRight, CheckCircle2, AlertCircle } from 'lucide-react'
import { inventoryApi, VehicleMovementCreate } from '../api/inventoryApi'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

interface VehicleTransferModalProps {
  initialChassisNo?: string
  onClose: () => void
  onSuccess?: () => void
}

export default function VehicleTransferModal({
  initialChassisNo = '',
  onClose,
  onSuccess,
}: VehicleTransferModalProps) {
  const queryClient = useQueryClient()
  const [chassisNo, setChassisNo] = useState(initialChassisNo)
  const [fromLocation, setFromLocation] = useState('')
  const [toLocation, setToLocation] = useState('')
  const [remarks, setRemarks] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const transferMutation = useMutation({
    mutationFn: (data: VehicleMovementCreate) => inventoryApi.createVehicleMovement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles-inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] })
      toast.success(`Vehicle ${chassisNo.trim().toUpperCase()} transferred successfully`)
      if (onSuccess) onSuccess()
      onClose()
    },
     
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to record vehicle transfer'
      setValidationError(msg)
      toast.error(msg)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    const trimmedChassis = chassisNo.trim().toUpperCase()
    const trimmedFrom = fromLocation.trim()
    const trimmedTo = toLocation.trim()

    if (!trimmedChassis) {
      setValidationError('Chassis number is required')
      return
    }
    if (!trimmedFrom) {
      setValidationError('Source location is required')
      return
    }
    if (!trimmedTo) {
      setValidationError('Destination location is required')
      return
    }
    if (trimmedFrom.toLowerCase() === trimmedTo.toLowerCase()) {
      setValidationError('Source and destination locations cannot be identical')
      return
    }

    transferMutation.mutate({
      chassis_no: trimmedChassis,
      movement_type: 'TRANSFER',
      from_location: trimmedFrom,
      to_location: trimmedTo,
      remarks: remarks.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-200/50 dark:border-primary-800/50 rounded-xl">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-heading">
                Transfer Vehicle Fleet Unit
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Log physical transfer between showrooms, service bays, or warehouses
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

        {/* Validation Error Banner */}
        {validationError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/60 dark:border-rose-800/50 flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Chassis Number *
            </label>
            <input
              type="text"
              required
              value={chassisNo}
              onChange={(e) => setChassisNo(e.target.value)}
              placeholder="e.g. ME4EVSHOWROOM00001"
              disabled={transferMutation.isPending}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-mono uppercase"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Source Location (From) *
              </label>
              <input
                type="text"
                required
                value={fromLocation}
                onChange={(e) => setFromLocation(e.target.value)}
                placeholder="e.g. MAIN_SHOWROOM"
                disabled={transferMutation.isPending}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Destination (To) *
              </label>
              <input
                type="text"
                required
                value={toLocation}
                onChange={(e) => setToLocation(e.target.value)}
                placeholder="e.g. SERVICE_BAY_1"
                disabled={transferMutation.isPending}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Transfer Reason & Remarks
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Customer delivery staging or test ride allocation..."
              disabled={transferMutation.isPending}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={transferMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={transferMutation.isPending}
              disabled={transferMutation.isPending}
              className="flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm Transfer
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
