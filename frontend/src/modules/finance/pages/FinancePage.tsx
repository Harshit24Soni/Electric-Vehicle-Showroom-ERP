import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { financeApi, FinanceCreate } from '../api/financeApi'
import { DollarSign, X, Trash2, Search } from 'lucide-react'
import { salesApi } from '@/modules/sales/api/salesApi'
import { formatDate, formatCurrency } from '@/lib/utils'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'

export default function FinancePage() {
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const queryClient = useQueryClient()

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => salesApi.getSales(),
  })

  // Backend doesn't have list endpoint yet, but let's assume it might or just use sales with finance
  const { data: financeRecords = [], isLoading } = useQuery({
    queryKey: ['finance-records'],
    queryFn: () => financeApi.getFinances ? financeApi.getFinances() : Promise.resolve([]),
  })

  const createMutation = useMutation({
    mutationFn: (data: FinanceCreate) => financeApi.createFinance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-records'] })
      setShowForm(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, hardDelete }: { id: number; hardDelete?: boolean }) =>
      financeApi.deleteFinance(id, hardDelete),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-records'] })
      setDeleteTarget(null)
    },
  })

  const handleDeleteConfirm = (hardDelete: boolean) => {
    if (deleteTarget) {
      deleteMutation.mutate({ id: deleteTarget.finance_id, hardDelete })
    }
  }

  const filteredRecords = financeRecords.filter((r: any) =>
    r.bank_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.sale_id.toString().includes(searchTerm)
  )

  const handleSubmit = (data: FinanceCreate) => {
    createMutation.mutate(data)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finance</h1>
          <p className="text-gray-600 mt-1">Manage vehicle financing</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Create Finance Record
        </button>
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by bank or sale ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading finance records...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Finance Records</h2>
            <p className="text-gray-600 mb-6">Create finance records for vehicle sales.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Sale ID</th>
                  <th>Financer</th>
                  <th>Loan Amount</th>
                  <th>Down Payment</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r: any) => (
                  <tr key={r.finance_id}>
                    <td>#{r.finance_id}</td>
                    <td className="font-medium">Sale #{r.sale_id}</td>
                    <td>{r.financer_name}</td>
                    <td className="font-semibold text-primary-700">{formatCurrency(r.loan_amount)}</td>
                    <td>{formatCurrency(r.down_payment)}</td>
                    <td>{formatDate(r.created_at)}</td>
                    <td>
                      <button
                        onClick={() => setDeleteTarget(r)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <FinanceForm
          sales={sales}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
          isLoading={createMutation.isPending}
        />
      )}

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        itemName={deleteTarget ? `Finance record for Sale #${deleteTarget.sale_id}` : ''}
        isPending={deleteMutation.isPending}
      />
    </div>
  )
}

interface FinanceFormProps {
  sales: any[]
  onSubmit: (data: FinanceCreate) => void
  onClose: () => void
  isLoading?: boolean
}

function FinanceForm({ sales, onSubmit, onClose, isLoading }: FinanceFormProps) {
  const financeSchema = z.object({
    sale_id: z.number().min(1, 'Sale is required'),
    financer_name: z.string().min(1, 'Financer name is required'),
    financer_contact: z.string().optional(),
    loan_amount: z.number().min(0, 'Loan amount must be positive'),
    down_payment: z.number().min(0, 'Down payment must be positive'),
    remarks: z.string().optional(),
  })

  type FinanceFormData = z.infer<typeof financeSchema>

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FinanceFormData>({
    resolver: zodResolver(financeSchema),
  })

  const onFormSubmit = (data: FinanceFormData) => {
    onSubmit(data)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Create Finance Record</h2>
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
                  Sale #{sale.sale_id} - {sale.chassis_no}
                </option>
              ))}
            </select>
            {errors.sale_id && <p className="mt-1 text-sm text-red-600">{String(errors.sale_id.message)}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Financer Name *</label>
            <input {...register('financer_name')} className="input" placeholder="Enter financer name" />
            {errors.financer_name && (
              <p className="mt-1 text-sm text-red-600">{String(errors.financer_name.message)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Financer Contact</label>
            <input {...register('financer_contact')} className="input" placeholder="Enter contact number" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Loan Amount *</label>
              <input
                type="number"
                step="0.01"
                {...register('loan_amount', { valueAsNumber: true })}
                className="input"
                placeholder="Enter loan amount"
              />
              {errors.loan_amount && (
                <p className="mt-1 text-sm text-red-600">{String(errors.loan_amount.message)}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Down Payment *</label>
              <input
                type="number"
                step="0.01"
                {...register('down_payment', { valueAsNumber: true })}
                className="input"
                placeholder="Enter down payment"
              />
              {errors.down_payment && (
                <p className="mt-1 text-sm text-red-600">{String(errors.down_payment.message)}</p>
              )}
            </div>
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
              {isLoading ? 'Creating...' : 'Create Finance Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
