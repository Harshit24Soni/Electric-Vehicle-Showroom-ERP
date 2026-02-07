import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { masterApi, VehicleCreate } from '../api/masterApi'
import { Plus, Search } from 'lucide-react'
import VehicleForm from '../components/VehicleForm'

export default function VehiclesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const queryClient = useQueryClient()

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      // In a real app, you'd have a list endpoint
      return []
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: VehicleCreate) => masterApi.createVehicle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setShowForm(false)
    },
  })

  const handleSubmit = (data: VehicleCreate) => {
    createMutation.mutate(data)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vehicles</h1>
          <p className="text-gray-600 mt-1">Manage vehicle inventory</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Vehicle
        </button>
      </div>

      <div className="card">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by chassis number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        <div className="text-center py-8">
          <p className="text-gray-500">Vehicle management interface</p>
          <p className="text-sm text-gray-400 mt-2">Use the API to fetch and display vehicles</p>
        </div>
      </div>

      {showForm && (
        <VehicleForm
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  )
}
