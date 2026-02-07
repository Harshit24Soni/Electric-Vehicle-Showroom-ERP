import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { InvoiceCreate } from '../api/billingApi'
import { useQuery } from '@tanstack/react-query'
import { salesApi } from '../../sales/api/salesApi'

const invoiceSchema = z.object({
  sale_id: z.number().min(1, 'Sale is required'),
  taxable_amount: z.number().min(0, 'Taxable amount must be positive'),
  gst_rate: z.number().min(0).max(100, 'GST rate must be between 0 and 100'),
  remarks: z.string().optional(),
})

type InvoiceFormData = z.infer<typeof invoiceSchema>

interface InvoiceFormProps {
  onSubmit: (data: InvoiceCreate) => void
  onClose: () => void
  isLoading?: boolean
}

export default function InvoiceForm({ onSubmit, onClose, isLoading }: InvoiceFormProps) {
  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => salesApi.getSales(),
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
  })

  const taxableAmount = watch('taxable_amount', 0)
  const gstRate = watch('gst_rate', 0)
  const gstAmount = (taxableAmount * gstRate) / 100
  const totalAmount = taxableAmount + gstAmount

  const onFormSubmit = (data: InvoiceFormData) => {
    onSubmit({
      sale_id: data.sale_id,
      taxable_amount: data.taxable_amount,
      gst_rate: data.gst_rate,
      remarks: data.remarks,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Create Invoice</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sale *</label>
            <select {...register('sale_id', { valueAsNumber: true })} className="input">
              <option value="">Select a sale</option>
              {sales.map((sale) => (
                <option key={sale.sale_id} value={sale.sale_id}>
                  Sale #{sale.sale_id} - {sale.chassis_no} - {sale.sale_status}
                </option>
              ))}
            </select>
            {errors.sale_id && <p className="mt-1 text-sm text-red-600">{errors.sale_id.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Taxable Amount *</label>
            <input
              type="number"
              step="0.01"
              {...register('taxable_amount', { valueAsNumber: true })}
              className="input"
              placeholder="Enter taxable amount"
            />
            {errors.taxable_amount && (
              <p className="mt-1 text-sm text-red-600">{errors.taxable_amount.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">GST Rate (%) *</label>
            <input
              type="number"
              step="0.01"
              {...register('gst_rate', { valueAsNumber: true })}
              className="input"
              placeholder="Enter GST rate"
            />
            {errors.gst_rate && <p className="mt-1 text-sm text-red-600">{errors.gst_rate.message}</p>}
          </div>

          {(taxableAmount > 0 || gstRate > 0) && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Taxable Amount:</span>
                <span className="font-medium">₹{taxableAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">GST ({gstRate}%):</span>
                <span className="font-medium">₹{gstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-sm font-semibold text-gray-900">Total Amount:</span>
                <span className="font-bold text-lg">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
            <textarea {...register('remarks')} className="input" rows={3} placeholder="Optional remarks" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn btn-primary">
              {isLoading ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
