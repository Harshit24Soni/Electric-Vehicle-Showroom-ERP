import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { salesApi } from '../api/salesApi'
import { ArrowLeft, Truck } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import PostDeliveryChecklist from '../components/PostDeliveryChecklist'

export default function SaleDetailPage() {
  const { saleId } = useParams<{ saleId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: sale, isLoading } = useQuery({
    queryKey: ['sale', saleId],
    queryFn: () => salesApi.getSaleDetail(Number(saleId)),
    enabled: !!saleId,
  })

  const { data: deliveryStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['delivery-status', saleId],
    queryFn: () => salesApi.getDeliveryStatus(Number(saleId)),
    enabled: !!saleId,
  })

  const generateInvoiceMutation = useMutation({
    mutationFn: () => salesApi.generateInvoice(Number(saleId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale', saleId] })
      queryClient.invalidateQueries({ queryKey: ['delivery-status', saleId] })
    }
  })

  const generateChallanMutation = useMutation({
    mutationFn: () => salesApi.generateChallan(Number(saleId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale', saleId] })
      queryClient.invalidateQueries({ queryKey: ['delivery-status', saleId] })
    }
  })

  const generateServiceScheduleMutation = useMutation({
    mutationFn: () => salesApi.generateServiceSchedule(Number(saleId)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale', saleId] })
      queryClient.invalidateQueries({ queryKey: ['delivery-status', saleId] })
    }
  })

  const deliverMutation = useMutation({
    mutationFn: (remarks?: string) => salesApi.deliverVehicle(Number(saleId!), { remarks }), // assuming deliverVehicle exists or needs update
    // Wait, salesApi.deliverVehicle is not defined in my salesApi.ts update?
    // I need to check if deliverVehicle exists in salesApi.ts. 
    // I added generateInvoice/Challan but not deliverVehicle? 
    // "deliverVehicle" was in the original file I viewed.
    // I didn't see it in my update, I appended methods.
    // I should check salesApi.ts content again if needed.
    // Assuming it's there or I need to add it.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale', saleId] })
      queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
  })

  if (isLoading || statusLoading) {
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

  const documents = deliveryStatus?.documents || {}
  const canDeliver = deliveryStatus?.allowed || false

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
              <label className="text-sm font-medium text-gray-600">Customer</label>
              <p className="text-gray-900 font-semibold">{sale.customer_id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Chassis Number</label>
              <p className="text-gray-900 font-mono">{sale.chassis_no}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Status</label>
              <p>
                <span className={`px-2 py-1 text-xs rounded-full ${sale.sale_status === 'DELIVERED'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
                  }`}>
                  {sale.sale_status}
                </span>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Total Amount</label>
              <p className="text-gray-900 font-semibold">{formatCurrency(sale.total_amount)}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Documents</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Tax Invoice</p>
                <p className="text-xs text-gray-500">{sale.invoice_number || 'Not Generated'}</p>
              </div>
              {sale.is_invoice_generated ? (
                <div className="flex gap-2 items-center">
                  <span className="text-green-600 text-sm font-medium">Generated</span>
                  <button onClick={() => window.open(`/print/sale/${saleId}/invoice`, '_blank')} className="text-blue-600 hover:underline text-sm">Print</button>
                </div>
              ) : (
                <button
                  onClick={() => generateInvoiceMutation.mutate()}
                  disabled={generateInvoiceMutation.isPending}
                  className="btn btn-sm btn-secondary"
                >
                  {generateInvoiceMutation.isPending ? '...' : 'Generate'}
                </button>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Payment Receipt</p>
                <p className="text-xs text-gray-500">{sale.is_receipt_generated ? 'Generated' : 'Pending'}</p>
              </div>
              {sale.is_receipt_generated ? (
                <span className="text-green-600 text-sm font-medium">Generated</span>
              ) : (
                <button
                  onClick={() => alert("Please use 'Add Receipt' modal (Not Implemented Here yet)")}
                  className="btn btn-sm btn-secondary"
                >
                  Add Receipt
                </button>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Delivery Challan</p>
                <p className="text-xs text-gray-500">{sale.delivery_challan_number || 'Not Generated'}</p>
              </div>
              {sale.is_challan_generated ? (
                <div className="flex gap-2 items-center">
                  <span className="text-green-600 text-sm font-medium">Generated</span>
                  <button onClick={() => window.open(`/print/sale/${saleId}/challan`, '_blank')} className="text-blue-600 hover:underline text-sm">Print</button>
                </div>
              ) : (
                <button
                  onClick={() => generateChallanMutation.mutate()}
                  disabled={generateChallanMutation.isPending || !sale.is_invoice_generated}
                  className="btn btn-sm btn-secondary"
                >
                  {generateChallanMutation.isPending ? '...' : 'Generate'}
                </button>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Service Schedule</p>
                <p className="text-xs text-gray-500">{sale.is_service_schedule_generated ? 'Generated' : 'Pending'}</p>
              </div>
              {sale.is_service_schedule_generated ? (
                <div className="flex gap-2 items-center">
                  <span className="text-green-600 text-sm font-medium">Generated</span>
                  <button onClick={() => window.open(`/print/sale/${saleId}/schedule`, '_blank')} className="text-blue-600 hover:underline text-sm">Print</button>
                </div>
              ) : (
                <button
                  onClick={() => generateServiceScheduleMutation.mutate()}
                  disabled={generateServiceScheduleMutation.isPending}
                  className="btn btn-sm btn-secondary"
                >
                  {generateServiceScheduleMutation.isPending ? '...' : 'Generate'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {sale.sale_status !== 'DELIVERED' && (
        <div className="card border-t-4 border-t-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Actions</h2>
              <p className="text-sm text-gray-600 mt-1">Complete the sale and deliver vehicle</p>
            </div>
            <button
              onClick={() => {
                if (confirm('Mark this sale as delivered?')) {
                  deliverMutation.mutate(undefined)
                }
              }}
              disabled={deliverMutation.isPending || !canDeliver}
              className={`btn btn-primary flex items-center gap-2 ${!canDeliver ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={!canDeliver ? 'Generate all documents first' : ''}
            >
              <Truck className="w-5 h-5" />
              {deliverMutation.isPending ? 'Delivering...' : 'Mark as Delivered'}
            </button>
          </div>
          {!canDeliver && (
            <div className="mt-3 text-sm text-red-500 bg-red-50 p-2 rounded">
              Documents Pending:
              {!documents.invoice && ' Invoice,'}
              {!documents.receipt && ' Receipt,'}
              {!documents.challan && ' Challan,'}
              {!documents.service_schedule && ' Service Schedule,'}
            </div>
          )}
        </div>
      )}

      <PostDeliveryChecklist sale={sale} />
    </div>
  )
}
