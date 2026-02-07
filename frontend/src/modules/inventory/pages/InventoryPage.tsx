import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi, SpareMovementCreate } from '../api/inventoryApi'
import { Package, Plus, Search, TrendingUp, TrendingDown } from 'lucide-react'
import SpareMovementForm from '../components/SpareMovementForm'

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showMovementForm, setShowMovementForm] = useState(false)
  const queryClient = useQueryClient()

  const createMovementMutation = useMutation({
    mutationFn: (data: SpareMovementCreate) => inventoryApi.createSpareMovement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] })
      setShowMovementForm(false)
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-600 mt-1">Manage stock levels and movements</p>
        </div>
        <button onClick={() => setShowMovementForm(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Record Movement
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Spare Parts</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
            </div>
            <Package className="w-12 h-12 text-primary-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Stock</p>
              <p className="text-3xl font-bold text-green-600 mt-2">0</p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-3xl font-bold text-red-600 mt-2">0</p>
            </div>
            <TrendingDown className="w-12 h-12 text-red-600" />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search inventory by part code or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        <div className="text-center py-8">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Inventory management interface</p>
          <p className="text-sm text-gray-400 mt-2">Use the API to fetch and display spare parts inventory</p>
        </div>
      </div>

      {showMovementForm && (
        <SpareMovementForm
          onSubmit={(data) => createMovementMutation.mutate(data)}
          onClose={() => setShowMovementForm(false)}
          isLoading={createMovementMutation.isPending}
        />
      )}
    </div>
  )
}
