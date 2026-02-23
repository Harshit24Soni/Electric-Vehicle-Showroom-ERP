import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { warrantyApi, ClaimCreate } from '../api/warrantyApi'
import { Plus, Search, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import ClaimForm from '../components/ClaimForm'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'

export default function WarrantyPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const queryClient = useQueryClient()

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['warranty-claims', statusFilter],
    queryFn: () => warrantyApi.getClaims(0, 100),
  })

  const createMutation = useMutation({
    mutationFn: (data: ClaimCreate) => warrantyApi.createClaim(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranty-claims'] })
      setShowForm(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, hardDelete }: { id: number; hardDelete?: boolean }) =>
      warrantyApi.deleteClaim(id, hardDelete),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranty-claims'] })
      setDeleteTarget(null)
    },
  })

  const handleDeleteConfirm = (hardDelete: boolean) => {
    if (deleteTarget) {
      deleteMutation.mutate({ id: deleteTarget.claim_id, hardDelete })
    }
  }

  const filteredClaims = claims.filter((claim) => {
    const matchesSearch =
      claim.so_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.portal_ref_no?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || claim.claim_status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Warranty</h1>
          <p className="text-gray-600 mt-1">Manage warranty claims</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Claim
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search claims..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input sm:w-48"
        >
          <option value="">All Status</option>
          <option value="RAISED">Raised</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading claims...</p>
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No claims found</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Claim ID</th>
                  <th>SO Number</th>
                  <th>Portal Ref</th>
                  <th>Status</th>
                  <th>Approval Date</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClaims.map((claim) => (
                  <tr key={claim.claim_id}>
                    <td>{claim.claim_id}</td>
                    <td className="font-medium">{claim.so_number}</td>
                    <td>{claim.portal_ref_no || '-'}</td>
                    <td>
                      <span className={`px-2 py-1 text-xs rounded-full ${claim.claim_status === 'APPROVED'
                          ? 'bg-green-100 text-green-800'
                          : claim.claim_status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        {claim.claim_status}
                      </span>
                    </td>
                    <td>{claim.approval_date ? formatDate(claim.approval_date) : '-'}</td>
                    <td>{formatDate(claim.created_at)}</td>
                    <td>
                      <button
                        onClick={() => setDeleteTarget(claim)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Delete Claim"
                      >
                        <Trash2 className="w-4 h-4" />
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
        <ClaimForm
          onSubmit={(data) => createMutation.mutate(data)}
          onClose={() => setShowForm(false)}
          isLoading={createMutation.isPending}
        />
      )}

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        itemName={deleteTarget ? `Claim SO: ${deleteTarget.so_number}` : ''}
        isPending={deleteMutation.isPending}
      />
    </div>
  )
}
