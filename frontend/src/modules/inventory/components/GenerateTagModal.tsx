import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { X, QrCode } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface GenerateTagModalProps {
  onClose: () => void
  defaultSpareId?: number
  defaultBatchId?: number
  defaultSerialId?: number
}

interface SpareMaster {
  spare_id: number
  spare_name: string
  tracking_mode: string
}

export default function GenerateTagModal({ onClose, defaultSpareId, defaultBatchId, defaultSerialId }: GenerateTagModalProps) {
  const queryClient = useQueryClient()
  const [spareId, setSpareId] = useState<number | ''>(defaultSpareId || '')
  const [batchId, setBatchId] = useState<number | ''>(defaultBatchId || '')
  const [serialId, setSerialId] = useState<number | ''>(defaultSerialId || '')
  const [quantity, setQuantity] = useState<number>(1)
  const [tagCount, setTagCount] = useState<number>(1)

  const { data: spares } = useQuery({
    queryKey: ['spares-master-active'],
    queryFn: () => api.get<SpareMaster[]>('/inventory/spares')
  })

  // We could also fetch batches and serials based on selected spareId to populate dropdowns,
  // but for simplicity we will just let the user type them or select from another UI.
  // In a robust app, selecting a part would fetch its active batches/serials.
  // We'll add a simplified fetch if spareId is BATCH or SERIALIZED
  
  const selectedSpare = spares?.find(s => s.spare_id === (typeof spareId === 'number' ? spareId : undefined))
  
  const { data: batches } = useQuery({
    queryKey: ['batches', spareId],
    queryFn: () => api.get<any>(`/inventory/batches?spare_id=${spareId}`),
    enabled: selectedSpare?.tracking_mode === 'BATCH'
  })

  const { data: serials } = useQuery({
    queryKey: ['serials', spareId],
    queryFn: () => api.get<any>(`/inventory/serials?spare_id=${spareId}`),
    enabled: selectedSpare?.tracking_mode === 'SERIALIZED'
  })

  const generateMutation = useMutation({
    mutationFn: (data: any) => api.post('/inventory/tags/bulk', data),
    onSuccess: (res: any) => {
      toast.success(`Successfully generated ${res.length} tag(s)`)
      queryClient.invalidateQueries({ queryKey: ['inventory-tags'] })
      onClose()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to generate tags')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!spareId || !selectedSpare) return

    const payload = {
      spare_id: spareId,
      tracking_mode: selectedSpare.tracking_mode,
      batch_id: batchId || undefined,
      serial_id: serialId || undefined,
      quantity: selectedSpare.tracking_mode === 'QUANTITY' ? quantity : 1,
      tag_count: tagCount
    }

    generateMutation.mutate(payload)
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

        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          Generate Tags
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Spare Part</label>
            <select
              value={spareId}
              onChange={(e) => {
                setSpareId(e.target.value ? Number(e.target.value) : '')
                setBatchId('')
                setSerialId('')
              }}
              className="input"
              required
              disabled={!!defaultSpareId}
            >
              <option value="">Select Spare Part</option>
              {spares?.map(s => (
                <option key={s.spare_id} value={s.spare_id}>{s.spare_name} ({s.tracking_mode})</option>
              ))}
            </select>
          </div>

          {selectedSpare?.tracking_mode === 'BATCH' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Batch</label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value ? Number(e.target.value) : '')}
                className="input"
                required
                disabled={!!defaultBatchId}
              >
                <option value="">Select a batch</option>
                {(batches as any)?.items?.map((b: any) => (
                  <option key={b.batch_id} value={b.batch_id}>{b.batch_number} (Qty: {b.available_quantity})</option>
                ))}
              </select>
            </div>
          )}

          {selectedSpare?.tracking_mode === 'SERIALIZED' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Serial</label>
              <select
                value={serialId}
                onChange={(e) => setSerialId(e.target.value ? Number(e.target.value) : '')}
                className="input"
                required
                disabled={!!defaultSerialId}
              >
                <option value="">Select a serial</option>
                {(serials as any)?.items?.filter((s: any) => s.status === 'IN_STOCK').map((s: any) => (
                  <option key={s.serial_id} value={s.serial_id}>{s.serial_number}</option>
                ))}
              </select>
            </div>
          )}

          {selectedSpare?.tracking_mode === 'QUANTITY' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity per Tag</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="input"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Number of units this tag represents.</p>
            </div>
          )}

          {selectedSpare?.tracking_mode !== 'SERIALIZED' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Tags to Generate</label>
              <input
                type="number"
                min="1"
                max="100"
                value={tagCount}
                onChange={(e) => setTagCount(Number(e.target.value))}
                className="input"
                required
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={generateMutation.isPending || !spareId}
              className="btn btn-primary"
            >
              {generateMutation.isPending ? 'Generating...' : 'Generate Tags'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
