import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { PolicyCreate } from '../api/insuranceApi'
import { useQuery } from '@tanstack/react-query'
import { insuranceApi } from '../api/insuranceApi'
import { salesApi } from '../../sales/api/salesApi'

const policySchema = z.object({
  vehicle_sale_id: z.number().min(1, 'Vehicle sale is required'),
  chassis_no: z.string().min(1, 'Chassis number is required'),
  insurance_company_id: z.number().min(1, 'Insurance company is required'),
  policy_number: z.string().min(1, 'Policy number is required'),
  policy_start_date: z.string().min(1, 'Start date is required'),
  policy_end_date: z.string().min(1, 'End date is required'),
  premium_amount: z.number().optional(),
}).refine((data) => new Date(data.policy_end_date) > new Date(data.policy_start_date), {
  message: 'End date must be after start date',
  path: ['policy_end_date'],
})

type PolicyFormData = z.infer<typeof policySchema>

interface PolicyFormProps {
  onSubmit: (data: PolicyCreate) => void
  onClose: () => void
  isLoading?: boolean
}

export default function PolicyForm({ onSubmit, onClose, isLoading }: PolicyFormProps) {
  const { data: companies = [] } = useQuery({
    queryKey: ['insurance-companies'],
    queryFn: insuranceApi.getCompanies,
  })

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => salesApi.getSales(),
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<PolicyFormData>({
    resolver: zodResolver(policySchema),
  })

  const selectedSale = watch('vehicle_sale_id')
  const sale = sales.find((s) => s.sale_id === selectedSale)

  const onFormSubmit = (data: PolicyFormData) => {
    onSubmit({
      vehicle_sale_id: data.vehicle_sale_id,
      chassis_no: data.chassis_no,
      insurance_company_id: data.insurance_company_id,
      policy_number: data.policy_number,
      policy_start_date: data.policy_start_date,
      policy_end_date: data.policy_end_date,
      premium_amount: data.premium_amount,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Create Insurance Policy</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Sale *</label>
            <select {...register('vehicle_sale_id', { valueAsNumber: true })} className="input">
              <option value="">Select a sale</option>
              {sales.map((sale) => (
                <option key={sale.sale_id} value={sale.sale_id}>
                  Sale #{sale.sale_id} - {sale.chassis_no}
                </option>
              ))}
            </select>
            {errors.vehicle_sale_id && (
              <p className="mt-1 text-sm text-red-600">{errors.vehicle_sale_id.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chassis Number *</label>
            <input
              {...register('chassis_no')}
              className="input"
              placeholder="Enter chassis number"
              defaultValue={sale?.chassis_no}
            />
            {errors.chassis_no && <p className="mt-1 text-sm text-red-600">{errors.chassis_no.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Insurance Company *</label>
            <select {...register('insurance_company_id', { valueAsNumber: true })} className="input">
              <option value="">Select insurance company</option>
              {companies.map((company) => (
                <option key={company.insurance_company_id} value={company.insurance_company_id}>
                  {company.company_name}
                </option>
              ))}
            </select>
            {errors.insurance_company_id && (
              <p className="mt-1 text-sm text-red-600">{errors.insurance_company_id.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Policy Number *</label>
            <input {...register('policy_number')} className="input" placeholder="Enter policy number" />
            {errors.policy_number && (
              <p className="mt-1 text-sm text-red-600">{errors.policy_number.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
              <input type="date" {...register('policy_start_date')} className="input" />
              {errors.policy_start_date && (
                <p className="mt-1 text-sm text-red-600">{errors.policy_start_date.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
              <input type="date" {...register('policy_end_date')} className="input" />
              {errors.policy_end_date && (
                <p className="mt-1 text-sm text-red-600">{errors.policy_end_date.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Premium Amount</label>
            <input
              type="number"
              step="0.01"
              {...register('premium_amount', { valueAsNumber: true, setValueAs: (v) => v === '' ? undefined : Number(v) })}
              className="input"
              placeholder="Enter premium amount"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn btn-primary">
              {isLoading ? 'Creating...' : 'Create Policy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
