import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, ArrowLeft, ShieldCheck } from 'lucide-react'
import { authApi } from '../api/authApi'

interface ForgotPinModalProps {
    onClose: () => void
}

type Mode = 'identifier' | 'totp-reset'

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
    const [mode, setMode] = useState<Mode>('identifier')
    const [loading, setLoading] = useState(false)
    const [identifier, setIdentifier] = useState('')
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)

    const { register, handleSubmit, formState: { errors } } = useForm<ResetForm>({
        resolver: zodResolver(resetSchema)
    })

    const handleIdentifierSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!identifier.trim()) return

        setLoading(true)
        setMessage(null)
        try {
            const res = await authApi.forgotPin(identifier)

            switch (res.action) {
                case 'TOTP_REQUIRED':
                    setMode('totp-reset')
                    setMessage({ type: 'info', text: res.message })
                    break
                case 'CONTACT_ADMIN':
                    setMessage({ type: 'error', text: res.message })
                    break
                case 'CONTACT_DEALER':
                    setMessage({ type: 'info', text: res.message })
                    break
                case 'NONE':
                default:
                    setMessage({ type: 'success', text: res.message })
                    break
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Failed to process request. Please try again.' })
        } finally {
            setLoading(false)
        }
    }

    const onResetSubmit = async (data: ResetForm) => {
        setLoading(true)
        setMessage(null)
        try {
            await authApi.resetDealerPin({
                identifier,
                totp_code: data.totp_code,
                new_pin: data.new_pin
            })
            setMessage({ type: 'success', text: 'PIN reset successfully. You can login now.' })
            setTimeout(onClose, 2000)
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.detail || 'Reset failed' })
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

                {mode === 'identifier' && (
                    <form onSubmit={handleIdentifierSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email or Mobile Number
                            </label>
                            <input
                                className="input w-full"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                placeholder="Enter your registered contact"
                                required
                                autoFocus
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !identifier.trim()}
                            className="btn btn-primary w-full py-2.5"
                        >
                            {loading ? 'Checking...' : 'Continue'}
                        </button>
                    </form>
                )}

                {mode === 'totp-reset' && (
                    <div>
                        <button
                            onClick={() => setMode('identifier')}
                            className="text-sm text-gray-500 flex items-center mb-6 hover:text-gray-900 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" /> Back
                        </button>

                        <form onSubmit={handleSubmit(onResetSubmit)} className="space-y-5">
                            <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-3 mb-6">
                                <ShieldCheck className="w-8 h-8 text-primary-600" />
                                <div>
                                    <h3 className="font-medium text-gray-900">Authenticator Check</h3>
                                    <p className="text-xs text-gray-500">Enter the 6-digit code from your app</p>
                                </div>
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
