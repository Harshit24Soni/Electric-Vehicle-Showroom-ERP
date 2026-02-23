import { useAuthStore } from '../../../store/authStore'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Plus, Search, Trash2, RefreshCcw, X } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'

interface Staff {
    staff_id: number
    full_name: string
    mobile_no: string
    email?: string
    designation: string
    is_active: boolean
    joined_date?: string
    created_at: string
    dealer_id?: number
    deleted_at?: string
}

interface CreateDealerForm {
    full_name: string
    mobile_no: string
    email: string
    aadhaar_no: string
    pan_no?: string
    joined_date?: string
    address_line1?: string
    city?: string
    state?: string
    pincode?: string
    bank_name?: string
    bank_account_no?: string
    ifsc_code?: string
    upi_id?: string
}

const INITIAL_FORM: CreateDealerForm = {
    full_name: '',
    mobile_no: '',
    email: '',
    aadhaar_no: '',
    pan_no: '',
    joined_date: '',
    address_line1: '',
    city: '',
    state: '',
    pincode: '',
    bank_name: '',
    bank_account_no: '',
    ifsc_code: '',
    upi_id: '',
}

export default function DealerManagementPage() {
    const [searchTerm, setSearchTerm] = useState('')
    const [showDeleted, setShowDeleted] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState<CreateDealerForm>({ ...INITIAL_FORM })
    const [createError, setCreateError] = useState('')
    const [createdPin, setCreatedPin] = useState('')
    const queryClient = useQueryClient()
    const { hasRole } = useAuthStore()
    const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null)

    // Only Admin can access this page
    if (!hasRole(['ADMIN'])) {
        return <div className="p-4 text-red-500">Access Denied</div>
    }

    const { data: staff = [], isLoading } = useQuery({
        queryKey: ['dealers', showDeleted],
        queryFn: async () => {
            const res = await api.get<Staff[]>(`/admin/staff?include_deleted=${showDeleted}`)
            return res.filter(s => s.designation === 'DEALER')
        },
    })

    const deleteMutation = useMutation({
        mutationFn: ({ id, hardDelete }: { id: number; hardDelete?: boolean }) =>
            api.delete(`/admin/staff/${id}`, { params: { hard_delete: hardDelete } }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dealers'] }),
    })

    const restoreMutation = useMutation({
        mutationFn: (id: number) => api.post(`/admin/staff/${id}/restore`, {}),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dealers'] }),
    })

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post<Staff>('/admin/staff', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dealers'] })
        },
    })

    const handleDelete = async (s: Staff) => {
        setDeleteTarget(s)
    }

    const handleDeleteConfirm = async (hardDelete: boolean) => {
        if (deleteTarget) {
            await deleteMutation.mutateAsync({ id: deleteTarget.staff_id, hardDelete })
        }
        setDeleteTarget(null)
    }

    const handleRestore = async (id: number) => {
        if (confirm('Restore this dealer?')) {
            await restoreMutation.mutateAsync(id)
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreateError('')
        setCreatedPin('')

        if (!form.full_name || !form.mobile_no || !form.email || !form.aadhaar_no) {
            setCreateError('Full Name, Mobile, Email, and Aadhaar are required.')
            return
        }

        try {
            await createMutation.mutateAsync({
                ...form,
                designation: 'DEALER',
            })
            setCreatedPin('Dealer created! A temporary PIN has been generated (check server logs).')
            setForm({ ...INITIAL_FORM })
            setTimeout(() => {
                setShowModal(false)
                setCreatedPin('')
            }, 3000)
        } catch (err: any) {
            setCreateError(err?.response?.data?.detail || err?.message || 'Failed to create dealer')
        }
    }

    const openModal = () => {
        setForm({ ...INITIAL_FORM })
        setCreateError('')
        setCreatedPin('')
        setShowModal(true)
    }

    const updateField = (field: keyof CreateDealerForm, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    const filteredStaff = staff.filter((s) =>
        s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.mobile_no.includes(searchTerm)
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dealer Management</h1>
                    <p className="text-gray-600 mt-1">Manage dealership accounts</p>
                </div>
                <div className='flex gap-2'>
                    <button
                        className={`btn ${showDeleted ? 'btn-secondary' : 'btn-outline'}`}
                        onClick={() => setShowDeleted(!showDeleted)}
                    >
                        {showDeleted ? 'Hide Deleted' : 'Show Deleted'}
                    </button>
                    <button className="btn btn-primary flex items-center gap-2" onClick={openModal}>
                        <Plus className="w-5 h-5" />
                        Add Dealer
                    </button>
                </div>
            </div>

            <div className="card">
                <div className="mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search dealers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input pl-10"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500">Loading dealers...</p>
                    </div>
                ) : filteredStaff.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500">No dealers found</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Mobile</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStaff.map((s) => (
                                    <tr key={s.staff_id} className={s.is_active ? '' : 'bg-gray-50'}>
                                        <td>{s.staff_id}</td>
                                        <td className="font-medium">{s.full_name}</td>
                                        <td>{s.mobile_no}</td>
                                        <td>{s.email || '-'}</td>
                                        <td>
                                            {s.deleted_at ? (
                                                <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Deleted</span>
                                            ) : (
                                                <span className={`px-2 py-1 text-xs rounded-full ${s.is_active
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {s.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            )}
                                        </td>
                                        <td>{formatDate(s.created_at)}</td>
                                        <td>
                                            {s.deleted_at ? (
                                                <button
                                                    onClick={() => handleRestore(s.staff_id)}
                                                    className="text-green-600 hover:text-green-800"
                                                    title="Restore"
                                                >
                                                    <RefreshCcw className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleDelete(s)}
                                                    className="text-red-600 hover:text-red-800"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Dealer Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-xl font-semibold">Add New Dealer</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-4 space-y-4">
                            {createError && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                                    {createError}
                                </div>
                            )}
                            {createdPin && (
                                <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
                                    {createdPin}
                                </div>
                            )}

                            {/* Basic Info */}
                            <fieldset className="space-y-3">
                                <legend className="text-sm font-semibold text-gray-700 mb-2">Basic Information</legend>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                        <input type="text" className="input" value={form.full_name}
                                            onChange={e => updateField('full_name', e.target.value)} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Mobile No *</label>
                                        <input type="text" className="input" value={form.mobile_no}
                                            onChange={e => updateField('mobile_no', e.target.value)} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                        <input type="email" className="input" value={form.email}
                                            onChange={e => updateField('email', e.target.value)} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                                        <input type="text" className="input bg-gray-100" value="DEALER" disabled />
                                    </div>
                                </div>
                            </fieldset>

                            {/* Personal Details */}
                            <fieldset className="space-y-3">
                                <legend className="text-sm font-semibold text-gray-700 mb-2">Personal Details</legend>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar No *</label>
                                        <input type="text" className="input" value={form.aadhaar_no}
                                            onChange={e => updateField('aadhaar_no', e.target.value)} required maxLength={12} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">PAN No</label>
                                        <input type="text" className="input" value={form.pan_no || ''}
                                            onChange={e => updateField('pan_no', e.target.value)} maxLength={10} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date</label>
                                        <input type="date" className="input" value={form.joined_date || ''}
                                            onChange={e => updateField('joined_date', e.target.value)} />
                                    </div>
                                </div>
                            </fieldset>

                            {/* Address */}
                            <fieldset className="space-y-3">
                                <legend className="text-sm font-semibold text-gray-700 mb-2">Address</legend>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                                        <input type="text" className="input" value={form.address_line1 || ''}
                                            onChange={e => updateField('address_line1', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                        <input type="text" className="input" value={form.city || ''}
                                            onChange={e => updateField('city', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                        <input type="text" className="input" value={form.state || ''}
                                            onChange={e => updateField('state', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                                        <input type="text" className="input" value={form.pincode || ''}
                                            onChange={e => updateField('pincode', e.target.value)} maxLength={6} />
                                    </div>
                                </div>
                            </fieldset>

                            {/* Bank Details */}
                            <fieldset className="space-y-3">
                                <legend className="text-sm font-semibold text-gray-700 mb-2">Bank Details</legend>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                                        <input type="text" className="input" value={form.bank_name || ''}
                                            onChange={e => updateField('bank_name', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Account No</label>
                                        <input type="text" className="input" value={form.bank_account_no || ''}
                                            onChange={e => updateField('bank_account_no', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                                        <input type="text" className="input" value={form.ifsc_code || ''}
                                            onChange={e => updateField('ifsc_code', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
                                        <input type="text" className="input" value={form.upi_id || ''}
                                            onChange={e => updateField('upi_id', e.target.value)} />
                                    </div>
                                </div>
                            </fieldset>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                                    {createMutation.isPending ? 'Creating...' : 'Create Dealer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <DeleteConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDeleteConfirm}
                itemName={deleteTarget?.full_name || ''}
                isPending={deleteMutation.isPending}
            />
        </div>
    )
}
