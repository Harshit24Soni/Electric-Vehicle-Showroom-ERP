import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { ShieldCheck, CheckCircle, Copy, AlertTriangle } from 'lucide-react'
import { authApi, TOTPSetupResponse } from '../auth/api/authApi'

export default function SecuritySettings() {
    const [step, setStep] = useState<'start' | 'setup' | 'verify' | 'success'>('start')
    const [totpData, setTotpData] = useState<TOTPSetupResponse | null>(null)
    const [verifyCode, setVerifyCode] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const handleStartSetup = async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await authApi.setupTotp()
            setTotpData(data)
            setStep('setup')
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to initialize setup')
        } finally {
            setLoading(false)
        }
    }

    const handleVerify = async () => {
        if (!totpData || verifyCode.length !== 6) return
        setLoading(true)
        setError(null)
        try {
            await authApi.verifyTotp({
                secret: totpData.secret,
                code: verifyCode
            })
            setStep('success')
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Verification failed. Check the code and try again.')
        } finally {
            setLoading(false)
        }
    }

    const copySecret = () => {
        if (totpData?.secret) {
            navigator.clipboard.writeText(totpData.secret)
            alert('Secret copied to clipboard')
        }
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Security Settings</h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-blue-50 rounded-lg">
                        <ShieldCheck className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Two-Factor Authentication (2FA)</h2>
                        <p className="text-gray-500 text-sm mt-1">
                            Secure your account with an authenticator app (Google Authenticator, Authy, etc.).
                            Required for resetting PINs.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        {error}
                    </div>
                )}

                {step === 'start' && (
                    <div>
                        <p className="text-gray-600 mb-6">
                            2FA adds an extra layer of security to your account. When enabled, you'll need a code from your
                            authenticator app to perform sensitive actions like resetting PINs.
                        </p>
                        <button
                            onClick={handleStartSetup}
                            disabled={loading}
                            className="btn btn-primary"
                        >
                            {loading ? 'Initializing...' : 'Set up 2FA'}
                        </button>
                    </div>
                )}

                {step === 'setup' && totpData && (
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 flex flex-col items-center">
                            <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
                                <QRCodeSVG value={totpData.provisioning_uri} size={192} />
                            </div>
                            <p className="text-sm font-medium text-gray-900 mb-2">Scan this QR code with your authenticator app</p>
                            <p className="text-xs text-gray-500">Or enter this secret key manually:</p>
                            <div className="flex items-center gap-2 mt-2">
                                <code className="bg-gray-100 px-3 py-1 rounded text-sm font-mono border border-gray-300">
                                    {totpData.secret}
                                </code>
                                <button onClick={copySecret} className="text-gray-500 hover:text-gray-700" title="Copy">
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={() => setStep('verify')}
                                className="btn btn-primary"
                            >
                                Next Step
                            </button>
                        </div>
                    </div>
                )}

                {step === 'verify' && (
                    <div className="max-w-sm mx-auto text-center">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Verify Setup</h3>
                        <p className="text-sm text-gray-500 mb-6">Enter the 6-digit code from your authenticator app to enable 2FA.</p>

                        <input
                            type="text"
                            value={verifyCode}
                            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="input text-center text-2xl tracking-widest font-mono mb-6"
                            placeholder="000000"
                            autoFocus
                        />

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setStep('setup')}
                                className="btn btn-secondary"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleVerify}
                                disabled={loading || verifyCode.length !== 6}
                                className="btn btn-primary"
                            >
                                {loading ? 'Verifying...' : 'Enable 2FA'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 'success' && (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">2FA Enabled Successfully!</h3>
                        <p className="text-gray-500 mb-6">
                            Your account is now secured. You can use your authenticator app to generate codes when needed.
                        </p>
                        <button
                            onClick={() => setStep('start')}
                            className="btn btn-secondary"
                        >
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
