import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { setupApi } from '../api/setupApi'
import type {
    PaymentMode, ExpenseCategory, JobCardCategory,
    InsuranceCompany, Bank, DocumentType, Brand,
    ShowroomConfig
} from '../api/setupApi'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
    Plus, Pencil, Trash2, X,
    CreditCard, FolderOpen, Wrench, Shield, Building2, FileText, Users, Tag, Store
} from 'lucide-react'
import StaffManager from '../components/StaffManager'
import { SkeletonTable } from '@/components/ui/SkeletonTable'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'



// ==================== GENERIC CRUD TABLE COMPONENT ====================

interface CrudField {
    key: string
    label: string
    type?: 'text' | 'select' | 'checkbox'
    required?: boolean
    options?: { value: string; label: string }[]
    placeholder?: string
}


interface CrudTableProps<T> {
    title: string
    icon: any
    queryKey: string
    fetchFn: () => Promise<T[]>
    createFn: (data: any) => Promise<T>
    updateFn: (id: number, data: any) => Promise<T>
    deleteFn: (id: number, hardDelete?: boolean) => Promise<any>
    restoreFn?: (id: number) => Promise<any>
    idField: string
    nameField: string
    fields: CrudField[]
    columns: { key: string; label: string; render?: (item: T, index: number) => React.ReactNode }[]
    enableSoftDelete?: boolean
}

