import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { salesApi, SaleProgress, PortalTracking } from '../api/salesApi'
import { ArrowLeft, Truck, CreditCard, ChevronRight, Globe, FileText } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { SalesProgressBar } from '../components/SalesProgressBar'
import PostDeliveryChecklist from '../components/PostDeliveryChecklist'
import PaymentModal from '../components/PaymentModal'
import toast from 'react-hot-toast'

const STAGES = [
  'ENQUIRY', 'QUOTATION', 'NEGOTIATION', 'BOOKING', 'DOCUMENTATION',
  'PAYMENT', 'INVOICE', 'PORTAL_WORK', 'DELIVERY', 'COMPLETED',
]

export default function SaleDetailPage() {
  const { saleId } = useParams<{ saleId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [stageRemarks, setStageRemarks] = useState('')

  const { data: sale, isLoading } = useQuery({
    queryKey: ['sale', saleId],
    queryFn: () => salesApi.getSaleDetail(Number(saleId)),
    enabled: !!saleId,
  })

  const { data: progress } = useQuery({
    queryKey: ['sale-progress', saleId],
    queryFn: () => salesApi.getSaleProgress(Number(saleId)),
    enabled: !!saleId,
  })

  const { data: deliveryStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['delivery-status', saleId],
    queryFn: () => salesApi.getDeliveryStatus(Number(saleId)),
    enabled: !!saleId,
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['sale', saleId] })
    queryClient.invalidateQueries({ queryKey: ['sale-progress', saleId] })
    queryClient.invalidateQueries({ queryKey: ['delivery-status', saleId] })
  }

  // ——— Mutations ———
  const generateInvoiceMutation = useMutation({
    mutationFn: () => salesApi.generateInvoice(Number(saleId)),
    onSuccess: invalidateAll,
  })

  const generateChallanMutation = useMutation({
    mutationFn: () => salesApi.generateChallan(Number(saleId)),
    onSuccess: invalidateAll,
  })

  const generateServiceScheduleMutation = useMutation({
    mutationFn: () => salesApi.generateServiceSchedule(Number(saleId)),
    onSuccess: invalidateAll,
  })

  const deliverMutation = useMutation({
    mutationFn: (remarks?: string) => salesApi.deliverVehicle(Number(saleId!), { remarks }),
    onSuccess: () => {
      invalidateAll()
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      toast.success('Vehicle marked as delivered!')
    },
  })

  const advanceStageMutation = useMutation({
    mutationFn: (toStage: string) =>
      salesApi.advanceStage(Number(saleId), toStage, stageRemarks || undefined),
    onSuccess: () => {
      invalidateAll()
      setStageRemarks('')
      toast.success('Stage advanced successfully')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to advance stage')
    },
  })

  const updatePortalMutation = useMutation({
    mutationFn: (data: Partial<PortalTracking>) =>
      salesApi.updatePortalTracking(Number(saleId), data),
    onSuccess: () => {
      invalidateAll()
      toast.success('Portal tracking updated')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to update portal')
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
  const currentStage = sale.sale_stage || progress?.sale_stage
  const currentStageIdx = STAGES.indexOf(currentStage || '')
  const nextStage = currentStageIdx >= 0 && currentStageIdx < STAGES.length - 1
    ? STAGES[currentStageIdx + 1]
    : null
  const portal = progress?.portal_tracking

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/sales')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Sale Details</h1>
          <p className="text-gray-600 mt-1">
            Sale #{sale.sale_id}
            {sale.is_direct_sale && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Direct Sale</span>
            )}
          </p>
        </div>
      </div>

      {/* ——— Sales Progress Bar ——— */}
      <div className="card">
        <SalesProgressBar currentStage={currentStage} />
      </div>

      {/* ——— Stage Advance ——— */}
      {nextStage && sale.sale_status !== 'DELIVERED' && (
        <div className="card border-l-4 border-l-indigo-500">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <ChevronRight className="w-5 h-5 text-indigo-600" />
            Advance Stage
          </h2>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="text-sm text-gray-600 block mb-1">Next Stage</label>
              <div className="px-3 py-2 bg-indigo-50 rounded-lg font-semibold text-indigo-700">
                {currentStage} → {nextStage}
              </div>
            </div>
            <div className="flex-1">
              <label className="text-sm text-gray-600 block mb-1">Remarks</label>
              <input
                type="text"
                value={stageRemarks}
                onChange={(e) => setStageRemarks(e.target.value)}
                className="input"
                placeholder="Optional remarks"
              />
            </div>
            <button
              onClick={() => advanceStageMutation.mutate(nextStage)}
              disabled={advanceStageMutation.isPending}
              className="btn btn-primary whitespace-nowrap"
            >
              {advanceStageMutation.isPending ? 'Advancing...' : `Advance to ${nextStage}`}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sale Information */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Sale Information</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Customer</label>
              <p className="text-gray-900 font-semibold">
                {sale.customer?.name || `Customer #${sale.customer_id}`}
              </p>
              {sale.customer?.primary_phone && (
                <p className="text-sm text-gray-500">{sale.customer.primary_phone}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Chassis Number</label>
              <p className="text-gray-900 font-mono">{sale.chassis_no}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Vehicle</label>
              <p className="text-gray-900">
                {sale.vehicle?.model?.brand?.brand_name} {sale.vehicle?.model?.model_name || 'N/A'}
                {sale.vehicle?.color && ` — ${sale.vehicle.color}`}
              </p>
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
            <div>
              <label className="text-sm font-medium text-gray-600">Sale Date</label>
              <p className="text-gray-900">{formatDate(sale.sale_date)}</p>
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documents
          </h2>
          <div className="space-y-4">
            {/* Invoice */}
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

            {/* Payment Receipt */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Payment Receipt</p>
                <p className="text-xs text-gray-500">{sale.is_receipt_generated ? 'Generated' : 'Pending'}</p>
              </div>
              {sale.is_receipt_generated ? (
                <span className="text-green-600 text-sm font-medium">Generated</span>
              ) : (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="btn btn-sm btn-secondary"
                >
                  Add Receipt
                </button>
              )}
            </div>

            {/* Delivery Challan */}
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

            {/* Service Schedule */}
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

      {/* ——— Payments Section ——— */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payments
          </h2>
          <button onClick={() => setShowPaymentModal(true)} className="btn btn-sm btn-primary">
            + Add Payment
          </button>
        </div>
        {progress?.payments && progress.payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-600">
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Mode</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2">Reference</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {progress.payments.map((p) => (
                  <tr key={p.sale_payment_id} className="border-b border-gray-100">
                    <td className="py-2">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">{p.payment_type}</span>
                    </td>
                    <td className="py-2">{p.payment_mode}</td>
                    <td className="py-2 font-semibold">{formatCurrency(p.amount)}</td>
                    <td className="py-2 text-gray-500">{p.reference_number || '—'}</td>
                    <td className="py-2 text-gray-500">{formatDate(p.payment_date)}</td>
                    <td className="py-2 text-gray-500">{p.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-4">No payments recorded yet</p>
        )}
      </div>

      {/* ——— Portal Tracking ——— */}
      {portal && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Portal Tracking
            {portal.all_portals_completed && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-2">All Complete</span>
            )}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Insurance */}
            <PortalCard
              title="Insurance"
              status={portal.insurance_status}
              details={portal.insurance_policy_number ? `Policy: ${portal.insurance_policy_number}` : undefined}
              completedDate={portal.insurance_completed_date}
              onUpdateStatus={(status) => updatePortalMutation.mutate({ insurance_status: status })}
            />
            {/* Subsidy */}
            <PortalCard
              title="Subsidy"
              status={portal.subsidy_status}
              details={portal.subsidy_reference ? `Ref: ${portal.subsidy_reference}` : undefined}
              completedDate={portal.subsidy_completed_date}
              onUpdateStatus={(status) => updatePortalMutation.mutate({ subsidy_status: status })}
            />
            {/* RTO */}
            <PortalCard
              title="RTO"
              status={portal.rto_status}
              details={portal.registration_number ? `Reg: ${portal.registration_number}` : undefined}
              completedDate={portal.rto_completed_date}
              onUpdateStatus={(status) => updatePortalMutation.mutate({ rto_status: status })}
            />
            {/* CELEX */}
            <PortalCard
              title="CELEX"
              status={portal.celex_status}
              details={portal.number_plate_ordered_date ? `Plate ordered: ${formatDate(portal.number_plate_ordered_date)}` : undefined}
              completedDate={portal.celex_completed_date}
              onUpdateStatus={(status) => updatePortalMutation.mutate({ celex_status: status })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                checked={portal.form_20_generated}
                onChange={(e) => updatePortalMutation.mutate({ form_20_generated: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Form 20 Generated</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                checked={portal.helmet_invoice_generated}
                onChange={(e) => updatePortalMutation.mutate({ helmet_invoice_generated: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Helmet Invoice Generated</span>
            </div>
          </div>
        </div>
      )}

      {/* ——— Delivery Action ——— */}
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

      {/* ——— Post-Delivery Checklist ——— */}
      <PostDeliveryChecklist sale={sale} />

      {/* ——— Payment Modal ——— */}
      {showPaymentModal && (
        <PaymentModal saleId={sale.sale_id} onClose={() => setShowPaymentModal(false)} />
      )}
    </div>
  )
}

/* ——— Portal Card sub-component ——— */
function PortalCard({
  title,
  status,
  details,
  completedDate,
  onUpdateStatus,
}: {
  title: string
  status: string
  details?: string
  completedDate?: string
  onUpdateStatus: (status: string) => void
}) {
  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-green-100 text-green-700',
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[status] || 'bg-gray-100 text-gray-600'}`}>
          {status}
        </span>
      </div>
      {details && <p className="text-xs text-gray-500 mb-2">{details}</p>}
      {completedDate && <p className="text-xs text-gray-400">Completed: {formatDate(completedDate)}</p>}
      {status !== 'COMPLETED' && (
        <div className="mt-2 flex gap-2">
          {status === 'PENDING' && (
            <button
              onClick={() => onUpdateStatus('IN_PROGRESS')}
              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Start
            </button>
          )}
          <button
            onClick={() => onUpdateStatus('COMPLETED')}
            className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Mark Complete
          </button>
        </div>
      )}
    </div>
  )
}
