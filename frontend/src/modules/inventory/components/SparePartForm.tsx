import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Save, PackagePlus } from 'lucide-react'
import { SpareMasterCreate } from '../api/inventoryApi'
import { Button } from '@/components/ui/Button'

const spareSchema = z.object({
  spare_name: z.string().min(1, 'Spare part name is required'),
  initial_code: z.string().min(1, 'Authoritative part code is required'),
  category: z.string().optional(),
  tracking_mode: z.enum(['QUANTITY', 'BATCH', 'SERIALIZED']),
  remarks: z.string().optional(),
})

type SpareFormData = z.infer<typeof spareSchema>

interface SparePartFormProps {
  onSubmit: (data: SpareMasterCreate) => void
  onClose: () => void
  isLoading?: boolean
}

export function SparePartForm({ onSubmit, onClose, isLoading }: SparePartFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SpareFormData>({
    resolver: zodResolver(spareSchema),
    defaultValues: {
      tracking_mode: 'QUANTITY',
    },
  })

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-200/50 dark:border-primary-800/50">
              <PackagePlus className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                Register New Spare Part
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Author authoritative SKU code, inventory tracking mode, and category
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

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Part Description / Name *
            </label>
            <input
              type="text"
              {...register('spare_name')}
              placeholder="e.g. Front Disc Brake Pad Set (Gen 2)"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
            {errors.spare_name && (
              <p className="mt-1 text-xs text-rose-500">{errors.spare_name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Authoritative Part Code *
            </label>
            <input
              type="text"
              {...register('initial_code')}
              placeholder="e.g. BRK-001"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 uppercase font-mono"
            />
            {errors.initial_code && (
              <p className="mt-1 text-xs text-rose-500">{errors.initial_code.message}</p>
            )}
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Registered as the active primary code in the parts master catalog.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Category
              </label>
              <input
                type="text"
                {...register('category')}
                placeholder="e.g. Brakes, Battery, Electrical"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Tracking Mode *
              </label>
              <select
                {...register('tracking_mode')}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="QUANTITY">Quantity (Standard Stock)</option>
                <option value="BATCH">Batch (Lot / Consignment)</option>
                <option value="SERIALIZED">Serialized (Individual Unit)</option>
              </select>
              {errors.tracking_mode && (
                <p className="mt-1 text-xs text-rose-500">{errors.tracking_mode.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Technical Remarks / Notes
            </label>
            <textarea
              {...register('remarks')}
              rows={3}
              placeholder="Compatibility notes, dimensions, or specifications..."
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
              <Save className="w-4 h-4" />
              Save Master Record
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
