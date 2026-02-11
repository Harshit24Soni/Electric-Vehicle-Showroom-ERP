import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, isToday, isPast, isFuture, parseISO } from 'date-fns'
import { Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { crmApi, Followup } from '../api/crmApi'
import { cn } from '@/lib/utils'

export default function FollowupDashboard() {
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState<'today' | 'overdue' | 'upcoming'>('today')
    const [completingId, setCompletingId] = useState<number | null>(null)
    const [remarks, setRemarks] = useState('')
    const [error, setError] = useState<string | null>(null)

    const { data, isLoading } = useQuery({
        queryKey: ['followup-dashboard'],
        queryFn: () => crmApi.getFollowupDashboard('SALES'), // Focus on Sales for now
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, remarks }: { id: number; remarks: string }) =>
            crmApi.updateFollowup(id, { followup_status: 'COMPLETED', remarks }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['followup-dashboard'] })
            setCompletingId(null)
            setRemarks('')
            setError(null)
        },
        onError: (err: any) => {
            setError(err.response?.data?.detail || 'Failed to update follow-up')
        }
    })

    const followups: Followup[] = data?.sales_followups || [] // Assuming data structure returned by API

    const todayFollowups = followups.filter(f => isToday(parseISO(f.scheduled_date)))
    const overdueFollowups = followups.filter(f => isPast(parseISO(f.scheduled_date)) && !isToday(parseISO(f.scheduled_date)))
    const upcomingFollowups = followups.filter(f => isFuture(parseISO(f.scheduled_date)))

    const currentList = activeTab === 'today' ? todayFollowups
        : activeTab === 'overdue' ? overdueFollowups
            : upcomingFollowups

    const handleComplete = (id: number) => {
        if (!remarks.trim()) {
            setError('Remarks are required to complete a follow-up')
            return
        }
        updateMutation.mutate({ id, remarks })
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    Pending Follow-ups
                </h3>
                <div className="flex gap-1 text-sm bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('overdue')}
                        className={cn(
                            "px-3 py-1 rounded-md transition-colors",
                            activeTab === 'overdue' ? "bg-white shadow text-red-600 font-medium" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Overdue ({overdueFollowups.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('today')}
                        className={cn(
                            "px-3 py-1 rounded-md transition-colors",
                            activeTab === 'today' ? "bg-white shadow text-blue-600 font-medium" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Today ({todayFollowups.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        className={cn(
                            "px-3 py-1 rounded-md transition-colors",
                            activeTab === 'upcoming' ? "bg-white shadow text-green-600 font-medium" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Upcoming ({upcomingFollowups.length})
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoading ? (
                    <p className="text-center text-gray-500 py-4">Loading...</p>
                ) : currentList.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No {activeTab} follow-ups</p>
                ) : (
                    currentList.map(f => (
                        <div key={f.followup_id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-medium text-gray-900">Lead #{f.lead_id}</p>
                                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                        <Clock className="w-3 h-3" />
                                        {format(parseISO(f.scheduled_date), 'PPP')}
                                    </p>
                                    {f.remarks && (
                                        <p className="text-xs text-gray-400 mt-2 italic">"{f.remarks}"</p>
                                    )}
                                </div>
                                {completingId === f.followup_id ? (
                                    <div className="bg-white border border-gray-200 rounded p-2 shadow-sm w-64 z-10">
                                        <p className="text-xs font-semibold mb-2">Add Result/Remarks</p>
                                        <textarea
                                            value={remarks}
                                            onChange={(e) => setRemarks(e.target.value)}
                                            className="w-full text-sm border-gray-300 rounded mb-2 h-20 p-2"
                                            placeholder="What happened? Set next steps..."
                                        />
                                        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => { setCompletingId(null); setRemarks(''); setError(null); }}
                                                className="text-xs text-gray-500 hover:text-gray-700"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => handleComplete(f.followup_id)}
                                                disabled={updateMutation.isPending}
                                                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                            >
                                                {updateMutation.isPending ? 'Saving...' : 'Complete'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setCompletingId(f.followup_id)}
                                        className="text-gray-400 hover:text-green-600 transition-colors"
                                        title="Mark as Complete"
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
