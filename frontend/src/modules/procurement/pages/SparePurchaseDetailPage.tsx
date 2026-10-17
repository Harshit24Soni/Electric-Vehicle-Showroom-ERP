import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { procurementApi, SparePurchaseItemResponse, SparePurchaseVerifyPayload, InvoiceGSTManifest } from '../api/procurementApi'
import { inventoryApi, SpareMasterItem } from '../../inventory/api/inventoryApi'
import { 
    ArrowLeft, CheckCircle, AlertTriangle, Info, FileText, Check, Save, Package, 
    LucideIcon, Copy, CheckCheck, Building2, ShieldCheck, Truck, CreditCard, Hash, Percent,
    Edit3, Plus, Trash2, X
} from 'lucide-react'
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
    const [copiedField, setCopiedField] = useState<string | null>(null)

    // Edit mode state for admin / authorized users
    const [isEditing, setIsEditing] = useState(false)
    const [headerEdits, setHeaderEdits] = useState<{
        vendor_invoice_no?: string
        vendor_invoice_date?: string
        purchase_date?: string
        docket_reference?: string
        remarks?: string
    } | null>(null)

    const { data: purchase, isLoading } = useQuery({
        queryKey: ['spare-purchase', purchaseId],
        queryFn: () => procurementApi.getSparePurchase(purchaseId),
    })

    const { data: spares = [] } = useQuery({
        queryKey: ['spares-list'],
        queryFn: () => inventoryApi.getSpares(),
    })

    // Local state for editable items override during verification or admin edits
    const [userEditedItems, setUserEditedItems] = useState<SparePurchaseItemResponse[] | null>(null)
    
    // Derive editable items directly during render from purchase or user edits
    const editedItems: SparePurchaseItemResponse[] = userEditedItems ?? (purchase?.items ? JSON.parse(JSON.stringify(purchase.items)) : [])

    // Parse GST manifest from purchase.remarks if stored as JSON
    const parsedManifest: InvoiceGSTManifest | null = React.useMemo(() => {
        if (!purchase?.remarks) return null
        try {
            const parsed = JSON.parse(purchase.remarks)
            if (typeof parsed === 'object' && parsed !== null) {
                return parsed as InvoiceGSTManifest
            }
        } catch {
            // Raw text remarks
        }
        return null
    }, [purchase?.remarks])

    const copyToClipboard = (text: string, fieldKey: string) => {
        navigator.clipboard.writeText(text)
        setCopiedField(fieldKey)
        toast.success(`Copied ${fieldKey}`)
        setTimeout(() => setCopiedField(null), 2000)
    }

    const isDraftOrOcr = ['DRAFT', 'OCR_PROCESSED', 'PENDING_VERIFICATION'].includes(purchase?.status || '')
    const canEdit = (isDraftOrOcr || isEditing) && hasRole(['ADMIN', 'DEALER'])
    const isApprovable = purchase?.status === 'VERIFIED'

    const verifyMutation = useMutation({
        mutationFn: (payload: SparePurchaseVerifyPayload) => procurementApi.verifySparePurchase(purchaseId, payload),
        onSuccess: () => {
            toast.success(isDraftOrOcr ? 'Invoice verified successfully' : 'Invoice updated successfully')
            setIsEditing(false)
            setHeaderEdits(null)
            setUserEditedItems(null)
            queryClient.invalidateQueries({ queryKey: ['spare-purchase', purchaseId] })
            queryClient.invalidateQueries({ queryKey: ['spare-purchases'] })
        },
        onError: (error: AxiosError<{ detail?: string }>) => {
            toast.error(error.response?.data?.detail || 'Failed to save invoice')
        }
    })

    const approveMutation = useMutation({
        mutationFn: () => procurementApi.approveSparePurchase(purchaseId),
        onSuccess: () => {
            toast.success('Receipt approved successfully')
            queryClient.invalidateQueries({ queryKey: ['spare-purchase', purchaseId] })
            queryClient.invalidateQueries({ queryKey: ['spare-purchases'] })
        },
        onError: (error: AxiosError<{ detail?: string }>) => {
            toast.error(error.response?.data?.detail || 'Failed to approve receipt')
        }
    })

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading purchase details...</div>
    if (!purchase) return <div className="p-8 text-center text-red-500">Purchase not found</div>

    // Header values (merged with edits)
    const currentInvoiceNo = headerEdits?.vendor_invoice_no !== undefined ? headerEdits.vendor_invoice_no : (purchase.vendor_invoice_no || '')
    const currentInvoiceDate = headerEdits?.vendor_invoice_date !== undefined ? headerEdits.vendor_invoice_date : (purchase.vendor_invoice_date || '')
    const currentPurchaseDate = headerEdits?.purchase_date !== undefined ? headerEdits.purchase_date : (purchase.purchase_date || '')
    const currentDocketRef = headerEdits?.docket_reference !== undefined ? headerEdits.docket_reference : (purchase.docket_reference || '')

    const handleHeaderChange = (field: string, value: string) => {
        setHeaderEdits(prev => ({
            vendor_invoice_no: prev?.vendor_invoice_no ?? purchase.vendor_invoice_no ?? '',
            vendor_invoice_date: prev?.vendor_invoice_date ?? purchase.vendor_invoice_date ?? '',
            purchase_date: prev?.purchase_date ?? purchase.purchase_date ?? '',
            docket_reference: prev?.docket_reference ?? purchase.docket_reference ?? '',
            remarks: prev?.remarks ?? purchase.remarks ?? '',
            [field]: value,
        }))
    }

    const handleItemChange = (index: number, field: keyof SparePurchaseItemResponse, value: string | number) => {
        const newItems: SparePurchaseItemResponse[] = JSON.parse(JSON.stringify(editedItems))
        newItems[index] = {
            ...newItems[index],
            [field]: value
        }
        
        // Auto mark as confirmed if user edits the mapping
        if (field === 'spare_id') {
            newItems[index].verification_status = 'CONFIRMED'
            
            // Look up the name to keep UI consistent
            const spare = (spares as SpareMasterItem[]).find(s => s.spare_id === Number(value))
            if (spare) {
                newItems[index].spare_name = `${spare.spare_code} — ${spare.spare_name}`
            }
        }

        // Dynamically calculate tax and total when quantity, price, or GST rate changes
        if (field === 'quantity' || field === 'unit_cost' || field === 'gst_percentage' || field === 'discount') {
            const qty = Number(newItems[index].quantity || 0)
            const unit = Number(newItems[index].unit_cost || 0)
            const gst = Number(newItems[index].gst_percentage || 0)
            const disc = Number(newItems[index].discount || 0)
            const baseAmount = Math.max(0, (qty * unit) - disc)
            const tax = (baseAmount * gst) / 100
            newItems[index].tax_amount = Number(tax.toFixed(2))
            newItems[index].total_cost = Number((baseAmount + tax).toFixed(2))
        }
        
        setUserEditedItems(newItems)
    }

    const handleAddItem = () => {
        const newItem: SparePurchaseItemResponse = {
            purchase_item_id: 0,
            spare_id: undefined,
            spare_name: '',
            part_code: '',
            part_description: '',
            quantity: 1,
            unit_cost: 0,
            discount: 0,
            tax_amount: 0,
            gst_percentage: 18,
            total_cost: 0,
            verification_status: 'CONFIRMED'
        }
        setUserEditedItems([...editedItems, newItem])
    }

    const handleRemoveItem = (index: number) => {
        if (editedItems.length <= 1) {
            toast.error('Invoice must contain at least one line item.')
            return
        }
        const newItems = editedItems.filter((_, i) => i !== index)
        setUserEditedItems(newItems)
    }

    const handleCancelEdit = () => {
        setIsEditing(false)
        setHeaderEdits(null)
        setUserEditedItems(null)
    }

    // Dynamic totals calculation
    const computedSubtotal = editedItems.reduce((acc, i) => acc + (Number(i.quantity || 0) * Number(i.unit_cost || 0)), 0)
    const computedTaxTotal = editedItems.reduce((acc, i) => acc + Number(i.tax_amount || 0), 0)
    const computedTotal = computedSubtotal + computedTaxTotal + Number(purchase.additional_charges || 0)

    const displaySubtotal = canEdit ? computedSubtotal : Number(purchase.subtotal || 0)
    const displayTaxTotal = canEdit ? computedTaxTotal : Number(purchase.tax_total || 0)
    const displayGrandTotal = canEdit ? computedTotal : Number(purchase.landed_cost_total || 0)

    const handleSave = () => {
        // Validate mappings
        const unmapped = editedItems.filter(i => !i.spare_id)
        if (unmapped.length > 0) {
            toast.error(`There are ${unmapped.length} unmapped parts. Please select or map each part before saving.`)
            return
        }

        const invalidCost = editedItems.filter(i => Number(i.unit_cost || 0) <= 0)
        if (invalidCost.length > 0) {
            toast.error('All line items must have a valid unit price greater than 0.')
            return
        }

        const payload: SparePurchaseVerifyPayload = {
            vendor_id: purchase.vendor_id,
            vendor_invoice_no: currentInvoiceNo,
            vendor_invoice_date: currentInvoiceDate || undefined,
            purchase_date: currentPurchaseDate,
            remarks: headerEdits?.remarks ?? purchase.remarks,
            docket_reference: currentDocketRef || undefined,
            include_in_accounting: true,
            status: isDraftOrOcr ? 'VERIFIED' : (purchase.status || 'VERIFIED'),
            subtotal: Number(computedSubtotal.toFixed(2)),
            tax_total: Number(computedTaxTotal.toFixed(2)),
            additional_charges: purchase.additional_charges,
            landed_cost_total: Number(computedTotal.toFixed(2)),
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
        if (!confirm('Approve this purchase receipt? This will finalize landed costs and enable inventory posting.')) return
        approveMutation.mutate()
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Top Action Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/procurement')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">Purchase Receipt & Invoice Review</h1>
                            <StatusBadge status={purchase.status || 'DRAFT'} />
                        </div>
                        <p className="text-gray-500 text-sm mt-1">
                            Receipt #{purchase.spare_purchase_id} • Vendor: <strong className="text-gray-800">{purchase.vendor_name || `Vendor #${purchase.vendor_id}`}</strong>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Editing mode actions */}
                    {isEditing ? (
                        <>
                            <button 
                                type="button"
                                onClick={handleCancelEdit}
                                className="btn btn-outline flex items-center gap-1.5 border-gray-300 hover:bg-gray-100 text-gray-700"
                            >
                                <X className="w-4 h-4" />
                                Cancel
                            </button>
                            <button 
                                type="button"
                                onClick={handleSave}
                                disabled={verifyMutation.isPending}
                                className="btn btn-primary flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700"
                            >
                                <Save className="w-4 h-4" />
                                {verifyMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Verification for DRAFT / OCR */}
                            {isDraftOrOcr && hasRole(['ADMIN', 'DEALER']) && (
                                <button 
                                    onClick={handleSave}
                                    disabled={verifyMutation.isPending}
                                    className="btn btn-primary flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    {verifyMutation.isPending ? 'Verifying...' : 'Verify Invoice'}
                                </button>
                            )}

                            {/* Edit Invoice button always available for Admin / Dealer */}
                            {!isDraftOrOcr && hasRole(['ADMIN', 'DEALER']) && (
                                <button 
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    className="btn btn-outline flex items-center gap-2 border-gray-300 hover:bg-gray-50 text-gray-700 font-medium"
                                >
                                    <Edit3 className="w-4 h-4 text-gray-600" />
                                    Edit Invoice
                                </button>
                            )}

                            {/* Approve button for VERIFIED invoices */}
                            {isApprovable && hasRole(['ADMIN', 'DEALER']) && (
                                <button 
                                    onClick={handleApprove}
                                    disabled={approveMutation.isPending}
                                    className="btn btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700"
                                >
                                    <Check className="w-4 h-4" />
                                    {approveMutation.isPending ? 'Approving...' : 'Approve Receipt'}
                                </button>
                            )}

                            {/* Post to Inventory for APPROVED invoices */}
                            {purchase.status === 'APPROVED' && hasRole(['ADMIN', 'DEALER']) && (
                                <button 
                                    onClick={() => setIsPostingModalOpen(true)}
                                    className="btn btn-primary flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
                                >
                                    <Package className="w-4 h-4" />
                                    Post to Inventory
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Column: Metadata & GST Compliance Manifest */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Basic Invoice Info */}
                    <div className="card">
                        <div className="flex items-center justify-between border-b pb-2 mb-3">
                            <h3 className="font-semibold text-base flex items-center gap-2 text-gray-900">
                                <FileText className="w-4 h-4 text-primary-600" />
                                Invoice Header
                            </h3>
                            {canEdit && (
                                <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    Editable
                                </span>
                            )}
                        </div>
                        <div className="space-y-2.5 text-sm">
                            <div className="flex justify-between items-center gap-2">
                                <span className="text-gray-500 shrink-0">Invoice No</span>
                                {canEdit ? (
                                    <input
                                        type="text"
                                        value={currentInvoiceNo}
                                        onChange={(e) => handleHeaderChange('vendor_invoice_no', e.target.value)}
                                        className="input text-xs font-mono py-1 px-2 w-48 text-right"
                                        placeholder="e.g. 98068444"
                                    />
                                ) : (
                                    <span className="font-semibold font-mono text-gray-900">{purchase.vendor_invoice_no || '-'}</span>
                                )}
                            </div>
                            <div className="flex justify-between items-center gap-2">
                                <span className="text-gray-500 shrink-0">Invoice Date</span>
                                {canEdit ? (
                                    <input
                                        type="date"
                                        value={currentInvoiceDate}
                                        onChange={(e) => handleHeaderChange('vendor_invoice_date', e.target.value)}
                                        className="input text-xs py-1 px-2 w-40"
                                    />
                                ) : (
                                    <span className="font-medium text-gray-800">{purchase.vendor_invoice_date || '-'}</span>
                                )}
                            </div>
                            {parsedManifest?.supply_date_time && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Date/Time of Supply</span>
                                    <span className="font-medium text-gray-800">{parsedManifest.supply_date_time}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center gap-2">
                                <span className="text-gray-500 shrink-0">Purchase Date</span>
                                {canEdit ? (
                                    <input
                                        type="date"
                                        value={currentPurchaseDate}
                                        onChange={(e) => handleHeaderChange('purchase_date', e.target.value)}
                                        className="input text-xs py-1 px-2 w-40"
                                    />
                                ) : (
                                    <span className="font-medium text-gray-800">{purchase.purchase_date || '-'}</span>
                                )}
                            </div>
                            <div className="flex justify-between items-center gap-2 pt-2 border-t">
                                <span className="text-gray-500 shrink-0">Docket / Ref</span>
                                {canEdit ? (
                                    <input
                                        type="text"
                                        value={currentDocketRef}
                                        onChange={(e) => handleHeaderChange('docket_reference', e.target.value)}
                                        className="input text-xs font-mono py-1 px-2 w-48 text-right"
                                        placeholder="Docket or reference"
                                    />
                                ) : (
                                    purchase.docket_reference ? (
                                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700 truncate max-w-[180px]" title={purchase.docket_reference}>
                                            {purchase.docket_reference}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 text-xs">-</span>
                                    )
                                )}
                            </div>
                        </div>
                    </div>

                    {/* GST & Regulatory Compliance Card */}
                    {parsedManifest && (
                        <div className="card border-blue-100 bg-gradient-to-b from-blue-50/40 to-white">
                            <h3 className="font-semibold text-base border-b pb-2 mb-3 flex items-center gap-2 text-blue-900">
                                <ShieldCheck className="w-4 h-4 text-blue-600" />
                                GST & Logistics Compliance
                            </h3>
                            
                            <div className="space-y-3 text-sm">
                                {/* IRN Hash */}
                                {parsedManifest.irn && (
                                    <div className="bg-white p-2.5 rounded-lg border border-blue-200">
                                        <div className="flex items-center justify-between text-xs text-blue-800 mb-1">
                                            <span className="font-semibold flex items-center gap-1">
                                                <Hash className="w-3.5 h-3.5" /> E-Invoice IRN
                                            </span>
                                            <button 
                                                onClick={() => copyToClipboard(parsedManifest.irn || '', 'IRN')}
                                                className="text-primary-600 hover:text-primary-800 flex items-center gap-1 font-medium"
                                            >
                                                {copiedField === 'IRN' ? <CheckCheck className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                {copiedField === 'IRN' ? 'Copied' : 'Copy'}
                                            </button>
                                        </div>
                                        <p className="font-mono text-[11px] text-gray-700 break-all leading-tight">
                                            {parsedManifest.irn}
                                        </p>
                                    </div>
                                )}

                                {/* Supplier GSTIN & PAN */}
                                <div className="bg-white p-2.5 rounded-lg border border-gray-200 space-y-1.5">
                                    <div className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                                        <Building2 className="w-3.5 h-3.5 text-gray-500" /> Supplier Tax Identifiers
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-gray-400 block">GSTIN</span>
                                            <span className="font-mono font-medium text-gray-900">{parsedManifest.supplier_gstin || 'Not Detected'}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 block">PAN</span>
                                            <span className="font-mono font-medium text-gray-900">{parsedManifest.supplier_pan || 'Not Detected'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Buyer GSTIN & PAN */}
                                <div className="bg-white p-2.5 rounded-lg border border-gray-200 space-y-1.5">
                                    <div className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                                        <Building2 className="w-3.5 h-3.5 text-gray-500" /> Buyer (Dealership) Tax Identifiers
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-gray-400 block">GSTIN</span>
                                            <span className="font-mono font-medium text-gray-900">{parsedManifest.buyer_gstin || 'Not Detected'}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 block">PAN</span>
                                            <span className="font-mono font-medium text-gray-900">{parsedManifest.buyer_pan || 'Not Detected'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Logistics Details */}
                                {(parsedManifest.dispatch_plant || parsedManifest.sales_office || parsedManifest.incoterms) && (
                                    <div className="bg-white p-2.5 rounded-lg border border-gray-200 space-y-1.5">
                                        <div className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                                            <Truck className="w-3.5 h-3.5 text-gray-500" /> Dispatch & Terms
                                        </div>
                                        <div className="space-y-1 text-xs">
                                            {parsedManifest.dispatch_plant && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Dispatch Plant:</span>
                                                    <span className="font-medium text-gray-800">{parsedManifest.dispatch_plant}</span>
                                                </div>
                                            )}
                                            {parsedManifest.sales_office && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Sales Office / Depot:</span>
                                                    <span className="font-medium text-gray-800">{parsedManifest.sales_office}</span>
                                                </div>
                                            )}
                                            {parsedManifest.incoterms && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Incoterms:</span>
                                                    <span className="font-medium text-gray-800">{parsedManifest.incoterms}</span>
                                                </div>
                                            )}
                                            {parsedManifest.terms_of_payment && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Payment Terms:</span>
                                                    <span className="font-medium text-gray-800">{parsedManifest.terms_of_payment}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Bank Virtual Account */}
                                {parsedManifest.virtual_account_no && (
                                    <div className="bg-white p-2.5 rounded-lg border border-gray-200 flex justify-between items-center text-xs">
                                        <span className="text-gray-500 flex items-center gap-1">
                                            <CreditCard className="w-3.5 h-3.5 text-gray-400" /> Remittance A/C
                                        </span>
                                        <span className="font-mono font-medium text-gray-900">{parsedManifest.virtual_account_no}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Financial & Tax Reconciliation */}
                    <div className="card">
                        <h3 className="font-semibold text-base border-b pb-2 mb-4 text-gray-900">Tax & Reconciliation</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">Subtotal (Assessable Value)</span>
                                <span className="font-medium">₹{displaySubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 flex items-center gap-1">
                                    <Percent className="w-3.5 h-3.5 text-gray-400" />
                                    Total GST (18%)
                                </span>
                                <span className="font-medium text-primary-700 font-mono">
                                    ₹{displayTaxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            
                            {/* Breakdown CGST + SGST (assuming intra-state 9+9) */}
                            {displayTaxTotal > 0 && (
                                <div className="text-xs bg-gray-50 p-2 rounded space-y-1 text-gray-500">
                                    <div className="flex justify-between">
                                        <span>CGST (9.0%):</span>
                                        <span>₹{(displayTaxTotal / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>SGST (9.0%):</span>
                                        <span>₹{(displayTaxTotal / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            )}

                            {Number(purchase.additional_charges || 0) > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Additional Charges / Freight</span>
                                    <span>₹{Number(purchase.additional_charges || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            )}
                            <div className="pt-3 border-t flex justify-between items-center font-bold text-lg text-gray-900">
                                <span>Grand Total</span>
                                <span className="text-green-700">₹{displayGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Extracted Line Items */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="card">
                        <div className="flex items-center justify-between border-b pb-3 mb-4">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg text-gray-900">Extracted Line Items</h3>
                                <span className="bg-primary-50 text-primary-700 text-xs px-2.5 py-0.5 rounded-full font-medium border border-primary-200">
                                    {editedItems.length} items
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {canEdit && (
                                    <button
                                        type="button"
                                        onClick={handleAddItem}
                                        className="btn btn-outline text-xs py-1 px-2.5 flex items-center gap-1 border-primary-300 text-primary-700 hover:bg-primary-50"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Part
                                    </button>
                                )}
                                {canEdit && (
                                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200 font-medium">
                                        Edit Mode Active
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            {editedItems.map((item, index) => {
                                const matchedSpare = (spares as SpareMasterItem[]).find(s => s.spare_id === Number(item.spare_id))
                                const spareDisplayName = item.spare_name || (matchedSpare ? `${matchedSpare.spare_code} — ${matchedSpare.spare_name}` : null) || (item.spare_id ? `Spare Part #${item.spare_id}` : null)

                                return (
                                    <div key={item.purchase_item_id || `idx-${index}`} className={`p-4 border rounded-xl relative transition-all ${
                                        item.verification_status === 'UNKNOWN_CODE' ? 'border-red-300 bg-red-50/40' :
                                        item.verification_status === 'LOW_CONFIDENCE' ? 'border-amber-300 bg-amber-50/40' :
                                        'border-gray-200 bg-white hover:border-gray-300 shadow-sm'
                                    }`}>
                                        
                                        {/* Top Bar: Verification Badge & Confidence & GST & Delete Action */}
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                                                    #{index + 1}
                                                </span>
                                                <ItemVerificationBadge status={item.verification_status || 'EXTRACTED'} />
                                                {item.confidence_score && (
                                                    <span className="text-[11px] font-medium px-2 py-0.5 bg-gray-50 text-gray-600 rounded-full border">
                                                        Confidence: {(Number(item.confidence_score) * 100).toFixed(0)}%
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {/* GST Badge */}
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                                                    <Percent className="w-3 h-3" />
                                                    <span>GST: {item.gst_percentage ? `${item.gst_percentage}%` : '18%'}</span>
                                                </div>

                                                {/* Delete item button if editing */}
                                                {canEdit && editedItems.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(index)}
                                                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                        title="Remove line item"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Part Mapping Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                                            <div className="md:col-span-5">
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">OEM Part Code & Description</label>
                                                {canEdit ? (
                                                    <div className="space-y-1.5">
                                                        <input
                                                            type="text"
                                                            value={item.part_code || ''}
                                                            onChange={(e) => handleItemChange(index, 'part_code', e.target.value)}
                                                            placeholder="OEM Code"
                                                            className="input text-xs font-mono font-semibold py-1 px-2.5 w-full"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={item.part_description || ''}
                                                            onChange={(e) => handleItemChange(index, 'part_description', e.target.value)}
                                                            placeholder="Part Description"
                                                            className="input text-xs py-1 px-2.5 w-full text-gray-700"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div className="font-mono text-sm font-semibold bg-gray-50 border px-3 py-2 rounded text-gray-900">
                                                            {item.part_code || '-'}
                                                        </div>
                                                        {item.part_description && (
                                                            <div className="text-xs text-gray-600 mt-1.5 leading-relaxed" title={item.part_description}>
                                                                {item.part_description}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="md:col-span-7">
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">
                                                    Mapped Inventory Spare Part <span className="text-red-500">*</span>
                                                </label>
                                                {canEdit ? (
                                                    <select 
                                                        value={item.spare_id || ''} 
                                                        onChange={(e) => handleItemChange(index, 'spare_id', e.target.value)}
                                                        className={`input text-sm w-full ${!item.spare_id ? 'border-red-400 bg-red-50/50 focus:border-red-500' : 'border-green-300'}`}
                                                    >
                                                        <option value="">-- Select or Map Part Code --</option>
                                                        {spares.map((s: SpareMasterItem) => (
                                                            <option key={s.spare_id} value={s.spare_id}>
                                                                {s.spare_code} — {s.spare_name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div className="text-sm px-3 py-2 border rounded bg-gray-50 font-medium text-gray-800">
                                                        {spareDisplayName ? (
                                                            <span className="flex items-center gap-1.5">
                                                                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                                                                <span>{spareDisplayName}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-red-600 font-semibold flex items-center gap-1">
                                                                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                                                                Unmapped
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Costing & Tax Breakdown Grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 pt-3 border-t border-gray-100 bg-gray-50/50 p-2.5 rounded-lg">
                                            <div>
                                                <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Quantity</label>
                                                {canEdit ? (
                                                    <input 
                                                        type="number" 
                                                        value={item.quantity} 
                                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                        className="input text-sm h-8 py-1"
                                                        min="1"
                                                    />
                                                ) : (
                                                    <div className="font-semibold text-gray-900">{item.quantity}</div>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Unit Price (Excl. Tax)</label>
                                                {canEdit ? (
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        value={item.unit_cost} 
                                                        onChange={(e) => handleItemChange(index, 'unit_cost', e.target.value)}
                                                        className="input text-sm h-8 py-1"
                                                    />
                                                ) : (
                                                    <div className="font-medium text-gray-900">₹{Number(item.unit_cost).toFixed(2)}</div>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-medium text-gray-500 mb-0.5">GST Rate %</label>
                                                {canEdit ? (
                                                    <input 
                                                        type="number" 
                                                        step="1"
                                                        value={item.gst_percentage ?? 18} 
                                                        onChange={(e) => handleItemChange(index, 'gst_percentage', e.target.value)}
                                                        className="input text-sm h-8 py-1 font-mono"
                                                    />
                                                ) : (
                                                    <div className="font-medium text-gray-900">{item.gst_percentage ?? 18}%</div>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-medium text-gray-500 mb-0.5">Tax Amount</label>
                                                <div className="font-medium text-gray-800 text-sm mt-1">
                                                    ₹{Number(item.tax_amount ?? ((Number(item.quantity || 0) * Number(item.unit_cost || 0) * 18) / 100)).toFixed(2)}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Line Total (Incl. Tax)</label>
                                                <div className="font-bold text-gray-900 text-sm mt-1">
                                                    ₹{Number(
                                                        item.total_cost ?? (
                                                            (Number(item.quantity || 0) * Number(item.unit_cost || 0)) + 
                                                            Number(item.tax_amount || 0)
                                                        )
                                                    ).toFixed(2)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Variance indicator if present */}
                                        {item.variance_amount && Number(item.variance_amount) !== 0 && (
                                            <div className="mt-2 text-xs flex items-center gap-1.5">
                                                <span className="text-gray-500">Historical Price Variance:</span>
                                                <span className={`font-semibold ${Number(item.variance_amount) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {Number(item.variance_amount) > 0 ? '+' : ''}₹{Number(item.variance_amount).toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
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
    const configs: Record<string, { icon: LucideIcon, text: string, classes: string }> = {
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
