import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billingApi, InvoiceCreate } from '../api/billingApi'
import { Plus, Search, CheckCircle, XCircle } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import InvoiceForm from '../components/InvoiceForm'

export default function BillingPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const queryClient = useQueryClient()

  // Note: Backend doesn't have a GET endpoint for listing invoices
  // Invoices are managed through sales - they're created per sale
  const invoices: any[] = []
  const isLoading = false

  const createMutation = useMutation({
    mutationFn: (data: InvoiceCreate) => billingApi.createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setShowForm(false)
    },
  })

  const finalizeMutation = useMutation({
    mutationFn: (invoiceId: number) => billingApi.finalizeInvoice(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || invoice.invoice_status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleFinalize = (invoiceId: number) => {
    if (confirm('Finalize this invoice? It cannot be edited after finalization.')) {
      finalizeMutation.mutate(invoiceId)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing</h1>
          <p className="text-gray-600 mt-1">Manage invoices and billing</p>
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
              placeholder="Search invoices..."
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
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="FINALIZED">Finalized</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading invoices...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No invoices found</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Total Amount</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.invoice_id}>
                    <td className="font-medium">{invoice.invoice_number}</td>
                    <td>{formatDate(invoice.invoice_date)}</td>
                    <td>
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                        {invoice.invoice_type}
                      </span>
                    </td>
                    <td>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        invoice.invoice_status === 'FINALIZED'
                          ? 'bg-green-100 text-green-800'
                          : invoice.invoice_status === 'CANCELLED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {invoice.invoice_status}
                      </span>
                    </td>
                    <td>{formatCurrency(invoice.total_amount)}</td>
                    <td>{formatDate(invoice.created_at)}</td>
                    <td>
                      {invoice.invoice_status === 'DRAFT' && (
                        <button
                          onClick={() => handleFinalize(invoice.invoice_id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded"
                          title="Finalize Invoice"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <InvoiceForm
          onSubmit={(data) => createMutation.mutate(data)}
          onClose={() => setShowForm(false)}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  )
}
