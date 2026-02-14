
import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { authApi, TOTPSetupResponse } from '../../auth/api/authApi'
import { toast } from 'react-hot-toast'
import { X, Copy, Check } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

interface Enable2FAModalProps {
    onClose: () => void
}

export default function Enable2FAModal({ onClose }: Enable2FAModalProps) {
    const [step, setStep] = useState<'SETUP' | 'VERIFY'>('SETUP')
    const [setupData, setSetupData] = useState<TOTPSetupResponse | null>(null)
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [verifying, setVerifying] = useState(false)
    const queryClient = useQueryClient()

    useEffect(() => {
        fetchSetupData()
    }, [])

    const fetchSetupData = async () => {
        setLoading(true)
        try {
            const response = await authApi.setupTotp()
            setSetupData(response)
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to initialize 2FA setup')
            onClose()
        } finally {
            setLoading(false)
        }
    }

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!setupData || code.length !== 6) return

        setVerifying(true)
        try {
            await authApi.verifyTotp({
                secret: setupData.secret,
                code
            })
            toast.success('Two-factor authentication enabled successfully')
            await queryClient.invalidateQueries({ queryKey: ['staff-profile'] })
            onClose()
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Invalid code. Please try again.')
        } finally {
            setVerifying(false)
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        toast.success('Copied to clipboard')
    }

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Set up Two-Factor Authentication
                    </h2>

                    {step === 'SETUP' && setupData && (
                        <div className="space-y-6">
                            <p className="text-gray-600">
                                1. Install Google Authenticator or Microsoft Authenticator on your phone.
                                <br />
                                2. Scan the QR code below.
                            </p>

                            <div className="flex justify-center p-4 bg-white border border-gray-200 rounded-lg">
                                <QRCodeSVG value={setupData.provisioning_uri} size={192} />
                            </div>

                            <div className="bg-gray-50 p-3 rounded-md">
                                <p className="text-xs text-gray-500 mb-1">Cannot scan? Enter manual code:</p>
                                <div className="flex items-center justify-between">
                                    <code className="text-sm font-mono font-bold text-gray-800 tracking-wider">
                                        {setupData.secret}
                                    </code>
                                    <button
                                        onClick={() => copyToClipboard(setupData.secret)}
                                        className="p-1 hover:bg-gray-200 rounded text-gray-500"
                                        title="Copy"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={() => setStep('VERIFY')}
                                className="w-full btn btn-primary"
                            >
                                Next
                            </button>
                        </div>
                    )}

                    {step === 'VERIFY' && (
                        <div className="space-y-6">
                            <p className="text-gray-600">
                                3. Enter the 6-digit code from your authenticator app to verify setup.
                            </p>

                            <form onSubmit={handleVerify} className="space-y-4">
                                <div>
                                    <input
                                        type="text"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className="input text-center text-2xl tracking-widest"
                                        placeholder="000000"
                                        autoFocus
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setStep('SETUP')}
                                        className="flex-1 btn btn-ghost"
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={verifying || code.length !== 6}
                                        className="flex-1 btn btn-primary"
                                    >
                                        {verifying ? 'Verifying...' : 'Verify & Enable'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
