import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../../auth/api/authApi'
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import TempPinModal from './TempPinModal'

interface ResetRequest {
    id: number
    staff_id: number
    staff_name: string
    staff_mobile: string
    requested_at: string
    hours_ago: number
}

export default function PinResetRequests() {
    const queryClient = useQueryClient()
    const [showPinModal, setShowPinModal] = useState(false)
    const [tempPin, setTempPin] = useState('')
    const [tempPinStaffName, setTempPinStaffName] = useState('')

    const { data, isLoading } = useQuery({
        queryKey: ['pin-reset-requests'],
        queryFn: () => authApi.getResetRequests(),
        refetchInterval: 30000, // Poll every 30s
    })

    const approveMutation = useMutation({
        mutationFn: (requestId: number) => authApi.approveReset(requestId),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['pin-reset-requests'] })
            setTempPin(result.temp_pin)
            setTempPinStaffName(result.staff_name)
            setShowPinModal(true)
        },
    })

    const denyMutation = useMutation({
        mutationFn: (requestId: number) => authApi.denyReset(requestId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pin-reset-requests'] })
        },
    })

    const requests = data?.requests || []

    if (isLoading) {
        return (
            <div className="card">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    PIN Reset Requests
                </h3>
                <p className="text-sm text-gray-500">Loading...</p>
            </div>
        )
    }

    if (requests.length === 0 && !showPinModal) return null  // Don't show empty widget

    return (
        <>
            <div className="card border-l-4 border-l-orange-400">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    PIN Reset Requests
                    <span className="ml-auto bg-orange-100 text-orange-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {requests.length} pending
                    </span>
                </h3>

                <div className="space-y-3">
                    {requests.map((req: ResetRequest) => (
                        <div
                            key={req.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                            <div>
                                <p className="font-medium text-gray-900">{req.staff_name}</p>
                                <p className="text-sm text-gray-500">
                                    {req.staff_mobile} · {req.hours_ago > 0 ? `${req.hours_ago}h ago` : 'Just now'}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => approveMutation.mutate(req.id)}
                                    disabled={approveMutation.isPending}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition"
                                    title="Approve"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Approve
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm('Deny this PIN reset request?')) {
                                            denyMutation.mutate(req.id)
                                        }
                                    }}
                                    disabled={denyMutation.isPending}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition"
                                    title="Deny"
                                >
                                    <XCircle className="w-4 h-4" />
                                    Deny
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Temp PIN Modal */}
            {showPinModal && tempPin && (
                <TempPinModal
                    pin={tempPin}
                    staffName={tempPinStaffName}
                    onClose={() => {
                        setShowPinModal(false)
                        setTempPin('')
                        setTempPinStaffName('')
                    }}
                />
            )}
        </>
    )
}
