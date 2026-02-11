import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { masterApi, Nominee, NomineeCreate } from '../api/masterApi'
import { Plus, Trash2, Shield, AlertTriangle } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface NomineeListProps {
    customerId: number
}

const nomineeSchema = z.object({
    nominee_name: z.string().min(1, 'Name is required'),
    nominee_dob: z.string().min(1, 'DOB is required'),
    relation: z.string().min(1, 'Relation is required'),
    is_primary: z.boolean().optional(),
})

type NomineeFormData = z.infer<typeof nomineeSchema>

export default function NomineeList({ customerId }: NomineeListProps) {
    const queryClient = useQueryClient()
    const [showForm, setShowForm] = useState(false)

    const { data: nominees, isLoading } = useQuery({
        queryKey: ['nominees', customerId],
        queryFn: () => masterApi.getNominees(customerId)
    })

    // Create Mutation
    const createMutation = useMutation({
        mutationFn: (data: NomineeCreate) => masterApi.createNominee(customerId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['nominees', customerId] })
            reset()
            setShowForm(false)
        },
    })

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: (nomineeId: number) => masterApi.deleteNominee(customerId, nomineeId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['nominees', customerId] })
        },
    })

    // Form
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<NomineeFormData>({
        resolver: zodResolver(nomineeSchema),
    })

    const onSubmit = (data: NomineeFormData) => {
        createMutation.mutate(data)
    }

    if (isLoading) return <div>Loading nominees...</div>

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-600" />
                    Nominees
                </h3>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="btn btn-sm btn-secondary flex items-center gap-1"
                    >
                        <Plus className="w-4 h-4" /> Add Nominee
                    </button>
                )}
            </div>

            {showForm && (
                <form onSubmit={handleSubmit(onSubmit)} className="bg-gray-50 p-4 rounded-lg border border-gray-200 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="label">Name</label>
                            <input {...register('nominee_name')} className="input" placeholder="Nominee Name" />
                            {errors.nominee_name && <p className="error-text">{errors.nominee_name.message}</p>}
                        </div>
                        <div>
                            <label className="label">Date of Birth</label>
                            <input type="date" {...register('nominee_dob')} className="input" />
                            {errors.nominee_dob && <p className="error-text">{errors.nominee_dob.message}</p>}
                        </div>
                        <div>
                            <label className="label">Relation</label>
                            <select {...register('relation')} className="input">
                                <option value="">Select Relation</option>
                                <option value="SPOUSE">Spouse</option>
                                <option value="SON">Son</option>
                                <option value="DAUGHTER">Daughter</option>
                                <option value="FATHER">Father</option>
                                <option value="MOTHER">Mother</option>
                                <option value="SIBLING">Sibling</option>
                                <option value="OTHER">Other</option>
                            </select>
                            {errors.relation && <p className="error-text">{errors.relation.message}</p>}
                        </div>
                        <div className="flex items-center pt-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" {...register('is_primary')} className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500" />
                                <span className="text-sm font-medium text-gray-700">Primary Nominee</span>
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="btn btn-sm btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="btn btn-sm btn-primary"
                        >
                            {createMutation.isPending ? 'Adding...' : 'Save Nominee'}
                        </button>
                    </div>
                </form>
            )}

            {nominees?.length === 0 && !showForm ? (
                <div className="text-center py-4 bg-gray-50 rounded-lg text-gray-500 flex flex-col items-center">
                    <AlertTriangle className="w-6 h-6 mb-2 text-yellow-500" />
                    No nominees added yet. Important for insurance!
                </div>
            ) : (
                <div className="grid gap-3">
                    {nominees?.map(nominee => (
                        <div key={nominee.nominee_id} className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-semibold">{nominee.nominee_name}</h4>
                                    {nominee.is_primary && (
                                        <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">PRIMARY</span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500">
                                    {nominee.relation} • DOB: {formatDate(nominee.nominee_dob)}
                                </p>
                            </div>
                            <button
                                onClick={() => deleteMutation.mutate(nominee.nominee_id)}
                                className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                                title="Delete Nominee"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
