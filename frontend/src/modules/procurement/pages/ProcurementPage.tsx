import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, ShoppingBag, Car, PackageCheck, AlertCircle, FileText, Calendar } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { procurementApi } from '../api/procurementApi'
import { useAuthStore } from '../../../store/authStore'

export default function ProcurementPage() {
    const navigate = useNavigate()
    const { hasRole } = useAuthStore()

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Procurement</h1>
                    <p className="text-gray-600 mt-1">Manage purchases and incoming stock</p>
                </div>
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

                {/* Vehicle Purchase Card */}
                {hasRole(['DEALER', 'ADMIN']) && (
                    <div className="card hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/procurement/vehicles/new')}>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                                <Car className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Vehicle Purchase</h3>
                                <p className="text-sm text-gray-500">Inward new vehicles</p>
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
                <PurchaseList />
            </div>
        </div>
    )
}

function PurchaseList() {
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

            {activeTab === 'spares' ? <SparePurchaseList /> : <VehiclePurchaseList />}
        </div>
    )
}

function SparePurchaseList() {
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

function VehiclePurchaseList() {
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


