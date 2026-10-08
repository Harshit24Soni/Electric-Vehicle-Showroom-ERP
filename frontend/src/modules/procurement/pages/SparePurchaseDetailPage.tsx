import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { procurementApi, SparePurchaseResponse, SparePurchaseItemResponse } from '../api/procurementApi'
import { inventoryApi } from '../../inventory/api/inventoryApi'
import { ArrowLeft, CheckCircle, AlertTriangle, Info, FileText, Check, Save, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../store/authStore'
import InventoryPostingModal from '../components/InventoryPostingModal'

export default function SparePurchaseDetailPage() {
    const { id } = useParams<{ id: string }>()
    const purchaseId = Number(id)
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { hasRole } = useAuthStore()
    const [isPostingModalOpen, setIsPostingModalOpen] = useState(false)

    const { data: purchase, isLoading } = useQuery({
        queryKey: ['spare-purchase', purchaseId],
        queryFn: () => procurementApi.getSparePurchase(purchaseId),
    })

    const { data: spares = [] } = useQuery({
        queryKey: ['spares-list'],
        queryFn: () => inventoryApi.getSpares(),
    })

    // Local state for editable items during verification
    const [editedItems, setEditedItems] = useState<SparePurchaseItemResponse[]>([])
    
    useEffect(() => {
        if (purchase) {
            setEditedItems(JSON.parse(JSON.stringify(purchase.items))) // Deep copy
        }
    }, [purchase])

    const verifyMutation = useMutation({
        mutationFn: (payload: any) => procurementApi.verifySparePurchase(purchaseId, payload),
        onSuccess: () => {
            toast.success('Invoice verified successfully')
            queryClient.invalidateQueries({ queryKey: ['spare-purchase', purchaseId] })
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to verify invoice')
        }
    })

    const approveMutation = useMutation({
        mutationFn: () => procurementApi.approveSparePurchase(purchaseId),
        onSuccess: () => {
            toast.success('Receipt approved successfully')
            queryClient.invalidateQueries({ queryKey: ['spare-purchase', purchaseId] })
            queryClient.invalidateQueries({ queryKey: ['spare-purchases'] })
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to approve receipt')
        }
    })

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading purchase details...</div>
    if (!purchase) return <div className="p-8 text-center text-red-500">Purchase not found</div>

    const isVerifiable = ['DRAFT', 'OCR_PROCESSED', 'PENDING_VERIFICATION'].includes(purchase.status || '')
    const isApprovable = purchase.status === 'VERIFIED'
    const isFinal = ['APPROVED', 'POSTED'].includes(purchase.status || '')

    const handleItemChange = (index: number, field: keyof SparePurchaseItemResponse, value: any) => {
        const newItems = [...editedItems]
        // @ts-ignore
        newItems[index][field] = value
        
        // Auto mark as confirmed if user edits the mapping
        if (field === 'spare_id') {
            newItems[index].verification_status = 'CONFIRMED'
            
            // Look up the name to keep UI consistent
            const spare = spares.find((s: any) => s.spare_id === Number(value))
            if (spare) {
                newItems[index].spare_name = spare.spare_name
            }
        }
        
        setEditedItems(newItems)
    }

    const handleVerify = () => {
        // Validate
        const unmapped = editedItems.filter(i => !i.spare_id)
        if (unmapped.length > 0) {
            toast.error(`There are ${unmapped.length} unmapped parts. Please map them before verifying.`)
            return
        }

        const payload = {
            vendor_id: purchase.vendor_id,
            vendor_invoice_no: purchase.vendor_invoice_no,
            vendor_invoice_date: purchase.vendor_invoice_date,
            purchase_date: purchase.purchase_date,
            remarks: purchase.remarks,
            include_in_accounting: true,
            status: 'VERIFIED',
            subtotal: purchase.subtotal,
            tax_total: purchase.tax_total,
            landed_cost_total: purchase.landed_cost_total,
            items: editedItems.map(i => ({
                spare_id: Number(i.spare_id),
                part_code: i.part_code,
                part_description: i.part_description,
                quantity: Number(i.quantity),
                unit_cost: Number(i.unit_cost),
                discount: Number(i.discount || 0),
                tax_amount: Number(i.tax_amount || 0),
                gst_percentage: Number(i.gst_percentage || 0),
                verification_status: 'CONFIRMED'
            }))
        }
        verifyMutation.mutate(payload)
    }

    const handleApprove = () => {
        if (!confirm('Approve this purchase receipt? This will finalize the landed costs and update inventory.')) return
        approveMutation.mutate()
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/procurement')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">Invoice Review</h1>
                            <StatusBadge status={purchase.status || 'DRAFT'} />
                        </div>
                        <p className="text-gray-500 text-sm mt-1">Receipt #{purchase.spare_purchase_id} • Vendor: {purchase.vendor_name}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {isVerifiable && hasRole(['ADMIN', 'DEALER']) && (
                        <button 
                            onClick={handleVerify}
                            disabled={verifyMutation.isPending}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {verifyMutation.isPending ? 'Verifying...' : 'Verify Invoice'}
                        </button>
                    )}
                    {isApprovable && hasRole(['ADMIN']) && (
                        <button 
                            onClick={handleApprove}
                            disabled={approveMutation.isPending}
                            className="btn btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700"
                        >
                            <Check className="w-4 h-4" />
                            {approveMutation.isPending ? 'Approving...' : 'Approve Receipt'}
                        </button>
                    )}
                    {purchase.status === 'APPROVED' && hasRole(['ADMIN', 'DEALER']) && (
                        <button 
                            onClick={() => setIsPostingModalOpen(true)}
                            className="btn btn-primary flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
                        >
                            <Package className="w-4 h-4" />
                            Post to Inventory
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Header Information */}
                <div className="col-span-1 space-y-6">
                    <div className="card">
                        <h3 className="font-semibold text-lg border-b pb-2 mb-4">Document Details</h3>
                        <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-2">
                                <span className="text-gray-500">Invoice No</span>
                                <span className="font-medium">{purchase.vendor_invoice_no || '-'}</span>
                            </div>
                            <div className="grid grid-cols-2">
                                <span className="text-gray-500">Invoice Date</span>
                                <span className="font-medium">{purchase.vendor_invoice_date || '-'}</span>
                            </div>
                            <div className="grid grid-cols-2">
                                <span className="text-gray-500">Document</span>
                                <span className="font-medium flex items-center gap-1 text-primary-600">
                                    <FileText className="w-4 h-4" />
                                    {purchase.invoice_document_id || 'Attached'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="font-semibold text-lg border-b pb-2 mb-4">Reconciliation</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Subtotal</span>
                                <span>₹{Number(purchase.subtotal || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Tax</span>
                                <span>₹{Number(purchase.tax_total || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Charges</span>
                                <span>₹{Number(purchase.additional_charges || 0).toFixed(2)}</span>
                            </div>
                            <div className="pt-2 border-t flex justify-between items-center font-bold text-lg">
                                <span>Total</span>
                                <span>₹{Number(purchase.landed_cost_total || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Line Items */}
                <div className="col-span-1 lg:col-span-2">
                    <div className="card h-full">
                        <h3 className="font-semibold text-lg border-b pb-2 mb-4 flex items-center gap-2">
                            Extracted Line Items
                            <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">{editedItems.length}</span>
                        </h3>
                        
                        <div className="space-y-4">
                            {editedItems.map((item, index) => (
                                <div key={item.purchase_item_id || index} className={`p-4 border rounded-xl relative ${
                                    item.verification_status === 'UNKNOWN_CODE' ? 'border-red-300 bg-red-50' :
                                    item.verification_status === 'LOW_CONFIDENCE' ? 'border-amber-300 bg-amber-50' :
                                    'border-gray-200 bg-white hover:border-gray-300'
                                }`}>
                                    
                                    {/* Badges row */}
                                    <div className="flex gap-2 mb-3">
                                        <ItemVerificationBadge status={item.verification_status || 'EXTRACTED'} />
                                        {item.confidence_score && (
                                            <span className="text-[10px] font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full border">
                                                Confidence: {(Number(item.confidence_score) * 100).toFixed(0)}%
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                                        <div className="md:col-span-5">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Extracted Part</label>
                                            <div className="font-mono text-sm bg-white border px-3 py-2 rounded">
                                                {item.part_code || '-'}
                                            </div>
                                            {item.part_description && (
                                                <div className="text-xs text-gray-500 mt-1 truncate" title={item.part_description}>
                                                    {item.part_description}
                                                </div>
                                            )}
                                        </div>

                                        <div className="md:col-span-7">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Matched Spare</label>
                                            {isVerifiable ? (
                                                <select 
                                                    value={item.spare_id || ''} 
                                                    onChange={(e) => handleItemChange(index, 'spare_id', e.target.value)}
                                                    className={`input text-sm ${!item.spare_id ? 'border-red-300 focus:border-red-500' : ''}`}
                                                >
                                                    <option value="">-- Unmapped Part Code --</option>
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO(Phase1.1 Baseline): Legacy warning
                                                    {spares.map((s: any) => (
                                                        <option key={s.spare_id} value={s.spare_id}>
                                                            {s.spare_code} - {s.spare_name}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="text-sm px-3 py-2 border rounded bg-gray-50 font-medium">
                                                    {item.spare_name || 'Unmapped'}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                                            {isVerifiable ? (
                                                <input 
                                                    type="number" 
                                                    value={item.quantity} 
                                                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                    className="input text-sm"
                                                    min="1"
                                                />
                                            ) : (
                                                <div className="font-medium">{item.quantity}</div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Unit Price</label>
                                            {isVerifiable ? (
                                                <input 
                                                    type="number" 
                                                    step="0.01"
                                                    value={item.unit_cost} 
                                                    onChange={(e) => handleItemChange(index, 'unit_cost', e.target.value)}
                                                    className="input text-sm"
                                                />
                                            ) : (
                                                <div className="font-medium">₹{Number(item.unit_cost).toFixed(2)}</div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Line Total</label>
                                            <div className="font-bold text-gray-900 mt-2">
                                                ₹{(Number(item.quantity || 0) * Number(item.unit_cost || 0)).toFixed(2)}
                                            </div>
                                        </div>
                                        <div>
                                            {item.variance_amount && Number(item.variance_amount) !== 0 && (
                                                <>
                                                    <label className="block text-xs text-gray-500 mb-1">Price Variance</label>
                                                    <div className={`text-sm font-bold mt-1.5 flex items-center gap-1 ${Number(item.variance_amount) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                        {Number(item.variance_amount) > 0 ? '+' : ''}₹{Number(item.variance_amount).toFixed(2)}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            
            {isPostingModalOpen && purchase && (
                <InventoryPostingModal
                    purchase={purchase}
                    onClose={() => setIsPostingModalOpen(false)}
                />
            )}
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        'DRAFT': 'bg-gray-100 text-gray-700 border-gray-200',
        'OCR_PROCESSED': 'bg-purple-100 text-purple-700 border-purple-200',
        'PENDING_VERIFICATION': 'bg-amber-100 text-amber-700 border-amber-200',
        'VERIFIED': 'bg-blue-100 text-blue-700 border-blue-200',
        'APPROVED': 'bg-green-100 text-green-700 border-green-200',
        'POSTED': 'bg-green-100 text-green-700 border-green-200',
    }
    
    return (
        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${colors[status] || colors['DRAFT']}`}>
            {status.replace('_', ' ')}
        </span>
    )
}

function ItemVerificationBadge({ status }: { status: string }) {
    const configs: Record<string, { icon: any, text: string, classes: string }> = {
        'EXTRACTED': { icon: Info, text: 'Extracted by OCR', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
        'UNKNOWN_CODE': { icon: AlertTriangle, text: 'Unknown part code — Action required', classes: 'bg-red-50 text-red-700 border-red-200' },
        'LOW_CONFIDENCE': { icon: AlertTriangle, text: 'Low confidence — Review', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
        'CONFIRMED': { icon: CheckCircle, text: 'Confirmed', classes: 'bg-green-50 text-green-700 border-green-200' },
        'MATCHED': { icon: CheckCircle, text: 'Matched', classes: 'bg-green-50 text-green-700 border-green-200' },
    }
    
    const config = configs[status] || configs['EXTRACTED']
    const Icon = config.icon

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded border uppercase ${config.classes}`}>
            <Icon className="w-3 h-3" />
            {config.text}
        </span>
    )
}
