import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, ArrowLeft, ShieldCheck, UserCog, Key } from 'lucide-react'
import { authApi } from '../api/authApi'

interface ForgotPinModalProps {
    onClose: () => void
}

type Mode = 'select' | 'staff-request' | 'totp-reset'

const resetSchema = z.object({
    totp_code: z.string().length(6, 'Code must be 6 digits'),
    new_pin: z.string().length(6, 'PIN must be 6 digits'),
    confirm_pin: z.string().length(6, 'PIN must be 6 digits'),
}).refine((data) => data.new_pin === data.confirm_pin, {
    message: "PINs don't match",
    path: ["confirm_pin"],
})

type ResetForm = z.infer<typeof resetSchema>

export default function ForgotPinModal({ onClose }: ForgotPinModalProps) {
    const [mode, setMode] = useState<Mode>('select')
    const [loading, setLoading] = useState(false)
    const [identifier, setIdentifier] = useState('')
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)

    const { register, handleSubmit, formState: { errors } } = useForm<ResetForm>({
        resolver: zodResolver(resetSchema)
    })

    // Staff submits a PIN reset request to admin
    const handleStaffRequest = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!identifier.trim()) return

        setLoading(true)
        setMessage(null)
        try {
            const res = await authApi.requestPinReset(identifier)
            setMessage({ type: 'success', text: res.message })
        } catch (err: any) {
            setMessage({ type: 'error', text: err?.response?.data?.detail || 'Failed to submit request' })
        } finally {
            setLoading(false)
        }
    }

    // Admin/Dealer resets own PIN with TOTP
    const onTotpResetSubmit = async (data: ResetForm) => {
        if (!identifier.trim()) {
            setMessage({ type: 'error', text: 'Please enter your mobile number' })
            return
        }
        setLoading(true)
        setMessage(null)
        try {
            const res = await authApi.resetPinSelf({
                mobile: identifier,
                totp_code: data.totp_code,
                new_pin: data.new_pin,
                confirm_pin: data.confirm_pin,
            })
            setMessage({ type: 'success', text: res.message })
            setTimeout(onClose, 2000)
        } catch (err: any) {
            setMessage({ type: 'error', text: err?.response?.data?.detail || 'Reset failed' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-gray-900 mb-1">Reset PIN</h2>
                <p className="text-sm text-gray-500 mb-6">Recover access to your account</p>

                {message && (
                    <div className={`mb-6 p-4 rounded-lg text-sm flex items-start
                        ${message.type === 'success' ? 'bg-green-50 text-green-700' :
                            message.type === 'error' ? 'bg-red-50 text-red-700' :
                                'bg-blue-50 text-blue-700'
                        }`}>
                        {message.text}
                    </div>
                )}

                {/* Step 1: Choose reset method */}
                {mode === 'select' && (
                    <div className="space-y-3">
                        <button
                            onClick={() => { setMode('totp-reset'); setMessage(null) }}
                            className="w-full flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition text-left"
                        >
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <ShieldCheck className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-medium text-gray-900">I have Authenticator Access</h3>
                                <p className="text-xs text-gray-500">Reset using your TOTP authenticator app</p>
                            </div>
                        </button>

                        <button
                            onClick={() => { setMode('staff-request'); setMessage(null) }}
                            className="w-full flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition text-left"
                        >
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <UserCog className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                                <h3 className="font-medium text-gray-900">Request Reset from Admin</h3>
                                <p className="text-xs text-gray-500">Staff: Submit reset request for admin approval</p>
                            </div>
                        </button>
                    </div>
                )}

                {/* Staff request flow */}
                {mode === 'staff-request' && (
                    <div>
                        <button
                            onClick={() => { setMode('select'); setMessage(null) }}
                            className="text-sm text-gray-500 flex items-center mb-6 hover:text-gray-900 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" /> Back
                        </button>

                        <div className="bg-orange-50 p-4 rounded-lg flex items-center gap-3 mb-6">
                            <UserCog className="w-8 h-8 text-orange-600" />
                            <div>
                                <h3 className="font-medium text-gray-900">Request Admin Reset</h3>
                                <p className="text-xs text-gray-500">An admin will generate a temporary PIN for you</p>
                            </div>
                        </div>

                        <form onSubmit={handleStaffRequest} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Mobile Number
                                </label>
                                <input
                                    className="input w-full"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    placeholder="Enter your registered mobile number"
                                    required
                                    autoFocus
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !identifier.trim()}
                                className="btn btn-primary w-full py-2.5"
                            >
                                {loading ? 'Submitting...' : 'Submit Reset Request'}
                            </button>
                        </form>
                    </div>
                )}

                {/* TOTP reset flow (Admin/Dealer) */}
                {mode === 'totp-reset' && (
                    <div>
                        <button
                            onClick={() => { setMode('select'); setMessage(null) }}
                            className="text-sm text-gray-500 flex items-center mb-6 hover:text-gray-900 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" /> Back
                        </button>

                        <form onSubmit={handleSubmit(onTotpResetSubmit)} className="space-y-5">
                            <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-3 mb-6">
                                <ShieldCheck className="w-8 h-8 text-primary-600" />
                                <div>
                                    <h3 className="font-medium text-gray-900">Authenticator Reset</h3>
                                    <p className="text-xs text-gray-500">Enter your mobile and TOTP code</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                                <input
                                    className="input w-full"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    placeholder="Enter your registered mobile"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Authenticator Code</label>
                                <input
                                    {...register('totp_code')}
                                    className="input w-full font-mono text-center tracking-widest text-lg"
                                    placeholder="000000"
                                    maxLength={6}
                                />
                                {errors.totp_code && <p className="text-red-500 text-xs mt-1">{errors.totp_code.message}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">New PIN</label>
                                    <input
                                        type="password"
                                        {...register('new_pin')}
                                        className="input w-full text-center"
                                        placeholder="******"
                                        maxLength={6}
                                    />
                                    {errors.new_pin && <p className="text-red-500 text-xs mt-1">{errors.new_pin.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm PIN</label>
                                    <input
                                        type="password"
                                        {...register('confirm_pin')}
                                        className="input w-full text-center"
                                        placeholder="******"
                                        maxLength={6}
                                    />
                                    {errors.confirm_pin && <p className="text-red-500 text-xs mt-1">{errors.confirm_pin.message}</p>}
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="btn btn-primary w-full py-2.5">
                                {loading ? 'Resetting PIN...' : 'Reset PIN'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    )
}
