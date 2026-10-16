import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../../auth/api/authApi'
import { CheckCircle, XCircle, Clock, KeyRound } from 'lucide-react'
import TempPinModal from './TempPinModal'
import { Badge } from '@/components/ui/Badge'

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
      <div className="card border-l-4 border-l-amber-500">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          PIN Reset Requests
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Loading pending requests...</p>
      </div>
    )
  }

  if (requests.length === 0 && !showPinModal) return null // Don't show empty widget

  return (
    <>
      <div className="card border-l-4 border-l-amber-500">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-500" />
            Staff Security Requests
          </h3>
          <Badge variant="warning" size="sm" pulse>
            {requests.length} Pending
          </Badge>
        </div>

        <div className="space-y-2">
          {requests.map((req: ResetRequest) => (
            <div
              key={req.id}
              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xl"
            >
              <div>
                <p className="font-semibold text-xs text-slate-900 dark:text-white">{req.staff_name}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {req.staff_mobile} • {req.hours_ago > 0 ? `${req.hours_ago}h ago` : 'Just now'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => approveMutation.mutate(req.id)}
                  disabled={approveMutation.isPending}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition font-medium"
                  title="Generate Temporary PIN"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Approve
                </button>
                <button
                  onClick={() => {
                    if (confirm('Deny this PIN reset request?')) {
                      denyMutation.mutate(req.id)
                    }
                  }}
                  disabled={denyMutation.isPending}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/60 transition font-medium"
                  title="Reject Request"
                >
                  <XCircle className="w-3.5 h-3.5" />
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
