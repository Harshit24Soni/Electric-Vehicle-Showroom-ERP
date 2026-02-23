import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, DollarSign } from 'lucide-react'
import { salesApi, SaleCreatePayload } from '../api/salesApi'
import { masterApi } from '../../master/api/masterApi'

interface NewSaleModalProps {
    onClose: () => void
}

export default function NewSaleModal({ onClose }: NewSaleModalProps) {
    const queryClient = useQueryClient()
    const [error, setError] = useState<string | null>(null)

    // Form state
    const [customerId, setCustomerId] = useState<number | ''>('')
    const [chassisNo, setChassisNo] = useState('')
    const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10))
    const [basePrice, setBasePrice] = useState<number | ''>('')
    const [taxes, setTaxes] = useState<number | ''>(0)
    const [totalAmount, setTotalAmount] = useState<number | ''>('')
    const [paymentMode, setPaymentMode] = useState('CASH')
    const [financierName, setFinancierName] = useState('')
    const [downPayment, setDownPayment] = useState<number | ''>('')
    const [remarks, setRemarks] = useState('')

    // Fetch customers + vehicles
    const { data: customers = [] } = useQuery({
        queryKey: ['customers'],
        queryFn: masterApi.getCustomers,
    })

    const { data: allVehicles = [] } = useQuery({
        queryKey: ['vehicles'],
        queryFn: () => masterApi.getVehicles(),
    })

    // Filter vehicles to only AVAILABLE / IN_STOCK
    const availableVehicles = useMemo(
        () => allVehicles.filter((v: any) => v.current_status === 'IN_STOCK' || v.current_status === 'AVAILABLE'),
        [allVehicles]
    )

    // Auto-calculate total when base_price or taxes change
    const computedTotal = useMemo(() => {
        const bp = Number(basePrice) || 0
        const tx = Number(taxes) || 0
        return bp + tx
    }, [basePrice, taxes])

    // Sync total
    const handleBasePriceChange = (val: number | '') => {
        setBasePrice(val)
        setTotalAmount((Number(val) || 0) + (Number(taxes) || 0))
    }
    const handleTaxesChange = (val: number | '') => {
        setTaxes(val)
        setTotalAmount((Number(basePrice) || 0) + (Number(val) || 0))
    }

    const mutation = useMutation({
        mutationFn: (payload: SaleCreatePayload) => salesApi.createSaleBilling(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sales'] })
            queryClient.invalidateQueries({ queryKey: ['vehicles'] })
            queryClient.invalidateQueries({ queryKey: ['customers'] })
            onClose()
        },
        onError: (err: any) => {
            setError(err?.response?.data?.detail || 'Failed to create sale.')
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!customerId) { setError('Please select a customer.'); return }
        if (!chassisNo) { setError('Please select a vehicle.'); return }
        if (!basePrice || Number(basePrice) <= 0) { setError('Base Price must be > 0.'); return }
        if (!totalAmount || Number(totalAmount) <= 0) { setError('Total Amount must be > 0.'); return }
        if (paymentMode === 'FINANCE' && !financierName.trim()) { setError('Financier Name is required for FINANCE mode.'); return }

        mutation.mutate({
            customer_id: customerId as number,
            chassis_no: chassisNo,
            sale_date: saleDate,
            base_price: Number(basePrice),
            taxes: Number(taxes) || 0,
            total_amount: Number(totalAmount),
            payment_mode: paymentMode,
            financier_name: paymentMode === 'FINANCE' ? financierName.trim() : undefined,
            down_payment_amount: Number(downPayment) || 0,
            remarks: remarks.trim() || undefined,
            is_direct_sale: true,
        })
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">New Sale / Billing</h2>
                            <p className="text-sm text-gray-500">Create sale, generate invoice, and record payment</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* ── Customer & Vehicle ── */}
                    <fieldset>
                        <legend className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">
                            Customer & Vehicle
                        </legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Customer <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={customerId}
                                    onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : '')}
                                    className="input"
                                >
                                    <option value="">Select customer</option>
                                    {customers.map((c: any) => (
                                        <option key={c.customer_id} value={c.customer_id}>
                                            {c.name} — {c.primary_phone}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Vehicle (Available) <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={chassisNo}
                                    onChange={(e) => setChassisNo(e.target.value)}
                                    className="input"
                                >
                                    <option value="">Select vehicle</option>
                                    {availableVehicles.map((v: any) => (
                                        <option key={v.chassis_no} value={v.chassis_no}>
                                            {v.model?.model_name || 'Vehicle'} — {v.chassis_no} ({v.color || 'N/A'})
                                        </option>
                                    ))}
                                </select>
                                {availableVehicles.length === 0 && (
                                    <p className="text-xs text-amber-600 mt-1">No available vehicles in inventory.</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sale Date</label>
                                <input
                                    type="date"
                                    value={saleDate}
                                    onChange={(e) => setSaleDate(e.target.value)}
                                    className="input"
                                />
                            </div>
                        </div>
                    </fieldset>

                    {/* ── Financials ── */}
                    <fieldset>
                        <legend className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">
                            Financials
                        </legend>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Base Price (₹) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    required
                                    min={1}
                                    value={basePrice}
                                    onChange={(e) => handleBasePriceChange(e.target.value ? Number(e.target.value) : '')}
                                    className="input"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Taxes (₹)</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={taxes}
                                    onChange={(e) => handleTaxesChange(e.target.value ? Number(e.target.value) : '')}
                                    className="input"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Total Amount (₹) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    required
                                    min={1}
                                    value={totalAmount}
                                    onChange={(e) => setTotalAmount(e.target.value ? Number(e.target.value) : '')}
                                    className="input font-semibold"
                                />
                                {computedTotal > 0 && totalAmount !== computedTotal && (
                                    <p className="text-xs text-amber-600 mt-1">Auto-calculated: ₹{computedTotal.toLocaleString()}</p>
                                )}
                            </div>
                        </div>
                    </fieldset>

                    {/* ── Payment ── */}
                    <fieldset>
                        <legend className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">
                            Payment
                        </legend>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Payment Mode <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={paymentMode}
                                    onChange={(e) => setPaymentMode(e.target.value)}
                                    className="input"
                                >
                                    <option value="CASH">Cash</option>
                                    <option value="CARD">Card</option>
                                    <option value="UPI">UPI</option>
                                    <option value="FINANCE">Finance</option>
                                </select>
                            </div>
                            {paymentMode === 'FINANCE' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Financier Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={financierName}
                                        onChange={(e) => setFinancierName(e.target.value)}
                                        className="input"
                                        placeholder="e.g. HDFC, Bajaj Finance"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Down Payment (₹)</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={downPayment}
                                    onChange={(e) => setDownPayment(e.target.value ? Number(e.target.value) : '')}
                                    className="input"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </fieldset>

                    {/* Remarks */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                        <textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            className="input"
                            rows={2}
                            placeholder="Optional notes"
                        />
                    </div>

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
                            {mutation.isPending ? 'Processing...' : 'Create Sale & Invoice'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
