import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { masterApi, Vendor, VendorCreate, VendorUpdate } from '../api/masterApi'
import { Plus, Search, Pencil } from 'lucide-react'
import { formatDate } from '../../../lib/utils'
import VendorForm from '../components/VendorForm'
import toast from 'react-hot-toast'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'

export default function VendorsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null)
  const queryClient = useQueryClient()

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ['vendors', true],
    queryFn: () => masterApi.getVendors(true),
  })

  const createMutation = useMutation({
    mutationFn: (data: VendorCreate) => masterApi.createVendor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      toast.success('Vendor created')
      setShowForm(false)
      setSelectedVendor(null)
    },
    onError: () => toast.error('Failed to create vendor'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: VendorUpdate }) => masterApi.updateVendor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      toast.success('Vendor updated')
      setShowForm(false)
      setSelectedVendor(null)
      setIsEditing(false)
    },
    onError: () => toast.error('Failed to update vendor'),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, hardDelete }: { id: number; hardDelete?: boolean }) => masterApi.deleteVendor(id, hardDelete),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      toast.success('Vendor deactivated')
    },
    onError: () => toast.error('Failed to delete vendor'),
  })

  const restoreMutation = useMutation({
    mutationFn: (id: number) => masterApi.restoreVendor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      toast.success('Vendor restored')
    },
    onError: () => toast.error('Failed to restore vendor'),
  })

  const filteredVendors = vendors.filter((vendor) =>
    vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.gstin?.includes(searchTerm) ||
    vendor.pan_no?.includes(searchTerm)
  )

  const handleSubmit = (data: VendorCreate) => {
    if (isEditing && selectedVendor) {
      const updateData: VendorUpdate = {
        vendor_name: data.vendor_name,
        vendor_type: data.vendor_type,
        gstin: data.gstin,
        pan_no: data.pan_no,
        address_line1: data.address_line1,
        address_line2: data.address_line2,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
      }
      updateMutation.mutate({ id: selectedVendor.vendor_id, data: updateData })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleToggleStatus = (vendor: Vendor) => {
    const isDeleted = vendor.is_deleted || !vendor.is_active
    if (isDeleted) {
      if (confirm(`Restore "${vendor.vendor_name}"?`)) {
        restoreMutation.mutate(vendor.vendor_id)
      }
    } else {
      setDeleteTarget(vendor)
    }
  }

  const handleDeleteConfirm = (hardDelete: boolean) => {
    if (deleteTarget) {
      deleteMutation.mutate({ id: deleteTarget.vendor_id, hardDelete })
    }
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendors</h1>
          <p className="text-gray-600 mt-1">Manage vendor information</p>
        </div>
        <button onClick={() => { setSelectedVendor(null); setIsEditing(false); setShowForm(true) }} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Vendor
        </button>
      </div>

      <div className="card">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading vendors...</p>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No vendors found</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>S.No.</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>GSTIN</th>
                  <th>PAN</th>
                  <th>City</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map((vendor, index) => {
                  const isDeleted = vendor.is_deleted || !vendor.is_active
                  return (
                    <tr key={vendor.vendor_id} className={isDeleted ? 'bg-gray-50' : ''}>
                      <td>{index + 1}</td>
                      <td className="font-medium">{vendor.vendor_name}</td>
                      <td>
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                          {vendor.vendor_type}
                        </span>
                      </td>
                      <td>{vendor.gstin || '-'}</td>
                      <td>{vendor.pan_no || '-'}</td>
                      <td>{vendor.city || '-'}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleStatus(vendor)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${!isDeleted ? 'bg-green-500' : 'bg-gray-300'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${!isDeleted ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                          <span className={`text-xs ${isDeleted ? 'text-gray-500' : 'text-green-700 font-medium'}`}>
                            {isDeleted ? 'Inactive' : 'Active'}
                          </span>
                        </div>
                      </td>
                      <td>{formatDate(vendor.created_at)}</td>
                      <td>
                        <div className="flex gap-2">
                          {!isDeleted && (
                            <button
                              onClick={() => {
                                setSelectedVendor(vendor)
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
        <VendorForm
          vendor={selectedVendor}
          isEditing={isEditing}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowForm(false)
            setSelectedVendor(null)
            setIsEditing(false)
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        itemName={deleteTarget ? String(deleteTarget.vendor_name) : ''}
        isPending={deleteMutation.isPending}
      />
    </div>
  )
}
