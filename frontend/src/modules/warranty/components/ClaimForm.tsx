import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { ComponentSwapRequest } from '../api/warrantyApi'

const claimSchema = z.object({
  job_card_id: z.number().min(1, 'Job card ID is required'),
  chassis_no: z.string().min(1, 'Chassis number is required'),
  component_type: z.enum(['battery', 'motor', 'controller', 'charger', 'convertor']),
  old_serial_no: z.string().min(1, 'Old serial number is required'),
  new_serial_no: z.string().min(1, 'New serial number is required'),
  remarks: z.string().optional(),
})

type ClaimFormData = z.infer<typeof claimSchema>

interface ClaimFormProps {
  onSubmit: (data: ComponentSwapRequest) => void
  onClose: () => void
  isLoading?: boolean
}

export default function ClaimForm({ onSubmit, onClose, isLoading }: ClaimFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClaimFormData>({
    resolver: zodResolver(claimSchema),
    defaultValues: { component_type: 'battery' }
  })

  const onFormSubmit = (data: ClaimFormData) => {
    onSubmit(data)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Warranty Swap / Claim Registration</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Job Card ID *</label>
              <input
                type="number"
                {...register('job_card_id', { valueAsNumber: true })}
                className="input"
                placeholder="Linked Job Card"
              />
              {errors.job_card_id && <p className="mt-1 text-sm text-red-600">{errors.job_card_id.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chassis Number *</label>
              <input {...register('chassis_no')} className="input" placeholder="Vehicle Chassis No" />
              {errors.chassis_no && <p className="mt-1 text-sm text-red-600">{errors.chassis_no.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Component Type *</label>
            <select {...register('component_type')} className="input">
              <option value="battery">Battery</option>
              <option value="motor">Motor</option>
              <option value="controller">Controller</option>
              <option value="charger">Charger</option>
              <option value="convertor">Convertor</option>
            </select>
            {errors.component_type && <p className="mt-1 text-sm text-red-600">{errors.component_type.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Old Serial Number *</label>
              <input {...register('old_serial_no')} className="input" placeholder="Defective Serial No" />
              {errors.old_serial_no && <p className="mt-1 text-sm text-red-600">{errors.old_serial_no.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Serial Number *</label>
              <input {...register('new_serial_no')} className="input" placeholder="Replacement Serial No" />
              {errors.new_serial_no && <p className="mt-1 text-sm text-red-600">{errors.new_serial_no.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
            <textarea {...register('remarks')} className="input" rows={3} placeholder="Describe the defect and swap context" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn btn-primary">
              {isLoading ? 'Processing...' : 'Execute Swap & Create Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
