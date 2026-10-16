interface LeadStatusOption {
  status_id: number
  status_name: string
}
interface StaffOption {
  staff_id: number
  full_name: string
  designation: string
}
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, UserPlus } from 'lucide-react'
import { LeadCreate } from '../api/leads'
import { useMasterStore } from '@/store/masterStore'
import { useQuery } from '@tanstack/react-query'
import { masterApi, VehicleModel } from '../../master/api/masterApi'
import { useAuthStore } from '../../../store/authStore'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'

const leadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(10, 'Phone must be at least 10 digits'),
  email: z.string().email().optional().or(z.literal('')),
  vehicle_model_id: z.number().min(1, 'Vehicle model is required'),
  lead_source: z.string().min(1, 'Lead source is required'),
  lead_status_id: z.coerce.number().optional(),
  expected_purchase_date: z.string().optional(),
  remarks: z.string().optional(),
  owner_staff_id: z.coerce.number().optional().or(z.literal('')),
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
    queryFn: () => masterApi.getVehicleModels(),
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
    const cleanOwnerId =
      typeof data.owner_staff_id === 'number' && !isNaN(data.owner_staff_id) && data.owner_staff_id > 0
        ? data.owner_staff_id
        : undefined

    onSubmit({
      name: data.name,
      phone: data.phone,
      email: data.email || undefined,
      vehicle_model_id: data.vehicle_model_id,
      lead_source: data.lead_source,
      lead_status_id: data.lead_status_id,
      owner_staff_id: isAdminOrDealer ? cleanOwnerId : undefined,
      expected_purchase_date: data.expected_purchase_date,
      remarks: data.remarks,
    })
  }

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400">
              <UserPlus className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
                Create New Lead
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Register a new prospective buyer or showroom enquiry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4">
          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Name *
              </label>
              <input
                {...register('name')}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-slate-400"
                placeholder="e.g. Ramesh Kumar"
              />
              {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone Number *
              </label>
              <input
                {...register('phone')}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-slate-400"
                placeholder="10-digit mobile"
              />
              {errors.phone && <p className="mt-1 text-xs text-rose-500">{errors.phone.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Email Address (Optional)
            </label>
            <input
              type="email"
              {...register('email')}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-slate-400"
              placeholder="customer@example.com"
            />
          </div>

          {/* Model and Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Vehicle Model Interest *
              </label>
              <select
                {...register('vehicle_model_id', { valueAsNumber: true })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              >
                <option value="">Select vehicle model</option>
                {models.map((model: VehicleModel) => (
                  <option key={model.vehicle_model_id} value={model.vehicle_model_id}>
                    {model.brand} {model.model_name}
                  </option>
                ))}
              </select>
              {errors.vehicle_model_id && (
                <p className="mt-1 text-xs text-rose-500">{errors.vehicle_model_id.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Lead Source *
              </label>
              <select
                {...register('lead_source')}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              >
                <option value="">Select source</option>
                {LEAD_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
              {errors.lead_source && <p className="mt-1 text-xs text-rose-500">{errors.lead_source.message}</p>}
            </div>
          </div>

          {/* Status & Expected Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Pipeline Status
              </label>
              <select
                {...register('lead_status_id', { valueAsNumber: true })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              >
                {leadStatuses.map((status: LeadStatusOption) => (
                  <option key={status.status_id} value={status.status_id}>
                    {status.status_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Expected Purchase Date
              </label>
              <input
                type="date"
                {...register('expected_purchase_date')}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              />
            </div>
          </div>

          {/* Assign To — Only for Admin/Dealer */}
          {isAdminOrDealer && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Assign Sales Consultant
              </label>
              <select
                {...register('owner_staff_id', { valueAsNumber: true })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              >
                <option value="">-- Auto-assign to Current Staff --</option>
                {staffList.map((staff: StaffOption) => (
                  <option key={staff.staff_id} value={staff.staff_id}>
                    {staff.full_name} ({staff.designation}) — ID #{staff.staff_id}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Initial Notes & Preferences
            </label>
            <textarea
              {...register('remarks')}
              rows={2}
              placeholder="e.g. Inquired about subsidy, preferred color: Nebula Blue..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} isLoading={isLoading} variant="primary">
              Create Lead
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
