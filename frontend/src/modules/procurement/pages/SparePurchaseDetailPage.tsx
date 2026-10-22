import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { procurementApi, SparePurchaseItemResponse, SparePurchaseVerifyPayload, InvoiceGSTManifest } from '../api/procurementApi'
import { inventoryApi, SpareMasterItem, SpareMasterCreate } from '../../inventory/api/inventoryApi'
import { 
    ArrowLeft, CheckCircle, AlertTriangle, Info, FileText, Check, Save, Package, 
    LucideIcon, Copy, CheckCheck, Building2, ShieldCheck, Truck, CreditCard, Hash, Percent,
    Edit3, Plus, Trash2, X, Search, Sparkles, AlertCircle, CheckCircle2, ChevronDown, 
    HelpCircle, RefreshCw, Calculator, Filter, ArrowRight, ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../store/authStore'
import InventoryPostingModal from '../components/InventoryPostingModal'

// Diagnostic Issue Types
export interface ItemIssue {
    type: 'UNMAPPED' | 'ZERO_QUANTITY' | 'ZERO_PRICE' | 'SUSPECTED_TAX' | 'ANOMALY' | 'LOW_CONFIDENCE'
    severity: 'CRITICAL' | 'WARNING'
    title: string
    description: string
    suggestion: string
}

export function getItemIssues(item: SparePurchaseItemResponse): ItemIssue[] {
    const issues: ItemIssue[] = []
    const codeUpper = (item.part_code || '').toUpperCase().trim()
    const descUpper = (item.part_description || '').toUpperCase().trim()

    // 1. Suspected Tax / Summary row from invoice footer
    const isTaxRow = 
        codeUpper.includes('CGST') || codeUpper.includes('SGST') || codeUpper.includes('IGST') ||
        descUpper.includes('CGST') || descUpper.includes('SGST') || descUpper.includes('IGST') ||
        codeUpper.includes('ROUND OFF') || descUpper.includes('ROUND OFF') ||
        codeUpper === 'TAX' || descUpper === 'TAX' ||
        codeUpper.includes('TOTAL') || descUpper === 'TOTAL'

    if (isTaxRow) {
        issues.push({
            type: 'SUSPECTED_TAX',
            severity: 'CRITICAL',
            title: 'Suspected Tax / Invoice Summary Row',
            description: `This line appears to be a GST tax calculation or invoice summary row ('${item.part_code || item.part_description}') extracted from the bill footer, not a physical spare part.`,
            suggestion: 'Click "Remove Non-Part Line" to discard this row from spare inventory purchase items.'
        })
    }

    // 2. Unmapped Part Code
    if (!item.spare_id) {
        issues.push({
            type: 'UNMAPPED',
            severity: 'CRITICAL',
            title: 'Unmapped Part Code',
            description: `OEM part code "${item.part_code || 'N/A'}" is not linked to any Spare Part in your master catalog.`,
            suggestion: 'Search & map to an existing catalog part, or click "+ Quick Create Part" to register it instantly.'
        })
    }

    // 3. Zero / Invalid Quantity
    if (!item.quantity || Number(item.quantity) <= 0) {
        issues.push({
            type: 'ZERO_QUANTITY',
            severity: 'CRITICAL',
            title: 'Missing / Zero Quantity',
            description: 'Quantity cannot be 0. Inventory receipts require at least 1 unit.',
            suggestion: 'Enter the physical quantity received from the supplier invoice.'
        })
    }

    // 4. Missing / Zero Unit Cost
    if (!item.unit_cost || Number(item.unit_cost) <= 0) {
        issues.push({
            type: 'ZERO_PRICE',
            severity: 'CRITICAL',
            title: 'Missing Purchase Unit Rate',
            description: 'Purchase unit price (excl. GST) cannot be ₹0.00.',
            suggestion: 'Enter the assessable unit purchase rate from the vendor bill.'
        })
    }

    // 5. Low confidence from OCR
    if (item.confidence_score && Number(item.confidence_score) < 0.85 && item.verification_status !== 'CONFIRMED') {
        issues.push({
            type: 'LOW_CONFIDENCE',
            severity: 'WARNING',
            title: 'Low OCR Confidence',
            description: `OCR model had low confidence (${(Number(item.confidence_score) * 100).toFixed(0)}%) reading this text.`,
            suggestion: 'Verify the part code, description, quantity, and rate against the physical invoice.'
        })
    }

    // 6. Value anomaly
    if (Number(item.quantity) >= 500 || Number(item.total_cost) >= 500000) {
        issues.push({
            type: 'ANOMALY',
            severity: 'WARNING',
            title: 'High Value / Quantity Anomaly',
            description: `Extracted quantity (${item.quantity}) or line total (₹${Number(item.total_cost).toLocaleString('en-IN')}) is unusually high.`,
            suggestion: 'Confirm whether OCR misread a part number, HSN code, or price as quantity.'
        })
    }

    return issues
}

export default function SparePurchaseDetailPage() {
    const { id } = useParams<{ id: string }>()
    const purchaseId = Number(id)
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const { user, hasRole } = useAuthStore()
    const [isPostingModalOpen, setIsPostingModalOpen] = useState(false)
    const [copiedField, setCopiedField] = useState<string | null>(null)

    // Edit mode state
    const [isEditing, setIsEditing] = useState(false)
    const [headerEdits, setHeaderEdits] = useState<{
        vendor_invoice_no?: string
        vendor_invoice_date?: string
        purchase_date?: string
        docket_reference?: string
        remarks?: string
    } | null>(null)

    // Filter & Search state
    const [filterMode, setFilterMode] = useState<'ALL' | 'FLAGGED' | 'READY'>('ALL')
    const [searchQuery, setSearchQuery] = useState('')

    // Quick Create Part Modal State
    const [quickCreateItemIndex, setQuickCreateItemIndex] = useState<number | null>(null)

    const { data: purchase, isLoading } = useQuery({
        queryKey: ['spare-purchase', purchaseId],
        queryFn: () => procurementApi.getSparePurchase(purchaseId),
    })

    const { data: spares = [] } = useQuery({
        queryKey: ['spares-list'],
        queryFn: () => inventoryApi.getSpares(),
    })

    // Local state for editable items
    const [userEditedItems, setUserEditedItems] = useState<SparePurchaseItemResponse[] | null>(null)
    const editedItems: SparePurchaseItemResponse[] = userEditedItems ?? (purchase?.items ? JSON.parse(JSON.stringify(purchase.items)) : [])

    // Parse GST manifest from purchase.remarks if stored as JSON
    const parsedManifest: InvoiceGSTManifest | null = useMemo(() => {
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
    // Allow editing for Admin, Dealer, Staff, or when explicitly toggled into Edit Mode
    const canEdit = isDraftOrOcr || isEditing || hasRole(['ADMIN', 'DEALER']) || Boolean(user)
    const isApprovable = purchase?.status === 'VERIFIED'

    const verifyMutation = useMutation({
        mutationFn: (payload: SparePurchaseVerifyPayload) => procurementApi.verifySparePurchase(purchaseId, payload),
        onSuccess: () => {
            toast.success(isDraftOrOcr ? 'Invoice verified successfully!' : 'Invoice updated successfully!')
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
            toast.success('Receipt approved successfully! Landed costs finalized.')
            queryClient.invalidateQueries({ queryKey: ['spare-purchase', purchaseId] })
            queryClient.invalidateQueries({ queryKey: ['spare-purchases'] })
        },
        onError: (error: AxiosError<{ detail?: string }>) => {
            toast.error(error.response?.data?.detail || 'Failed to approve receipt')
        }
    })

    // Header values (merged with edits)
    const currentInvoiceNo = headerEdits?.vendor_invoice_no !== undefined ? headerEdits.vendor_invoice_no : (purchase?.vendor_invoice_no || '')
    const currentInvoiceDate = headerEdits?.vendor_invoice_date !== undefined ? headerEdits.vendor_invoice_date : (purchase?.vendor_invoice_date || '')
    const currentPurchaseDate = headerEdits?.purchase_date !== undefined ? headerEdits.purchase_date : (purchase?.purchase_date || '')
    const currentDocketRef = headerEdits?.docket_reference !== undefined ? headerEdits.docket_reference : (purchase?.docket_reference || '')

    const handleHeaderChange = (field: string, value: string) => {
        setHeaderEdits(prev => ({
            vendor_invoice_no: prev?.vendor_invoice_no ?? purchase?.vendor_invoice_no ?? '',
            vendor_invoice_date: prev?.vendor_invoice_date ?? purchase?.vendor_invoice_date ?? '',
            purchase_date: prev?.purchase_date ?? purchase?.purchase_date ?? '',
            docket_reference: prev?.docket_reference ?? purchase?.docket_reference ?? '',
            remarks: prev?.remarks ?? purchase?.remarks ?? '',
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
            const gst = Number(newItems[index].gst_percentage ?? 18)
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
        toast.success('Added new line item. Please select part and enter price.')
    }

    const handleRemoveItem = (index: number) => {
        if (editedItems.length <= 1) {
            toast.error('Invoice must contain at least one line item.')
            return
        }
        const removed = editedItems[index]
        const newItems = editedItems.filter((_, i) => i !== index)
        setUserEditedItems(newItems)
        toast.success(`Removed line: ${removed.part_code || removed.part_description || `#${index + 1}`}`)
    }

    // Purge all detected tax summary rows in 1 click
    const handlePurgeTaxRows = () => {
        const remaining = editedItems.filter(item => {
            const issues = getItemIssues(item)
            return !issues.some(i => i.type === 'SUSPECTED_TAX')
        })
        const removedCount = editedItems.length - remaining.length
        if (removedCount > 0) {
            setUserEditedItems(remaining)
            toast.success(`Removed ${removedCount} phantom tax summary row(s).`)
        } else {
            toast('No suspected tax rows detected.')
        }
    }

    const handleCancelEdit = () => {
        setIsEditing(false)
        setHeaderEdits(null)
        setUserEditedItems(null)
        toast('Cancelled edits, reloaded saved invoice.')
    }

    // Dynamic totals calculation
    const computedSubtotal = editedItems.reduce((acc, i) => acc + (Number(i.quantity || 0) * Number(i.unit_cost || 0)), 0)
    const computedTaxTotal = editedItems.reduce((acc, i) => acc + Number(i.tax_amount || 0), 0)
    const computedTotal = computedSubtotal + computedTaxTotal + Number(purchase?.additional_charges || 0)

    const displaySubtotal = canEdit ? computedSubtotal : Number(purchase?.subtotal || 0)
    const displayTaxTotal = canEdit ? computedTaxTotal : Number(purchase?.tax_total || 0)
    const displayGrandTotal = canEdit ? computedTotal : Number(purchase?.landed_cost_total || 0)

    // Items with their diagnostics
    const itemsWithDiagnostics = useMemo(() => {
        return editedItems.map((item, index) => {
            const issues = getItemIssues(item)
            const hasCritical = issues.some(i => i.severity === 'CRITICAL')
            const hasWarning = issues.some(i => i.severity === 'WARNING')
            return {
                item,
                index,
                issues,
                hasCritical,
                hasWarning,
                isReady: issues.length === 0,
            }
        })
    }, [editedItems])

    // Filtered Items for Display
    const filteredItems = useMemo(() => {
        return itemsWithDiagnostics.filter(({ item, issues }) => {
            // Search filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim()
                const matchCode = (item.part_code || '').toLowerCase().includes(q)
                const matchDesc = (item.part_description || '').toLowerCase().includes(q)
                const matchName = (item.spare_name || '').toLowerCase().includes(q)
                if (!matchCode && !matchDesc && !matchName) return false
            }

            // Tab filter
            if (filterMode === 'FLAGGED') {
                return issues.length > 0
            }
            if (filterMode === 'READY') {
                return issues.length === 0
            }
            return true
        })
    }, [itemsWithDiagnostics, filterMode, searchQuery])

    // Aggregate issue metrics
    const totalIssuesCount = itemsWithDiagnostics.filter(i => i.issues.length > 0).length
    const unmappedCount = itemsWithDiagnostics.filter(i => i.issues.some(x => x.type === 'UNMAPPED')).length
    const suspectedTaxCount = itemsWithDiagnostics.filter(i => i.issues.some(x => x.type === 'SUSPECTED_TAX')).length
    const zeroRateOrQtyCount = itemsWithDiagnostics.filter(i => i.issues.some(x => x.type === 'ZERO_PRICE' || x.type === 'ZERO_QUANTITY')).length
    const readyCount = itemsWithDiagnostics.filter(i => i.isReady).length

    const handleSave = () => {
        // Evaluate critical blocking issues
        const criticalItems = itemsWithDiagnostics.filter(i => i.hasCritical)
        if (criticalItems.length > 0) {
            setFilterMode('FLAGGED')
            toast.error(
                `Cannot verify: ${criticalItems.length} line item(s) require action. Filtered view to show flagged items.`,
                { duration: 5000 }
            )
            return
        }

        if (!purchase) return

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
                gst_percentage: Number(i.gst_percentage || 18),
                verification_status: 'CONFIRMED'
            }))
        }
        verifyMutation.mutate(payload)
    }

    const handleApprove = () => {
        if (!confirm('Approve this purchase receipt? This will finalize landed costs and enable inventory posting.')) return
        approveMutation.mutate()
    }

    if (isLoading) {
        return (
            <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                <p className="font-medium text-slate-700">Loading purchase details & OCR scan...</p>
            </div>
        )
    }

    if (!purchase) {
        return (
            <div className="p-16 text-center text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl max-w-lg mx-auto my-12">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-rose-500" />
                <h2 className="text-xl font-bold">Purchase Record Not Found</h2>
                <p className="text-sm text-slate-600 mt-2">The requested invoice ID #{purchaseId} does not exist or has been removed.</p>
                <button onClick={() => navigate('/procurement')} className="mt-6 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold">
                    Return to Procurement
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in">
            {/* Top Navigation & Action Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/procurement')} 
                        className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors border border-slate-200 dark:border-slate-800"
                        title="Back to Procurement"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                                Purchase Receipt & Invoice Review
                            </h1>
                            <StatusBadge status={purchase.status || 'DRAFT'} />
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
                            Receipt #{purchase.spare_purchase_id} • Supplier: <strong className="text-slate-800 dark:text-slate-200">{purchase.vendor_name || `Vendor #${purchase.vendor_id}`}</strong>
                        </p>
                    </div>
                </div>

                <div className="flex items-center flex-wrap gap-2.5">
                    {/* Editing mode actions */}
                    {isEditing ? (
                        <>
                            <button 
                                type="button"
                                onClick={handleCancelEdit}
                                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors"
                            >
                                <X className="w-4 h-4" />
                                Cancel
                            </button>
                            <button 
                                type="button"
                                onClick={handleSave}
                                disabled={verifyMutation.isPending}
                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {verifyMutation.isPending ? 'Saving...' : 'Save & Verify Changes'}
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Verification for DRAFT / OCR */}
                            {isDraftOrOcr && (
                                <button 
                                    onClick={handleSave}
                                    disabled={verifyMutation.isPending}
                                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shadow-sm ${
                                        totalIssuesCount === 0 
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse' 
                                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    {verifyMutation.isPending ? 'Verifying...' : 'Verify Invoice'}
                                </button>
                            )}

                            {/* Unlock / Edit Invoice toggle button */}
                            {!isDraftOrOcr && (
                                <button 
                                    type="button"
                                    onClick={() => {
                                        setIsEditing(true)
                                        toast('Edit mode unlocked. You can now modify line items and mappings.')
                                    }}
                                    className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
                                >
                                    <Edit3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    Edit Invoice
                                </button>
                            )}

                            {/* Approve button for VERIFIED invoices */}
                            {isApprovable && (
                                <button 
                                    onClick={handleApprove}
                                    disabled={approveMutation.isPending}
                                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
                                >
                                    <Check className="w-4 h-4" />
                                    {approveMutation.isPending ? 'Approving...' : 'Approve Receipt'}
                                </button>
                            )}

                            {/* Post to Inventory for APPROVED invoices */}
                            {purchase.status === 'APPROVED' && (
                                <button 
                                    onClick={() => setIsPostingModalOpen(true)}
                                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column: Metadata & GST Compliance Manifest */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Basic Invoice Info */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h3 className="font-bold text-sm sm:text-base flex items-center gap-2 text-slate-900 dark:text-white">
                                <FileText className="w-4 h-4 text-blue-600" />
                                Invoice Header Details
                            </h3>
                            {canEdit && (
                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                    Editable
                                </span>
                            )}
                        </div>

                        <div className="space-y-3.5 text-xs sm:text-sm">
                            <div>
                                <label className="block text-slate-500 text-xs mb-1 font-medium">Invoice Number</label>
                                {canEdit ? (
                                    <input 
                                        type="text" 
                                        value={currentInvoiceNo}
                                        onChange={(e) => handleHeaderChange('vendor_invoice_no', e.target.value)}
                                        className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. 98088035"
                                    />
                                ) : (
                                    <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center justify-between">
                                        <span>{purchase.vendor_invoice_no || 'N/A'}</span>
                                        {purchase.vendor_invoice_no && (
                                            <button 
                                                onClick={() => copyToClipboard(purchase.vendor_invoice_no!, 'Invoice No')}
                                                className="p-1 text-slate-400 hover:text-slate-600"
                                            >
                                                {copiedField === 'Invoice No' ? <CheckCheck className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-500 text-xs mb-1 font-medium">Invoice Date</label>
                                    {canEdit ? (
                                        <input 
                                            type="date" 
                                            value={currentInvoiceDate}
                                            onChange={(e) => handleHeaderChange('vendor_invoice_date', e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    ) : (
                                        <div className="font-medium text-slate-800 dark:text-slate-200">{purchase.vendor_invoice_date || '-'}</div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-slate-500 text-xs mb-1 font-medium">Purchase / Inward Date</label>
                                    {canEdit ? (
                                        <input 
                                            type="date" 
                                            value={currentPurchaseDate}
                                            onChange={(e) => handleHeaderChange('purchase_date', e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    ) : (
                                        <div className="font-medium text-slate-800 dark:text-slate-200">{purchase.purchase_date}</div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-500 text-xs mb-1 font-medium">Transport / Docket Reference</label>
                                {canEdit ? (
                                    <input 
                                        type="text" 
                                        value={currentDocketRef}
                                        onChange={(e) => handleHeaderChange('docket_reference', e.target.value)}
                                        className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Docket or LR Number"
                                    />
                                ) : (
                                    <div className="font-mono text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-200 dark:border-slate-800 break-all">
                                        {purchase.docket_reference || 'No transport reference recorded'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* GST & Logistics Compliance Card */}
                    {parsedManifest && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                            <h3 className="font-bold text-sm sm:text-base border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2 text-slate-900 dark:text-white">
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                GST Compliance & Logistics
                            </h3>

                            <div className="space-y-3 text-xs">
                                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                                    <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                                        <span>Supplier Tax Identifiers</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                                        <div>
                                            <span className="text-[11px] block text-slate-400">GSTIN</span>
                                            <span className="font-mono font-medium text-slate-900 dark:text-white">{parsedManifest.supplier_gstin || 'Not Detected'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[11px] block text-slate-400">PAN</span>
                                            <span className="font-mono font-medium text-slate-900 dark:text-white">{parsedManifest.supplier_pan || 'Not Detected'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                                    <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                                        <Truck className="w-3.5 h-3.5 text-indigo-600" />
                                        <span>Dealership & Dispatch</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                                        <div>
                                            <span className="text-[11px] block text-slate-400">Buyer GSTIN</span>
                                            <span className="font-mono font-medium text-slate-900 dark:text-white">{parsedManifest.buyer_gstin || 'Not Detected'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[11px] block text-slate-400">Plant / Depot</span>
                                            <span className="font-medium text-slate-900 dark:text-white">{parsedManifest.dispatch_plant || 'Primary Depot'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Financial & Tax Reconciliation */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                        <h3 className="font-bold text-sm sm:text-base border-b border-slate-100 dark:border-slate-800 pb-3 text-slate-900 dark:text-white">
                            Tax & Landed Cost Breakdown
                        </h3>
                        <div className="space-y-3 text-xs sm:text-sm">
                            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                <span>Assessable Subtotal (Net of GST)</span>
                                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                                    ₹{displaySubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-blue-700 dark:text-blue-400">
                                <span className="flex items-center gap-1">
                                    <Percent className="w-3.5 h-3.5" />
                                    Total Input GST (18%)
                                </span>
                                <span className="font-mono font-semibold">
                                    ₹{displayTaxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            
                            {displayTaxTotal > 0 && (
                                <div className="text-xs bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 text-slate-500">
                                    <div className="flex justify-between">
                                        <span>CGST (9.0%):</span>
                                        <span className="font-mono">₹{(displayTaxTotal / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>SGST (9.0%):</span>
                                        <span className="font-mono">₹{(displayTaxTotal / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            )}

                            {Number(purchase.additional_charges || 0) > 0 && (
                                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                                    <span>Freight / Extra Charges</span>
                                    <span className="font-mono font-semibold text-slate-900 dark:text-white">
                                        ₹{Number(purchase.additional_charges || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}

                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                                <span>Grand Landed Total</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                                    ₹{displayGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Extracted Line Items & Diagnostic Rectification Studio */}
                <div className="lg:col-span-8 space-y-5">
                    
                    {/* Triage & Validation Banner */}
                    {totalIssuesCount > 0 ? (
                        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-rose-800 dark:text-rose-200 shadow-sm">
                            <div className="flex items-start gap-3">
                                <span className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 shrink-0">
                                    <AlertTriangle className="w-5 h-5" />
                                </span>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-bold text-rose-900 dark:text-rose-100">
                                            {totalIssuesCount} Line Item{totalIssuesCount > 1 ? 's' : ''} Require Attention Before Verification
                                        </p>
                                    </div>
                                    <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                                        Invoices cannot be verified with unmapped codes, zero rates, or phantom tax summary rows.
                                    </p>
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        {unmappedCount > 0 && (
                                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-200/80 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                                                {unmappedCount} Unmapped Part{unmappedCount > 1 ? 's' : ''}
                                            </span>
                                        )}
                                        {suspectedTaxCount > 0 && (
                                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                                                {suspectedTaxCount} Suspected Tax Line{suspectedTaxCount > 1 ? 's' : ''}
                                            </span>
                                        )}
                                        {zeroRateOrQtyCount > 0 && (
                                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-200/80 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
                                                {zeroRateOrQtyCount} Missing Rate/Qty
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                {suspectedTaxCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={handlePurgeTaxRows}
                                        className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center gap-1.5 shadow-sm"
                                        title="Automatically remove detected CGST/SGST/Summary lines"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Purge {suspectedTaxCount} Tax Row{suspectedTaxCount > 1 ? 's' : ''}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setFilterMode(filterMode === 'FLAGGED' ? 'ALL' : 'FLAGGED')}
                                    className="text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-sm"
                                >
                                    {filterMode === 'FLAGGED' ? 'Show All Items' : `Filter Flagged (${totalIssuesCount})`}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-emerald-800 dark:text-emerald-200 shadow-sm">
                            <div className="flex items-center gap-3">
                                <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="w-5 h-5" />
                                </span>
                                <div>
                                    <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                                        All {editedItems.length} Line Items Validated & Mapped
                                    </p>
                                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                                        All parts are recognized in your catalog, purchase rates are verified, and GST is balanced.
                                    </p>
                                </div>
                            </div>
                            {isDraftOrOcr && (
                                <button
                                    onClick={handleSave}
                                    disabled={verifyMutation.isPending}
                                    className="text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm flex items-center gap-1.5"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    {verifyMutation.isPending ? 'Verifying...' : 'Verify Now'}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Filter, Search & Add Line Item Toolbar */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mr-1 flex items-center gap-1">
                                <Filter className="w-3.5 h-3.5 text-slate-400" /> Filter:
                            </span>
                            <button
                                type="button"
                                onClick={() => setFilterMode('ALL')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                    filterMode === 'ALL'
                                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                            >
                                All Items ({itemsWithDiagnostics.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterMode('FLAGGED')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                    filterMode === 'FLAGGED'
                                        ? 'bg-rose-600 text-white shadow-sm'
                                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300'
                                }`}
                            >
                                <span>Flagged Issues</span>
                                {totalIssuesCount > 0 && (
                                    <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                                        {totalIssuesCount}
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterMode('READY')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                    filterMode === 'READY'
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300'
                                }`}
                            >
                                <span>Verified</span>
                                <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">
                                    {readyCount}
                                </span>
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by code or description..."
                                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl w-48 sm:w-56 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>

                            {canEdit && (
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add Part
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Extracted Line Items List */}
                    <div className="space-y-4">
                        {filteredItems.length === 0 ? (
                            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500">
                                <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                <p className="font-semibold text-sm">No items matching current filter</p>
                                <p className="text-xs mt-1">Try switching tabs or clearing your search query.</p>
                                <button 
                                    onClick={() => { setFilterMode('ALL'); setSearchQuery(''); }}
                                    className="mt-3 text-xs font-semibold text-blue-600 hover:underline"
                                >
                                    Reset Filters
                                </button>
                            </div>
                        ) : (
                            filteredItems.map(({ item, index, issues, hasCritical, hasWarning, isReady }) => {
                                const matchedSpare = (spares as SpareMasterItem[]).find(s => s.spare_id === Number(item.spare_id))
                                const spareDisplayName = item.spare_name || (matchedSpare ? `${matchedSpare.spare_code} — ${matchedSpare.spare_name}` : null)

                                return (
                                    <div 
                                        key={item.purchase_item_id || `item-idx-${index}`}
                                        className={`p-5 rounded-2xl border transition-all shadow-sm ${
                                            hasCritical 
                                                ? 'border-rose-300 dark:border-rose-800/80 bg-rose-50/30 dark:bg-rose-950/20' 
                                                : hasWarning
                                                ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/20'
                                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                                        }`}
                                    >
                                        {/* Card Top Header: Item Number, Verification Badge, GST, and Actions */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800/60 mb-3.5">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
                                                    #{index + 1}
                                                </span>
                                                <ItemVerificationBadge status={item.verification_status || 'EXTRACTED'} />
                                                {item.confidence_score && (
                                                    <span className="text-[11px] font-mono font-medium px-2 py-0.5 bg-slate-50 dark:bg-slate-950 text-slate-500 rounded-full border border-slate-200 dark:border-slate-800">
                                                        OCR Confidence: {(Number(item.confidence_score) * 100).toFixed(0)}%
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2.5">
                                                {/* GST Badge */}
                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800/60">
                                                    <Percent className="w-3 h-3" />
                                                    <span>GST Rate: {item.gst_percentage ? `${item.gst_percentage}%` : '18%'}</span>
                                                </div>

                                                {/* Delete Item Button */}
                                                {canEdit && editedItems.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(index)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                                                        title="Remove this line item from purchase"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Diagnostic & Rectification Guidance Box (Shown when item has any issue) */}
                                        {issues.length > 0 && (
                                            <div className="mb-4 p-3.5 rounded-xl bg-white dark:bg-slate-950 border border-rose-200 dark:border-rose-900/60 shadow-xs space-y-2.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="p-1 rounded-md bg-rose-100 dark:bg-rose-900/80 text-rose-600 dark:text-rose-300">
                                                        <AlertTriangle className="w-3.5 h-3.5" />
                                                    </span>
                                                    <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200 uppercase tracking-wide">
                                                        Diagnostics: Why this record is flagged & how to rectify
                                                    </h4>
                                                </div>

                                                <div className="space-y-2">
                                                    {issues.map((iss, iIdx) => (
                                                        <div key={iIdx} className="text-xs flex items-start gap-2 text-slate-700 dark:text-slate-300">
                                                            <span className="font-bold text-rose-600 shrink-0 mt-0.5">•</span>
                                                            <div className="flex-1">
                                                                <strong className="text-slate-900 dark:text-white mr-1">{iss.title}:</strong>
                                                                <span>{iss.description}</span>
                                                                <p className="text-[11px] text-blue-700 dark:text-blue-300 font-medium mt-0.5 flex items-center gap-1">
                                                                    <ArrowRight className="w-3 h-3" />
                                                                    <span>Action: {iss.suggestion}</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Quick Rectify Action Toolbar right in the diagnostic box */}
                                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap">
                                                    {!item.spare_id && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setQuickCreateItemIndex(index)}
                                                            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" />
                                                            + Quick Create Part in Catalog
                                                        </button>
                                                    )}

                                                    {issues.some(x => x.type === 'SUSPECTED_TAX') && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveItem(index)}
                                                            className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            Remove Non-Part Tax Line
                                                        </button>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const qty = Math.max(1, Number(item.quantity || 1))
                                                            const rate = Number(item.unit_cost || 0)
                                                            const gst = Number(item.gst_percentage ?? 18)
                                                            handleItemChange(index, 'quantity', qty)
                                                            handleItemChange(index, 'unit_cost', rate)
                                                            handleItemChange(index, 'gst_percentage', gst)
                                                            toast.success('Recalculated line amounts')
                                                        }}
                                                        className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors"
                                                    >
                                                        <Calculator className="w-3 h-3 text-slate-500" />
                                                        Auto-Balance Totals
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Part Mapping Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                                            {/* OEM Part Code & Description */}
                                            <div className="md:col-span-5 space-y-1.5">
                                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                                                    OEM Extracted Code & Description
                                                </label>
                                                {canEdit ? (
                                                    <div className="space-y-2">
                                                        <input
                                                            type="text"
                                                            value={item.part_code || ''}
                                                            onChange={(e) => handleItemChange(index, 'part_code', e.target.value)}
                                                            placeholder="OEM Part Code"
                                                            className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={item.part_description || ''}
                                                            onChange={(e) => handleItemChange(index, 'part_description', e.target.value)}
                                                            placeholder="OEM Description (e.g. NXG FOOT MAT-BLUE)"
                                                            className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                                                        <div className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                                            {item.part_code || '-'}
                                                        </div>
                                                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                                            {item.part_description || 'No description provided'}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Mapped Catalog Spare Part (Searchable Combobox) */}
                                            <div className="md:col-span-7 space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                                        Mapped Dealership Spare Part <span className="text-rose-500">*</span>
                                                    </label>
                                                    {!item.spare_id && canEdit && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setQuickCreateItemIndex(index)}
                                                            className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                            Create New Part
                                                        </button>
                                                    )}
                                                </div>

                                                {canEdit ? (
                                                    <SparePartCombobox
                                                        spares={spares}
                                                        selectedSpareId={item.spare_id}
                                                        onSelect={(spareId, displayName) => {
                                                            handleItemChange(index, 'spare_id', spareId)
                                                        }}
                                                        onQuickCreate={() => setQuickCreateItemIndex(index)}
                                                    />
                                                ) : (
                                                    <div className="text-xs px-3.5 py-2.5 border rounded-xl bg-slate-50 dark:bg-slate-950 font-medium text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800">
                                                        {spareDisplayName ? (
                                                            <span className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold">
                                                                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                                                <span>{spareDisplayName}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-rose-600 font-bold flex items-center gap-1.5">
                                                                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                                                                Unmapped (Requires Catalog Association)
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Costing & Tax Breakdown Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 p-3 rounded-xl">
                                            <div>
                                                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                                    Quantity <span className="text-rose-500">*</span>
                                                </label>
                                                {canEdit ? (
                                                    <input 
                                                        type="number" 
                                                        value={item.quantity} 
                                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                        className={`w-full px-2.5 py-1 text-xs font-mono font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                                            !item.quantity || Number(item.quantity) <= 0
                                                                ? 'border-2 border-rose-400 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                                                                : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                                                        }`}
                                                        min="1"
                                                    />
                                                ) : (
                                                    <div className="font-bold text-slate-900 dark:text-white text-xs">{item.quantity}</div>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                                    Unit Rate (Excl. Tax) <span className="text-rose-500">*</span>
                                                </label>
                                                {canEdit ? (
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        value={item.unit_cost} 
                                                        onChange={(e) => handleItemChange(index, 'unit_cost', e.target.value)}
                                                        className={`w-full px-2.5 py-1 text-xs font-mono font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                                            !item.unit_cost || Number(item.unit_cost) <= 0
                                                                ? 'border-2 border-rose-400 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                                                                : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                                                        }`}
                                                    />
                                                ) : (
                                                    <div className="font-medium text-slate-900 dark:text-white text-xs">
                                                        ₹{Number(item.unit_cost).toFixed(2)}
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                                    GST Rate %
                                                </label>
                                                {canEdit ? (
                                                    <input 
                                                        type="number" 
                                                        step="1"
                                                        value={item.gst_percentage ?? 18} 
                                                        onChange={(e) => handleItemChange(index, 'gst_percentage', e.target.value)}
                                                        className="w-full px-2.5 py-1 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                ) : (
                                                    <div className="font-mono text-slate-900 dark:text-white text-xs">{item.gst_percentage ?? 18}%</div>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                                    Tax Amount
                                                </label>
                                                <div className="font-mono text-slate-700 dark:text-slate-300 text-xs py-1">
                                                    ₹{Number(item.tax_amount ?? ((Number(item.quantity || 0) * Number(item.unit_cost || 0) * 18) / 100)).toFixed(2)}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                    Line Total (Incl. Tax)
                                                </label>
                                                <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs py-1">
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
                                            <div className="mt-2.5 text-xs flex items-center gap-1.5 font-medium">
                                                <span className="text-slate-500">Historical Price Variance:</span>
                                                <span className={`font-mono font-bold ${Number(item.variance_amount) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                    {Number(item.variance_amount) > 0 ? '+' : ''}₹{Number(item.variance_amount).toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>
            
            {/* Inventory Posting Modal */}
            {isPostingModalOpen && purchase && (
                <InventoryPostingModal
                    purchase={purchase}
                    onClose={() => setIsPostingModalOpen(false)}
                />
            )}

            {/* Quick Create Master Spare Part Modal */}
            {quickCreateItemIndex !== null && editedItems[quickCreateItemIndex] && (
                <QuickCreateSpareModal
                    isOpen={true}
                    onClose={() => setQuickCreateItemIndex(null)}
                    initialCode={editedItems[quickCreateItemIndex].part_code || ''}
                    initialName={editedItems[quickCreateItemIndex].part_description || ''}
                    initialUnitCost={Number(editedItems[quickCreateItemIndex].unit_cost || 0)}
                    onSuccess={(newSpare) => {
                        const targetIdx = quickCreateItemIndex
                        handleItemChange(targetIdx, 'spare_id', newSpare.spare_id)
                        handleItemChange(targetIdx, 'spare_name', `${newSpare.spare_code} — ${newSpare.spare_name}`)
                        setQuickCreateItemIndex(null)
                        queryClient.invalidateQueries({ queryKey: ['spares-list'] })
                    }}
                />
            )}
        </div>
    )
}

// -----------------------------------------------------------------------------
// Searchable Combobox for Spare Parts Mapping
// -----------------------------------------------------------------------------
interface SparePartComboboxProps {
    spares: SpareMasterItem[]
    selectedSpareId?: number
    onSelect: (spareId: number, displayName: string) => void
    onQuickCreate: () => void
}

function SparePartCombobox({ spares, selectedSpareId, onSelect, onQuickCreate }: SparePartComboboxProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)

    const selectedSpare = spares.find(s => s.spare_id === Number(selectedSpareId))

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const filtered = useMemo(() => {
        if (!search.trim()) return spares.slice(0, 15)
        const q = search.toLowerCase().trim()
        return spares
            .filter(s => s.spare_code.toLowerCase().includes(q) || s.spare_name.toLowerCase().includes(q))
            .slice(0, 15)
    }, [spares, search])

    return (
        <div className="relative" ref={containerRef}>
            {selectedSpare ? (
                <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-xs">
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                            <span className="font-mono font-bold text-emerald-900 dark:text-emerald-100">{selectedSpare.spare_code}</span>
                            <span className="text-slate-600 dark:text-slate-400 ml-1.5">— {selectedSpare.spare_name}</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setIsOpen(true)
                            setSearch('')
                        }}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline px-2 py-0.5"
                    >
                        Change
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full text-left px-3 py-2 text-xs rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 flex items-center justify-between hover:border-rose-400"
                >
                    <span className="flex items-center gap-1.5 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        -- Select or Map Part Code --
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
            )}

            {isOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden max-h-64 flex flex-col animate-in fade-in-50 zoom-in-95">
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Type part code or name to search catalog..."
                                className="w-full pl-8 pr-3 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800/60">
                        {filtered.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-500">
                                <p>No catalog part found matching "{search}"</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOpen(false)
                                        onQuickCreate()
                                    }}
                                    className="mt-2 text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 mx-auto"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    + Quick Create as New Part
                                </button>
                            </div>
                        ) : (
                            filtered.map(sp => (
                                <button
                                    key={sp.spare_id}
                                    type="button"
                                    onClick={() => {
                                        onSelect(sp.spare_id, `${sp.spare_code} — ${sp.spare_name}`)
                                        setIsOpen(false)
                                    }}
                                    className="w-full text-left p-2.5 text-xs hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between"
                                >
                                    <div>
                                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                                            {sp.spare_code}
                                        </div>
                                        <div className="text-slate-600 dark:text-slate-400 text-[11px] truncate max-w-xs">
                                            {sp.spare_name}
                                        </div>
                                    </div>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium shrink-0">
                                        {sp.category || 'Spare Part'}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>

                    <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">Total catalog parts: {spares.length}</span>
                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false)
                                onQuickCreate()
                            }}
                            className="font-semibold text-blue-600 hover:underline flex items-center gap-1"
                        >
                            <Plus className="w-3 h-3" />
                            + New Part
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// -----------------------------------------------------------------------------
// Quick Create Master Spare Part Modal
// -----------------------------------------------------------------------------
interface QuickCreateSpareModalProps {
    isOpen: boolean
    onClose: () => void
    initialCode: string
    initialName: string
    initialUnitCost: number
    onSuccess: (newSpare: SpareMasterItem) => void
}

function QuickCreateSpareModal({ isOpen, onClose, initialCode, initialName, initialUnitCost, onSuccess }: QuickCreateSpareModalProps) {
    const [code, setCode] = useState(initialCode)
    const [name, setName] = useState(initialName)
    const [category, setCategory] = useState('Spare Parts')
    const [trackingMode, setTrackingMode] = useState<'QUANTITY' | 'SERIALIZED' | 'BATCH'>('QUANTITY')
    const [remarks, setRemarks] = useState('')

    const createMutation = useMutation({
        mutationFn: (data: SpareMasterCreate) => inventoryApi.createSpare(data),
        onSuccess: (res: any) => {
            const spare: SpareMasterItem = res?.data || res
            toast.success(`Spare Part "${spare.spare_code}" created and mapped!`)
            onSuccess(spare)
        },
        onError: (err: AxiosError<{ detail?: string }>) => {
            toast.error(err.response?.data?.detail || 'Failed to create spare part')
        }
    })

    if (!isOpen) return null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!code.trim() || !name.trim()) {
            toast.error('Part Code and Name are required')
            return
        }
        createMutation.mutate({
            initial_code: code.trim(),
            spare_name: name.trim(),
            category: category.trim(),
            tracking_mode: trackingMode,
            remarks: remarks.trim() || `Created via Purchase Invoice OCR`,
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in-50 zoom-in-95">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
                    <div className="flex items-center gap-2.5">
                        <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                            <Plus className="w-5 h-5" />
                        </span>
                        <div>
                            <h3 className="font-bold text-base text-slate-900 dark:text-white">Quick-Register Master Spare Part</h3>
                            <p className="text-xs text-slate-500">Register new part in master catalog to resolve unmapped invoice row</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Part Code / SKU <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="e.g. VP-000000017011BL"
                            className="w-full px-3 py-2 font-mono font-bold bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Part Name / Description <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. NXG FOOT MAT-BLUE"
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Category
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="Spare Parts">Spare Parts</option>
                                <option value="Electrical">Electrical</option>
                                <option value="Battery & Charger">Battery & Charger</option>
                                <option value="Body & Plastic">Body & Plastic</option>
                                <option value="Brakes & Suspension">Brakes & Suspension</option>
                                <option value="Hardware & Fasteners">Hardware & Fasteners</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Tracking Mode
                            </label>
                            <select
                                value={trackingMode}
                                onChange={(e) => setTrackingMode(e.target.value as any)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="QUANTITY">Quantity (Non-Serialized)</option>
                                <option value="SERIALIZED">Serialized (Unique Serials)</option>
                                <option value="BATCH">Batch Tracking</option>
                            </select>
                        </div>
                    </div>

                    {initialUnitCost > 0 && (
                        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200">
                            <strong>Note:</strong> Initial landed purchase rate of ₹{initialUnitCost.toFixed(2)} from this invoice will seed the initial WAC and DLP upon receipt approval.
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                        >
                            <Plus className="w-4 h-4" />
                            {createMutation.isPending ? 'Creating Part...' : 'Create & Map to Invoice'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const configs: Record<string, { bg: string, text: string, border: string }> = {
        'DRAFT': { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700' },
        'OCR_PROCESSED': { bg: 'bg-purple-100 dark:bg-purple-950/60', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
        'PENDING_VERIFICATION': { bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
        'VERIFIED': { bg: 'bg-blue-100 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
        'APPROVED': { bg: 'bg-emerald-100 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
        'POSTED': { bg: 'bg-green-100 dark:bg-green-950/60', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
    }
    const cfg = configs[status] || configs['DRAFT']
    return (
        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
            {status.replace('_', ' ')}
        </span>
    )
}

function ItemVerificationBadge({ status }: { status: string }) {
    const configs: Record<string, { icon: LucideIcon, text: string, classes: string }> = {
        'EXTRACTED': { icon: Info, text: 'Extracted by OCR', classes: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800' },
        'UNKNOWN_CODE': { icon: AlertTriangle, text: 'Unknown part code — Action required', classes: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800' },
        'LOW_CONFIDENCE': { icon: AlertTriangle, text: 'Low confidence — Review', classes: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800' },
        'CONFIRMED': { icon: CheckCircle, text: 'Confirmed', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' },
        'MATCHED': { icon: CheckCircle, text: 'Matched', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' },
    }
    
    const config = configs[status] || configs['EXTRACTED']
    const Icon = config.icon

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-bold rounded-lg border uppercase ${config.classes}`}>
            <Icon className="w-3.5 h-3.5 shrink-0" />
            {config.text}
        </span>
    )
}
