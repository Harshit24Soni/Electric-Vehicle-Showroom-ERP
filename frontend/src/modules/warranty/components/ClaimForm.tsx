import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { ClaimCreate } from '../api/warrantyApi'

const claimSchema = z.object({
  job_spare_id: z.number().min(1, 'Job spare ID is required'),
  so_number: z.string().min(1, 'SO number is required'),
  remarks: z.string().optional(),
})

type ClaimFormData = z.infer<typeof claimSchema>

interface ClaimFormProps {
  onSubmit: (data: ClaimCreate) => void
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
  })

  const onFormSubmit = (data: ClaimFormData) => {
    onSubmit({
      job_spare_id: data.job_spare_id,
      so_number: data.so_number,
      remarks: data.remarks,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Create Warranty Claim</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Job Spare ID *</label>
            <input
              type="number"
              {...register('job_spare_id', { valueAsNumber: true })}
              className="input"
              placeholder="Enter job spare ID"
            />
            {errors.job_spare_id && (
              <p className="mt-1 text-sm text-red-600">{errors.job_spare_id.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">SO Number *</label>
            <input {...register('so_number')} className="input" placeholder="Enter SO number" />
            {errors.so_number && <p className="mt-1 text-sm text-red-600">{errors.so_number.message}</p>}
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
              {isLoading ? 'Creating...' : 'Create Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
