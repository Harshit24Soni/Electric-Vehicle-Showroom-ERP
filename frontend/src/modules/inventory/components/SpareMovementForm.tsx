import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { SpareMovementCreate } from '../api/inventoryApi'

const movementSchema = z.object({
  spare_id: z.number().min(1, 'Spare part is required'),
  quantity: z.number().min(1, 'Quantity must be positive'),
  movement_type: z.enum(['PURCHASE', 'SALE', 'SERVICE_PAID', 'SERVICE_INSURANCE', 'ADJUSTMENT']),
  serial_id: z.number().optional(),
  reference_type: z.string().optional(),
  reference_id: z.number().optional(),
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
    formState: { errors },
  } = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
  })

  const onFormSubmit = (data: MovementFormData) => {
    onSubmit({
      spare_id: data.spare_id,
      quantity: data.quantity,
      movement_type: data.movement_type,
      serial_id: data.serial_id,
      reference_type: data.reference_type,
      reference_id: data.reference_id,
      remarks: data.remarks,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Record Spare Movement</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Spare Part ID *</label>
            <input
              type="number"
              {...register('spare_id', { valueAsNumber: true })}
              className="input"
              placeholder="Enter spare part ID"
            />
            {errors.spare_id && <p className="mt-1 text-sm text-red-600">{errors.spare_id.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
            <input
              type="number"
              {...register('quantity', { valueAsNumber: true })}
              className="input"
              placeholder="Enter quantity"
            />
            {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Movement Type *</label>
            <select {...register('movement_type')} className="input">
              <option value="PURCHASE">Purchase</option>
              <option value="SALE">Sale</option>
              <option value="SERVICE_PAID">Service (Paid)</option>
              <option value="SERVICE_INSURANCE">Service (Insurance)</option>
              <option value="ADJUSTMENT">Adjustment</option>
            </select>
            {errors.movement_type && (
              <p className="mt-1 text-sm text-red-600">{errors.movement_type.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Serial ID (Optional)</label>
            <input
              type="number"
              {...register('serial_id', { valueAsNumber: true, setValueAs: (v) => v === '' ? undefined : Number(v) })}
              className="input"
              placeholder="Enter serial ID if applicable"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reference Type (Optional)</label>
            <input {...register('reference_type')} className="input" placeholder="e.g., INVOICE, JOB_CARD" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reference ID (Optional)</label>
            <input
              type="number"
              {...register('reference_id', { valueAsNumber: true, setValueAs: (v) => v === '' ? undefined : Number(v) })}
              className="input"
              placeholder="Enter reference ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
            <textarea {...register('remarks')} className="input" rows={3} placeholder="Optional remarks" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn btn-primary">
              {isLoading ? 'Recording...' : 'Record Movement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
