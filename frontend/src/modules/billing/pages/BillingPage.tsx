import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billingApi, InvoiceCreate, InvoiceResponse, InvoiceUpdate } from '../api/billingApi'
import { Plus, Search, CheckCircle, Trash2, Edit2, X, Receipt } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import InvoiceForm from '../components/InvoiceForm'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'

export default function BillingPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<InvoiceResponse | null>(null)
  const [editFormData, setEditFormData] = useState<InvoiceUpdate>({ taxable_amount: 0, gst_rate: 18, remarks: '' })
  const [deleteTarget, setDeleteTarget] = useState<InvoiceResponse | null>(null)
  const queryClient = useQueryClient()

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => billingApi.getInvoices(),
  })

  const createMutation = useMutation({
    mutationFn: (data: InvoiceCreate) => billingApi.createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setShowForm(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: InvoiceUpdate }) => billingApi.updateInvoice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setEditingInvoice(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, hardDelete }: { id: number; hardDelete?: boolean }) =>
      billingApi.deleteInvoice(id, hardDelete),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setDeleteTarget(null)
    },
  })

  const handleDeleteConfirm = (hardDelete: boolean) => {
    if (deleteTarget) {
      deleteMutation.mutate({ id: deleteTarget.invoice_id, hardDelete })
    }
  }

  const finalizeMutation = useMutation({
    mutationFn: (invoiceId: number) => billingApi.finalizeInvoice(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })

  const invoiceList: InvoiceResponse[] = Array.isArray(invoices) ? invoices : []

  const filteredInvoices = invoiceList.filter((invoice) => {
    const invNum = invoice.invoice_number || `INV-${invoice.invoice_id}`
    const matchesSearch =
      invNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(invoice.sale_id).includes(searchTerm)
    const currentStatus = invoice.is_final ? 'FINALIZED' : 'DRAFT'
    const matchesStatus = !statusFilter || currentStatus === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleFinalize = (invoiceId: number) => {
    if (confirm('Finalize this invoice? It cannot be edited after finalization.')) {
      finalizeMutation.mutate(invoiceId)
    }
  }

  const openEditModal = (inv: InvoiceResponse) => {
    setEditingInvoice(inv)
    setEditFormData({
      taxable_amount: inv.taxable_amount,
      gst_rate: inv.gst_rate,
      remarks: '',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing & Invoices</h1>
          <p className="text-gray-600 mt-1">Manage sales invoices, revisions, and tax finalizations</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Invoice
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by invoice number or sale ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input sm:w-48"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="FINALIZED">Finalized</option>
        </select>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading invoices...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Invoices Found</h2>
            <p className="text-gray-600 mb-6">Create invoices for booked or confirmed sales.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Sale ID</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Taxable Amt</th>
                  <th>GST Rate</th>
                  <th>Total Amount</th>
                  <th>Rev</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => {
                  const isFinal = invoice.is_final
                  return (
                    <tr key={invoice.invoice_id}>
                      <td className="font-medium text-primary-700">{invoice.invoice_number || `#${invoice.invoice_id}`}</td>
                      <td>Sale #{invoice.sale_id}</td>
                      <td>{invoice.invoice_date ? formatDate(invoice.invoice_date) : '-'}</td>
                      <td>
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-medium ${
                            isFinal ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {isFinal ? 'FINALIZED' : 'DRAFT'}
                        </span>
                      </td>
                      <td>{formatCurrency(invoice.taxable_amount)}</td>
                      <td>{invoice.gst_rate}%</td>
                      <td className="font-semibold text-gray-900">{formatCurrency(invoice.total_amount)}</td>
                      <td>v{invoice.revision_no || 1}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          {!isFinal && (
                            <>
                              <button
                                onClick={() => handleFinalize(invoice.invoice_id)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                title="Finalize Invoice (Permanent)"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openEditModal(invoice)}
                                className="p-1.5 text-primary-600 hover:bg-primary-50 rounded"
                                title="Revise Invoice"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setDeleteTarget(invoice)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit / Revision Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-semibold">Revise Invoice {editingInvoice.invoice_number}</h2>
              <button onClick={() => setEditingInvoice(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taxable Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  value={editFormData.taxable_amount}
                  onChange={(e) => setEditFormData({ ...editFormData, taxable_amount: parseFloat(e.target.value) || 0 })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GST Rate (%) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={editFormData.gst_rate}
                  onChange={(e) => setEditFormData({ ...editFormData, gst_rate: parseFloat(e.target.value) || 0 })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Revision Remarks</label>
                <input
                  type="text"
                  placeholder="Reason for revision"
                  value={editFormData.remarks || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => setEditingInvoice(null)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={() => updateMutation.mutate({ id: editingInvoice.invoice_id, data: editFormData })}
                disabled={updateMutation.isPending}
                className="btn btn-primary"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Revision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <InvoiceForm
          onSubmit={(data) => createMutation.mutate(data)}
          onClose={() => setShowForm(false)}
          isLoading={createMutation.isPending}
        />
      )}

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        itemName={deleteTarget ? deleteTarget.invoice_number || `Invoice #${deleteTarget.invoice_id}` : ''}
        isPending={deleteMutation.isPending}
      />
    </div>
  )
}
