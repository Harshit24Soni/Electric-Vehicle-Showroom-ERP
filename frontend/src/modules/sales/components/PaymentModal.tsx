import { useState } from 'react'
import { X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { salesApi } from '../api/salesApi'
import toast from 'react-hot-toast'

interface PaymentModalProps {
    saleId: number
    onClose: () => void
}

const PAYMENT_TYPES = ['BOOKING', 'PARTIAL', 'FINAL'] as const
const PAYMENT_MODES = ['CASH', 'UPI', 'CARD', 'CHEQUE', 'FINANCE'] as const

export default function PaymentModal({ saleId, onClose }: PaymentModalProps) {
    const queryClient = useQueryClient()
    const [paymentType, setPaymentType] = useState('BOOKING')
    const [paymentMode, setPaymentMode] = useState('CASH')
    const [amount, setAmount] = useState('')
    const [referenceNumber, setReferenceNumber] = useState('')
    const [bankName, setBankName] = useState('')
    const [remarks, setRemarks] = useState('')

    const mutation = useMutation({
        mutationFn: () =>
            salesApi.addPayment(saleId, {
                payment_type: paymentType,
                payment_mode: paymentMode,
                amount: parseFloat(amount),
                reference_number: referenceNumber || undefined,
                bank_name: bankName || undefined,
                remarks: remarks || undefined,
            }),
        onSuccess: () => {
            toast.success('Payment added successfully')
            queryClient.invalidateQueries({ queryKey: ['sale', String(saleId)] })
            queryClient.invalidateQueries({ queryKey: ['sale-progress', String(saleId)] })
            onClose()
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.detail || 'Failed to add payment')
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!amount || parseFloat(amount) <= 0) {
            toast.error('Please enter a valid amount')
            return
        }
        mutation.mutate()
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-lg w-full">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold">Add Payment</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type *</label>
                            <select
                                value={paymentType}
                                onChange={(e) => setPaymentType(e.target.value)}
                                className="input"
                            >
                                {PAYMENT_TYPES.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode *</label>
                            <select
                                value={paymentMode}
                                onChange={(e) => setPaymentMode(e.target.value)}
                                className="input"
                            >
                                {PAYMENT_MODES.map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                        <input
                            type="number"
                            step="0.01"
                            min="1"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="input"
                            placeholder="Enter amount"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reference / Transaction Number</label>
                        <input
                            type="text"
                            value={referenceNumber}
                            onChange={(e) => setReferenceNumber(e.target.value)}
                            className="input"
                            placeholder="UTR, cheque number, etc."
                        />
                    </div>

                    {paymentMode === 'FINANCE' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                            <input
                                type="text"
                                value={bankName}
                                onChange={(e) => setBankName(e.target.value)}
                                className="input"
                                placeholder="Finance bank name"
                            />
                        </div>
                    )}

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

                    <div className="flex justify-end gap-3 pt-2 border-t">
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
                            {mutation.isPending ? 'Adding...' : 'Add Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
