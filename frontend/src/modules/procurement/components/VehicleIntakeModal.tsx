import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Plus, Trash2, Truck } from 'lucide-react'
import { procurementApi, VehicleIntakePayload, VehicleIntakeItem } from '../api/procurementApi'
import { masterApi } from '../../master/api/masterApi'

interface VehicleIntakeModalProps {
    onClose: () => void
}

interface VehicleRow {
    chassis_no: string
    motor_no: string
    vehicle_model_id: number | ''
    color: string
    battery_serial_no: string
    purchase_price: number | ''
}

const emptyRow = (): VehicleRow => ({
    chassis_no: '',
    motor_no: '',
    vehicle_model_id: '',
    color: '',
    battery_serial_no: '',
    purchase_price: '',
})

export default function VehicleIntakeModal({ onClose }: VehicleIntakeModalProps) {
    const queryClient = useQueryClient()

    // Invoice fields
    const [oemInvoiceNo, setOemInvoiceNo] = useState('')
    const [oemInvoiceDate, setOemInvoiceDate] = useState('')
    const [vendorId, setVendorId] = useState<number | ''>('')

    // Dynamic vehicle rows
    const [vehicles, setVehicles] = useState<VehicleRow[]>([emptyRow()])
    const [error, setError] = useState<string | null>(null)

    // Fetch vendors (OEM only) + vehicle models
    const { data: allVendors = [] } = useQuery({
        queryKey: ['vendors'],
        queryFn: () => masterApi.getVendors(),
    })

    const oemVendors = allVendors.filter(
        (v: any) => v.vendor_type === 'OEM' && !v.is_deleted && v.is_active !== false
    )

    const { data: models = [] } = useQuery({
        queryKey: ['vehicle-models'],
        queryFn: () => masterApi.getVehicleModels(),
    })

    // Only show active, non-deleted models
    const activeModels = models.filter(
        (m: any) => !m.is_deleted && m.is_active !== false
    )

    const addRow = () => setVehicles([...vehicles, emptyRow()])

    const removeRow = (idx: number) => {
        if (vehicles.length <= 1) return
        setVehicles(vehicles.filter((_, i) => i !== idx))
    }

    const updateRow = (idx: number, field: keyof VehicleRow, value: any) => {
        const updated = [...vehicles]
        updated[idx] = { ...updated[idx], [field]: value }

        // Auto-fill color from selected VehicleModel
        if (field === 'vehicle_model_id' && value) {
            const selectedModel = activeModels.find((m: any) => m.vehicle_model_id === Number(value))
            if (selectedModel?.colour && !updated[idx].color) {
                updated[idx].color = selectedModel.colour
            }
        }

        setVehicles(updated)
    }

    const mutation = useMutation({
        mutationFn: (payload: VehicleIntakePayload) => procurementApi.intakeVehicles(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vehicle-purchases'] })
            queryClient.invalidateQueries({ queryKey: ['vehicles'] })
            onClose()
        },
        onError: (err: any) => {
            setError(err?.response?.data?.detail || 'Failed to process vehicle intake.')
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!oemInvoiceNo.trim()) { setError('OEM Invoice No. is required.'); return }
        if (!oemInvoiceDate) { setError('OEM Invoice Date is required.'); return }
        if (!vendorId) { setError('Please select an OEM vendor.'); return }

        // Validate all rows
        for (let i = 0; i < vehicles.length; i++) {
            const v = vehicles[i]
            if (!v.chassis_no.trim()) { setError(`Row ${i + 1}: Chassis No. is required.`); return }
            if (!v.vehicle_model_id) { setError(`Row ${i + 1}: Vehicle Model is required.`); return }
            if (!v.color.trim()) { setError(`Row ${i + 1}: Color is required.`); return }
            if (!v.purchase_price || Number(v.purchase_price) <= 0) { setError(`Row ${i + 1}: Purchase Price must be > 0.`); return }
        }

        // Check duplicate chassis within the form
        const chassisSet = new Set<string>()
        for (const v of vehicles) {
            if (chassisSet.has(v.chassis_no.trim())) {
                setError(`Duplicate chassis number: ${v.chassis_no.trim()}`); return
            }
            chassisSet.add(v.chassis_no.trim())
        }

        const payload: VehicleIntakePayload = {
            oem_invoice_no: oemInvoiceNo.trim(),
            oem_invoice_date: oemInvoiceDate,
            vendor_id: vendorId as number,
            vehicles: vehicles.map((v): VehicleIntakeItem => ({
                chassis_no: v.chassis_no.trim(),
                motor_no: v.motor_no.trim() || undefined,
                vehicle_model_id: v.vehicle_model_id as number,
                color: v.color.trim(),
                battery_serial_no: v.battery_serial_no.trim() || undefined,
                purchase_price: Number(v.purchase_price),
            })),
        }

        mutation.mutate(payload)
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                            <Truck className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Receive Vehicles (OEM Intake)</h2>
                            <p className="text-sm text-gray-500">Register a truckload of vehicles from OEM invoice</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* ── Invoice Details ── */}
                    <fieldset>
                        <legend className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">
                            OEM Invoice Details
                        </legend>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Invoice No. <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={oemInvoiceNo}
                                    onChange={(e) => setOemInvoiceNo(e.target.value)}
                                    className="input"
                                    placeholder="OEM-INV-001"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Invoice Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={oemInvoiceDate}
                                    onChange={(e) => setOemInvoiceDate(e.target.value)}
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Vendor (OEM) <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={vendorId}
                                    onChange={(e) => setVendorId(e.target.value ? Number(e.target.value) : '')}
                                    className="input"
                                >
                                    <option value="">Select OEM vendor</option>
                                    {oemVendors.map((v: any) => (
                                        <option key={v.vendor_id} value={v.vendor_id}>
                                            {v.vendor_name}
                                        </option>
                                    ))}
                                </select>
                                {oemVendors.length === 0 && (
                                    <p className="text-xs text-amber-600 mt-1">No OEM vendors found. Add one in Master → Vendors first.</p>
                                )}
                            </div>
                        </div>
                    </fieldset>

                    {/* ── Vehicle Rows ── */}
                    <fieldset>
                        <div className="flex items-center justify-between mb-3">
                            <legend className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                                Vehicles ({vehicles.length})
                            </legend>
                            <button
                                type="button"
                                onClick={addRow}
                                className="btn btn-secondary text-sm flex items-center gap-1"
                            >
                                <Plus className="w-4 h-4" /> Add Vehicle Row
                            </button>
                        </div>

                        <div className="space-y-3">
                            {vehicles.map((row, idx) => (
                                <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-semibold text-gray-500 uppercase">Vehicle #{idx + 1}</span>
                                        {vehicles.length > 1 && (
                                            <button type="button" onClick={() => removeRow(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Remove">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Chassis No. *</label>
                                            <input
                                                type="text"
                                                required
                                                value={row.chassis_no}
                                                onChange={(e) => updateRow(idx, 'chassis_no', e.target.value)}
                                                className="input text-sm"
                                                placeholder="CHSXXXX"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Motor No.</label>
                                            <input
                                                type="text"
                                                value={row.motor_no}
                                                onChange={(e) => updateRow(idx, 'motor_no', e.target.value)}
                                                className="input text-sm"
                                                placeholder="Optional"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Model *</label>
                                            <select
                                                required
                                                value={row.vehicle_model_id}
                                                onChange={(e) => updateRow(idx, 'vehicle_model_id', e.target.value ? Number(e.target.value) : '')}
                                                className="input text-sm"
                                            >
                                                <option value="">Select</option>
                                                {activeModels.map((m: any) => (
                                                    <option key={m.vehicle_model_id} value={m.vehicle_model_id}>
                                                        {m.brand_name ? `${m.brand_name} — ${m.model_name}` : m.model_name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Color *</label>
                                            <input
                                                type="text"
                                                required
                                                value={row.color}
                                                onChange={(e) => updateRow(idx, 'color', e.target.value)}
                                                className="input text-sm"
                                                placeholder="Red"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Battery S/N</label>
                                            <input
                                                type="text"
                                                value={row.battery_serial_no}
                                                onChange={(e) => updateRow(idx, 'battery_serial_no', e.target.value)}
                                                className="input text-sm"
                                                placeholder="Optional"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Price (₹) *</label>
                                            <input
                                                type="number"
                                                required
                                                min={1}
                                                value={row.purchase_price}
                                                onChange={(e) => updateRow(idx, 'purchase_price', e.target.value ? Number(e.target.value) : '')}
                                                className="input text-sm"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </fieldset>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
                            {mutation.isPending ? 'Processing...' : `Receive ${vehicles.length} Vehicle(s)`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
