import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { procurementApi, TemporaryItemCreate } from '../api/procurementApi'
import { useAuthStore } from '../../../store/authStore'
import { Plus, Check, Loader } from 'lucide-react'
import { useForm } from 'react-hook-form'

export default function TemporaryItemPage() {
    const { hasRole } = useAuthStore()
    const queryClient = useQueryClient()
    const [showCreateForm, setShowCreateForm] = useState(false)

    const { data: items = [], isLoading } = useQuery({
        queryKey: ['temporary-items'],
        queryFn: procurementApi.getTemporaryItems,
    })

    // Only Admin or Dealer can see this page? Logic in router.
    // Admin can approve. Dealer can create.

    const createMutation = useMutation({
        mutationFn: procurementApi.createTemporaryItem,
        onSuccess: () => {
            setShowCreateForm(false)
            reset()
            queryClient.invalidateQueries({ queryKey: ["temporary-items"] })
            alert('Temporary item requested.')
        },
        onError: (err) => alert('Failed to create item')
    })

    const approveMutation = useMutation({
        mutationFn: procurementApi.approveTemporaryItem,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["temporary-items"] })
            alert('Item approved and converted to Master.')
        }
    })

    const { register, handleSubmit, reset } = useForm<TemporaryItemCreate>()

    const onSubmit = (data: TemporaryItemCreate) => {
        createMutation.mutate(data)
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Temporary Items</h1>
                    <p className="text-gray-500">Manage unverified spare parts</p>
                </div>
                <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn btn-primary flex gap-2 items-center">
                    <Plus className="w-4 h-4" /> Request New Item
                </button>
            </div>

            {showCreateForm && (
                <div className="card border-primary-100 bg-primary-50">
                    <h3 className="font-semibold mb-4">Request New Temporary Item</h3>
                    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label">Part Code</label>
                            <input {...register('part_code')} className="input" required />
                        </div>
                        <div>
                            <label className="label">Description</label>
                            <input {...register('description')} className="input" required />
                        </div>
                        <div>
                            <label className="label">Category</label>
                            <input {...register('category')} className="input" />
                        </div>
                        <div>
                            <label className="label">Landing Price</label>
                            <input type="number" step="0.01" {...register('dealer_landing_price')} className="input" />
                        </div>
                        <div>
                            <label className="label">Margin %</label>
                            <input type="number" step="0.01" {...register('dealer_margin_percent')} className="input" />
                        </div>
                        <div>
                            <label className="label">GST %</label>
                            <input type="number" step="0.01" {...register('gst_percentage')} className="input" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="label">Remarks</label>
                            <input {...register('remarks')} className="input" />
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-2">
                            <button type="button" onClick={() => setShowCreateForm(false)} className="btn btn-ghost">Cancel</button>
                            <button type="submit" disabled={createMutation.isPending} className="btn btn-primary">
                                {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card">
                <h3 className="text-lg font-semibold mb-4">Pending Items</h3>
                {isLoading ? (
                    <div className="py-8 text-center text-gray-500">Loading...</div>
                ) : items.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">No pending temporary items.</div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Name</th>
                                    <th>Category</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item: any) => (
                                    <tr key={item.spare_id}>
                                        <td>{item.spare_code}</td>
                                        <td>{item.spare_name}</td>
                                        <td>{item.category}</td>
                                        <td>
                                            <span className={`px-2 py-1 text-xs rounded-full ${item.is_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {item.is_verified ? 'Verified' : 'Pending Approval'}
                                            </span>
                                        </td>
                                        <td>
                                            {hasRole(['ADMIN']) && !item.is_verified && (
                                                <button
                                                    onClick={() => approveMutation.mutate(item.spare_id)}
                                                    disabled={approveMutation.isPending}
                                                    className="btn btn-sm btn-outline text-green-600 hover:bg-green-50 border-green-200"
                                                >
                                                    <Check className="w-4 h-4 mr-1" /> Approve
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
        </div>
    )
}
