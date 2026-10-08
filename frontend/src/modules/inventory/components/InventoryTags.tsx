import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Search, QrCode, Plus, Printer, Ban } from 'lucide-react'
import { SkeletonTable } from '@/components/ui/SkeletonTable'
import { toast } from 'react-hot-toast'
import TagDetailModal from './TagDetailModal'
import GenerateTagModal from './GenerateTagModal'
import ScannerModal, { TagScanResult } from '@/components/common/ScannerModal'

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
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to revoke tag')
    }
  })

  const handleTagScan = (tag: TagScanResult) => {
    setSelectedTag(tag.tag_identifier)
  }

  const tags = tagData?.items || []
  const filteredTags = tags.filter(t => 
    t.tag_identifier.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search by tag identifier..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="input pl-10" 
          />
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsScannerOpen(true)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <QrCode className="w-4 h-4" />
            Scan Tag
          </button>
          <button 
            onClick={() => setIsGenerateOpen(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Generate Tag
          </button>
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <SkeletonTable rows={5} />
        ) : filteredTags.length === 0 ? (
          <div className="text-center py-8">
            <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No tags found</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Identifier</th>
                  <th>Tracking Mode</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Print Count</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTags.map((tag: InventoryTag) => (
                  <tr key={tag.tag_id}>
                    <td className="font-mono font-medium text-primary-600 cursor-pointer" onClick={() => setSelectedTag(tag.tag_identifier)}>
                      {tag.tag_identifier}
                    </td>
                    <td>{tag.tracking_mode}</td>
                    <td>{tag.quantity}</td>
                    <td>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        tag.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        tag.status === 'REVOKED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {tag.status}
                      </span>
                    </td>
                    <td>{tag.print_count}</td>
                    <td className="text-right">
                      {tag.status === 'ACTIVE' && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setSelectedTag(tag.tag_identifier)} className="p-1 hover:bg-gray-100 rounded text-gray-600" title="View & Print">
                            <Printer className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              if (window.confirm("Are you sure you want to revoke this tag?")) {
                                revokeMutation.mutate(tag.tag_id)
                              }
                            }}
                            className="p-1 hover:bg-red-50 rounded text-red-600" title="Revoke"
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

      {selectedTag && (
        <TagDetailModal 
          identifier={selectedTag} 
          onClose={() => setSelectedTag(null)} 
        />
      )}

      {isGenerateOpen && (
        <GenerateTagModal 
          onClose={() => setIsGenerateOpen(false)} 
        />
      )}

      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleTagScan}
        title="Scan Inventory Tag"
      />
    </div>
  )
}
