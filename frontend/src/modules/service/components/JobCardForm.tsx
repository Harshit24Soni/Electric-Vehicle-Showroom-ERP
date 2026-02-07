import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { JobCardCreate } from '../api/serviceApi'

const jobCardSchema = z.object({
  chassis_no: z.string().min(1, 'Chassis number is required'),
  is_free_service: z.boolean(),
  remarks: z.string().optional(),
})

type JobCardFormData = z.infer<typeof jobCardSchema>

interface JobCardFormProps {
  onSubmit: (data: JobCardCreate) => void
  onClose: () => void
  isLoading?: boolean
}

export default function JobCardForm({ onSubmit, onClose, isLoading }: JobCardFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JobCardFormData>({
    resolver: zodResolver(jobCardSchema),
    defaultValues: {
      is_free_service: false,
    },
  })

  const onFormSubmit = (data: JobCardFormData) => {
    onSubmit({
      chassis_no: data.chassis_no,
      is_free_service: data.is_free_service,
      remarks: data.remarks,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Create Job Card</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chassis Number *</label>
            <input {...register('chassis_no')} className="input" placeholder="Enter chassis number" />
            {errors.chassis_no && <p className="mt-1 text-sm text-red-600">{errors.chassis_no.message}</p>}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              {...register('is_free_service')}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label className="ml-2 text-sm font-medium text-gray-700">Free Service</label>
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
              {isLoading ? 'Creating...' : 'Create Job Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
