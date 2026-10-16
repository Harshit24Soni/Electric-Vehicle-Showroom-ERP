import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, ArrowLeftRight, CheckCircle2 } from 'lucide-react'
import { SpareMovementCreate } from '../api/inventoryApi'
import { Button } from '@/components/ui/Button'

const movementSchema = z.object({
  spare_id: z.coerce.number().min(1, 'Spare part ID is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1 unit'),
  movement_type: z.enum([
    'PURCHASE',
    'SALE',
    'SERVICE_CONSUMPTION',
    'WARRANTY_INWARD',
    'WARRANTY_OUTWARD',
    'ADJUSTMENT',
  ]),
  adjustment_direction: z.enum(['ADD', 'DEDUCT']).optional(),
  serial_id: z.coerce.number().optional().or(z.literal('')),
  reference_type: z.string().optional(),
  reference_id: z.coerce.number().optional().or(z.literal('')),
  remarks: z.string().optional(),
})

type MovementFormData = z.infer<typeof movementSchema>

interface SpareMovementFormProps {
  onSubmit: (data: SpareMovementCreate) => void
  onClose: () => void
  isLoading?: boolean
}

export default function SpareMovementForm({ onSubmit, onClose, isLoading }: SpareMovementFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<MovementFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(movementSchema) as any,
    defaultValues: {
      movement_type: 'ADJUSTMENT',
      adjustment_direction: 'DEDUCT',
    },
  })

  const selectedMovementType = watch('movement_type')

  const onFormSubmit = (data: MovementFormData) => {
    let signedQuantity = Math.abs(Number(data.quantity))
    if (
      data.movement_type === 'SALE' ||
      data.movement_type === 'SERVICE_CONSUMPTION' ||
      data.movement_type === 'WARRANTY_OUTWARD'
    ) {
      signedQuantity = -signedQuantity
    } else if (data.movement_type === 'ADJUSTMENT' && data.adjustment_direction === 'DEDUCT') {
      signedQuantity = -signedQuantity
    }

    onSubmit({
      spare_id: Number(data.spare_id),
      quantity: signedQuantity,
      movement_type: data.movement_type,
      serial_id:
        typeof data.serial_id === 'number' && !isNaN(data.serial_id) && data.serial_id > 0
          ? data.serial_id
          : undefined,
      reference_type: data.reference_type?.trim() || undefined,
      reference_id:
        typeof data.reference_id === 'number' && !isNaN(data.reference_id) && data.reference_id > 0
          ? data.reference_id
          : undefined,
      remarks: data.remarks?.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-200/50 dark:border-primary-800/50">
              <ArrowLeftRight className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                Record Stock Movement
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Log receipts, job card issuances, and physical count adjustments
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Spare Part ID *
              </label>
              <input
                type="number"
                {...register('spare_id')}
                placeholder="e.g. 101"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-mono"
              />
              {errors.spare_id && (
                <p className="mt-1 text-xs text-rose-500">{errors.spare_id.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Quantity *
              </label>
              <input
                type="number"
                min="1"
                {...register('quantity')}
                placeholder="Units count"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-mono"
              />
              {errors.quantity && (
                <p className="mt-1 text-xs text-rose-500">{errors.quantity.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Movement Type *
            </label>
            <select
              {...register('movement_type')}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              <option value="ADJUSTMENT">Adjustment (Cycle Count / Discrepancy)</option>
              <option value="PURCHASE">Purchase (Supplier Inward)</option>
              <option value="SALE">Sale (Direct Counter Sale)</option>
              <option value="SERVICE_CONSUMPTION">Service Consumption (Job Card)</option>
              <option value="WARRANTY_INWARD">Warranty Inward (OEM Replacement)</option>
              <option value="WARRANTY_OUTWARD">Warranty Outward (Defective Claim)</option>
            </select>
            {errors.movement_type && (
              <p className="mt-1 text-xs text-rose-500">{errors.movement_type.message}</p>
            )}
          </div>

          {/* Adjustment Direction for ADJUSTMENT */}
          {selectedMovementType === 'ADJUSTMENT' && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Adjustment Direction *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold cursor-pointer">
                  <input
                    type="radio"
                    value="DEDUCT"
                    {...register('adjustment_direction')}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span>Deduct Stock (- Shrinkage)</span>
                </label>
                <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold cursor-pointer">
                  <input
                    type="radio"
                    value="ADD"
                    {...register('adjustment_direction')}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span>Add Stock (+ Found)</span>
                </label>
              </div>
            </div>
          )}

          {/* Direction indicator helper */}
          {(selectedMovementType === 'SALE' ||
            selectedMovementType === 'SERVICE_CONSUMPTION' ||
            selectedMovementType === 'WARRANTY_OUTWARD') && (
            <div className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/50 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-300">
              Note: This is an outward movement. The quantity will be automatically deducted from inventory.
            </div>
          )}
          {(selectedMovementType === 'PURCHASE' || selectedMovementType === 'WARRANTY_INWARD') && (
            <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/40 text-[11px] text-emerald-800 dark:text-emerald-300">
              Note: This is an inward receipt. The quantity will be added to inventory stock.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Reference Type (Optional)
              </label>
              <input
                type="text"
                {...register('reference_type')}
                placeholder="e.g. INVOICE, JOB_CARD"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Reference ID (Optional)
              </label>
              <input
                type="number"
                {...register('reference_id')}
                placeholder="e.g. 504"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Serial ID (Optional)
            </label>
            <input
              type="number"
              {...register('serial_id')}
              placeholder="Associated serial unit ID if serialized"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Operational Remarks
            </label>
            <textarea
              {...register('remarks')}
              rows={3}
              placeholder="Auditable reason for movement or adjustment..."
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              disabled={isLoading}
              className="flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Commit Movement
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
