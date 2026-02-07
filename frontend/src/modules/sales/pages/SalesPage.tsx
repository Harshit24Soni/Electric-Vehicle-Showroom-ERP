import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { salesApi, VehicleSaleCreate } from '../api/salesApi'
import { Plus, Search, Eye, Truck } from 'lucide-react'
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

  const deliverMutation = useMutation({
    mutationFn: ({ saleId, remarks }: { saleId: number; remarks?: string }) =>
      salesApi.deliverVehicle(saleId, { remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
  })

  const filteredSales = sales.filter((sale) =>
    sale.chassis_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.sale_id.toString().includes(searchTerm)
  )

  const handleDeliver = (saleId: number) => {
    if (confirm('Mark this sale as delivered?')) {
      deliverMutation.mutate({ saleId })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales</h1>
          <p className="text-gray-600 mt-1">Manage vehicle sales</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Sale
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by sale ID or chassis number..."
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
          <option value="BOOKED">Booked</option>
          <option value="DELIVERED">Delivered</option>
        </select>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading sales...</p>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No sales found</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Sale ID</th>
                  <th>Lead ID</th>
                  <th>Chassis No</th>
                  <th>Status</th>
                  <th>Booking Amount</th>
                  <th>Created</th>
                  <th>Delivered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale) => (
                  <tr key={sale.sale_id}>
                    <td>{sale.sale_id}</td>
                    <td>{sale.lead_id}</td>
                    <td className="font-medium">{sale.chassis_no}</td>
                    <td>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        sale.sale_status === 'DELIVERED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {sale.sale_status}
                      </span>
                    </td>
                    <td>{formatCurrency(sale.booking_amount)}</td>
                    <td>{formatDate(sale.created_at)}</td>
                    <td>{sale.delivered_at ? formatDate(sale.delivered_at) : '-'}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/sales/${sale.sale_id}`)}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {sale.sale_status !== 'DELIVERED' && (
                          <button
                            onClick={() => handleDeliver(sale.sale_id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded"
                            title="Mark as Delivered"
                          >
                            <Truck className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