function CrudTable<T extends Record<string, any>>({
    title, icon: Icon, queryKey, fetchFn, createFn, updateFn, deleteFn, restoreFn,
    idField, nameField, fields, columns, enableSoftDelete
}: CrudTableProps<T>) {
    const queryClient = useQueryClient()
    const [showForm, setShowForm] = useState(false)
    const [editingItem, setEditingItem] = useState<T | null>(null)
    const [formData, setFormData] = useState<Record<string, any>>({})
    const [deleteTarget, setDeleteTarget] = useState<T | null>(null)

    const { data: items = [], isLoading } = useQuery({
        queryKey: [queryKey],
        queryFn: fetchFn,
    })

    const createMut = useMutation({
        mutationFn: (data: any) => createFn(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKey] })
            toast.success(`${title} created`)
            resetForm()
        },
        onError: () => toast.error(`Failed to create ${title.toLowerCase()}`),
    })

    const updateMut = useMutation({
        mutationFn: ({ id, data }: { id: number; data: any }) => updateFn(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKey] })
            toast.success(`${title} updated`)
            resetForm()
        },
        onError: () => toast.error(`Failed to update ${title.toLowerCase()}`),
    })

    const deleteMut = useMutation({
        mutationFn: ({ id, hardDelete }: { id: number; hardDelete?: boolean }) => deleteFn(id, hardDelete),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKey] })
            toast.success(enableSoftDelete ? `${title} deactivated` : `${title} deleted`)
        },
        onError: () => toast.error(`Failed to delete ${title.toLowerCase()}`),
    })

    const restoreMut = useMutation({
        mutationFn: (id: number) => restoreFn!(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKey] })
            toast.success(`${title} restored`)
        },
        onError: () => toast.error(`Failed to restore ${title.toLowerCase()}`),
    })

    const resetForm = () => {
        setShowForm(false)
        setEditingItem(null)
        setFormData({})
    }

    const openCreate = () => {
        setEditingItem(null)
        setFormData({})
        setShowForm(true)
    }

    const openEdit = (item: T) => {
        setEditingItem(item)
        const data: Record<string, any> = {}
        fields.forEach(f => { data[f.key] = item[f.key] ?? '' })
        setFormData(data)
        setShowForm(true)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (editingItem) {
            updateMut.mutate({ id: editingItem[idField], data: formData })
        } else {
            createMut.mutate(formData)
        }
    }

    const handleDelete = (item: T) => {
        setDeleteTarget(item)
    }

    const handleDeleteConfirm = (hardDelete: boolean) => {
        if (deleteTarget) {
            deleteMut.mutate({ id: deleteTarget[idField], hardDelete })
        }
        setDeleteTarget(null)
    }

    const handleToggleStatus = (item: T) => {
        if (!restoreFn) return
        const isDeleted = item.is_deleted || !item.is_active
        if (isDeleted) {
            if (confirm(`Restore "${item[nameField]}"?`)) {
                restoreMut.mutate(item[idField])
            }
        } else {
            setDeleteTarget(item)
        }
    }

    // Filter out status column if enableSoftDelete is on (we'll add our own)
    const displayColumns = enableSoftDelete
        ? columns.filter(c => c.key !== 'is_active' && c.key !== 'status')
        : columns

    return (
        <>
            <div>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Icon className="w-6 h-6 text-primary-600" />
                        <h2 className="text-xl font-semibold text-gray-800">{title}s</h2>
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {items.length}
                        </span>
                    </div>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Add {title}
                    </button>
                </div>

                {/* Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                            <div className="flex items-center justify-between p-6 border-b">
                                <h3 className="text-lg font-semibold">
                                    {editingItem ? `Edit ${title}` : `New ${title}`}
                                </h3>
                                <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                {fields.map(field => (
                                    <div key={field.key}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {field.label}
                                            {field.required && <span className="text-red-500 ml-1">*</span>}
                                        </label>
                                        {field.type === 'select' ? (
                                            <select
                                                value={formData[field.key] ?? ''}
                                                onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            >
                                                <option value="">— Select —</option>
                                                {field.options?.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        ) : field.type === 'checkbox' ? (
                                            <input
                                                type="checkbox"
                                                checked={!!formData[field.key]}
                                                onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.checked }))}
                                                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                value={formData[field.key] ?? ''}
                                                onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                                                placeholder={field.placeholder}
                                                required={field.required}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            />
                                        )}
                                    </div>
                                ))}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="submit"
                                        disabled={createMut.isPending || updateMut.isPending}
                                        className="flex-1 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
                                    >
                                        {createMut.isPending || updateMut.isPending ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Table */}
                {isLoading ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <SkeletonTable rows={5} />
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-12">
                        <Icon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No {title.toLowerCase()}s yet</p>
                        <button onClick={openCreate} className="text-primary-600 hover:underline text-sm mt-2">
                            Create your first {title.toLowerCase()}
                        </button>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    {displayColumns.map(col => (
                                        <th key={col.key} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            {col.label}
                                        </th>
                                    ))}
                                    {enableSoftDelete && (
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                    )}
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {items.map((item, index) => {
                                    const isDeleted = item.is_deleted || !item.is_active
                                    return (
                                        <tr key={item[idField]} className={`hover:bg-gray-50 transition-colors ${isDeleted ? 'bg-gray-50' : ''}`}>
                                            {displayColumns.map(col => (
                                                <td key={col.key} className="px-4 py-3 text-sm text-gray-700">
                                                    {col.render ? col.render(item, index) : String(item[col.key] ?? '—')}
                                                </td>
                                            ))}
                                            {enableSoftDelete && (
                                                <td className="px-4 py-3 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleToggleStatus(item)}
                                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${!isDeleted ? 'bg-green-500' : 'bg-gray-300'
                                                                }`}
                                                        >
                                                            <span
                                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${!isDeleted ? 'translate-x-6' : 'translate-x-1'
                                                                    }`}
                                                            />
                                                        </button>
                                                        <span className={`text-xs ${isDeleted ? 'text-gray-500' : 'text-green-700 font-medium'}`}>
                                                            {isDeleted ? 'Inactive' : 'Active'}
                                                        </span>
                                                    </div>
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {!isDeleted && (
                                                        <button
                                                            onClick={() => openEdit(item)}
                                                            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {!enableSoftDelete && (
                                                        <button
                                                            onClick={() => handleDelete(item)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
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

            <DeleteConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDeleteConfirm}
                itemName={deleteTarget ? String(deleteTarget[nameField]) : ''}
                isPending={deleteMut.isPending}
            />
        </>
    )
}


// ==================== TAB DEFINITIONS ====================

const TABS = [
    { id: 'brands', label: 'Brands', icon: Tag },
    { id: 'payment-modes', label: 'Payment Modes', icon: CreditCard },
    { id: 'expense-categories', label: 'Expense Categories', icon: FolderOpen },
    { id: 'job-card-categories', label: 'Job Card Categories', icon: Wrench },
    { id: 'insurance-companies', label: 'Insurance Companies', icon: Shield },
    { id: 'banks', label: 'Banks', icon: Building2 },
    { id: 'document-types', label: 'Document Types', icon: FileText },
    { id: 'staff', label: 'Staff', icon: Users },
    { id: 'showroom', label: 'Showroom Details', icon: Store },
]

// ==================== SHOWROOM CONFIG COMPONENT ====================

function ShowroomConfigForm() {
    const queryClient = useQueryClient()
    const { data: config, isLoading } = useQuery({
        queryKey: ['setup-showroom-config'],
        queryFn: setupApi.getShowroomConfig,
    })

    const mut = useMutation({
        mutationFn: setupApi.upsertShowroomConfig,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['setup-showroom-config'] })
            toast.success('Showroom details saved successfully')
        },
        onError: () => toast.error('Failed to save showroom details')
    })

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const data = Object.fromEntries(formData.entries()) as unknown as ShowroomConfig
        mut.mutate(data)
    }

    if (isLoading) {
        return <div className="bg-white p-6 rounded-xl border"><SkeletonTable rows={3} /></div>
    }

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
                <Store className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-800">Showroom Configuration</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
                {/* General Details */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Business Identity</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Dealership Display Name *</label>
                            <input type="text" name="dealership_name" defaultValue={config?.dealership_name || ''} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="e.g. EV Motors" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Legal Entity Name *</label>
                            <input type="text" name="legal_entity_name" defaultValue={config?.legal_entity_name || ''} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="e.g. EV Motors Pvt Ltd" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN *</label>
                            <input type="text" name="gstin" defaultValue={config?.gstin || ''} required pattern="^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" placeholder="22AAAAA0000A1Z5" />
                        </div>
                    </div>
                </div>

                {/* Contact & Address */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Contact & Location</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Registered Address *</label>
                            <input type="text" name="registered_address" defaultValue={config?.registered_address || ''} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                            <input type="text" name="city" defaultValue={config?.city || ''} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                            <input type="text" name="state" defaultValue={config?.state || ''} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
                            <input type="text" name="pincode" defaultValue={config?.pincode || ''} required pattern="^\d{6}$" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
                            <input type="email" name="contact_email" defaultValue={config?.contact_email || ''} required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Mobile *</label>
                            <input type="text" name="contact_mobile" defaultValue={config?.contact_mobile || ''} required pattern="^[6-9]\d{9}$" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" />
                        </div>
                    </div>
                </div>

                {/* Bank Details */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Default Bank Details (For Invoices)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                            <input type="text" name="bank_name" defaultValue={config?.bank_name || ''} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                            <input type="text" name="bank_account_no" defaultValue={config?.bank_account_no || ''} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                            <input type="text" name="bank_ifsc" defaultValue={config?.bank_ifsc || ''} pattern="^[A-Z]{4}0[A-Z0-9]{6}$" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" />
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t flex justify-end">
                    <button type="submit" disabled={mut.isPending} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50">
                        {mut.isPending ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </form>
        </div>
    )
}



// ==================== MAIN SETUP PAGE ====================

export default function SetupPage() {
    const [activeTab, setActiveTab] = useState('showroom')

    return (
        <div className="p-6">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Setup</h1>
                <p className="text-gray-500 mt-1">Manage master data tables and system configuration</p>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-1 mb-8 bg-gray-100 p-1 rounded-xl">
                {TABS.map(tab => {
                    const TabIcon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                                ? 'bg-white text-primary-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                                }`}
                        >
                            <TabIcon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                {activeTab === 'showroom' && <ShowroomConfigForm />}
                {activeTab === 'brands' && (
                    <CrudTable<Brand>
                        title="Brand"
                        icon={Tag}
                        queryKey="setup-brands"
                        fetchFn={setupApi.listBrands}
                        createFn={setupApi.createBrand}
                        updateFn={setupApi.updateBrand}
                        deleteFn={setupApi.deleteBrand}
                        restoreFn={setupApi.restoreBrand}
                        enableSoftDelete={true}
                        idField="brand_id"
                        nameField="brand_name"
                        fields={[
                            { key: 'brand_name', label: 'Brand Name', required: true, placeholder: 'e.g. Ather Energy' },
                        ]}
                        columns={[
                            { key: 'sno', label: 'S.No.', render: (_, idx) => idx + 1 },
                            { key: 'brand_name', label: 'Brand Name' },
                        ]}
                    />
                )}

                {activeTab === 'payment-modes' && (
                    <CrudTable<PaymentMode>
                        title="Payment Mode"
                        icon={CreditCard}
                        queryKey="setup-payment-modes"
                        fetchFn={setupApi.listPaymentModes}
                        createFn={setupApi.createPaymentMode}
                        updateFn={setupApi.updatePaymentMode}
                        deleteFn={setupApi.deletePaymentMode}
                        restoreFn={setupApi.restorePaymentMode}
                        enableSoftDelete={true}
                        idField="payment_mode_id"
                        nameField="mode_name"
                        fields={[
                            { key: 'mode_name', label: 'Mode Name', required: true, placeholder: 'e.g. UPI, Cash, Card' },
                            { key: 'description', label: 'Description', placeholder: 'Optional description' },
                        ]}
                        columns={[
                            { key: 'sno', label: 'S.No.', render: (_, idx) => idx + 1 },
                            { key: 'mode_name', label: 'Mode Name' },
                            { key: 'description', label: 'Description' },
                        ]}
                    />
                )}

                {activeTab === 'expense-categories' && (
                    <CrudTable<ExpenseCategory>
                        title="Expense Category"
                        icon={FolderOpen}
                        queryKey="setup-expense-categories"
                        fetchFn={setupApi.listExpenseCategories}
                        createFn={setupApi.createExpenseCategory}
                        updateFn={setupApi.updateExpenseCategory}
                        deleteFn={setupApi.deleteExpenseCategory}
                        restoreFn={setupApi.restoreExpenseCategory}
                        enableSoftDelete={true}
                        idField="expense_category_id"
                        nameField="category_name"
                        fields={[
                            { key: 'category_name', label: 'Category Name', required: true, placeholder: 'e.g. Rent, Utilities' },
                            { key: 'description', label: 'Description', placeholder: 'Optional description' },
                        ]}
                        columns={[
                            { key: 'sno', label: 'S.No.', render: (_, idx) => idx + 1 },
                            { key: 'category_name', label: 'Category Name' },
                            { key: 'description', label: 'Description' },
                        ]}
                    />
                )}

                {activeTab === 'job-card-categories' && (
                    <CrudTable<JobCardCategory>
                        title="Job Card Category"
                        icon={Wrench}
                        queryKey="setup-job-card-categories"
                        fetchFn={setupApi.listJobCardCategories}
                        createFn={setupApi.createJobCardCategory}
                        updateFn={setupApi.updateJobCardCategory}
                        deleteFn={setupApi.deleteJobCardCategory}
                        restoreFn={setupApi.restoreJobCardCategory}
                        enableSoftDelete={true}
                        idField="job_card_category_id"
                        nameField="category_name"
                        fields={[
                            { key: 'category_name', label: 'Category Name', required: true, placeholder: 'e.g. Routine Service, Repair' },
                            { key: 'description', label: 'Description', placeholder: 'Optional description' },
                        ]}
                        columns={[
                            { key: 'sno', label: 'S.No.', render: (_, idx) => idx + 1 },
                            { key: 'category_name', label: 'Category Name' },
                            { key: 'description', label: 'Description' },
                        ]}
                    />
                )}

                {activeTab === 'insurance-companies' && (
                    <CrudTable<InsuranceCompany>
                        title="Insurance Company"
                        icon={Shield}
                        queryKey="setup-insurance-companies"
                        fetchFn={setupApi.listInsuranceCompanies}
                        createFn={setupApi.createInsuranceCompany}
                        updateFn={setupApi.updateInsuranceCompany}
                        deleteFn={setupApi.deleteInsuranceCompany}
                        restoreFn={setupApi.restoreInsuranceCompany}
                        enableSoftDelete={true}
                        idField="insurance_company_id"
                        nameField="company_name"
                        fields={[
                            { key: 'company_name', label: 'Company Name', required: true, placeholder: 'e.g. ICICI Lombard' },
                            { key: 'contact_person', label: 'Contact Person', placeholder: 'Name of representative' },
                            { key: 'contact_number', label: 'Contact Number', placeholder: '+91 ...' },
                            { key: 'email', label: 'Email', placeholder: 'email@example.com' },
                            { key: 'address', label: 'Address', placeholder: 'Office address' },
                            { key: 'gstin', label: 'GSTIN', placeholder: '22AAAAA0000A1Z5' },
                        ]}
                        columns={[
                            { key: 'sno', label: 'S.No.', render: (_, idx) => idx + 1 },
                            { key: 'company_name', label: 'Company' },
                            { key: 'contact_person', label: 'Contact' },
                            { key: 'contact_number', label: 'Phone' },
                        ]}
                    />
                )}

                {activeTab === 'banks' && (
                    <CrudTable<Bank>
                        title="Bank"
                        icon={Building2}
                        queryKey="setup-banks"
                        fetchFn={setupApi.listBanks}
                        createFn={setupApi.createBank}
                        updateFn={setupApi.updateBank}
                        deleteFn={setupApi.deleteBank}
                        restoreFn={setupApi.restoreBank}
                        enableSoftDelete={true}
                        idField="bank_id"
                        nameField="bank_name"
                        fields={[
                            { key: 'bank_name', label: 'Bank Name', required: true, placeholder: 'e.g. State Bank of India' },
                            { key: 'branch', label: 'Branch', placeholder: 'Branch name' },
                            { key: 'ifsc_code', label: 'IFSC Code', required: true, placeholder: 'SBIN0001234' },
                            { key: 'address', label: 'Address', placeholder: 'Branch address' },
                            { key: 'contact_number', label: 'Contact Number', placeholder: '+91 ...' },
                        ]}
                        columns={[
                            { key: 'sno', label: 'S.No.', render: (_, idx) => idx + 1 },
                            { key: 'bank_name', label: 'Bank' },
                            { key: 'branch', label: 'Branch' },
                            { key: 'ifsc_code', label: 'IFSC' },
                        ]}
                    />
                )}

                {activeTab === 'document-types' && (
                    <CrudTable<DocumentType>
                        title="Document Type"
                        icon={FileText}
                        queryKey="setup-document-types"
                        fetchFn={setupApi.listDocumentTypes}
                        createFn={setupApi.createDocumentType}
                        updateFn={setupApi.updateDocumentType}
                        deleteFn={setupApi.deleteDocumentType}
                        restoreFn={setupApi.restoreDocumentType}
                        enableSoftDelete={true}
                        idField="document_type_id"
                        nameField="type_name"
                        fields={[
                            { key: 'type_name', label: 'Type Name', required: true, placeholder: 'e.g. Aadhaar Card' },
                            { key: 'description', label: 'Description', placeholder: 'Optional description' },
                            {
                                key: 'applicable_to', label: 'Applicable To', type: 'select',
                                options: [
                                    { value: 'customer', label: 'Customer' },
                                    { value: 'vendor', label: 'Vendor' },
                                    { value: 'vehicle', label: 'Vehicle' },
                                    { value: 'sale', label: 'Sale' },
                                    { value: 'all', label: 'All' },
                                ]
                            },
                            { key: 'is_mandatory', label: 'Mandatory', type: 'checkbox' },
                        ]}
                        columns={[
                            { key: 'sno', label: 'S.No.', render: (_, idx) => idx + 1 },
                            { key: 'type_name', label: 'Type Name' },
                            {
                                key: 'applicable_to', label: 'Applies To',
                                render: (item) => (
                                    <span className="capitalize">{item.applicable_to || '—'}</span>
                                )
                            },
                            {
                                key: 'is_mandatory', label: 'Mandatory',
                                render: (item) => item.is_mandatory ? '✅ Yes' : 'No'
                            },
                        ]}
                    />
                )}

                {activeTab === 'staff' && <StaffManager />}
            </div>
        </div>
    )
}
