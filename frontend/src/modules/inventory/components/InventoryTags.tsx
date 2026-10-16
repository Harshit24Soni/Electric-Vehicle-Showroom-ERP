import { AxiosError } from 'axios'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Search, QrCode, Plus, Printer, Ban, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import TagDetailModal from './TagDetailModal'
import GenerateTagModal from './GenerateTagModal'
import ScannerModal, { TagScanResult } from '@/components/common/ScannerModal'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

interface InventoryTag {
  tag_id: number
  tag_identifier: string
  spare_id: number
  batch_id?: number
  serial_id?: number
  tracking_mode: string
  quantity: number
  status: string
  print_count: number
}

export default function InventoryTags() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [isGenerateOpen, setIsGenerateOpen] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [revokeTargetTagId, setRevokeTargetTagId] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const { data: tagData, isLoading } = useQuery({
    queryKey: ['inventory-tags'],
    queryFn: () => api.get<{ items: InventoryTag[] }>('/inventory/tags'),
  })

  const revokeMutation = useMutation({
    mutationFn: (tagId: number) => api.put(`/inventory/tags/${tagId}/revoke`, {}),
    onSuccess: () => {
      toast.success('Tag revoked successfully')
      queryClient.invalidateQueries({ queryKey: ['inventory-tags'] })
      setRevokeTargetTagId(null)
    },
    onError: (error: unknown) => {
      const axiosErr = error as AxiosError<{ detail?: string }>
      toast.error(axiosErr.response?.data?.detail || 'Failed to revoke tag')
      setRevokeTargetTagId(null)
    },
  })

  const handleTagScan = (tag: TagScanResult) => {
    setSelectedTag(tag.tag_identifier)
  }

  const tags = tagData?.items || []
  const filteredTags = tags.filter((t) =>
    t.tag_identifier.toLowerCase().includes(searchTerm.toLowerCase().trim())
  )

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Space-Efficient Tags Container */}
      <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {/* Compact Integrated Toolbar */}
        <div className="p-3 sm:p-4 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3 flex-1">
            <span className="font-mono text-slate-400 text-xs hidden sm:inline">
              ({filteredTags.length} registered tags)
            </span>

            <div className="relative flex-1 sm:w-64 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search tag identifier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-1.5 h-8 text-xs shrink-0"
            >
              <QrCode className="w-3.5 h-3.5" />
              Scan Tag
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsGenerateOpen(true)}
              className="flex items-center gap-1.5 h-8 text-xs shrink-0 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Generate Tag
            </Button>
          </div>
        </div>

        {/* Content Table */}
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : filteredTags.length === 0 ? (
          <EmptyState
            icon={QrCode}
            title="No inventory tags found"
            description={
              searchTerm
                ? 'No tags matched your identifier search. Try another query.'
                : 'No barcode or QR tags have been generated yet. Click "Generate Tag" to print labels.'
            }
            actionLabel={searchTerm ? 'Clear Search' : 'Generate New Tag'}
            onAction={searchTerm ? () => setSearchTerm('') : () => setIsGenerateOpen(true)}
            className="py-14"
          />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Tag Identifier</th>
                  <th>Tracking Mode</th>
                  <th className="text-right">Quantity</th>
                  <th>Status</th>
                  <th className="text-right">Print Count</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTags.map((tag: InventoryTag) => (
                  <tr
                    key={tag.tag_id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td>
                      <span
                        className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200/50 dark:border-primary-800/50 cursor-pointer hover:underline"
                        onClick={() => setSelectedTag(tag.tag_identifier)}
                        title="Click to view QR & details"
                      >
                        {tag.tag_identifier}
                      </span>
                    </td>
                    <td>
                      <Badge
                        variant={
                          tag.tracking_mode === 'SERIALIZED'
                            ? 'info'
                            : tag.tracking_mode === 'BATCH'
                            ? 'warning'
                            : 'neutral'
                        }
                      >
                        {tag.tracking_mode}
                      </Badge>
                    </td>
                    <td className="text-right font-mono font-bold text-slate-900 dark:text-white text-xs">
                      {tag.quantity}
                    </td>
                    <td>
                      <Badge variant={tag.status === 'ACTIVE' ? 'success' : 'neutral'}>
                        {tag.status}
                      </Badge>
                    </td>
                    <td className="text-right font-mono text-xs text-slate-600 dark:text-slate-400">
                      {tag.print_count}
                    </td>
                    <td className="text-right">
                      {tag.status === 'ACTIVE' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedTag(tag.tag_identifier)}
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="View & Print QR Label"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setRevokeTargetTagId(tag.tag_id)}
                            className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                            title="Revoke Tag"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tag Details Modal */}
      {selectedTag && (
        <TagDetailModal
          identifier={selectedTag}
          onClose={() => setSelectedTag(null)}
        />
      )}

      {/* Generate Tag Modal */}
      {isGenerateOpen && (
        <GenerateTagModal
          onClose={() => setIsGenerateOpen(false)}
        />
      )}

      {/* Barcode / QR Scanner Modal */}
      {isScannerOpen && (
        <ScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          onScanSuccess={handleTagScan}
        />
      )}

      {/* Revoke Confirmation Dialog */}
      <DeleteConfirmModal
        isOpen={revokeTargetTagId !== null}
        onClose={() => setRevokeTargetTagId(null)}
        onConfirm={() => {
          if (revokeTargetTagId) {
            revokeMutation.mutate(revokeTargetTagId)
          }
        }}
        itemName={revokeTargetTagId ? `Inventory Tag #${revokeTargetTagId}` : 'Inventory Tag'}
        isPending={revokeMutation.isPending}
      />
    </div>
  )
}
