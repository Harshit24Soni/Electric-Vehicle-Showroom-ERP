import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { BatchItem, SerialItem, BatchListResponse, SerialListResponse } from '../api/inventoryApi'
import { api } from '@/lib/api'
import { X, QrCode } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/Button'

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
    queryFn: () => api.get<BatchListResponse>(`/inventory/batches?spare_id=${spareId}`),
    enabled: selectedSpare?.tracking_mode === 'BATCH'
  })

  const { data: serials } = useQuery({
    queryKey: ['serials', spareId],
    queryFn: () => api.get<SerialListResponse>(`/inventory/serials?spare_id=${spareId}`),
    enabled: selectedSpare?.tracking_mode === 'SERIALIZED'
  })

  const generateMutation = useMutation({
    mutationFn: (data: unknown) => api.post<{ tag_id: number }[]>('/inventory/tags/bulk', data),
    onSuccess: (res: { tag_id: number }[]) => {
      toast.success(`Successfully generated ${res.length} tag(s)`)
      queryClient.invalidateQueries({ queryKey: ['inventory-tags'] })
      onClose()
    },
    onError: (err: unknown) => {
      const axiosErr = err as AxiosError<{ detail?: string }>;
      toast.error(axiosErr.response?.data?.detail || 'Failed to generate tags')
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
                Generate Inventory Tags
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Print barcode and optical QR identifiers for parts and bins
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Spare Part *
            </label>
            <select
              value={spareId}
              onChange={(e) => {
                setSpareId(e.target.value ? Number(e.target.value) : '')
                setBatchId('')
                setSerialId('')
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors text-sm"
              required
              disabled={!!defaultSpareId}
            >
              <option value="">Select Spare Part</option>
              {spares?.map((s) => (
                <option key={s.spare_id} value={s.spare_id}>
                  {s.spare_name} ({s.tracking_mode})
                </option>
              ))}
            </select>
          </div>

          {selectedSpare?.tracking_mode === 'BATCH' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Select Lot / Batch *
              </label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors text-sm"
                required
                disabled={!!defaultBatchId}
              >
                <option value="">Select a batch</option>
                {batches?.items?.map((b: BatchItem) => (
                  <option key={b.batch_id} value={b.batch_id}>
                    {b.batch_number} (Qty: {b.quantity})
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedSpare?.tracking_mode === 'SERIALIZED' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Select Serial Unit *
              </label>
              <select
                value={serialId}
                onChange={(e) => setSerialId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors text-sm"
                required
                disabled={!!defaultSerialId}
              >
                <option value="">Select a serial</option>
                {serials?.items
                  ?.filter((s: SerialItem) => s.status === 'IN_STOCK')
                  .map((s: SerialItem) => (
                    <option key={s.serial_id} value={s.serial_id}>
                      {s.serial_number}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {selectedSpare?.tracking_mode === 'QUANTITY' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Quantity per Tag *
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors text-sm font-mono"
                required
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Number of physical units this bin/pack tag represents.
              </p>
            </div>
          )}

          {selectedSpare?.tracking_mode !== 'SERIALIZED' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Number of Tags to Generate *
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={tagCount}
                onChange={(e) => setTagCount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors text-sm font-mono"
                required
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={generateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={generateMutation.isPending || !spareId}
              isLoading={generateMutation.isPending}
            >
              Generate Tags
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
