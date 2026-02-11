import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, User, Car, DollarSign } from 'lucide-react'
import { masterApi, Customer, Vehicle } from '../../master/api/masterApi'
import { salesApi, SaleCreate } from '../../sales/api/salesApi'
import { Lead } from '../api/leads' // Assuming Lead type is exported from here or correct path

interface LeadConversionModalProps {
    lead: Lead
    onClose: () => void
    onSuccess: () => void
}

export default function LeadConversionModal({ lead, onClose, onSuccess }: LeadConversionModalProps) {
    const queryClient = useQueryClient()
    const [step, setStep] = useState<1 | 2>(1)
    const [customerMode, setCustomerMode] = useState<'new' | 'existing'>('new')
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
    const [selectedChassisNo, setSelectedChassisNo] = useState<string>('')
    const [totalAmount, setTotalAmount] = useState<number>(0)
    const [remarks, setRemarks] = useState('')
    const [error, setError] = useState<string | null>(null)

    // Customer Form State (for new customer)
    const [customerData, setCustomerData] = useState({
        name: lead.name,
        primary_phone: lead.phone,
        email: lead.email || '',
        customer_type: 'INDIVIDUAL' as const
    })

    // Fetch Data
    const { data: vehicles } = useQuery({
        queryKey: ['vehicles', 'IN_STOCK'],
        queryFn: () => masterApi.getVehicles('IN_STOCK'),
    })

    const { data: customers } = useQuery({
        queryKey: ['customers'],
        queryFn: masterApi.getCustomers,
        enabled: customerMode === 'existing'
    })

    const createCustomerMutation = useMutation({
        mutationFn: masterApi.createCustomer,
    })

    const createSaleMutation = useMutation({
        mutationFn: salesApi.createSale,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leads'] })
            queryClient.invalidateQueries({ queryKey: ['sales'] })
            queryClient.invalidateQueries({ queryKey: ['vehicles'] })
            onSuccess()
            onClose()
        },
        onError: (err: any) => {
            setError(err.response?.data?.detail || 'Failed to create sale')
        }
    })

    const handleSubmit = async () => {
        setError(null)
        try {
            let finalCustomerId = selectedCustomerId

            // Step 1: Create Customer if New
            if (customerMode === 'new') {
                const newCustomer = await createCustomerMutation.mutateAsync({
                    name: customerData.name,
                    primary_phone: customerData.primary_phone,
                    email: customerData.email,
                    customer_type: customerData.customer_type
                })
                finalCustomerId = newCustomer.customer_id
            }

            if (!finalCustomerId) {
                setError("Please select or create a customer")
                return
            }

            if (!selectedChassisNo) {
                setError("Please select a vehicle")
                return
            }

            if (totalAmount <= 0) {
                setError("Please enter a valid sale amount")
                return
            }

            // Step 2: Create Sale
            await createSaleMutation.mutateAsync({
                lead_id: lead.lead_id,
                customer_id: finalCustomerId,
                chassis_no: selectedChassisNo,
                sale_date: new Date().toISOString().split('T')[0],
                total_amount: totalAmount,
                remarks: remarks
            })

        } catch (err: any) {
            setError(err.response?.data?.detail || 'An error occurred')
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900">Convert Lead to Sale</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Progress Steps */}
                    <div className="flex items-center justify-center mb-6">
                        <div className={`flex items-center gap-2 ${step === 1 ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm">1</div>
                            Customer
                        </div>
                        <div className="w-16 h-px bg-gray-300 mx-4"></div>
                        <div className={`flex items-center gap-2 ${step === 2 ? 'text-blue-600 font-bold' : 'text-gray-500'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${step === 2 ? 'bg-blue-100' : 'bg-gray-100'}`}>2</div>
                            Details
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
                            {error}
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="flex gap-4 mb-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="customerMode"
                                        checked={customerMode === 'new'}
                                        onChange={() => setCustomerMode('new')}
                                        className="text-blue-600"
                                    />
                                    <span className="font-medium">Create New Customer</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="customerMode"
                                        checked={customerMode === 'existing'}
                                        onChange={() => setCustomerMode('existing')}
                                        className="text-blue-600"
                                    />
                                    <span className="font-medium">Select Existing</span>
                                </label>
                            </div>

                            {customerMode === 'new' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Full Name</label>
                                        <input
                                            type="text"
                                            value={customerData.name}
                                            onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                                            className="input"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Phone Number</label>
                                        <input
                                            type="text"
                                            value={customerData.primary_phone}
                                            onChange={(e) => setCustomerData({ ...customerData, primary_phone: e.target.value })}
                                            className="input"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Email (Optional)</label>
                                        <input
                                            type="email"
                                            value={customerData.email}
                                            onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                                            className="input"
                                        />
                                    </div>
                                    <div>
                                        <label className="label">Type</label>
                                        <select
                                            value={customerData.customer_type}
                                            onChange={(e) => setCustomerData({ ...customerData, customer_type: e.target.value as any })}
                                            className="input"
                                        >
                                            <option value="INDIVIDUAL">Individual</option>
                                            <option value="BUSINESS">Business</option>
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="label">Select Customer</label>
                                    <select
                                        value={selectedCustomerId || ''}
                                        onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                                        className="input"
                                    >
                                        <option value="">-- Select Customer --</option>
                                        {customers?.map(c => (
                                            <option key={c.customer_id} value={c.customer_id}>
                                                {c.name} ({c.primary_phone})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex justify-end mt-6">
                                <button onClick={() => setStep(2)} className="btn btn-primary">
                                    Next: Sale Details
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <label className="label flex items-center gap-2">
                                    <Car className="w-4 h-4" />
                                    Select Vehicle
                                </label>
                                <select
                                    value={selectedChassisNo}
                                    onChange={(e) => setSelectedChassisNo(e.target.value)}
                                    className="input"
                                >
                                    <option value="">-- Select Vehicle in Stock --</option>
                                    {vehicles?.map(v => (
                                        <option key={v.chassis_no} value={v.chassis_no}>
                                            {v.chassis_no}
                                        </option>
                                    ))}
                                </select>
                                {vehicles?.length === 0 && (
                                    <p className="text-xs text-red-500 mt-1">No vehicles available in stock!</p>
                                )}
                            </div>

                            <div>
                                <label className="label flex items-center gap-2">
                                    <DollarSign className="w-4 h-4" />
                                    Total Sale Amount
                                </label>
                                <input
                                    type="number"
                                    value={totalAmount}
                                    onChange={(e) => setTotalAmount(Number(e.target.value))}
                                    className="input"
                                    min="0"
                                />
                            </div>

                            <div>
                                <label className="label">Remarks</label>
                                <textarea
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    className="input h-20"
                                    placeholder="Any additional notes..."
                                />
                            </div>

                            <div className="flex justify-between mt-6">
                                <button onClick={() => setStep(1)} className="btn btn-secondary">
                                    Back
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={createSaleMutation.isPending || createCustomerMutation.isPending}
                                    className="btn btn-primary"
                                >
                                    {(createSaleMutation.isPending || createCustomerMutation.isPending) ? 'Processing...' : 'Confirm Sale'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
