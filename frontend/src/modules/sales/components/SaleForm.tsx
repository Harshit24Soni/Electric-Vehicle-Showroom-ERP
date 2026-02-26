import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { VehicleSaleCreate } from '../api/salesApi'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/api'

const saleSchema = z.object({
  is_direct_sale: z.boolean().default(false),
  lead_id: z.number().optional(),
  customer_id: z.number().optional(),
  chassis_no: z.string().min(1, 'Chassis number is required'),
  booking_amount: z.number().min(0, 'Booking amount must be positive'),
  remarks: z.string().optional(),
}).refine(
  (data) => {
    if (data.is_direct_sale) return !!data.customer_id
    return !!data.lead_id
  },
  { message: 'Select a lead or customer', path: ['lead_id'] }
)

type SaleFormData = z.infer<typeof saleSchema>

interface SaleFormProps {
  onSubmit: (data: VehicleSaleCreate) => void
  onClose: () => void
  isLoading?: boolean
}

export default function SaleForm({ onSubmit, onClose, isLoading }: SaleFormProps) {
  const [isDirectSale, setIsDirectSale] = useState(false)

  const { data: leads = [] } = useQuery<any[]>({
    queryKey: ['leads'],
    queryFn: () => api.get<any[]>('/crm/leads'),
  })

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ['customers'],
    queryFn: () => api.get<any[]>('/master/customers'),
  })

  const { data: vehiclesData } = useQuery<any>({
    queryKey: ['vehicles'],
    queryFn: () => api.get<any>('/master/vehicles'),
  })

  const vehicles = Array.isArray(vehiclesData) ? vehiclesData : (vehiclesData?.data || [])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema),
    defaultValues: { is_direct_sale: false },
  })

  const handleDirectSaleToggle = (checked: boolean) => {
    setIsDirectSale(checked)
    setValue('is_direct_sale', checked)
    if (checked) {
      setValue('lead_id', undefined)
    } else {
      setValue('customer_id', undefined)
    }
  }

  const onFormSubmit = (data: SaleFormData) => {
    if (isDirectSale) {
      onSubmit({
        lead_id: null,
        customer_id: data.customer_id!,
        chassis_no: data.chassis_no,
        sale_date: new Date().toISOString().split('T')[0],
        total_amount: data.booking_amount,
        booking_amount: data.booking_amount,
        remarks: data.remarks,
        is_direct_sale: true,
      })
    } else {
      const selectedLead = leads.find((l: any) => l.lead_id === data.lead_id)
      onSubmit({
        lead_id: data.lead_id,
        customer_id: selectedLead?.customer_id || data.customer_id || 0,
        chassis_no: data.chassis_no,
        sale_date: new Date().toISOString().split('T')[0],
        total_amount: data.booking_amount,
        booking_amount: data.booking_amount,
        remarks: data.remarks,
        is_direct_sale: false,
      })
    }
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
          {/* Direct Sale Toggle */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <input
              type="checkbox"
              id="directSale"
              checked={isDirectSale}
              onChange={(e) => handleDirectSaleToggle(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="directSale" className="text-sm font-medium text-blue-800">
              Direct Sale (Walk-in Customer — no lead required)
            </label>
          </div>

          {/* Lead Selection — shown only for non-direct sales */}
          {!isDirectSale && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Lead *</label>
              <select {...register('lead_id', { valueAsNumber: true })} className="input">
                <option value="">Select a lead</option>
                {leads.map((lead: any) => (
                  <option key={lead.lead_id} value={lead.lead_id}>
                    {lead.name} — {lead.phone} — {lead.lead_status || 'WARM'}
                  </option>
                ))}
              </select>
              {errors.lead_id && <p className="mt-1 text-sm text-red-600">{errors.lead_id.message}</p>}
            </div>
          )}

          {/* Customer Selection — shown for direct sales */}
          {isDirectSale && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
              <select {...register('customer_id', { valueAsNumber: true })} className="input">
                <option value="">Select a customer</option>
                {customers.map((c: any) => (
                  <option key={c.customer_id} value={c.customer_id}>
                    {c.name} — {c.primary_phone}
                  </option>
                ))}
              </select>
              {errors.customer_id && <p className="mt-1 text-sm text-red-600">{errors.customer_id.message}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Available Vehicle (Chassis) *</label>
            <select {...register('chassis_no')} className="input">
              <option value="">Select a vehicle</option>
              {vehicles.filter((v: any) => v.current_status === 'IN_STOCK' || v.current_status === 'AVAILABLE').map((v: any) => (
                <option key={v.chassis_no} value={v.chassis_no}>
                  {v.chassis_no} ({v.model?.model_name || 'Vehicle'})
                </option>
              ))}
            </select>
            {errors.chassis_no && <p className="mt-1 text-sm text-red-600">{errors.chassis_no.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Total Amount *</label>
            <input
              type="number"
              step="0.01"
              {...register('booking_amount', { valueAsNumber: true })}
              className="input"
              placeholder="Enter total sale amount"
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
