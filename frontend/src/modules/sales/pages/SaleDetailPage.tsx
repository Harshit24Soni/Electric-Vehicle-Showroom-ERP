import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { salesApi } from '../api/salesApi'
import { ArrowLeft, Truck } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

export default function SaleDetailPage() {
  const { saleId } = useParams<{ saleId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: sale, isLoading } = useQuery({
    queryKey: ['sale', saleId],
    queryFn: () => salesApi.getSaleDetail(Number(saleId)),
    enabled: !!saleId,
  })

  const deliverMutation = useMutation({
    mutationFn: (remarks?: string) => salesApi.deliverVehicle(Number(saleId!), { remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale', saleId] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-gray-500">Loading sale details...</p>
        </div>
      </div>
    )
  }

  if (!sale) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-gray-500">Sale not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/sales')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sale Details</h1>
          <p className="text-gray-600 mt-1">Sale ID: {sale.sale_id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Sale Information</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Sale ID</label>
              <p className="text-gray-900">{sale.sale_id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Lead ID</label>
              <p className="text-gray-900">{sale.lead_id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Chassis Number</label>
              <p className="text-gray-900 font-mono">{sale.chassis_no}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Status</label>
              <p>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  sale.sale_status === 'DELIVERED'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {sale.sale_status}
                </span>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Booking Amount</label>
              <p className="text-gray-900 font-semibold">{formatCurrency(sale.booking_amount)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Vehicle Available</label>
              <p>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  sale.vehicle_available
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {sale.vehicle_available ? 'Yes' : 'No'}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Timeline</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Created At</label>
              <p className="text-gray-900">{formatDate(sale.created_at)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Delivered At</label>
              <p className="text-gray-900">{sale.delivered_at ? formatDate(sale.delivered_at) : 'Not delivered'}</p>
            </div>
            {sale.remarks && (
              <div>
                <label className="text-sm font-medium text-gray-600">Remarks</label>
                <p className="text-gray-900">{sale.remarks}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {sale.sale_status !== 'DELIVERED' && (
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Delivery</h2>
              <p className="text-sm text-gray-600 mt-1">Mark this sale as delivered</p>
            </div>
            <button
              onClick={() => {
                if (confirm('Mark this sale as delivered?')) {
                  deliverMutation.mutate(undefined)
                }
              }}
              disabled={deliverMutation.isPending}
              className="btn btn-primary flex items-center gap-2"
            >
              <Truck className="w-5 h-5" />
              {deliverMutation.isPending ? 'Delivering...' : 'Mark as Delivered'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
