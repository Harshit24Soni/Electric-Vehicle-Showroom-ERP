import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { useQuery, useMutation } from '@tanstack/react-query'
import { masterApi } from '../../master/api/masterApi'
import { procurementApi, VehiclePurchaseCreate } from '../api/procurementApi'
import { Plus, Trash, ArrowLeft } from 'lucide-react'

export default function VehiclePurchasePage() {
    const navigate = useNavigate()

    const { data: vendors = [] } = useQuery({
        queryKey: ['vendors'],
        queryFn: masterApi.getVendors,
    })

    const { data: models = [] } = useQuery({
        queryKey: ['vehicle-models'],
        queryFn: masterApi.getVehicleModels,
    })

    // Filter vendors to only vehicle vendors if possible, but all is fine for now

    const { register, control, handleSubmit, watch, formState: { errors } } = useForm<VehiclePurchaseCreate>({
        defaultValues: {
            invoice_date: new Date().toISOString().split('T')[0],
            include_in_accounting: true,
            details: [{ vehicle_model_id: 0, chassis_no: '', cost_price: 0 }]
        }
    })

    const { fields, append, remove } = useFieldArray({
        control,
        name: "details"
    })

    const mutation = useMutation({
        mutationFn: procurementApi.createVehiclePurchase,
        onSuccess: () => {
            alert('Vehicle Purchase recorded successfully')
            navigate('/procurement')
        },
        onError: (err) => {
            alert('Failed to record purchase')
            console.error(err)
        }
    })

    const onSubmit = (data: VehiclePurchaseCreate) => {
        mutation.mutate(data)
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/procurement')} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold">New Vehicle Purchase</h1>
                    <p className="text-gray-500">Inward new vehicles from OEM</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="card space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2">Invoice Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            <label className="label">Invoice No</label>
                            <input type="text" {...register('invoice_number')} className="input" required />
                        </div>
                        <div>
                            <label className="label">Invoice Date</label>
                            <input type="date" {...register('invoice_date')} className="input" required />
                        </div>
                        <div>
                            <label className="label">Total Amount</label>
                            <input type="number" step="0.01" {...register('invoice_amount')} className="input" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                        <input type="checkbox" {...register('include_in_accounting')} id="acc" className="w-4 h-4" />
                        <label htmlFor="acc" className="text-sm font-medium">Include in Accounting</label>
                    </div>
                </div>

                <div className="card space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                        <h3 className="font-semibold text-lg">Vehicles</h3>
                        <button type="button" onClick={() => append({ vehicle_model_id: 0, chassis_no: '', cost_price: 0 })} className="btn btn-outline btn-sm">
                            <Plus className="w-4 h-4 mr-1" /> Add Vehicle
                        </button>
                    </div>

                    <div className="space-y-6">
                        {fields.map((field, index) => (
                            <div key={field.id} className="border p-4 rounded-lg bg-gray-50 relative group">
                                <button type="button" onClick={() => remove(index)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">
                                    <Trash className="w-5 h-5" />
                                </button>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div>
                                        <label className="text-xs font-medium text-gray-500">Model</label>
                                        <select {...register(`details.${index}.vehicle_model_id`)} className="input text-sm" required>
                                            <option value="">Select Model</option>
                                            {models.map(m => (
                                                <option key={m.vehicle_model_id} value={m.vehicle_model_id}>{m.model_name} ({m.colour})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-500">Chassis No</label>
                                        <input type="text" {...register(`details.${index}.chassis_no`)} className="input text-sm" required placeholder="VIN / Chassis Number" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-gray-500">Cost Price</label>
                                        <input type="number" step="0.01" {...register(`details.${index}.cost_price`)} className="input text-sm" />
                                    </div>
                                </div>

                                {/* Component Serials */}
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-400">Motor Serial</label>
                                        <input type="text" {...register(`details.${index}.motor_serial_no`)} className="input text-xs" placeholder="Motor S/N" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400">Battery Serial</label>
                                        <input type="text" {...register(`details.${index}.battery_serial_no`)} className="input text-xs" placeholder="Battery S/N" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400">Charger Serial</label>
                                        <input type="text" {...register(`details.${index}.charger_serial_no`)} className="input text-xs" placeholder="Charger S/N" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400">Controller Serial</label>
                                        <input type="text" {...register(`details.${index}.controller_serial_no`)} className="input text-xs" placeholder="Controller S/N" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400">Converter Serial</label>
                                        <input type="text" {...register(`details.${index}.convertor_serial_no`)} className="input text-xs" placeholder="Converter S/N" />
                                    </div>
                                </div>
                            </div>
                        ))}
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
