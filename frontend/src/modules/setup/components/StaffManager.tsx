import { useAuthStore } from '@/store/authStore'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Plus, Search, RotateCcw, X } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import TempPinModal from '../../admin/components/TempPinModal'
import { SkeletonTable } from '@/components/ui/SkeletonTable'
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
    updated_at?: string
    deleted_at?: string
    is_deleted?: boolean
    deleted_by?: number
}

interface CreateStaffForm {
    full_name: string
    mobile_no: string
    email: string
    designation: string
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
    emergency_contact_name?: string
    emergency_contact_no?: string
}

const INITIAL_FORM: CreateStaffForm = {
    full_name: '',
    mobile_no: '',
    email: '',
    designation: 'STAFF',
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
    emergency_contact_name: '',
    emergency_contact_no: '',
}

export default function StaffManager() {
    const [searchTerm, setSearchTerm] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState<CreateStaffForm>({ ...INITIAL_FORM })
    const [createError, setCreateError] = useState('')
    const [roleFilter, setRoleFilter] = useState<'all' | 'ADMIN' | 'DEALER' | 'STAFF'>('all')

    // Temp PIN modal state
    const [showPinModal, setShowPinModal] = useState(false)
    const [tempPin, setTempPin] = useState('')
    const [tempPinStaffName, setTempPinStaffName] = useState('')
    const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null)

    const queryClient = useQueryClient()
    const { hasRole, user } = useAuthStore()
    const isDealer = user?.designation === 'DEALER'

    // Always fetch ALL staff (including deleted)
    const { data: staff = [], isLoading } = useQuery({
        queryKey: ['staff'],
        queryFn: () => api.get<Staff[]>('/admin/staff?include_deleted=true'),
    })

    const filteredStaff = staff.filter((s) => {
        const matchesSearch = s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.mobile_no.includes(searchTerm) ||
            s.designation.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesRole = roleFilter === 'all' || s.designation === roleFilter

        return matchesSearch && matchesRole
    })

    const deleteMutation = useMutation({
        mutationFn: ({ id, hardDelete }: { id: number; hardDelete?: boolean }) =>
            api.delete(`/admin/staff/${id}`, { params: { hard_delete: hardDelete } }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] }),
    })

    const restoreMutation = useMutation({
        mutationFn: (id: number) => api.post(`/admin/staff/${id}/restore`, {}),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] }),
    })

    const createMutation = useMutation({
        mutationFn: (data: CreateStaffForm) => api.post<any>('/admin/staff', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff'] })
        },
    })

    const resetPinMutation = useMutation({
        mutationFn: (staffId: number) => api.post<any>('/auth/reset-pin', { staff_id: staffId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff'] })
        },
    })

    const handleToggleStatus = async (s: Staff) => {
        if (s.is_deleted) {
            // Currently Deleted -> Restore
            if (confirm(`Restore ${s.full_name}?`)) {
                await restoreMutation.mutateAsync(s.staff_id)
            }
        } else {
            // Currently Active -> Delete via modal
            setDeleteTarget(s)
        }
    }

    const handleDeleteConfirm = async (hardDelete: boolean) => {
        if (deleteTarget) {
            await deleteMutation.mutateAsync({ id: deleteTarget.staff_id, hardDelete })
        }
        setDeleteTarget(null)
    }

    const handleResetPin = async (staffId: number, staffName: string) => {
        if (!confirm(`Reset PIN for ${staffName}? This will generate a temporary PIN that must be changed on next login.`)) return
        try {
            const result = await resetPinMutation.mutateAsync(staffId)
            setTempPin(result.temporary_pin)
            setTempPinStaffName(staffName)
            setShowPinModal(true)
        } catch (err: any) {
            alert(err?.response?.data?.detail || 'Failed to reset PIN')
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreateError('')

        if (!form.full_name || !form.mobile_no || !form.email || !form.aadhaar_no) {
            setCreateError('Full Name, Mobile, Email, and Aadhaar are required.')
            return
        }

        try {
            const result = await createMutation.mutateAsync(form)
            setShowModal(false)
            setForm({ ...INITIAL_FORM })
            if (result.temp_pin) {
                setTempPin(result.temp_pin)
                setTempPinStaffName(result.full_name || form.full_name)
                setShowPinModal(true)
            }
        } catch (err: any) {
            setCreateError(err?.response?.data?.detail || err?.message || 'Failed to create staff')
        }
    }

    const openModal = () => {
        setForm({ ...INITIAL_FORM })
        if (isDealer) {
            setForm(prev => ({ ...prev, designation: 'STAFF' }))
        }
        setCreateError('')
        setShowModal(true)
    }

    const updateField = (field: keyof CreateStaffForm, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div></div>
                <div className="flex gap-2">
                    {hasRole(['DEALER', 'ADMIN']) && (
                        <button className="btn btn-primary flex items-center gap-2" onClick={openModal}>
                            <Plus className="w-5 h-5" />
                            Add Staff
                        </button>
                    )}
                </div>
            </div>

            <div className="card">
                <div className="mb-4 flex gap-3">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value as any)}
                        className="input w-auto"
                    >
                        <option value="all">All Roles</option>
                        <option value="ADMIN">Admin</option>
                        <option value="DEALER">Dealer</option>
                        <option value="STAFF">Staff</option>
                    </select>
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search staff..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input pl-10"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <SkeletonTable rows={5} />
                ) : filteredStaff.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500">No staff found</p>
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
                                    <th>Designation</th>
                                    <th>Status (Toggle)</th>
                                    <th>Joined</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStaff.map((s) => (
                                    <tr key={s.staff_id} className={s.is_deleted ? 'bg-gray-50' : ''}>
                                        <td>{s.staff_id}</td>
                                        <td className="font-medium">{s.full_name}</td>
                                        <td>{s.mobile_no}</td>
                                        <td>{s.email || '-'}</td>
                                        <td>
                                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                                                {s.designation}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleToggleStatus(s)}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 ${!s.is_deleted ? 'bg-green-500' : 'bg-gray-300'
                                                        }`}
                                                    title={s.is_deleted ? "Click to Activate" : "Click to Deactivate"}
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${!s.is_deleted ? 'translate-x-6' : 'translate-x-1'
                                                            }`}
                                                    />
                                                </button>
                                                <span className={`text-xs ${s.is_deleted ? 'text-gray-500' : 'text-green-700 font-medium'}`}>
                                                    {s.is_deleted ? 'Inactive' : 'Active'}
                                                </span>
                                            </div>
                                        </td>
                                        <td>{s.joined_date ? formatDate(s.joined_date) : '-'}</td>
                                        <td>{formatDate(s.created_at)}</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                {!s.is_deleted && (
                                                    <button
                                                        onClick={() => handleResetPin(s.staff_id, s.full_name)}
                                                        className="text-orange-600 hover:text-orange-800"
                                                        title="Reset PIN"
                                                    >
                                                        <RotateCcw className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {s.is_deleted && (
                                                    <span className="text-xs text-gray-400 italic">Deleted</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Staff Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-xl font-semibold">Add New Staff</h2>
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
                                        {isDealer ? (
                                            <input type="text" className="input bg-gray-100" value="STAFF" disabled />
                                        ) : (
                                            <select className="input" value={form.designation}
                                                onChange={e => updateField('designation', e.target.value)}>
                                                <option value="STAFF">STAFF</option>
                                                <option value="DEALER">DEALER</option>
                                                <option value="ADMIN">ADMIN</option>
                                            </select>
                                        )}
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

                            {/* Emergency Contact */}
                            <fieldset className="space-y-3">
                                <legend className="text-sm font-semibold text-gray-700 mb-2">Emergency Contact</legend>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                                        <input type="text" className="input" value={form.emergency_contact_name || ''}
                                            onChange={e => updateField('emergency_contact_name', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact No</label>
                                        <input type="text" className="input" value={form.emergency_contact_no || ''}
                                            onChange={e => updateField('emergency_contact_no', e.target.value)} />
                                    </div>
                                </div>
                            </fieldset>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                                    {createMutation.isPending ? 'Creating...' : 'Create Staff'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Temp PIN Modal */}
            {showPinModal && tempPin && (
                <TempPinModal
                    pin={tempPin}
                    staffName={tempPinStaffName}
                    onClose={() => {
                        setShowPinModal(false)
                        setTempPin('')
                        setTempPinStaffName('')
                    }}
                />
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
