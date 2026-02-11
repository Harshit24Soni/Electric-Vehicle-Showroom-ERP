import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { VehicleSaleCreate } from '../api/salesApi'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/api'

const saleSchema = z.object({
  lead_id: z.number().min(1, 'Lead is required'),
  chassis_no: z.string().min(1, 'Chassis number is required'),
  booking_amount: z.number().min(0, 'Booking amount must be positive'),
  remarks: z.string().optional(),
})

type SaleFormData = z.infer<typeof saleSchema>

interface SaleFormProps {
  onSubmit: (data: VehicleSaleCreate) => void
  onClose: () => void
  isLoading?: boolean
}

export default function SaleForm({ onSubmit, onClose, isLoading }: SaleFormProps) {
  const { data: leads = [] } = useQuery<any[]>({
    queryKey: ['leads'],
    queryFn: () => api.get<any[]>('/crm/leads'),
  })

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles-available'],
    queryFn: async () => {
      // Get available vehicles - this would need a proper endpoint
      return []
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema),
  })

  const selectedLead = watch('lead_id')
  const lead = leads.find((l: any) => l.lead_id === selectedLead)

  const onFormSubmit = (data: SaleFormData) => {
    const selectedLeadData = leads.find((l: any) => l.lead_id === data.lead_id)
    onSubmit({
      lead_id: data.lead_id,
      customer_id: selectedLeadData?.customer_id || 0,
      chassis_no: data.chassis_no,
      sale_date: new Date().toISOString().split('T')[0],
      total_amount: data.booking_amount,
      booking_amount: data.booking_amount,
      remarks: data.remarks,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Create New Sale</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lead *</label>
            <select {...register('lead_id', { valueAsNumber: true })} className="input">
              <option value="">Select a lead</option>
              {leads.map((lead: any) => (
                <option key={lead.lead_id} value={lead.lead_id}>
                  Lead #{lead.lead_id} - Customer #{lead.customer_id} - {lead.lead_status}
                </option>
              ))}
            </select>
            {errors.lead_id && <p className="mt-1 text-sm text-red-600">{errors.lead_id.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chassis Number *</label>
            <input {...register('chassis_no')} className="input" placeholder="Enter chassis number" />
            {errors.chassis_no && <p className="mt-1 text-sm text-red-600">{errors.chassis_no.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Booking Amount *</label>
            <input
              type="number"
              step="0.01"
              {...register('booking_amount', { valueAsNumber: true })}
              className="input"
              placeholder="Enter booking amount"
            />
            {errors.booking_amount && (
              <p className="mt-1 text-sm text-red-600">{errors.booking_amount.message}</p>
            )}
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
              {isLoading ? 'Creating...' : 'Create Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
