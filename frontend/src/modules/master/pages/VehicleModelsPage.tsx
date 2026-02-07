import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { masterApi, VehicleModel, VehicleModelCreate } from '../api/masterApi'
import { Plus, Search, Eye } from 'lucide-react'
import { formatDate } from '../../../lib/utils'
import VehicleModelForm from '../components/VehicleModelForm'

export default function VehicleModelsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedModel, setSelectedModel] = useState<VehicleModel | null>(null)
  const queryClient = useQueryClient()

  const { data: models = [], isLoading } = useQuery({
    queryKey: ['vehicle-models'],
    queryFn: masterApi.getVehicleModels,
  })

  const createMutation = useMutation({
    mutationFn: (data: VehicleModelCreate) => masterApi.createVehicleModel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-models'] })
      setShowForm(false)
      setSelectedModel(null)
    },
  })

  const filteredModels = models.filter((model) =>
    model.model_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    model.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    model.material_number.includes(searchTerm)
  )

  const handleSubmit = (data: VehicleModelCreate) => {
    createMutation.mutate(data)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vehicle Models</h1>
          <p className="text-gray-600 mt-1">Manage vehicle model specifications</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Model
        </button>
      </div>

      <div className="card">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search models..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading models...</p>
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No models found</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Brand</th>
                  <th>Model</th>
                  <th>Material No</th>
                  <th>Color</th>
                  <th>Battery Type</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredModels.map((model) => (
                  <tr key={model.vehicle_model_id}>
                    <td>{model.vehicle_model_id}</td>
                    <td className="font-medium">{model.brand}</td>
                    <td>{model.model_name}</td>
                    <td>{model.material_number}</td>
                    <td>{model.colour}</td>
                    <td>{model.battery_type || '-'}</td>
                    <td>{formatDate(model.created_at)}</td>
                    <td>
                      <button
                        onClick={() => {
                          setSelectedModel(model)
                          setShowForm(true)
                        }}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <VehicleModelForm
          model={selectedModel}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowForm(false)
            setSelectedModel(null)
          }}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  )
}
