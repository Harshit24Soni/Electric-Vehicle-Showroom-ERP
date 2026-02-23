import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { leadsApi, Lead, LeadConvertPayload } from '../api/leads'
import { useCrmStore } from '@/store/crmStore'

interface LeadConversionModalProps {
    lead: Lead
    onClose: () => void
    onSuccess: () => void
}

/**
 * Lead → Customer Conversion Modal
 *
 * "Buyer vs. Rider" flow: pre-fills from Lead data but allows editing
 * (e.g., son enquired but father is the actual buyer).
 *
 * Captures: Customer details + KYC (Aadhaar/PAN) + Address + Nominee
 * in a single atomic transaction.
 */
export default function LeadConversionModal({ lead, onClose, onSuccess }: LeadConversionModalProps) {
    const queryClient = useQueryClient()
    const [error, setError] = useState<string | null>(null)

    // Customer details — pre-filled from Lead but editable
    const [name, setName] = useState(lead.name)
    const [phone, setPhone] = useState(lead.phone)
    const [email, setEmail] = useState(lead.email || '')
    const [customerType, setCustomerType] = useState('INDIVIDUAL')

    // KYC
    const [aadhaarNo, setAadhaarNo] = useState('')
    const [panNo, setPanNo] = useState('')

    // Address
    const [addressLine1, setAddressLine1] = useState('')
    const [city, setCity] = useState('')
    const [state, setState] = useState('')
    const [pincode, setPincode] = useState('')

    // Nominee
    const [nomineeName, setNomineeName] = useState('')
    const [nomineeRelation, setNomineeRelation] = useState('')
    const [nomineeDob, setNomineeDob] = useState('')

    const convertMutation = useMutation({
        mutationFn: (payload: LeadConvertPayload) => leadsApi.convert(lead.lead_id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leads'] })
            queryClient.invalidateQueries({ queryKey: ['customers'] })
            useCrmStore.getState().fetchLeads()
            onSuccess()
            onClose()
        },
        onError: (err: any) => {
            setError(err?.response?.data?.detail || 'Failed to convert lead.')
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        // Client-side guards
        if (!name.trim() || !phone.trim()) {
            setError('Name and Phone are required.')
            return
        }
        if (aadhaarNo.length !== 12) {
            setError('Aadhaar must be exactly 12 digits.')
            return
        }
        if (panNo.length !== 10) {
            setError('PAN must be exactly 10 characters.')
            return
        }
        if (!addressLine1.trim() || !city.trim() || !state.trim() || !pincode.trim()) {
            setError('Complete address is required.')
            return
        }
        if (!nomineeName.trim() || !nomineeRelation.trim() || !nomineeDob) {
            setError('All nominee fields are required.')
            return
        }

        convertMutation.mutate({
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim() || undefined,
            customer_type: customerType,
            address_line1: addressLine1.trim(),
            city: city.trim(),
            state: state.trim(),
            pincode: pincode.trim(),
            aadhaar_no: aadhaarNo.trim(),
            pan_no: panNo.trim().toUpperCase(),
            nominee: {
                nominee_name: nomineeName.trim(),
                nominee_dob: nomineeDob,
                relation: nomineeRelation.trim(),
            },
        })
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Convert Lead to Customer</h2>
                        <p className="text-sm text-gray-500 mt-0.5">Complete KYC & Nominee for {lead.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* ── Buyer Details ── */}
                    <fieldset>
                        <legend className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">
                            Buyer Details
                        </legend>
                        <p className="text-xs text-gray-400 mb-3">
                            Pre-filled from lead — edit if the actual buyer is different (e.g., son inquired, father is buying).
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="input" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label>
                                <input type="text" required value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Type</label>
                                <select value={customerType} onChange={(e) => setCustomerType(e.target.value)} className="input">
                                    <option value="INDIVIDUAL">Individual</option>
                                    <option value="BUSINESS">Business</option>
                                </select>
                            </div>
                        </div>
                    </fieldset>

                    {/* ── KYC ── */}
                    <fieldset>
                        <legend className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">
                            KYC Documents
                        </legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar No. <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={aadhaarNo}
                                    onChange={(e) => setAadhaarNo(e.target.value.replace(/\D/g, '').slice(0, 12))}
                                    className="input"
                                    placeholder="12-digit Aadhaar"
                                    maxLength={12}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">PAN No. <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={panNo}
                                    onChange={(e) => setPanNo(e.target.value.toUpperCase().slice(0, 10))}
                                    className="input"
                                    placeholder="10-char PAN"
                                    maxLength={10}
                                />
                            </div>
                        </div>
                    </fieldset>

                    {/* ── Address ── */}
                    <fieldset>
                        <legend className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">
                            Address
                        </legend>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1 <span className="text-red-500">*</span></label>
                                <input type="text" required value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className="input" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">City <span className="text-red-500">*</span></label>
                                    <input type="text" required value={city} onChange={(e) => setCity(e.target.value)} className="input" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">State <span className="text-red-500">*</span></label>
                                    <input type="text" required value={state} onChange={(e) => setState(e.target.value)} className="input" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Pincode <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        value={pincode}
                                        onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className="input"
                                        maxLength={6}
                                    />
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    {/* ── Insurance Nominee ── */}
                    <fieldset>
                        <legend className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">
                            Insurance Nominee
                        </legend>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nominee Name <span className="text-red-500">*</span></label>
                                <input type="text" required value={nomineeName} onChange={(e) => setNomineeName(e.target.value)} className="input" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Relation <span className="text-red-500">*</span></label>
                                <input type="text" required value={nomineeRelation} onChange={(e) => setNomineeRelation(e.target.value)} className="input" placeholder="e.g. Spouse, Father" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth <span className="text-red-500">*</span></label>
                                <input type="date" required value={nomineeDob} onChange={(e) => setNomineeDob(e.target.value)} className="input" />
                            </div>
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
                        <button type="submit" disabled={convertMutation.isPending} className="btn btn-primary">
                            {convertMutation.isPending ? 'Converting...' : 'Convert to Customer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
