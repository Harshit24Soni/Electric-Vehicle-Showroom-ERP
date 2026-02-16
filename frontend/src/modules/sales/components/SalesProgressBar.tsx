import { useMemo } from 'react'

interface SalesProgressBarProps {
    currentStage: string | null | undefined
    className?: string
}

const STAGES = [
    { key: 'ENQUIRY', label: 'Enquiry', short: 'ENQ' },
    { key: 'QUOTATION', label: 'Quotation', short: 'QUO' },
    { key: 'NEGOTIATION', label: 'Negotiation', short: 'NEG' },
    { key: 'BOOKING', label: 'Booking', short: 'BKG' },
    { key: 'DOCUMENTATION', label: 'Documentation', short: 'DOC' },
    { key: 'PAYMENT', label: 'Payment', short: 'PAY' },
    { key: 'INVOICE', label: 'Invoice', short: 'INV' },
    { key: 'PORTAL_WORK', label: 'Portal Work', short: 'PTL' },
    { key: 'DELIVERY', label: 'Delivery', short: 'DLV' },
    { key: 'COMPLETED', label: 'Completed', short: 'DON' },
]

export function SalesProgressBar({ currentStage, className = '' }: SalesProgressBarProps) {
    const currentIdx = useMemo(() => {
        if (!currentStage) return -1
        return STAGES.findIndex(s => s.key === currentStage)
    }, [currentStage])

    const percentage = currentIdx >= 0 ? Math.round(((currentIdx + 1) / STAGES.length) * 100) : 0

    return (
        <div className={`w-full ${className}`}>
            {/* Percentage header */}
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Sale Progress</span>
                <span className="text-sm font-semibold text-blue-600">{percentage}%</span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
                <div
                    className="h-2.5 rounded-full transition-all duration-500 ease-out"
                    style={{
                        width: `${percentage}%`,
                        background: percentage === 100
                            ? 'linear-gradient(90deg, #10b981, #059669)'
                            : 'linear-gradient(90deg, #3b82f6, #6366f1)',
                    }}
                />
            </div>

            {/* Stage indicators */}
            <div className="flex items-center justify-between gap-0.5">
                {STAGES.map((stage, idx) => {
                    const isCompleted = idx <= currentIdx
                    const isCurrent = idx === currentIdx

                    return (
                        <div key={stage.key} className="flex flex-col items-center flex-1 min-w-0">
                            {/* Dot */}
                            <div
                                className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${isCompleted
                                        ? isCurrent
                                            ? 'bg-blue-600 border-blue-600 ring-2 ring-blue-200 scale-125'
                                            : 'bg-green-500 border-green-500'
                                        : 'bg-white border-gray-300'
                                    }`}
                            />
                            {/* Label */}
                            <span
                                className={`text-[10px] mt-1 text-center leading-tight truncate w-full ${isCompleted
                                        ? isCurrent
                                            ? 'text-blue-600 font-semibold'
                                            : 'text-green-600 font-medium'
                                        : 'text-gray-400'
                                    }`}
                                title={stage.label}
                            >
                                {stage.short}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default SalesProgressBar
