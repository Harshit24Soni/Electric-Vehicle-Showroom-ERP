import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, isToday, isPast, isFuture, parseISO } from 'date-fns'
import { Calendar, CheckCircle2, Clock, AlertTriangle, MessageSquare, Check } from 'lucide-react'
import { crmApi, Followup } from '../api/crmApi'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

export default function FollowupDashboard() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'overdue' | 'today' | 'upcoming'>('today')
  const [completingId, setCompletingId] = useState<number | null>(null)
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['followup-dashboard'],
    queryFn: () => crmApi.getFollowupDashboard('SALES'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: number; remarks: string }) =>
      crmApi.updateFollowup(id, { followup_status: 'COMPLETED', remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followup-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      setCompletingId(null)
      setRemarks('')
      setError(null)
    },
     
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to update follow-up')
    },
  })

  const followups: Followup[] = data?.sales_followups || []

  const todayFollowups = followups.filter((f) => isToday(parseISO(f.scheduled_date)))
  const overdueFollowups = followups.filter(
    (f) => isPast(parseISO(f.scheduled_date)) && !isToday(parseISO(f.scheduled_date))
  )
  const upcomingFollowups = followups.filter((f) => isFuture(parseISO(f.scheduled_date)))

  const currentList =
    activeTab === 'today'
      ? todayFollowups
      : activeTab === 'overdue'
      ? overdueFollowups
      : upcomingFollowups

  const handleComplete = (id: number) => {
    if (!remarks.trim()) {
      setError('Remarks are required to complete a follow-up')
      return
    }
    updateMutation.mutate({ id, remarks: remarks.trim() })
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/90 dark:border-slate-800/90 overflow-hidden flex flex-col transition-colors animate-fade-in">
      {/* Header with Title and Segmented Tabs */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2.5 text-base font-heading">
            <span className="p-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-200/50 dark:border-primary-800/50">
              <Calendar className="w-4 h-4" />
            </span>
            Follow-up Queue
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track pending customer interactions, calls, and visit reminders
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
          <button
            onClick={() => setActiveTab('overdue')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all select-none',
              activeTab === 'overdue'
                ? 'bg-white dark:bg-slate-700 shadow-sm text-rose-600 dark:text-rose-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span>Overdue</span>
            <span
              className={cn(
                'ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                activeTab === 'overdue'
                  ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              )}
            >
              {overdueFollowups.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('today')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all select-none',
              activeTab === 'today'
                ? 'bg-white dark:bg-slate-700 shadow-sm text-primary-600 dark:text-primary-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <Clock className="w-3.5 h-3.5 text-primary-500" />
            <span>Today</span>
            <span
              className={cn(
                'ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                activeTab === 'today'
                  ? 'bg-primary-100 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              )}
            >
              {todayFollowups.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('upcoming')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all select-none',
              activeTab === 'upcoming'
                ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-500" />
            <span>Upcoming</span>
            <span
              className={cn(
                'ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                activeTab === 'upcoming'
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              )}
            >
              {upcomingFollowups.length}
            </span>
          </button>
        </div>
      </div>

      {/* Follow-ups Content Queue */}
      <div className="p-4 sm:p-6 space-y-3">
        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : currentList.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={`No ${activeTab} Follow-ups`}
            description={
              activeTab === 'overdue'
                ? 'Great job! You have cleared all overdue follow-ups in this queue.'
                : activeTab === 'today'
                ? 'All customer follow-ups scheduled for today have been addressed.'
                : 'No future follow-ups scheduled yet. Log upcoming reminders directly from any lead detail card.'
            }
            className="py-12"
          />
        ) : (
          currentList.map((f) => (
            <div
              key={f.followup_id}
              className={cn(
                'border rounded-xl p-4 transition-all duration-150',
                activeTab === 'overdue'
                  ? 'border-rose-200/80 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/10'
                  : 'border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-800/40 hover:bg-slate-50/80 dark:hover:bg-slate-800/60'
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      Lead #{f.lead_id}
                    </span>
                    <span
                      className={cn(
                        'text-xs font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full',
                        activeTab === 'overdue'
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                          : activeTab === 'today'
                          ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      )}
                    >
                      <Clock className="w-3 h-3" />
                      {format(parseISO(f.scheduled_date), 'PPP')}
                    </span>
                  </div>

                  {f.remarks ? (
                    <p className="text-xs text-slate-600 dark:text-slate-300 italic flex items-start gap-1.5 mt-1 bg-slate-50/80 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <span>"{f.remarks}"</span>
                    </p>
                  ) : null}
                </div>

                {/* Actions & Completion Form */}
                <div className="shrink-0">
                  {completingId === f.followup_id ? (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 shadow-xl w-full sm:w-80 z-10 animate-fade-in space-y-2">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Record Outcome & Mark Done
                      </p>
                      <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        className="w-full text-xs bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:outline-none transition-all placeholder:text-slate-400"
                        rows={2}
                        placeholder="Details of customer call or visit..."
                      />
                      {error && <p className="text-[11px] text-rose-500 font-medium">{error}</p>}
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => {
                            setCompletingId(null)
                            setRemarks('')
                            setError(null)
                          }}
                          className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleComplete(f.followup_id)}
                          disabled={updateMutation.isPending}
                          className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1"
                        >
                          {updateMutation.isPending ? 'Saving...' : 'Mark Completed'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setCompletingId(f.followup_id)
                        setRemarks('')
                        setError(null)
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/60 dark:border-emerald-800/60 transition-colors"
                      title="Mark Follow-up as Completed"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
