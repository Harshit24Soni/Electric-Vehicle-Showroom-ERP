import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { LeadCreate } from '../api/leads'
import { useMasterStore } from '@/store/masterStore' // Use store for dropdowns
import { useQuery } from '@tanstack/react-query'
import { masterApi } from '../../master/api/masterApi'
import { useAuthStore } from '../../../store/authStore'
import { api } from '../../../lib/api'

const leadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  customer_id: z.number().optional(),
  vehicle_model_id: z.number().min(1, 'Vehicle model is required'),
  lead_source: z.string().min(1, 'Lead source is required'),
  lead_status_id: z.coerce.number().optional(),
  owner_staff_id: z.number().min(1, 'Owner is required'),
  expected_purchase_date: z.string().optional(),
  remarks: z.string().optional(),
})

type LeadFormData = z.infer<typeof leadSchema>

interface LeadFormProps {
  onSubmit: (data: LeadCreate) => void
  onClose: () => void
  isLoading?: boolean
}

export default function LeadForm({ onSubmit, onClose, isLoading }: LeadFormProps) {
  const { user } = useAuthStore()
  const { leadStatuses, fetchMasterData } = useMasterStore() // Use store
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: masterApi.getCustomers,
  })

  // Ensure master data is loaded
  // fetchMasterData is usually called in parent, but safe to call here too or rely on parent

  const { data: models = [] } = useQuery({
    queryKey: ['vehicle-models'],
    queryFn: masterApi.getVehicleModels,
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      lead_status_id: 1, // Default to 1 (NEW) - ideally find dynamically: leadStatuses.find(s => s.status_name === 'NEW')?.status_id
      owner_staff_id: user?.staff_id || 0,
    },
  })

  const onFormSubmit = (data: LeadFormData) => {
    onSubmit({
      name: data.name,
      phone: data.phone,
      customer_id: data.customer_id,
      vehicle_model_id: data.vehicle_model_id,
      lead_source: data.lead_source,
      lead_status_id: data.lead_status_id,
      owner_staff_id: data.owner_staff_id,
      expected_purchase_date: data.expected_purchase_date,
      remarks: data.remarks,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Create Lead</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
            <select {...register('customer_id', { valueAsNumber: true })} className="input">
              <option value="">Select a customer</option>
              {customers.map((customer) => (
                <option key={customer.customer_id} value={customer.customer_id}>
                  {customer.name} - {customer.primary_phone}
                </option>
              ))}
            </select>
            {errors.customer_id && (
              <p className="mt-1 text-sm text-red-600">{errors.customer_id.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Model *</label>
            <select {...register('vehicle_model_id', { valueAsNumber: true })} className="input">
              <option value="">Select a vehicle model</option>
              {models.map((model) => (
                <option key={model.vehicle_model_id} value={model.vehicle_model_id}>
                  {model.brand} {model.model_name}
                </option>
              ))}
            </select>
            {errors.vehicle_model_id && (
              <p className="mt-1 text-sm text-red-600">{errors.vehicle_model_id.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lead Source *</label>
            <input {...register('lead_source')} className="input" placeholder="e.g., Website, Walk-in, Referral" />
            {errors.lead_source && <p className="mt-1 text-sm text-red-600">{errors.lead_source.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lead Status</label>
            <select
              {...register('lead_status_id', { valueAsNumber: true })}
              className="input"
            >
              <option value="">Select Status</option>
              {leadStatuses.map((status: any) => (
                <option key={status.status_id} value={status.status_id}>
                  {status.status_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Expected Purchase Date</label>
            <input type="date" {...register('expected_purchase_date')} className="input" />
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
              {isLoading ? 'Creating...' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
