import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Save } from 'lucide-react'
import { SpareMasterCreate } from '../api/inventoryApi'

const spareSchema = z.object({
  spare_name: z.string().min(1, 'Spare part name is required'),
  initial_code: z.string().min(1, 'Initial part code is required'),
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
    }
  })

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Add New Spare Part</h2>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Part Name *</label>
            <input
              type="text"
              {...register('spare_name')}
              className="input w-full focus:ring-primary-500"
              placeholder="e.g. Front Brake Pad Set"
            />
            {errors.spare_name && <p className="mt-1 text-sm text-red-500">{errors.spare_name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Part Code *</label>
            <input
              type="text"
              {...register('initial_code')}
              className="input w-full uppercase font-mono"
              placeholder="e.g. BRK-001"
            />
            {errors.initial_code && <p className="mt-1 text-sm text-red-500">{errors.initial_code.message}</p>}
            <p className="mt-1.5 text-xs text-gray-500">This will be registered as the current authoritative code.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
              <input
                type="text"
                {...register('category')}
                className="input w-full"
                placeholder="e.g. Brakes"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tracking Mode *</label>
              <select {...register('tracking_mode')} className="input w-full bg-white">
                <option value="QUANTITY">Quantity (Standard)</option>
                <option value="BATCH">Batch (Lot Tracking)</option>
                <option value="SERIALIZED">Serialized (Individual)</option>
              </select>
              {errors.tracking_mode && (
                <p className="mt-1 text-sm text-red-500">{errors.tracking_mode.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Remarks</label>
            <textarea 
              {...register('remarks')} 
              className="input w-full resize-none" 
              rows={3} 
              placeholder="Optional notes or description" 
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn btn-secondary px-5">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn btn-primary px-5 flex items-center gap-2">
              <Save className="w-4 h-4" />
              {isLoading ? 'Saving...' : 'Save Part'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
