import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { salesApi, VehicleSaleCreate } from '../api/salesApi'
import { Plus, Search, Eye, Truck, FileText } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import SaleForm from '../components/SaleForm'
import { useNavigate } from 'react-router-dom'

export default function SalesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales', statusFilter],
    queryFn: () => salesApi.getSales(statusFilter || undefined),
  })

  const createMutation = useMutation({
    mutationFn: (data: VehicleSaleCreate) => salesApi.createSale(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      setShowForm(false)
    },
  })

  const filteredSales = sales.filter((sale) =>
    sale.chassis_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.sale_id.toString().includes(searchTerm) ||
    sale.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Count by status
  const pendingCount = sales.filter(s => s.sale_status === 'PENDING' || s.sale_status === 'BOOKED').length
  const deliveredCount = sales.filter(s => s.sale_status === 'DELIVERED').length

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
      case 'BOOKED':
        return 'bg-yellow-100 text-yellow-800'
      case 'INVOICED':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
          <p className="text-gray-500 text-sm mt-1">Manage vehicle sales and deliveries</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Sale
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${statusFilter === '' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          All ({sales.length})
        </button>
        <button
          onClick={() => setStatusFilter('PENDING')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${statusFilter === 'PENDING' ? 'bg-white shadow text-yellow-700' : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          Pending ({pendingCount})
        </button>
        <button
          onClick={() => setStatusFilter('DELIVERED')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${statusFilter === 'DELIVERED' ? 'bg-white shadow text-green-700' : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          Delivered ({deliveredCount})
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by sale ID, chassis, or customer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Sales Table */}
      <div className="card">
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading sales...</p>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No sales found</p>
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              Create First Sale
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Sale ID</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th>Docs</th>
                  <th>Booking</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => {
                  // Count completed documents
                  const docsReady = [
                    sale.receipts && sale.receipts.length > 0,
                    sale.invoice_number,
                    sale.challan_number,
                    sale.is_service_schedule_generated
                  ].filter(Boolean).length

                  return (
                    <tr key={sale.sale_id}>
                      <td className="font-medium">#{sale.sale_id}</td>
                      <td>{sale.customer?.name || '-'}</td>
                      <td>
                        <div>
                          <span className="font-medium">{sale.vehicle?.model?.model_name || '-'}</span>
                          <span className="text-xs text-gray-500 block">{sale.chassis_no}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(sale.sale_status)}`}>
                          {sale.sale_status}
                        </span>
                      </td>
                      <td>
                        <span className={`text-sm ${docsReady === 4 ? 'text-green-600' : 'text-gray-500'}`}>
                          {docsReady}/4
                        </span>
                      </td>
                      <td>{formatCurrency(sale.booking_amount || 0)}</td>
                      <td>{formatDate(sale.created_at)}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/sales/${sale.sale_id}`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {sale.sale_status !== 'DELIVERED' && (
                            <button
                              onClick={() => navigate(`/sales/${sale.sale_id}`)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded"
                              title="Process Delivery"
                            >
                              <Truck className="w-4 h-4" />
                            </button>
                          )}
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

      {/* Sale Form Modal */}
      {showForm && (
        <SaleForm
          onSubmit={(data) => createMutation.mutate(data)}
          onClose={() => setShowForm(false)}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  )
}
