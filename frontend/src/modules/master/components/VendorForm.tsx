import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { Vendor, VendorCreate } from '../api/masterApi'

const vendorSchema = z.object({
  vendor_name: z.string().min(1, 'Vendor name is required'),
  vendor_type: z.enum(['OEM', 'DEALER', 'LOCAL']),
  gstin: z.string().length(15, 'GSTIN must be 15 characters').optional().or(z.literal('')),
  pan_no: z.string().length(10, 'PAN must be 10 characters').optional().or(z.literal('')),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
})

type VendorFormData = z.infer<typeof vendorSchema>

interface VendorFormProps {
  vendor?: Vendor | null
  onSubmit: (data: VendorCreate) => void
  onClose: () => void
  isLoading?: boolean
}

export default function VendorForm({ vendor, onSubmit, onClose, isLoading }: VendorFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: vendor
      ? {
          vendor_name: vendor.vendor_name,
          vendor_type: vendor.vendor_type,
          gstin: vendor.gstin || '',
          pan_no: vendor.pan_no || '',
          address_line1: vendor.address_line1 || '',
          address_line2: vendor.address_line2 || '',
          city: vendor.city || '',
          state: vendor.state || '',
          pincode: vendor.pincode || '',
        }
      : {
          vendor_type: 'LOCAL',
        },
  })

  useEffect(() => {
    if (vendor) {
      reset({
        vendor_name: vendor.vendor_name,
        vendor_type: vendor.vendor_type,
        gstin: vendor.gstin || '',
        pan_no: vendor.pan_no || '',
        address_line1: vendor.address_line1 || '',
        address_line2: vendor.address_line2 || '',
        city: vendor.city || '',
        state: vendor.state || '',
        pincode: vendor.pincode || '',
      })
    }
  }, [vendor, reset])

  const onFormSubmit = (data: VendorFormData) => {
    onSubmit({
      vendor_name: data.vendor_name,
      vendor_type: data.vendor_type,
      gstin: data.gstin || undefined,
      pan_no: data.pan_no || undefined,
      address_line1: data.address_line1 || undefined,
      address_line2: data.address_line2 || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
      pincode: data.pincode || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{vendor ? 'View Vendor' : 'Add Vendor'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Name *</label>
              <input {...register('vendor_name')} className="input" disabled={!!vendor} />
              {errors.vendor_name && (
                <p className="mt-1 text-sm text-red-600">{errors.vendor_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Type *</label>
              <select {...register('vendor_type')} className="input" disabled={!!vendor}>
                <option value="OEM">OEM</option>
                <option value="DEALER">Dealer</option>
                <option value="LOCAL">Local</option>
              </select>
              {errors.vendor_type && (
                <p className="mt-1 text-sm text-red-600">{errors.vendor_type.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">GSTIN</label>
              <input {...register('gstin')} className="input" maxLength={15} disabled={!!vendor} />
              {errors.gstin && <p className="mt-1 text-sm text-red-600">{errors.gstin.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">PAN No</label>
              <input {...register('pan_no')} className="input" maxLength={10} disabled={!!vendor} />
              {errors.pan_no && <p className="mt-1 text-sm text-red-600">{errors.pan_no.message}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1</label>
              <input {...register('address_line1')} className="input" disabled={!!vendor} />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
              <input {...register('address_line2')} className="input" disabled={!!vendor} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
              <input {...register('city')} className="input" disabled={!!vendor} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
              <input {...register('state')} className="input" disabled={!!vendor} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pincode</label>
              <input {...register('pincode')} className="input" disabled={!!vendor} />
            </div>
          </div>

          {!vendor && (
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={isLoading} className="btn btn-primary">
                {isLoading ? 'Creating...' : 'Create Vendor'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
