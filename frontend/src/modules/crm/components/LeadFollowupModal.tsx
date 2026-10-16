interface LeadStatusItem {
  status_id: number
  status_name: string
}
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, CalendarCheck } from 'lucide-react'
import { leadsApi } from '../api/leads'
import { useMasterStore } from '@/store/masterStore'
import { Button } from '@/components/ui/Button'

interface LeadFollowupModalProps {
  leadId: number
  leadName: string
  onClose: () => void
}

export default function LeadFollowupModal({ leadId, leadName, onClose }: LeadFollowupModalProps) {
  const queryClient = useQueryClient()
  const { leadStatuses } = useMasterStore()

  const [remarks, setRemarks] = useState('')
  const [outcomeStatus, setOutcomeStatus] = useState('')
  const [nextFollowupDate, setNextFollowupDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (data: { remarks: string; outcome_status: string; next_followup_date?: string }) =>
      leadsApi.addLeadFollowup(leadId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['followup-dashboard'] })
      onClose()
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      setError(err?.response?.data?.detail || 'Failed to log follow-up.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!remarks.trim()) {
      setError('A remark is strictly mandatory for logging a follow-up.')
      return
    }
    if (remarks.trim().length < 10) {
      setError('Remarks must be at least 10 characters.')
      return
    }
    if (!outcomeStatus) {
      setError('Please select an outcome status.')
      return
    }

    mutation.mutate({
      remarks: remarks.trim(),
      outcome_status: outcomeStatus,
      next_followup_date: nextFollowupDate || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400">
              <CalendarCheck className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
                Log Follow-up
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customer: <span className="font-semibold text-slate-800 dark:text-slate-200">{leadName}</span>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Outcome Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Outcome Status *
            </label>
            <select
              required
              value={outcomeStatus}
              onChange={(e) => setOutcomeStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all cursor-pointer"
            >
              <option value="">-- Select Outcome --</option>
              {leadStatuses.map((status: LeadStatusItem) => (
                <option key={status.status_id} value={status.status_name}>
                  {status.status_name}
                </option>
              ))}
            </select>
          </div>

          {/* Remarks (mandatory min 10 chars) */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Interaction Remarks * <span className="text-slate-400 font-normal">(Min 10 chars)</span>
              </label>
              <span className={`text-[11px] font-mono ${remarks.length >= 10 ? 'text-emerald-500' : 'text-slate-400'}`}>
                {remarks.length} / 10
              </span>
            </div>
            <textarea
              required
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              placeholder="Record summary of call, customer requirements, or negotiation notes..."
              minLength={10}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Next Follow-up Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Next Follow-up Date (Optional)
            </label>
            <input
              type="date"
              value={nextFollowupDate}
              onChange={(e) => setNextFollowupDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Schedule when to contact this customer next
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300">
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
              disabled={mutation.isPending || remarks.trim().length < 10 || !outcomeStatus}
              isLoading={mutation.isPending}
              variant="primary"
            >
              Log Follow-up
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
