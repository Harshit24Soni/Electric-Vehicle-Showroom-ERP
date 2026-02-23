import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { leadsApi } from '../api/leads'
import { useMasterStore } from '@/store/masterStore'

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold">Log Follow-Up</h2>
                        <p className="text-sm text-gray-500 mt-0.5">{leadName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Remark — Mandatory */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Remark <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            required
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            className="input w-full"
                            rows={3}
                            placeholder="What happened? Minimum 10 characters..."
                            minLength={10}
                        />
                    </div>

                    {/* Outcome Status — Dynamic from lead_status_master */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Outcome Status <span className="text-red-500">*</span>
                        </label>
                        <select
                            required
                            value={outcomeStatus}
                            onChange={(e) => setOutcomeStatus(e.target.value)}
                            className="input w-full"
                        >
                            <option value="">Select outcome</option>
                            {leadStatuses.map((status: any) => (
                                <option key={status.status_id} value={status.status_name}>
                                    {status.status_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Next Follow-up Date — Optional */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Next Follow-up Date
                        </label>
                        <input
                            type="date"
                            value={nextFollowupDate}
                            onChange={(e) => setNextFollowupDate(e.target.value)}
                            className="input w-full"
                            min={new Date().toISOString().split('T')[0]}
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Optional — schedule when to follow up next
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={mutation.isPending} className="btn btn-primary">
                            {mutation.isPending ? 'Saving...' : 'Log Follow-Up'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
