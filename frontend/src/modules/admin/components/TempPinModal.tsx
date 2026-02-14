import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { CheckCircle, Copy, Check, AlertTriangle, X } from 'lucide-react'

interface TempPinModalProps {
    pin: string
    staffName: string
    onClose: () => void
}

export default function TempPinModal({ pin, staffName, onClose }: TempPinModalProps) {
    const [copied, setCopied] = useState(false)

    const copyToClipboard = async () => {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(pin)
                setCopied(true)
                toast.success('PIN copied to clipboard')
            } else {
                // Fallback for non-secure contexts
                const textArea = document.createElement("textarea")
                textArea.value = pin
                textArea.style.position = "fixed"
                textArea.style.left = "-9999px"
                textArea.style.top = "0"
                document.body.appendChild(textArea)
                textArea.focus()
                textArea.select()
                try {
                    document.execCommand('copy')
                    setCopied(true)
                    toast.success('PIN copied to clipboard')
                } catch (err) {
                    console.error('Fallback copy failed', err)
                    toast.error('Failed to copy PIN manually')
                }
                document.body.removeChild(textArea)
            }
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Copy failed', err)
            toast.error('Failed to copy PIN')
        }
    }

    useEffect(() => {
        if (pin) {
            // Auto copy logic with safety check
            const autoCopy = async () => {
                try {
                    if (navigator.clipboard && window.isSecureContext) {
                        await navigator.clipboard.writeText(pin)
                        setCopied(true)
                        toast.success('PIN copied to clipboard automatically')
                        setTimeout(() => setCopied(false), 2000)
                    }
                } catch (err) {
                    // Silently fail auto-copy on non-secure contexts to avoid annoying errors
                    console.warn('Auto-copy not available in this context')
                }
            }
            autoCopy()
        }
    }, [pin])

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>

                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Staff Created Successfully
                    </h3>

                    <p className="text-sm text-gray-500 mb-4">
                        {staffName} has been created
                    </p>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <p className="text-sm font-medium text-yellow-800 mb-2">
                            Temporary PIN
                        </p>
                        <div className="flex items-center justify-center gap-2">
                            <code className="text-3xl font-mono font-bold text-yellow-900 tracking-wider">
                                {pin}
                            </code>
                            <button
                                onClick={copyToClipboard}
                                className="ml-2 p-2 hover:bg-yellow-100 rounded transition"
                                title="Copy PIN"
                            >
                                {copied ? (
                                    <Check className="h-5 w-5 text-green-600" />
                                ) : (
                                    <Copy className="h-5 w-5 text-yellow-700" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                        <p className="text-xs text-red-700 flex items-start">
                            <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5" />
                            <span>
                                This PIN will only be shown once. Please copy it and share with the user.
                                They must change it on first login.
                            </span>
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                        I've Copied the PIN
                    </button>
                </div>
            </div>
        </div>
    )
}
