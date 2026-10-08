import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { X, Printer, Package, Layers, MapPin } from 'lucide-react'
import { toast } from 'react-hot-toast'

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
      // In a real app, this would trigger an actual print dialog
      // window.print() over an invisible iframe containing the QR
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold mb-4">Tag Details</h2>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            Tag not found or invalid identifier.
          </div>
        ) : tag ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
              {qrData?.qr_base64 ? (
                <img src={`data:image/png;base64,${qrData.qr_base64}`} alt="QR Code" className="w-48 h-48" />
              ) : (
                <div className="w-48 h-48 bg-gray-200 animate-pulse flex items-center justify-center rounded">Loading QR...</div>
              )}
              <p className="font-mono mt-2 font-bold text-lg tracking-wider text-gray-800">{tag.tag_identifier}</p>
              <span className={`mt-2 px-2 py-1 text-xs rounded-full ${
                  tag.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                  tag.status === 'REVOKED' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {tag.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2">
                <p className="text-gray-500">Part</p>
                <p className="font-medium text-base">{tag.spare_name}</p>
                <p className="text-xs text-gray-400">{tag.spare_category}</p>
              </div>

              <div>
                <p className="text-gray-500 flex items-center gap-1"><Package className="w-3 h-3"/> Tracking</p>
                <p className="font-medium">{tag.tracking_mode}</p>
              </div>

              <div>
                <p className="text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3"/> Location</p>
                <p className="font-medium">{tag.location || 'N/A'}</p>
              </div>

              {tag.tracking_mode === 'BATCH' && (
                <div className="col-span-2">
                  <p className="text-gray-500 flex items-center gap-1"><Layers className="w-3 h-3"/> Batch Number</p>
                  <p className="font-medium">{tag.batch_number}</p>
                </div>
              )}

              {tag.tracking_mode === 'SERIALIZED' && (
                <div className="col-span-2">
                  <p className="text-gray-500 flex items-center gap-1"><Layers className="w-3 h-3"/> Serial Number</p>
                  <p className="font-medium">{tag.serial_number}</p>
                </div>
              )}

              {tag.tracking_mode === 'QUANTITY' && (
                <div className="col-span-2">
                  <p className="text-gray-500 flex items-center gap-1"><Package className="w-3 h-3"/> Tag Quantity</p>
                  <p className="font-medium text-lg text-primary-600">{tag.quantity}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={handlePrint}
                disabled={tag.status !== 'ACTIVE' || printMutation.isPending}
                className="btn btn-primary w-full flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                {printMutation.isPending ? 'Printing...' : 'Print QR Code'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
