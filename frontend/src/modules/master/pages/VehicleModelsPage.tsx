import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { masterApi, VehicleModel, VehicleModelCreate, VehicleModelUpdate } from '../api/masterApi'
import { Plus, Search, Pencil, Trash2, RotateCcw } from 'lucide-react'
import { formatDate } from '../../../lib/utils'
import VehicleModelForm from '../components/VehicleModelForm'
import toast from 'react-hot-toast'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'

export default function VehicleModelsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedModel, setSelectedModel] = useState<VehicleModel | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<VehicleModel | null>(null)
  const queryClient = useQueryClient()

  const { data: models = [], isLoading } = useQuery({
    queryKey: ['vehicle-models', true],
    queryFn: () => masterApi.getVehicleModels(true),
  })

  const createMutation = useMutation({
    mutationFn: (data: VehicleModelCreate) => masterApi.createVehicleModel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-models'] })
      toast.success('Vehicle model created')
      setShowForm(false)
      setSelectedModel(null)
    },
    onError: () => toast.error('Failed to create vehicle model'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: VehicleModelUpdate }) => masterApi.updateVehicleModel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-models'] })
      toast.success('Vehicle model updated')
      setShowForm(false)
      setSelectedModel(null)
      setIsEditing(false)
    },
    onError: () => toast.error('Failed to update vehicle model'),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, hardDelete }: { id: number; hardDelete?: boolean }) => masterApi.deleteVehicleModel(id, hardDelete),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-models'] })
      toast.success('Vehicle model deactivated')
    },
    onError: () => toast.error('Failed to delete vehicle model'),
  })

  const restoreMutation = useMutation({
    mutationFn: (id: number) => masterApi.restoreVehicleModel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-models'] })
      toast.success('Vehicle model restored')
    },
    onError: () => toast.error('Failed to restore vehicle model'),
  })

  const filteredModels = models.filter((model) =>
    model.model_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    model.brand_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    model.material_number.includes(searchTerm)
  )

  const handleSubmit = (data: VehicleModelCreate) => {
    if (isEditing && selectedModel) {
      const updateData: VehicleModelUpdate = {
        model_name: data.model_name,
        material_number: data.material_number,
        colour: data.colour,
        battery_type: data.battery_type,
        laden_weight: data.laden_weight,
        unladen_weight: data.unladen_weight,
        hsn_code: data.hsn_code,
      }
      updateMutation.mutate({ id: selectedModel.vehicle_model_id, data: updateData })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleToggleStatus = (model: VehicleModel) => {
    const isDeleted = model.is_deleted || !model.is_active
    if (isDeleted) {
      if (confirm(`Restore "${model.model_name}"?`)) {
        restoreMutation.mutate(model.vehicle_model_id)
      }
    } else {
      setDeleteTarget(model)
    }
  }

  const handleDeleteConfirm = (hardDelete: boolean) => {
    if (deleteTarget) {
      deleteMutation.mutate({ id: deleteTarget.vehicle_model_id, hardDelete })
    }
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vehicle Models</h1>
          <p className="text-gray-600 mt-1">Manage vehicle model specifications</p>
        </div>
        <button onClick={() => { setSelectedModel(null); setIsEditing(false); setShowForm(true) }} className="btn btn-primary flex items-center gap-2">
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
                  <th>S.No.</th>
                  <th>Brand</th>
                  <th>Model</th>
                  <th>Material No</th>
                  <th>Color</th>
                  <th>Battery Type</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredModels.map((model, index) => {
                  const isDeleted = model.is_deleted || !model.is_active
                  return (
                    <tr key={model.vehicle_model_id} className={isDeleted ? 'bg-gray-50' : ''}>
                      <td>{index + 1}</td>
                      <td className="font-medium">{model.brand_name}</td>
                      <td>{model.model_name}</td>
                      <td>{model.material_number}</td>
                      <td>{model.colour}</td>
                      <td>{model.battery_type || '-'}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleStatus(model)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${!isDeleted ? 'bg-green-500' : 'bg-gray-300'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${!isDeleted ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                          <span className={`text-xs ${isDeleted ? 'text-gray-500' : 'text-green-700 font-medium'}`}>
                            {isDeleted ? 'Inactive' : 'Active'}
                          </span>
                        </div>
                      </td>
                      <td>{formatDate(model.created_at)}</td>
                      <td>
                        <div className="flex gap-2">
                          {!isDeleted && (
                            <button
                              onClick={() => {
                                setSelectedModel(model)
                                setIsEditing(true)
                                setShowForm(true)
                              }}
                              className="p-2 text-primary-600 hover:bg-primary-50 rounded"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <VehicleModelForm
          model={selectedModel}
          isEditing={isEditing}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowForm(false)
            setSelectedModel(null)
            setIsEditing(false)
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        itemName={deleteTarget ? String(deleteTarget.model_name) : ''}
        isPending={deleteMutation.isPending}
      />
    </div>
  )
}
