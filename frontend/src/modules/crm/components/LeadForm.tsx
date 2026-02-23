import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { LeadCreate } from '../api/leads'
import { useMasterStore } from '@/store/masterStore'
import { useQuery } from '@tanstack/react-query'
import { masterApi } from '../../master/api/masterApi'
import { useAuthStore } from '../../../store/authStore'
import { api } from '@/lib/api'

/**
 * Lead Form - Per Master Plan:
 * - Lead is created when staff registers an enquiry
 * - Lead creator = default owner (auto-assigned)
 * - NO customer required at lead creation
 * - Customer is created only at Lead → Sale conversion
 *
 * RBAC:
 * - STAFF: "Assign To" is hidden; backend auto-assigns to the creator.
 * - ADMIN / DEALER: "Assign To" dropdown is shown so they can assign to another staff member.
 */

const leadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  email: z.string().email().optional().or(z.literal('')),
  vehicle_model_id: z.number().min(1, 'Vehicle model is required'),
  lead_source: z.string().min(1, 'Lead source is required'),
  lead_status_id: z.coerce.number().optional(),
  expected_purchase_date: z.string().optional(),
  remarks: z.string().optional(),
  owner_staff_id: z.coerce.number().optional(),
})

type LeadFormData = z.infer<typeof leadSchema>

interface LeadFormProps {
  onSubmit: (data: LeadCreate) => void
  onClose: () => void
  isLoading?: boolean
}

const LEAD_SOURCES = [
  'Walk-in',
  'Website',
  'Phone Call',
  'Referral',
  'Social Media',
  'Advertisement',
  'Other',
]

export default function LeadForm({ onSubmit, onClose, isLoading }: LeadFormProps) {
  const { user } = useAuthStore()
  const { leadStatuses } = useMasterStore()

  const isAdminOrDealer =
    user?.designation === 'ADMIN' ||
    user?.designation === 'DEALER' ||
    user?.designation === 'Admin' ||
    user?.designation === 'Dealer'

  const { data: models = [] } = useQuery({
    queryKey: ['vehicle-models'],
    queryFn: masterApi.getVehicleModels,
  })

  // Fetch staff list only for Admin/Dealer
  const { data: staffList = [] } = useQuery({
    queryKey: ['admin-staff-list'],
    queryFn: () => api.get<any[]>('/admin/staff'),
    enabled: isAdminOrDealer,
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      lead_status_id: leadStatuses.find((s: any) => s.status_name === 'NEW')?.status_id || 1,
    },
  })

  const onFormSubmit = (data: LeadFormData) => {
    onSubmit({
      name: data.name,
      phone: data.phone,
      email: data.email || undefined,
      vehicle_model_id: data.vehicle_model_id,
      lead_source: data.lead_source,
      lead_status_id: data.lead_status_id,
      // Admin/Dealer: send selected staff; Staff: omit so backend auto-assigns
      owner_staff_id: isAdminOrDealer ? data.owner_staff_id || undefined : undefined,
      expected_purchase_date: data.expected_purchase_date,
      remarks: data.remarks,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Create Lead</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4">
          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input {...register('name')} className="input" placeholder="Customer name" />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input {...register('phone')} className="input" placeholder="10-digit phone" />
              {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" {...register('email')} className="input" placeholder="Optional email" />
          </div>

          {/* Lead Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Model *</label>
              <select {...register('vehicle_model_id', { valueAsNumber: true })} className="input">
                <option value="">Select model</option>
                {models.map((model: any) => (
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Lead Source *</label>
              <select {...register('lead_source')} className="input">
                <option value="">Select source</option>
                {LEAD_SOURCES.map((source) => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
              {errors.lead_source && <p className="mt-1 text-sm text-red-600">{errors.lead_source.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select {...register('lead_status_id', { valueAsNumber: true })} className="input">
                {leadStatuses.map((status: any) => (
                  <option key={status.status_id} value={status.status_id}>
                    {status.status_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Purchase</label>
              <input type="date" {...register('expected_purchase_date')} className="input" />
            </div>
          </div>

          {/* Assign To — Only visible to Admin/Dealer */}
          {isAdminOrDealer && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
              <select {...register('owner_staff_id', { valueAsNumber: true })} className="input">
                <option value="">Auto-assign to me</option>
                {staffList.map((staff: any) => (
                  <option key={staff.staff_id} value={staff.staff_id}>
                    {staff.full_name} ({staff.designation})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
            <textarea {...register('remarks')} className="input" rows={2} placeholder="Optional notes" />
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
