import React, { useState, useEffect } from 'react'
import { X, AlertCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { procurementApi, SparePurchaseResponse, SparePurchaseItemResponse } from '../api/procurementApi'
import { inventoryApi } from '../../inventory/api/inventoryApi'

interface Props {
  purchase: SparePurchaseResponse
  onClose: () => void
}

export default function InventoryPostingModal({ purchase, onClose }: Props) {
  const queryClient = useQueryClient()
  const [location, setLocation] = useState('MAIN_WAREHOUSE')
  const [itemData, setItemData] = useState<Record<number, any>>({})
  
  const { data: spares = [] } = useQuery({
    queryKey: ['spares-list'],
    queryFn: async () => {
      return await inventoryApi.getSpares()
    }
  })

  // Initialize item data based on tracking mode
  useEffect(() => {
    if (spares.length > 0 && purchase.items) {
      const initialData: Record<number, any> = {}
      purchase.items.forEach(item => {
        const spare = spares.find((s: any) => s.spare_id === item.spare_id)
        const mode = spare?.tracking_mode || (spare?.is_serialized ? 'SERIALIZED' : 'QUANTITY')
        
        initialData[item.purchase_item_id] = {
          purchase_item_id: item.purchase_item_id,
          tracking_mode: mode,
          batch_number: '',
          expiry_date: '',
          serial_numbers: Array(item.quantity).fill('')
        }
      })
      setItemData(initialData)
    }
  }, [spares, purchase.items])

  const postMutation = useMutation({
    mutationFn: (payload: any) => procurementApi.postSparePurchaseToInventory(purchase.spare_purchase_id, payload),
    onSuccess: () => {
      toast.success('Successfully posted to inventory')
      queryClient.invalidateQueries({ queryKey: ['spare-purchase', purchase.spare_purchase_id] })
      queryClient.invalidateQueries({ queryKey: ['spare-purchases'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-batches'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-serials'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] })
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to post to inventory')
    }
  })

  const handlePost = () => {
    // Validate
    if (!location) {
      toast.error('Location is required')
      return
    }

    const payloadItems = []
    for (const item of purchase.items) {
      const data = itemData[item.purchase_item_id]
      if (!data) continue

      const payloadItem: any = {
        purchase_item_id: item.purchase_item_id
      }

      if (data.tracking_mode === 'BATCH') {
        if (!data.batch_number) {
          toast.error(`Batch number required for ${item.spare_name || item.part_code}`)
          return
        }
        payloadItem.batch_number = data.batch_number
        if (data.expiry_date) {
          payloadItem.expiry_date = data.expiry_date
        }
      } else if (data.tracking_mode === 'SERIALIZED') {
        const emptySerials = data.serial_numbers.filter((s: string) => !s.trim())
        if (emptySerials.length > 0) {
          toast.error(`All ${item.quantity} serial numbers required for ${item.spare_name || item.part_code}`)
          return
        }
        payloadItem.serial_numbers = data.serial_numbers
      }

      payloadItems.push(payloadItem)
    }

    const payload = {
      location,
      items: payloadItems
    }

    postMutation.mutate(payload)
  }

  const handleBatchChange = (itemId: number, field: string, value: string) => {
    setItemData(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value }
    }))
  }

  const handleSerialChange = (itemId: number, index: number, value: string) => {
    setItemData(prev => {
      const current = { ...prev[itemId] }
      const newSerials = [...current.serial_numbers]
      newSerials[index] = value
      current.serial_numbers = newSerials
      return { ...prev, [itemId]: current }
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Post to Inventory</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <div className="bg-blue-50 text-blue-800 p-4 rounded-lg mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Confirm Inventory Posting</p>
              <p>This will permanently update stock levels, calculate Weighted Average Cost (WAC), and write entries to the inventory ledger. This action cannot be undone.</p>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Location *</label>
            <input 
              type="text" 
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="input w-full max-w-md"
              placeholder="e.g. MAIN_WAREHOUSE"
            />
          </div>

          <div className="space-y-6">
            <h3 className="font-semibold text-lg border-b pb-2">Tracking Information Required</h3>
            
            {purchase.items.map(item => {
              const data = itemData[item.purchase_item_id]
              if (!data) return null

              return (
                <div key={item.purchase_item_id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="font-medium text-gray-900">{item.spare_name || item.part_code}</div>
                      <div className="text-sm text-gray-500">Qty: {item.quantity} | Mode: {data.tracking_mode}</div>
                    </div>
                  </div>

                  {data.tracking_mode === 'BATCH' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Batch Number *</label>
                        <input 
                          type="text" 
                          value={data.batch_number}
                          onChange={e => handleBatchChange(item.purchase_item_id, 'batch_number', e.target.value)}
                          className="input w-full"
                          placeholder="Batch ID"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Expiry Date (Optional)</label>
                        <input 
                          type="date" 
                          value={data.expiry_date}
                          onChange={e => handleBatchChange(item.purchase_item_id, 'expiry_date', e.target.value)}
                          className="input w-full"
                        />
                      </div>
                    </div>
                  )}

                  {data.tracking_mode === 'SERIALIZED' && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">Serial Numbers ({item.quantity} required) *</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {data.serial_numbers.map((serial: string, idx: number) => (
                          <input 
                            key={idx}
                            type="text"
                            value={serial}
                            onChange={e => handleSerialChange(item.purchase_item_id, idx, e.target.value)}
                            className="input text-sm font-mono"
                            placeholder={`Serial #${idx + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {data.tracking_mode === 'QUANTITY' && (
                    <div className="text-sm text-gray-500 italic">
                      No additional tracking information required for this item.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        
        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 rounded-b-xl">
          <button 
            type="button" 
            onClick={onClose} 
            className="btn btn-outline"
            disabled={postMutation.isPending}
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handlePost} 
            className="btn btn-primary bg-green-600 hover:bg-green-700"
            disabled={postMutation.isPending}
          >
            {postMutation.isPending ? 'Posting...' : 'Confirm & Post'}
          </button>
        </div>
      </div>
    </div>
  )
}
