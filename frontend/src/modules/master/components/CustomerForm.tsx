import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { Customer, CustomerCreate } from '../api/masterApi'

const customerSchema = z.object({
  customer_type: z.enum(['INDIVIDUAL', 'BUSINESS']),
  name: z.string().min(1, 'Name is required'),
  guardian_name: z.string().optional(),
  primary_phone: z.string().min(10, 'Phone number is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  aadhaar_no: z.string().length(12, 'Aadhaar must be 12 digits').optional().or(z.literal('')),
  pan_no: z.string().length(10, 'PAN must be 10 characters').optional().or(z.literal('')),
  gstin: z.string().length(15, 'GSTIN must be 15 characters').optional().or(z.literal('')),
})

type CustomerFormData = z.infer<typeof customerSchema>

interface CustomerFormProps {
  customer?: Customer | null
  onSubmit: (data: CustomerCreate) => void
  onClose: () => void
  isLoading?: boolean
}

export default function CustomerForm({ customer, onSubmit, onClose, isLoading }: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer
      ? {
          customer_type: customer.customer_type,
          name: customer.name,
          guardian_name: customer.guardian_name || '',
          primary_phone: customer.primary_phone,
          email: customer.email || '',
          address_line1: customer.address_line1 || '',
          address_line2: customer.address_line2 || '',
          city: customer.city || '',
          state: customer.state || '',
          pincode: customer.pincode || '',
          aadhaar_no: customer.aadhaar_no || '',
          pan_no: customer.pan_no || '',
          gstin: customer.gstin || '',
        }
      : {
          customer_type: 'INDIVIDUAL',
        },
  })

  useEffect(() => {
    if (customer) {
      reset({
        customer_type: customer.customer_type,
        name: customer.name,
        guardian_name: customer.guardian_name || '',
        primary_phone: customer.primary_phone,
        email: customer.email || '',
        address_line1: customer.address_line1 || '',
        address_line2: customer.address_line2 || '',
        city: customer.city || '',
        state: customer.state || '',
        pincode: customer.pincode || '',
        aadhaar_no: customer.aadhaar_no || '',
        pan_no: customer.pan_no || '',
        gstin: customer.gstin || '',
      })
    }
  }, [customer, reset])

  const onFormSubmit = (data: CustomerFormData) => {
    const submitData: CustomerCreate = {
      ...data,
      guardian_name: data.guardian_name || undefined,
      email: data.email || undefined,
      address_line1: data.address_line1 || undefined,
      address_line2: data.address_line2 || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
      pincode: data.pincode || undefined,
      aadhaar_no: data.aadhaar_no || undefined,
      pan_no: data.pan_no || undefined,
      gstin: data.gstin || undefined,
    }
    onSubmit(submitData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{customer ? 'View Customer' : 'Add New Customer'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer Type *</label>
              <select {...register('customer_type')} className="input" disabled={!!customer}>
                <option value="INDIVIDUAL">Individual</option>
                <option value="BUSINESS">Business</option>
              </select>
              {errors.customer_type && (
                <p className="mt-1 text-sm text-red-600">{errors.customer_type.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
              <input {...register('name')} className="input" disabled={!!customer} />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Guardian Name</label>
              <input {...register('guardian_name')} className="input" disabled={!!customer} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Primary Phone *</label>
              <input {...register('primary_phone')} className="input" disabled={!!customer} />
              {errors.primary_phone && (
                <p className="mt-1 text-sm text-red-600">{errors.primary_phone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input type="email" {...register('email')} className="input" disabled={!!customer} />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Aadhaar No</label>
              <input {...register('aadhaar_no')} className="input" maxLength={12} disabled={!!customer} />
              {errors.aadhaar_no && (
                <p className="mt-1 text-sm text-red-600">{errors.aadhaar_no.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">PAN No</label>
              <input {...register('pan_no')} className="input" maxLength={10} disabled={!!customer} />
              {errors.pan_no && <p className="mt-1 text-sm text-red-600">{errors.pan_no.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">GSTIN</label>
              <input {...register('gstin')} className="input" maxLength={15} disabled={!!customer} />
              {errors.gstin && <p className="mt-1 text-sm text-red-600">{errors.gstin.message}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1</label>
              <input {...register('address_line1')} className="input" disabled={!!customer} />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
              <input {...register('address_line2')} className="input" disabled={!!customer} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
              <input {...register('city')} className="input" disabled={!!customer} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
              <input {...register('state')} className="input" disabled={!!customer} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
              <input {...register('pincode')} className="input" disabled={!!customer} />
            </div>
          </div>

          {!customer && (
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={isLoading} className="btn btn-primary">
                {isLoading ? 'Creating...' : 'Create Customer'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
