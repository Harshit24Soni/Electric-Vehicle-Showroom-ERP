import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { serviceApi } from '../api/serviceApi'
import { inventoryApi, StockItem } from '../../inventory/api/inventoryApi'
import { X, Scan, QrCode } from 'lucide-react'
import { toast } from 'react-hot-toast'
import ScannerModal, { TagScanResult } from '@/components/common/ScannerModal'

interface AddSpareModalProps {
  jobCardId: number
  onClose: () => void
  onSuccess: () => void
}

export default function AddSpareModal({ jobCardId, onClose, onSuccess }: AddSpareModalProps) {
  const [selectedSpare, setSelectedSpare] = useState<StockItem | null>(null)
  const [quantity, setQuantity] = useState<number>(1)
  const [scannedTag, setScannedTag] = useState<TagScanResult | null>(null)
  const [isScannerOpen, setIsScannerOpen] = useState(false)

  const { data: stockItems = [], isLoading: loadingStock } = useQuery({
    queryKey: ['inventory-stock', 'MAIN'],
    queryFn: () => inventoryApi.getStock(undefined, 'MAIN').then(r => r.items),
  })

  const draftMutation = useMutation({
    mutationFn: (data: { spare_id: number; quantity: number; tracking_mode: string; serial_id?: number; batch_id?: number }) => 
        serviceApi.draftSpare(jobCardId, data),
    onSuccess: () => {
      toast.success('Spare added as draft')
      onSuccess()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to add spare')
    }
  })

  const handleTagScan = (tag: TagScanResult) => {
    setScannedTag(tag)
    
    // Sync the selectedSpare so the UI looks consistent
    const item = stockItems.find((i: StockItem) => i.spare_id === tag.spare_id)
    if (item) {
      setSelectedSpare(item)
    } else {
      setSelectedSpare({
        spare_id: tag.spare_id,
        part_code: tag.spare_code || '',
        spare_name: tag.spare_name || 'Scanned Spare',
        quantity: tag.available_quantity || 1
      } as StockItem)
    }
    
    if (tag.tracking_mode === 'SERIALIZED') {
      setQuantity(1)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSpare) {
        toast.error('Please select a spare part')
        return
    }
    if (quantity <= 0 || quantity > (scannedTag?.available_quantity || selectedSpare.quantity)) {
        toast.error('Invalid quantity')
        return
    }
    
    let trackingMode = 'QUANTITY'
    let batchId = undefined
    let serialId = undefined
    
    if (scannedTag) {
        trackingMode = scannedTag.tracking_mode
        batchId = scannedTag.batch_id
        serialId = scannedTag.serial_id
        
        if (trackingMode === 'SERIALIZED' && quantity !== 1) {
            toast.error('Serialized parts must have quantity 1')
            return
        }
    }

    draftMutation.mutate({
        spare_id: selectedSpare.spare_id,
        quantity: quantity,
        tracking_mode: trackingMode,
        batch_id: batchId,
        serial_id: serialId
    })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Add Spare to Job Card</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-4">
            <div className="mb-6 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg p-6 bg-gray-50">
              <QrCode className="w-12 h-12 text-gray-400 mb-3" />
              <button
                type="button"
                className="btn btn-primary w-full max-w-xs flex justify-center items-center gap-2"
                onClick={() => setIsScannerOpen(true)}
              >
                <Scan className="w-4 h-4" />
                Scan Inventory Tag
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Scan a barcode or QR code to instantly select the exact part, batch, or serial number.
              </p>
            </div>

            <div className="relative flex py-2 items-center mb-6">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">OR SELECT MANUALLY</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <div className="mb-6">
               <select
                  className="input w-full"
                  value={selectedSpare?.spare_id || ''}
                  onChange={(e) => {
                     setScannedTag(null) // clear scan if manually selected
                     const item = stockItems.find((i: StockItem) => i.spare_id === Number(e.target.value))
                     if (item) {
                        setSelectedSpare(item)
                        setQuantity(1)
                     }
                  }}
               >
                  <option value="">-- Select Spare from Stock --</option>
                  {stockItems.map((item: StockItem) => (
                     <option key={item.spare_id} value={item.spare_id} disabled={item.quantity <= 0}>
                        {item.part_code} - {item.spare_name} (In Stock: {item.quantity})
                     </option>
                  ))}
               </select>
            </div>

            {selectedSpare && (
                <form onSubmit={handleSubmit} className="space-y-4 bg-gray-50 p-4 rounded-lg border">
                   <div>
                      <p className="text-sm font-medium">{selectedSpare.spare_name}</p>
                      <p className="text-xs text-gray-500 font-mono mb-2">{selectedSpare.part_code}</p>
                      
                      {scannedTag ? (
                        <div className="bg-blue-50 text-blue-800 text-xs p-2 rounded-md border border-blue-200">
                          <span className="font-semibold block mb-1">Scanned Tag: {scannedTag.tag_identifier}</span>
                          {scannedTag.tracking_mode === 'SERIALIZED' && <div>Serial: {scannedTag.serial_number}</div>}
                          {scannedTag.tracking_mode === 'BATCH' && <div>Batch: {scannedTag.batch_number}</div>}
                          <div className="mt-1 text-green-700">Available: {scannedTag.available_quantity}</div>
                        </div>
                      ) : (
                        <p className="text-xs text-green-600 mt-1">Available in Stock: {selectedSpare.quantity}</p>
                      )}
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <input
                         type="number"
                         min={1}
                         max={scannedTag?.available_quantity || selectedSpare.quantity}
                         value={quantity}
                         onChange={(e) => setQuantity(Number(e.target.value))}
                         className="input w-full"
                         required
                         disabled={scannedTag?.tracking_mode === 'SERIALIZED'}
                      />
                      {scannedTag?.tracking_mode === 'SERIALIZED' && (
                        <p className="text-xs text-gray-500 mt-1">Serialized parts must have a quantity of 1.</p>
                      )}
                   </div>
                   <div className="flex justify-end gap-3 pt-4">
                      <button type="button" onClick={onClose} className="btn border border-gray-300">
                         Cancel
                      </button>
                      <button 
                         type="submit" 
                         className="btn btn-primary"
                         disabled={draftMutation.isPending}
                      >
                         Add to Job Card
                      </button>
                   </div>
                </form>
            )}
          </div>
        </div>
      </div>

      <ScannerModal 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleTagScan}
        title="Scan Tag for Service"
      />
    </>
  )
}
