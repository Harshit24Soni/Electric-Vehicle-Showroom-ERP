import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, ShoppingBag, Car, PackageCheck, AlertCircle, FileText, Calendar, Trash2, Truck } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { procurementApi } from '../api/procurementApi'
import { useAuthStore } from '../../../store/authStore'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import VehicleIntakeModal from '../components/VehicleIntakeModal'

export default function ProcurementPage() {
    const navigate = useNavigate()
    const { hasRole } = useAuthStore()
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'spare' | 'vehicle'; id: number; name: string } | null>(null)
    const [showIntakeModal, setShowIntakeModal] = useState(false)
    const queryClient = useQueryClient()

    const deleteMutation = useMutation({
        mutationFn: ({ type, id, hardDelete }: { type: 'spare' | 'vehicle'; id: number; hardDelete?: boolean }) =>
            type === 'spare' ? procurementApi.deleteSparePurchase(id, hardDelete) : procurementApi.deleteVehiclePurchase(id, hardDelete),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [deleteTarget?.type === 'spare' ? 'spare-purchases' : 'vehicle-purchases'] })
            setDeleteTarget(null)
        },
    })

    const handleDeleteConfirm = (hardDelete: boolean) => {
        if (deleteTarget) {
            deleteMutation.mutate({ type: deleteTarget.type, id: deleteTarget.id, hardDelete })
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Procurement</h1>
                    <p className="text-gray-600 mt-1">Manage purchases and incoming stock</p>
                </div>
                {hasRole(['DEALER', 'ADMIN']) && (
                    <button
                        onClick={() => setShowIntakeModal(true)}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Truck className="w-4 h-4" />
                        Receive Vehicles (OEM Intake)
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Spare Purchase Card */}
                {/* Spare Purchase Card */}
                {hasRole(['DEALER', 'ADMIN']) && (
                    <div className="card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/procurement/spares/new')}>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                                <ShoppingBag className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Spare Purchase</h3>
                                <p className="text-sm text-gray-500">Buy parts from vendors</p>
                            </div>
                        </div>
                        <button className="btn btn-primary w-full flex items-center justify-center gap-2">
                            <Plus className="w-4 h-4" />
                            New Entry
                        </button>
                    </div>
                )}


                {/* Temporary Items Card - Admin Only */}
                {hasRole(['ADMIN']) && (
                    <div className="card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/procurement/temporary-items')}>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Temporary Items</h3>
                                <p className="text-sm text-gray-500">Review & Approve new parts</p>
                            </div>
                        </div>
                        <button className="btn btn-outline w-full flex items-center justify-center gap-2">
                            <PackageCheck className="w-4 h-4" />
                            Manage Items
                        </button>
                    </div>
                )}
            </div>

            {/* Purchase History */}
            <div className="card">
                <h2 className="text-xl font-bold mb-4">Purchase History</h2>
                <PurchaseList onSetDelete={(target) => setDeleteTarget(target)} />
            </div>

            <DeleteConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDeleteConfirm}
                itemName={deleteTarget ? deleteTarget.name : ''}
                isPending={deleteMutation.isPending}
            />

            {showIntakeModal && (
                <VehicleIntakeModal onClose={() => setShowIntakeModal(false)} />
            )}
        </div>
    )
}

function PurchaseList({ onSetDelete }: { onSetDelete: (target: any) => void }) {
    const [activeTab, setActiveTab] = useState<'spares' | 'vehicles'>('spares')

    // We can fetch both or fetch based on active tab. Fetching both for simplicity for now as list won't be huge yet.
    // Or better, fetch based on tab.

    return (
        <div>
            <div className="flex border-b mb-4">
                <button
                    className={`px-4 py-2 font-medium ${activeTab === 'spares' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('spares')}
                >
                    Spare Purchases
                </button>
                <button
                    className={`px-4 py-2 font-medium ${activeTab === 'vehicles' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('vehicles')}
                >
                    Vehicle Purchases
                </button>
            </div>

            {activeTab === 'spares' ? <SparePurchaseList onSetDelete={onSetDelete} /> : <VehiclePurchaseList onSetDelete={onSetDelete} />}
        </div>
    )
}

function SparePurchaseList({ onSetDelete }: { onSetDelete: (target: any) => void }) {
    const { data: purchases = [], isLoading } = useQuery({
        queryKey: ['spare-purchases'],
        queryFn: procurementApi.getSparePurchases
    })

    if (isLoading) return <div className="p-4 text-center">Loading...</div>

    return (
        <div className="overflow-x-auto">
            <table className="table w-full">
                <thead>
                    <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left">ID</th>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left">Vendor</th>
                        <th className="px-4 py-2 text-left">Invoice No</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                        <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {purchases.map((p: any) => (
                        <tr key={p.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2">#{p.id}</td>
                            <td className="px-4 py-2">{new Date(p.purchase_date).toLocaleDateString()}</td>
                            <td className="px-4 py-2">{p.vendor_name || '-'}</td>
                            <td className="px-4 py-2">{p.vendor_invoice_no || '-'}</td>
                            <td className="px-4 py-2 text-right">₹{Number(p.total_amount || 0).toFixed(2)}</td>
                            <td className="px-4 py-2 text-right">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onSetDelete({ type: 'spare', id: p.id, name: `Spare Purchase #${p.id}` }) }}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                    title="Delete Purchase"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {purchases.length === 0 && (
                        <tr>
                            <td colSpan={5} className="text-center py-8 text-gray-500">No spare purchases found</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}

function VehiclePurchaseList({ onSetDelete }: { onSetDelete: (target: any) => void }) {
    const { data: purchases = [], isLoading } = useQuery({
        queryKey: ['vehicle-purchases'],
        queryFn: procurementApi.getVehiclePurchases
    })

    if (isLoading) return <div className="p-4 text-center">Loading...</div>

    return (
        <div className="overflow-x-auto">
            <table className="table w-full">
                <thead>
                    <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left">ID</th>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left">Vendor</th>
                        <th className="px-4 py-2 text-left">Invoice No</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                        <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {purchases.map((p: any) => (
                        <tr key={p.purchase_id || p.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2">#{p.purchase_id || p.id}</td>
                            <td className="px-4 py-2">{new Date(p.invoice_date).toLocaleDateString()}</td>
                            <td className="px-4 py-2">{p.vendor_name || '-'}</td>
                            <td className="px-4 py-2">{p.invoice_number}</td>
                            <td className="px-4 py-2 text-right">₹{Number(p.invoice_amount || p.total_amount || 0).toFixed(2)}</td>
                            <td className="px-4 py-2 text-right">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onSetDelete({ type: 'vehicle', id: p.purchase_id || p.id, name: `Vehicle Purchase #${p.purchase_id || p.id}` }) }}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                    title="Delete Purchase"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {purchases.length === 0 && (
                        <tr>
                            <td colSpan={5} className="text-center py-8 text-gray-500">No vehicle purchases found</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}


