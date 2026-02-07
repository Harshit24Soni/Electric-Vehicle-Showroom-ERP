import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { masterApi, Vendor, VendorCreate } from '../api/masterApi'
import { Plus, Search, Eye } from 'lucide-react'
import { formatDate } from '../../../lib/utils'
import VendorForm from '../components/VendorForm'

export default function VendorsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const queryClient = useQueryClient()

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: masterApi.getVendors,
  })

  const createMutation = useMutation({
    mutationFn: (data: VendorCreate) => masterApi.createVendor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      setShowForm(false)
      setSelectedVendor(null)
    },
  })

  const filteredVendors = vendors.filter((vendor) =>
    vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.gstin?.includes(searchTerm) ||
    vendor.pan_no?.includes(searchTerm)
  )

  const handleSubmit = (data: VendorCreate) => {
    createMutation.mutate(data)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendors</h1>
          <p className="text-gray-600 mt-1">Manage vendor information</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
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
                  <th>ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>GSTIN</th>
                  <th>PAN</th>
                  <th>City</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.vendor_id}>
                    <td>{vendor.vendor_id}</td>
                    <td className="font-medium">{vendor.vendor_name}</td>
                    <td>
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                        {vendor.vendor_type}
                      </span>
                    </td>
                    <td>{vendor.gstin || '-'}</td>
                    <td>{vendor.pan_no || '-'}</td>
                    <td>{vendor.city || '-'}</td>
                    <td>{formatDate(vendor.created_at)}</td>
                    <td>
                      <button
                        onClick={() => {
                          setSelectedVendor(vendor)
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
        <VendorForm
          vendor={selectedVendor}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowForm(false)
            setSelectedVendor(null)
          }}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  )
}
