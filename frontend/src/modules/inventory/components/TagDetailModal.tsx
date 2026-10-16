import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { X, Printer, Package, Layers, MapPin, QrCode } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface TagDetailModalProps {
  identifier: string
  onClose: () => void
}

interface TagScanResult {
  tag_id: number
  tag_identifier: string
  spare_id: number
  spare_name: string
  spare_category: string
  tracking_mode: string
  status: string
  quantity: number
  location: string | null
  batch_number: string | null
  serial_number: string | null
}

export default function TagDetailModal({ identifier, onClose }: TagDetailModalProps) {
  const queryClient = useQueryClient()

  const { data: tag, isLoading, error } = useQuery({
    queryKey: ['tag-scan', identifier],
    queryFn: () => api.get<TagScanResult>(`/inventory/tags/scan/${identifier}`),
    retry: false
  })

  const { data: qrData } = useQuery({
    queryKey: ['tag-qr', tag?.tag_id],
    queryFn: () => api.get<{ qr_base64: string }>(`/inventory/tags/${tag?.tag_id}/qr`),
    enabled: !!tag?.tag_id
  })

  const printMutation = useMutation({
    mutationFn: (tagId: number) => api.post(`/inventory/tags/${tagId}/reprint`, {}),
    onSuccess: () => {
      toast.success('Sent to printer')
      queryClient.invalidateQueries({ queryKey: ['inventory-tags'] })
    }
  })

  const handlePrint = () => {
    if (tag) {
      printMutation.mutate(tag.tag_id)
    }
  }

  const getTagStatusBadgeVariant = (status: string): 'success' | 'danger' | 'neutral' => {
    switch (status) {
      case 'ACTIVE':
        return 'success'
      case 'REVOKED':
        return 'danger'
      default:
        return 'neutral'
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-200/50 dark:border-primary-800/50 rounded-xl">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-heading">
                Tag & Verification Details
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Optical QR code preview and inventory payload binding
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-8 space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Loading tag payload...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 p-4 rounded-xl text-xs">
            Tag not found or invalid identifier. Please check barcode integrity.
          </div>
        ) : tag ? (
          <div className="space-y-5">
            {/* QR Card Container */}
            <div className="flex flex-col items-center p-5 bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 rounded-xl">
              {qrData?.qr_base64 ? (
                <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200/80">
                  <img src={`data:image/png;base64,${qrData.qr_base64}`} alt="QR Code" className="w-44 h-44" />
                </div>
              ) : (
                <div className="w-44 h-44 bg-slate-200 dark:bg-slate-800 animate-pulse flex items-center justify-center rounded-lg text-xs text-slate-400 font-mono">
                  Loading QR Code...
                </div>
              )}
              <p className="font-mono mt-3 font-bold text-base tracking-widest text-slate-900 dark:text-white">
                {tag.tag_identifier}
              </p>
              <div className="mt-2">
                <Badge variant={getTagStatusBadgeVariant(tag.status)}>
                  {tag.status}
                </Badge>
              </div>
            </div>

            {/* Spec Fields */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/50 dark:bg-slate-850/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
              <div className="col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Spare Part
                </p>
                <p className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">{tag.spare_name}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{tag.spare_category}</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <Package className="w-3 h-3 text-primary-500"/> Tracking
                </p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{tag.tracking_mode}</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-primary-500"/> Location
                </p>
                <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{tag.location || 'N/A'}</p>
              </div>

              {tag.tracking_mode === 'BATCH' && (
                <div className="col-span-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-blue-500"/> Lot / Batch Number
                  </p>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">{tag.batch_number || '—'}</p>
                </div>
              )}

              {tag.tracking_mode === 'SERIALIZED' && (
                <div className="col-span-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-purple-500"/> Serial Number
                  </p>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">{tag.serial_number || '—'}</p>
                </div>
              )}

              {tag.tracking_mode === 'QUANTITY' && (
                <div className="col-span-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Package className="w-3 h-3 text-emerald-500"/> Bound Quantity
                  </p>
                  <p className="font-mono font-bold text-base text-primary-600 dark:text-primary-400 mt-0.5">{tag.quantity} units</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="outline"
                size="md"
                onClick={onClose}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handlePrint}
                disabled={tag.status !== 'ACTIVE' || printMutation.isPending}
                isLoading={printMutation.isPending}
                className="flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                {printMutation.isPending ? 'Sending...' : 'Print QR Label'}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
