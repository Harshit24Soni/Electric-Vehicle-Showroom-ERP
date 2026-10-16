import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  warrantyApi,
  ClaimCreate,
  ComponentSwapRequest,
  InwardCreate,
  ShipmentCreate,
  Claim,
} from '../api/warrantyApi'
import { Plus, Search, Trash2, ArrowLeftRight, Truck, PackageCheck, X, ShieldAlert } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import ClaimForm from '../components/ClaimForm'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'

export default function WarrantyPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showSwapModal, setShowSwapModal] = useState(false)
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [showInwardModal, setShowInwardModal] = useState(false)
  const [showShipmentModal, setShowShipmentModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Claim | null>(null)

  // Standard claim form state
  const [claimData, setClaimData] = useState<ClaimCreate>({ job_spare_id: 1, so_number: '', remarks: '' })
  // Inward form state
  const [inwardData, setInwardData] = useState<InwardCreate>({
    oem_invoice_no: '',
    oem_invoice_date: new Date().toISOString().split('T')[0],
    remarks: '',
    items: [{ spare_id: 1, quantity: 1, unit_cost: 0 }],
  })
  // Shipment form state
  const [shipmentData, setShipmentData] = useState<ShipmentCreate>({
    courier_name: '',
    docket_no: '',
    dispatch_date: new Date().toISOString().split('T')[0],
    items: [{ claim_id: 1 }],
  })

  const queryClient = useQueryClient()

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['warranty-claims', statusFilter],
    queryFn: () => warrantyApi.getClaims(0, 100),
  })

  // Mutations
  const createClaimMutation = useMutation({
    mutationFn: (data: ClaimCreate) => warrantyApi.createClaim(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranty-claims'] })
      setShowClaimModal(false)
    },
  })

  const swapMutation = useMutation({
    mutationFn: (data: ComponentSwapRequest) => warrantyApi.swapComponent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranty-claims'] })
      setShowSwapModal(false)
    },
  })

  const inwardMutation = useMutation({
    mutationFn: (data: InwardCreate) => warrantyApi.createInward(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranty-claims'] })
      setShowInwardModal(false)
    },
  })

  const shipmentMutation = useMutation({
    mutationFn: (data: ShipmentCreate) => warrantyApi.createShipment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warranty-claims'] })
      setShowShipmentModal(false)
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

  const claimList: Claim[] = Array.isArray(claims) ? claims : []

  const filteredClaims = claimList.filter((claim) => {
    const so = claim.so_number || ''
    const ref = claim.portal_ref_no || ''
    const matchesSearch =
      so.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || claim.claim_status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Warranty Management</h1>
          <p className="text-gray-600 mt-1">Manage OEM claims, component serial swaps, inwards, and return shipments</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowInwardModal(true)}
            className="btn btn-secondary flex items-center gap-1.5"
            title="Record Inward from OEM"
          >
            <PackageCheck className="w-4 h-4" />
            Inward Spares
          </button>
          <button
            onClick={() => setShowShipmentModal(true)}
            className="btn btn-secondary flex items-center gap-1.5"
            title="Dispatch Defective Parts to OEM"
          >
            <Truck className="w-4 h-4" />
            Dispatch Shipment
          </button>
          <button
            onClick={() => setShowSwapModal(true)}
            className="btn btn-secondary flex items-center gap-1.5"
            title="Swap Defective Component on Vehicle"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Component Swap
          </button>
          <button
            onClick={() => setShowClaimModal(true)}
            className="btn btn-primary flex items-center gap-1.5"
            title="Raise New Warranty Claim"
          >
            <Plus className="w-4 h-4" />
            Raise Claim
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by SO number or portal reference..."
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
          <option value="">All Statuses</option>
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
          <div className="text-center py-12">
            <ShieldAlert className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Warranty Claims Found</h2>
            <p className="text-gray-600 mb-6">Submit warranty claims or component swaps for serviced vehicles.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Claim ID</th>
                  <th>SO Number</th>
                  <th>Job Spare ID</th>
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
                    <td>#{claim.claim_id}</td>
                    <td className="font-medium text-primary-700">{claim.so_number}</td>
                    <td>Spare #{claim.job_spare_id}</td>
                    <td>{claim.portal_ref_no || '-'}</td>
                    <td>
                      <span
                        className={`px-2 py-1 text-xs rounded-full font-medium ${
                          claim.claim_status === 'APPROVED'
                            ? 'bg-green-100 text-green-800'
                            : claim.claim_status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {claim.claim_status}
                      </span>
                    </td>
                    <td>{claim.approval_date ? formatDate(claim.approval_date) : '-'}</td>
                    <td>{formatDate(claim.created_at)}</td>
                    <td>
                      <button
                        onClick={() => setDeleteTarget(claim)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
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

      {/* Component Swap Modal */}
      {showSwapModal && (
        <ClaimForm
          onSubmit={(data) => swapMutation.mutate(data)}
          onClose={() => setShowSwapModal(false)}
          isLoading={swapMutation.isPending}
        />
      )}

      {/* Standard Raise Claim Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-semibold">Raise Warranty Claim</h2>
              <button onClick={() => setShowClaimModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Spare ID *</label>
                <input
                  type="number"
                  value={claimData.job_spare_id}
                  onChange={(e) => setClaimData({ ...claimData, job_spare_id: parseInt(e.target.value) || 1 })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">OEM Service Order (SO) Number *</label>
                <input
                  type="text"
                  placeholder="e.g. SO-2026-9901"
                  value={claimData.so_number}
                  onChange={(e) => setClaimData({ ...claimData, so_number: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  rows={3}
                  placeholder="Defect details and OEM ticket notes"
                  value={claimData.remarks || ''}
                  onChange={(e) => setClaimData({ ...claimData, remarks: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => setShowClaimModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={() => createClaimMutation.mutate(claimData)}
                disabled={createClaimMutation.isPending || !claimData.so_number}
                className="btn btn-primary"
              >
                {createClaimMutation.isPending ? 'Submitting...' : 'Submit Claim'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OEM Inward Modal */}
      {showInwardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-semibold">Record OEM Inward Spares</h2>
              <button onClick={() => setShowInwardModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">OEM Invoice Number *</label>
                <input
                  type="text"
                  placeholder="e.g. OEM-INW-5501"
                  value={inwardData.oem_invoice_no}
                  onChange={(e) => setInwardData({ ...inwardData, oem_invoice_no: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={inwardData.oem_invoice_date}
                  onChange={(e) => setInwardData({ ...inwardData, oem_invoice_date: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Spare ID *</label>
                <input
                  type="number"
                  value={inwardData.items[0]?.spare_id || 1}
                  onChange={(e) =>
                    setInwardData({
                      ...inwardData,
                      items: [{ ...inwardData.items[0], spare_id: parseInt(e.target.value) || 1, quantity: inwardData.items[0]?.quantity || 1 }],
                    })
                  }
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  value={inwardData.items[0]?.quantity || 1}
                  onChange={(e) =>
                    setInwardData({
                      ...inwardData,
                      items: [{ ...inwardData.items[0], spare_id: inwardData.items[0]?.spare_id || 1, quantity: parseInt(e.target.value) || 1 }],
                    })
                  }
                  className="input"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => setShowInwardModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={() => inwardMutation.mutate(inwardData)}
                disabled={inwardMutation.isPending || !inwardData.oem_invoice_no}
                className="btn btn-primary"
              >
                {inwardMutation.isPending ? 'Saving...' : 'Record Inward'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OEM Shipment Dispatch Modal */}
      {showShipmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-semibold">Dispatch Return Shipment to OEM</h2>
              <button onClick={() => setShowShipmentModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Courier Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Blue Dart, Delhivery, V-Trans"
                  value={shipmentData.courier_name}
                  onChange={(e) => setShipmentData({ ...shipmentData, courier_name: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Docket / Tracking Number *</label>
                <input
                  type="text"
                  placeholder="e.g. BLU-998822"
                  value={shipmentData.docket_no}
                  onChange={(e) => setShipmentData({ ...shipmentData, docket_no: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dispatch Date</label>
                <input
                  type="date"
                  value={shipmentData.dispatch_date}
                  onChange={(e) => setShipmentData({ ...shipmentData, dispatch_date: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Claim ID to Return *</label>
                <input
                  type="number"
                  value={shipmentData.items[0]?.claim_id || 1}
                  onChange={(e) =>
                    setShipmentData({
                      ...shipmentData,
                      items: [{ claim_id: parseInt(e.target.value) || 1 }],
                    })
                  }
                  className="input"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button onClick={() => setShowShipmentModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                onClick={() => shipmentMutation.mutate(shipmentData)}
                disabled={shipmentMutation.isPending || !shipmentData.courier_name || !shipmentData.docket_no}
                className="btn btn-primary"
              >
                {shipmentMutation.isPending ? 'Dispatching...' : 'Dispatch Shipment'}
              </button>
            </div>
          </div>
        </div>
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
