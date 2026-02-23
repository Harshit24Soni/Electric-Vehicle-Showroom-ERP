import { useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { salesApi, SaleProgress, PortalTracking } from '../api/salesApi'
import {
  ArrowLeft, Truck, CreditCard, ChevronRight, Globe, FileText,
  Printer, Download, Shield, Car, Landmark, Hash, CalendarCheck
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { SalesProgressBar } from '../components/SalesProgressBar'
import PostDeliveryChecklist from '../components/PostDeliveryChecklist'
import PaymentModal from '../components/PaymentModal'
import toast from 'react-hot-toast'

const STAGES = [
  'ENQUIRY', 'QUOTATION', 'NEGOTIATION', 'BOOKING', 'DOCUMENTATION',
  'PAYMENT', 'INVOICE', 'PORTAL_WORK', 'DELIVERY', 'COMPLETED',
]

// ————————————————————————————————
// Reusable document print/download helpers
// ————————————————————————————————

/** Build a printable HTML string for a document */
function buildDocumentHtml(
  title: string,
  number: string | undefined,
  sale: any,
  extra?: string,
): string {
  const customer = sale.customer || {}
  const vehicle = sale.vehicle || {}
  const modelName = vehicle.model?.model_name || 'N/A'
  const brandName = vehicle.model?.brand?.brand_name || ''

  return `
    <div style="font-family: 'Inter', sans-serif; padding: 40px; max-width: 800px; margin: auto;">
      <div style="text-align:center; margin-bottom: 32px;">
        <h1 style="font-size: 24px; font-weight: bold; margin: 0;">${title}</h1>
        ${number ? `<p style="color: #6b7280; margin-top: 4px;">${number}</p>` : ''}
      </div>
      <hr style="border-color: #e5e7eb; margin-bottom: 24px;" />
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 40%;">Customer Name</td>
          <td style="padding: 8px 0; font-weight: 600;">${customer.name || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Phone</td>
          <td style="padding: 8px 0;">${customer.primary_phone || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Address</td>
          <td style="padding: 8px 0;">${[customer.address_line1, customer.city, customer.state, customer.pincode].filter(Boolean).join(', ') || '-'}</td>
        </tr>
        <tr><td colspan="2" style="padding: 12px 0;"><hr style="border-color: #e5e7eb;" /></td></tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Vehicle</td>
          <td style="padding: 8px 0; font-weight: 600;">${brandName} ${modelName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Chassis No.</td>
          <td style="padding: 8px 0; font-family: monospace;">${sale.chassis_no}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Color</td>
          <td style="padding: 8px 0;">${vehicle.color || '-'}</td>
        </tr>
        <tr><td colspan="2" style="padding: 12px 0;"><hr style="border-color: #e5e7eb;" /></td></tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Sale Date</td>
          <td style="padding: 8px 0;">${sale.sale_date || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Total Amount</td>
          <td style="padding: 8px 0; font-weight: 700; font-size: 16px;">₹${Number(sale.total_amount || 0).toLocaleString('en-IN')}</td>
        </tr>
      </table>
      ${extra || ''}
      <div style="margin-top: 48px; text-align: center; color: #9ca3af; font-size: 12px;">
        Generated on ${new Date().toLocaleDateString('en-IN')} | Sale #${sale.sale_id}
      </div>
    </div>
  `
}

function printDocument(html: string) {
  const printWin = window.open('', '_blank', 'width=800,height=600')
  if (!printWin) return
  printWin.document.write(`
    <html><head><title>Print Document</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    </head><body>${html}</body></html>
  `)
  printWin.document.close()
  setTimeout(() => { printWin.print(); printWin.close() }, 400)
}

async function downloadPdf(html: string, filename: string) {
  const html2pdf = (await import('html2pdf.js')).default
  const container = document.createElement('div')
  container.innerHTML = html
  document.body.appendChild(container)
  await html2pdf().from(container).set({
    margin: 10,
    filename: `${filename}.pdf`,
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  }).save()
  document.body.removeChild(container)
}

// ————————————————————————————————
// Toggle Switch Component
// ————————————————————————————————
function ToggleSwitch({
  checked, onChange, disabled, label, icon, description, children,
}: {
  checked: boolean
  onChange: (val: boolean) => void
  disabled?: boolean
  label: string
  icon?: React.ReactNode
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div className={`p-4 rounded-xl border transition-all ${checked ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && <div className={`p-2 rounded-lg ${checked ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>{icon}</div>}
          <div>
            <span className="font-medium text-sm text-gray-900">{label}</span>
            {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-green-500' : 'bg-gray-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'
            }`} />
        </button>
      </div>
      {children}
    </div>
  )
}

// ————————————————————————————————
// Main Page Component
// ————————————————————————————————
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
      toast.success('Tracking updated')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to update tracking')
    },
  })

  // ——— Document Print/Download handlers ———
  const handlePrint = useCallback((docType: string) => {
    if (!sale) return
    const titleMap: Record<string, string> = {
      invoice: 'TAX INVOICE',
      receipt: 'PAYMENT RECEIPT',
      challan: 'DELIVERY CHALLAN',
      schedule: 'SERVICE SCHEDULE',
    }
    const numberMap: Record<string, string | undefined> = {
      invoice: sale.invoice_number,
      receipt: undefined,
      challan: sale.delivery_challan_number,
      schedule: undefined,
    }
    let extra = ''
    if (docType === 'schedule' && sale.service_schedules?.length) {
      extra = `<table style="width:100%;border-collapse:collapse;margin-top:24px;font-size:14px;">
        <tr style="background:#f3f4f6;"><th style="padding:8px;text-align:left;">Service #</th><th style="padding:8px;text-align:left;">Type</th><th style="padding:8px;text-align:left;">Due Date</th><th style="padding:8px;text-align:left;">Status</th></tr>
        ${sale.service_schedules.map((s: any) => `<tr><td style="padding:8px;">${s.service_number}</td><td style="padding:8px;">${s.service_type}</td><td style="padding:8px;">${s.due_date}</td><td style="padding:8px;">${s.status}</td></tr>`).join('')}
      </table>`
    }
    const html = buildDocumentHtml(titleMap[docType] || docType, numberMap[docType], sale, extra)
    printDocument(html)
  }, [sale])

  const handleDownload = useCallback(async (docType: string) => {
    if (!sale) return
    const titleMap: Record<string, string> = {
      invoice: 'TAX INVOICE',
      receipt: 'PAYMENT RECEIPT',
      challan: 'DELIVERY CHALLAN',
      schedule: 'SERVICE SCHEDULE',
    }
    const numberMap: Record<string, string | undefined> = {
      invoice: sale.invoice_number,
      receipt: undefined,
      challan: sale.delivery_challan_number,
      schedule: undefined,
    }
    let extra = ''
    if (docType === 'schedule' && sale.service_schedules?.length) {
      extra = `<table style="width:100%;border-collapse:collapse;margin-top:24px;font-size:14px;">
        <tr style="background:#f3f4f6;"><th style="padding:8px;text-align:left;">Service #</th><th style="padding:8px;text-align:left;">Type</th><th style="padding:8px;text-align:left;">Due Date</th><th style="padding:8px;text-align:left;">Status</th></tr>
        ${sale.service_schedules.map((s: any) => `<tr><td style="padding:8px;">${s.service_number}</td><td style="padding:8px;">${s.service_type}</td><td style="padding:8px;">${s.due_date}</td><td style="padding:8px;">${s.status}</td></tr>`).join('')}
      </table>`
    }
    const html = buildDocumentHtml(titleMap[docType] || docType, numberMap[docType], sale, extra)
    const fname = `${titleMap[docType].replace(/\s/g, '_')}_${numberMap[docType] || `Sale-${sale.sale_id}`}`
    await downloadPdf(html, fname)
    toast.success(`${titleMap[docType]} downloaded as PDF`)
  }, [sale])

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

  // Document cards data
  const docCards = [
    {
      key: 'invoice',
      label: 'Tax Invoice',
      number: sale.invoice_number,
      generated: sale.is_invoice_generated,
      onGenerate: () => generateInvoiceMutation.mutate(),
      genPending: generateInvoiceMutation.isPending,
      disabled: false,
    },
    {
      key: 'receipt',
      label: 'Payment Receipt',
      number: sale.is_receipt_generated ? 'Generated' : undefined,
      generated: sale.is_receipt_generated,
      onGenerate: () => setShowPaymentModal(true),
      genPending: false,
      genLabel: 'Add Receipt',
      disabled: false,
    },
    {
      key: 'challan',
      label: 'Delivery Challan',
      number: sale.delivery_challan_number,
      generated: sale.is_challan_generated,
      onGenerate: () => generateChallanMutation.mutate(),
      genPending: generateChallanMutation.isPending,
      disabled: !sale.is_invoice_generated,
    },
    {
      key: 'schedule',
      label: 'Service Schedule',
      number: sale.is_service_schedule_generated ? 'Generated' : undefined,
      generated: sale.is_service_schedule_generated,
      onGenerate: () => generateServiceScheduleMutation.mutate(),
      genPending: generateServiceScheduleMutation.isPending,
      disabled: false,
    },
  ]

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

        {/* ——— Delivery Documents — Print + Download PDF ——— */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Delivery Documents
          </h2>
          <div className="space-y-3">
            {docCards.map((doc) => (
              <div key={doc.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{doc.label}</p>
                  <p className="text-xs text-gray-500">
                    {doc.generated ? (doc.number || 'Generated') : 'Not Generated'}
                  </p>
                </div>
                {doc.generated ? (
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 text-xs font-medium bg-green-50 px-2 py-0.5 rounded-full">✓ Ready</span>
                    <button
                      onClick={() => handlePrint(doc.key)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title={`Print ${doc.label}`}
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(doc.key)}
                      className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title={`Download ${doc.label} PDF`}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={doc.onGenerate}
                    disabled={doc.genPending || doc.disabled}
                    className="btn btn-sm btn-secondary"
                  >
                    {doc.genPending ? '...' : (doc.genLabel || 'Generate')}
                  </button>
                )}
              </div>
            ))}
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

      {/* ——— Portal & Compliance Tracking ——— */}
      {portal && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Portal & Compliance Tracking
            {portal.all_portals_completed && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-2">All Complete</span>
            )}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Insurance */}
            <ToggleSwitch
              checked={portal.insurance_status === 'COMPLETED'}
              onChange={(val) => updatePortalMutation.mutate({ insurance_status: val ? 'COMPLETED' : 'PENDING' })}
              disabled={updatePortalMutation.isPending}
              label="Insurance"
              icon={<Shield className="w-4 h-4" />}
              description={portal.insurance_policy_number ? `Policy: ${portal.insurance_policy_number}` : 'Vehicle insurance filing'}
            />

            {/* RTO Portal */}
            <ToggleSwitch
              checked={portal.rto_status === 'COMPLETED'}
              onChange={(val) => updatePortalMutation.mutate({ rto_status: val ? 'COMPLETED' : 'PENDING' })}
              disabled={updatePortalMutation.isPending}
              label="RTO Portal"
              icon={<Car className="w-4 h-4" />}
              description={portal.registration_number ? `Reg: ${portal.registration_number}` : 'Vehicle registration'}
            />

            {/* Subsidy Portal */}
            <ToggleSwitch
              checked={portal.subsidy_status === 'COMPLETED'}
              onChange={(val) => updatePortalMutation.mutate({ subsidy_status: val ? 'COMPLETED' : 'PENDING' })}
              disabled={updatePortalMutation.isPending}
              label="Subsidy Portal"
              icon={<Landmark className="w-4 h-4" />}
              description={portal.subsidy_reference ? `Ref: ${portal.subsidy_reference}` : 'Government subsidy application'}
            />

            {/* CELEX / Number Plate Ordered */}
            <ToggleSwitch
              checked={portal.celex_status === 'COMPLETED'}
              onChange={(val) => updatePortalMutation.mutate({ celex_status: val ? 'COMPLETED' : 'PENDING' })}
              disabled={updatePortalMutation.isPending}
              label="Number Plate Ordered"
              icon={<Hash className="w-4 h-4" />}
              description={portal.number_plate_ordered_date ? `Ordered: ${formatDate(portal.number_plate_ordered_date)}` : 'CELEX number plate order'}
            />
          </div>

          {/* Number Plate Affixed — with date picker */}
          <div className="mt-4">
            <ToggleSwitch
              checked={!!portal.number_plate_fixed_date}
              onChange={(val) => {
                if (val) {
                  updatePortalMutation.mutate({ number_plate_fixed_date: new Date().toISOString().slice(0, 10) as any })
                } else {
                  updatePortalMutation.mutate({ number_plate_fixed_date: null as any })
                }
              }}
              disabled={updatePortalMutation.isPending}
              label="Number Plate Affixed"
              icon={<CalendarCheck className="w-4 h-4" />}
              description="Physical number plate has been installed on the vehicle"
            >
              {portal.number_plate_fixed_date && (
                <div className="mt-3 flex items-center gap-2 ml-11">
                  <label className="text-xs text-gray-600">Affixed Date:</label>
                  <input
                    type="date"
                    value={typeof portal.number_plate_fixed_date === 'string' ? portal.number_plate_fixed_date.slice(0, 10) : ''}
                    onChange={(e) => updatePortalMutation.mutate({ number_plate_fixed_date: e.target.value as any })}
                    className="input text-sm py-1 px-2 w-auto"
                  />
                </div>
              )}
            </ToggleSwitch>
          </div>

          {/* Form 20 / Helmet Invoice toggles */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="checkbox"
                checked={portal.form_20_generated}
                onChange={(e) => updatePortalMutation.mutate({ form_20_generated: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm font-medium text-gray-700">Form 20 Generated</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="checkbox"
                checked={portal.helmet_invoice_generated}
                onChange={(e) => updatePortalMutation.mutate({ helmet_invoice_generated: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm font-medium text-gray-700">Helmet Invoice Generated</span>
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
