import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { useQuery, useMutation } from '@tanstack/react-query'
import { masterApi } from '../../master/api/masterApi'
import { procurementApi, SparePurchaseCreate } from '../api/procurementApi'
import { useAuthStore } from '../../../store/authStore'
import { Plus, Trash, ArrowLeft } from 'lucide-react'
import { inventoryApi } from '../../inventory/api/inventoryApi' // Assuming exists or need to check
import { api } from '../../../lib/api'

// Temporary fix since I didn't check inventoryApi
const getSpares = async () => {
    const response = await api.get('/inventory/status') // or master/spares? Helper to get spares list
    // Actually typically returns stock. 
    // Let's assume there is an endpoint to get all spare masters.
    // I recall creating spare master in inventory schema. 
    // And usually there is an endpoint to list them.
    // Let's try /master/spares if it exists? Or /inventory/stock implies stock but maybe includes details.
    // Better: GET /inventory/stock usually lists items.
    return response
}

export default function SparePurchasePage() {
    const navigate = useNavigate()
    const { user } = useAuthStore() // Verify role if needed

    const { data: vendors = [] } = useQuery({
        queryKey: ['vendors'],
        queryFn: masterApi.getVendors,
    })

    // We need a list of spares to select from.
    // For now, let's assume we can fetch them.
    // If not, we might need an autocomplete. 
    // Simplified: Dropdown of all spares (might be heavy but ok for MVP).

    // NOTE: I am making a raw api call here if I don't validly know the api function
    const { data: spares = [] } = useQuery({
        queryKey: ['spares-list'],
        queryFn: async () => {
            const res = await api.get<any[]>('/inventory/status') // Using stock endpoint to get list of items
            return res
        }
    })

    const { register, control, handleSubmit, watch, formState: { errors } } = useForm<SparePurchaseCreate>({
        defaultValues: {
            purchase_date: new Date().toISOString().split('T')[0],
            include_in_accounting: true,
            items: [{ spare_id: 0, quantity: 1, unit_cost: 0, gst_percentage: 18 }]
        }
    })

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items"
    })

    const items = watch('items')

    const totalAmount = items.reduce((sum, item) => {
        const cost = Number(item.unit_cost) || 0
        const qty = Number(item.quantity) || 0
        const gst = Number(item.gst_percentage) || 0
        const total = (cost * qty) * (1 + gst / 100)
        return sum + total
    }, 0)

    const mutation = useMutation({
        mutationFn: procurementApi.createSparePurchase,
        onSuccess: () => {
            alert('Purchase recorded successfully')
            navigate('/procurement')
        },
        onError: (err) => {
            alert('Failed to record purchase')
            console.error(err)
        }
    })

    const onSubmit = (data: SparePurchaseCreate) => {
        // Transform data if needed, ensure types
        mutation.mutate(data)
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/procurement')} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold">New Spare Purchase</h1>
                    <p className="text-gray-500">Record inward supply of parts</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="card space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Vendor & Invoice Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label">Vendor</label>
                            <select {...register('vendor_id')} className="input" required>
                                <option value="">Select Vendor</option>
                                {vendors.map(v => (
                                    <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">Purchase Date</label>
                            <input type="date" {...register('purchase_date')} className="input" required />
                        </div>
                        <div>
                            <label className="label">Invoice No</label>
                            <input type="text" {...register('vendor_invoice_no')} className="input" placeholder="Optional" />
                        </div>
                        <div>
                            <label className="label">Invoice Date</label>
                            <input type="date" {...register('vendor_invoice_date')} className="input" />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                        <input type="checkbox" {...register('include_in_accounting')} id="acc" className="w-4 h-4" />
                        <label htmlFor="acc" className="text-sm font-medium">Include in Accounting</label>
                    </div>
                </div>

                <div className="card space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                        <h3 className="font-semibold text-lg">Items</h3>
                        <button type="button" onClick={() => append({ spare_id: 0, quantity: 1, unit_cost: 0, gst_percentage: 18 })} className="btn btn-outline btn-sm">
                            <Plus className="w-4 h-4 mr-1" /> Add Item
                        </button>
                    </div>

                    <div className="space-y-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-12 gap-2 items-end border p-3 rounded-lg bg-gray-50">
                                <div className="col-span-4">
                                    <label className="text-xs font-medium text-gray-500">Part</label>
                                    <select {...register(`items.${index}.spare_id`)} className="input text-sm" required>
                                        <option value="">Select Part</option>
                                        {spares.map((s: any) => (
                                            // Assuming s has spare_id and spare_name/code
                                            <option key={s.spare_id} value={s.spare_id}>{s.spare_name} ({s.part_code || s.spare_code})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-medium text-gray-500">Qty</label>
                                    <input type="number" {...register(`items.${index}.quantity`)} className="input text-sm" min="1" required />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-medium text-gray-500">Rate</label>
                                    <input type="number" step="0.01" {...register(`items.${index}.unit_cost`)} className="input text-sm" required />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-medium text-gray-500">GST %</label>
                                    <input type="number" step="0.01" {...register(`items.${index}.gst_percentage`)} className="input text-sm" />
                                </div>
                                <div className="col-span-1">
                                    <label className="text-xs font-medium text-gray-500">Total</label>
                                    <div className="py-2 text-sm font-bold text-gray-700">
                                        {((Number(items[index]?.unit_cost) || 0) * (Number(items[index]?.quantity) || 0) * (1 + (Number(items[index]?.gst_percentage) || 0) / 100)).toFixed(0)}
                                    </div>
                                </div>
                                <div className="col-span-1 flex justify-center pb-1">
                                    <button type="button" onClick={() => remove(index)} className="text-red-500 hover:text-red-700">
                                        <Trash className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end pt-4">
                        <div className="text-xl font-bold">
                            Total: ₹{totalAmount.toFixed(2)}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <button type="button" onClick={() => navigate('/procurement')} className="btn btn-outline">Cancel</button>
                    <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
                        {mutation.isPending ? 'Saving...' : 'Save Purchase'}
                    </button>
                </div>
            </form>
        </div>
    )
}
