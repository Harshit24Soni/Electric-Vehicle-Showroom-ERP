import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, FileCheck, UserCheck, ShieldCheck, MapPin, CreditCard } from 'lucide-react'
import { leadsApi, Lead, LeadConvertPayload } from '../api/leads'
import { useCrmStore } from '@/store/crmStore'
import { Button } from '@/components/ui/Button'

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
      useCrmStore.getState().fetchLeads(true)
      onSuccess()
      onClose()
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <FileCheck className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
                Convert Lead to Customer
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Complete KYC & Nominee records for {lead.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 1. Buyer Details */}
          <div className="space-y-3 bg-slate-50/50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-primary-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-heading">
                Buyer Details
              </h3>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Pre-filled from lead — edit if the registered buyer is different (e.g. father buying for child).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Primary Phone *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Type
                </label>
                <select
                  value={customerType}
                  onChange={(e) => setCustomerType(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 cursor-pointer"
                >
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="BUSINESS">Business / Corporate</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. KYC Documents */}
          <div className="space-y-3 bg-slate-50/50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-heading">
                KYC Verification Documents
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Aadhaar Number * <span className="text-slate-400 font-normal">(12 digits)</span>
                </label>
                <input
                  type="text"
                  required
                  value={aadhaarNo}
                  onChange={(e) => setAadhaarNo(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-mono"
                  placeholder="12-digit Aadhaar"
                  maxLength={12}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  PAN Number * <span className="text-slate-400 font-normal">(10 characters)</span>
                </label>
                <input
                  type="text"
                  required
                  value={panNo}
                  onChange={(e) => setPanNo(e.target.value.toUpperCase().slice(0, 10))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-mono uppercase"
                  placeholder="e.g. ABCDE1234F"
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          {/* 3. Address */}
          <div className="space-y-3 bg-slate-50/50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-heading">
                Residential / Registration Address
              </h3>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  required
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  placeholder="House / Flat No., Street, Area"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Pincode *
                  </label>
                  <input
                    type="text"
                    required
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-mono"
                    maxLength={6}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Insurance Nominee */}
          <div className="space-y-3 bg-slate-50/50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-heading">
                Mandatory Insurance Nominee
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nominee Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={nomineeName}
                  onChange={(e) => setNomineeName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Relationship *
                </label>
                <input
                  type="text"
                  required
                  value={nomineeRelation}
                  onChange={(e) => setNomineeRelation(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  placeholder="e.g. Spouse, Father"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  required
                  value={nomineeDob}
                  onChange={(e) => setNomineeDob(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 animate-shake">
              {error}
            </div>
          )}

          {/* Action Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={convertMutation.isPending}
              isLoading={convertMutation.isPending}
              variant="primary"
            >
              Convert to Customer
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
