import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, Settings2, PackageSearch } from 'lucide-react'
import { inventoryApi } from '../api/inventoryApi'
import { SkeletonTable } from '@/components/ui/SkeletonTable'
import { SpareMasterItem, SpareMasterCreate } from '../api/inventoryApi'
import { SparePartForm } from './SparePartForm'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

export function SparePartsList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isAdding, setIsAdding] = useState(false) // placeholder for modal

  const { data: spares = [], isLoading } = useQuery({
    queryKey: ['spares-inventory'],
    queryFn: async () => {
      const data = await inventoryApi.getSpares()
      return data
    }
  })

  const queryClient = useQueryClient()
  const createSpareMutation = useMutation({
    mutationFn: (data: SpareMasterCreate) => inventoryApi.createSpare(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spares-inventory'] })
      toast.success('Spare part added successfully')
      setIsAdding(false)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Failed to add spare part')
    }
  })

  const handleCreateSpare = (data: SpareMasterCreate) => {
    createSpareMutation.mutate(data)
  }

  const filteredSpares = spares.filter((spare: SpareMasterItem) => {
    const term = searchTerm.toLowerCase()
    const currentCode = spare.spare_code?.toLowerCase() || ''
    return (
      spare.spare_name.toLowerCase().includes(term) ||
      currentCode.includes(term) ||
      (spare.category && spare.category.toLowerCase().includes(term))
    )
  })

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by part name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 w-full shadow-sm focus:ring-primary-500 transition-all"
          />
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="btn btn-primary w-full sm:w-auto shadow-md hover:shadow-lg transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Part
        </button>
      </div>

      <div className="card overflow-hidden shadow-sm border border-gray-100">
        {isLoading ? (
          <SkeletonTable rows={5} />
        ) : filteredSpares.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <PackageSearch className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No parts found</h3>
            <p className="text-gray-500">Add a new spare part to get started or adjust your search.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="py-4 font-semibold text-gray-600">Part Info</th>
                  <th className="py-4 font-semibold text-gray-600">Current Code</th>
                  <th className="py-4 font-semibold text-gray-600">Category</th>
                  <th className="py-4 font-semibold text-gray-600">Tracking Mode</th>
                  <th className="py-4 font-semibold text-gray-600">Status</th>
                  <th className="py-4 font-semibold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSpares.map((spare: SpareMasterItem) => {
                  const currentCode = spare.spare_code || '-'
                  return (
                    <tr key={spare.spare_id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="py-3">
                        <div className="font-medium text-gray-900">{spare.spare_name}</div>
                        {spare.is_temporary && (
                          <span className="text-xs font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full mt-1 inline-block">
                            Temporary
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="font-mono text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded border border-gray-200">
                          {currentCode}
                        </span>
                      </td>
                      <td className="py-3 text-gray-600">{spare.category || '-'}</td>
                      <td className="py-3">
                        <span className="text-xs font-medium bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-100">
                          {spare.tracking_mode}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                          spare.is_active 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {spare.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                          <Settings2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isAdding && (
        <SparePartForm
          onSubmit={handleCreateSpare}
          onClose={() => setIsAdding(false)}
          isLoading={createSpareMutation.isPending}
        />
      )}
    </div>
  )
}
