import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { financeApi, FinanceCreate, FinanceResponse, FinanceStatusUpdate } from '../api/financeApi'
import { DollarSign, X, Trash2, Search, Edit3 } from 'lucide-react'
import { salesApi } from '@/modules/sales/api/salesApi'
import { formatDate, formatCurrency } from '@/lib/utils'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'

export default function FinancePage() {
  const [showForm, setShowForm] = useState(false)
  const [updatingRecord, setUpdatingRecord] = useState<FinanceResponse | null>(null)
  const [statusFormData, setStatusFormData] = useState<FinanceStatusUpdate>({ finance_status: 'APPROVED', reference_number: '', remarks: '' })
  const [deleteTarget, setDeleteTarget] = useState<FinanceResponse | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const queryClient = useQueryClient()

  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => salesApi.getSales(),
  })

  const { data: financeRecords = [], isLoading } = useQuery({
    queryKey: ['finance-records'],
    queryFn: () => financeApi.getFinances(),
  })

  const createMutation = useMutation({
    mutationFn: (data: FinanceCreate) => financeApi.createFinance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-records'] })
      setShowForm(false)
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: FinanceStatusUpdate }) =>
      financeApi.updateFinanceStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-records'] })
      setUpdatingRecord(null)
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

  const recordList: FinanceResponse[] = Array.isArray(financeRecords) ? financeRecords : []

  const filteredRecords = recordList.filter((r) => {
    const financer = r.financer_name || ''
    const matchesSearch =
      financer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(r.sale_id).includes(searchTerm) ||
      (r.reference_number || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || r.finance_status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleSubmit = (data: FinanceCreate) => {
    createMutation.mutate(data)
  }

  const openStatusModal = (rec: FinanceResponse) => {
    setUpdatingRecord(rec)
    setStatusFormData({
      finance_status: rec.finance_status || 'APPROVED',
      reference_number: rec.reference_number || '',
      remarks: '',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vehicle Finance</h1>
          <p className="text-gray-600 mt-1">Manage loan applications, approvals, and financer integrations</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Create Finance Application
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by financer, loan ref, or sale ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input sm:w-48"
        >
          <option value="">All Statuses</option>
          <option value="APPLIED">Applied</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="DISBURSED">Disbursed</option>
        </select>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading finance records...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Finance Records</h2>
            <p className="text-gray-600 mb-6">Create finance records for vehicle sales requiring financing.</p>
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
                  <th>Status</th>
                  <th>Loan Ref No</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r: FinanceResponse) => (
                  <tr key={r.finance_id}>
                    <td>#{r.finance_id}</td>
                    <td className="font-medium text-primary-700">Sale #{r.sale_id}</td>
                    <td>{r.financer_name}</td>
                    <td className="font-semibold text-gray-900">{formatCurrency(r.loan_amount)}</td>
                    <td>{formatCurrency(r.down_payment)}</td>
                    <td>
                      <span
                        className={`px-2 py-1 text-xs rounded-full font-medium ${
                          r.finance_status === 'APPROVED' || r.finance_status === 'DISBURSED'
                            ? 'bg-green-100 text-green-800'
                            : r.finance_status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {r.finance_status || 'APPLIED'}
                      </span>
                    </td>
                    <td className="text-sm text-gray-600">{r.reference_number || '-'}</td>
                    <td>{r.created_at ? formatDate(r.created_at) : '-'}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openStatusModal(r)}
                          className="p-1.5 text-primary-600 hover:bg-primary-50 rounded"
                          title="Update Approval Status"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(r)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Status Transition Modal */}
      {updatingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-semibold">Update Status for Finance #{updatingRecord.finance_id}</h2>
              <button onClick={() => setUpdatingRecord(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                <select
                  value={statusFormData.finance_status}
                  onChange={(e) => setStatusFormData({ ...statusFormData, finance_status: e.target.value })}
                  className="input"
                >
                  <option value="APPLIED">Applied</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="DISBURSED">Disbursed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Reference / Approval No</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC-LN-88992"
                  value={statusFormData.reference_number || ''}
                  onChange={(e) => setStatusFormData({ ...statusFormData, reference_number: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="Underwriter remarks"
                  value={statusFormData.remarks || ''}
                  onChange={(e) => setStatusFormData({ ...statusFormData, remarks: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => setUpdatingRecord(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={() =>
                  updateStatusMutation.mutate({
                    id: updatingRecord.finance_id,
                    data: statusFormData,
                  })
                }
                disabled={updateStatusMutation.isPending}
                className="btn btn-primary"
              >
                {updateStatusMutation.isPending ? 'Updating...' : 'Save Status'}
              </button>
            </div>
          </div>
        </div>
      )}

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
            <input {...register('financer_name')} className="input" placeholder="e.g. HDFC Bank, Bajaj Finserv" />
            {errors.financer_name && (
              <p className="mt-1 text-sm text-red-600">{String(errors.financer_name.message)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Financer Contact</label>
            <input {...register('financer_contact')} className="input" placeholder="Contact person or phone" />
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
