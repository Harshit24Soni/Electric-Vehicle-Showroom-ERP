import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { leadsApi } from '../api/leads'
import { formatDate } from '@/lib/utils'
import { Calendar, CheckCircle2, AlertCircle } from 'lucide-react'

export default function FollowUpList() {
    const [filterType, setFilterType] = useState<'ALL' | 'SALES' | 'SERVICE' | 'WARRANTY'>('ALL')

    const { data: dashboard, isLoading } = useQuery({
        queryKey: ['followups', filterType],
        queryFn: () => leadsApi.getFollowups(filterType)
    })

    // Dashboard structure from backend: 
    // { summary: { total: 10, overdue: 2, today: 5 }, upcoming: [], overdue: [] }

    if (isLoading) {
        return <div className="text-center py-8">Loading followups...</div>
    }

    const { summary, upcoming, overdue } = dashboard || { summary: {}, upcoming: [], overdue: [] }

    const renderFollowupCard = (item: any) => (
        <div key={item.followup_id || item.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 flex flex-col gap-2">
            <div className="flex justify-between items-start">
                <div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${item.type === 'SALES' ? 'bg-blue-100 text-blue-700' :
                            item.type === 'SERVICE' ? 'bg-orange-100 text-orange-700' :
                                'bg-purple-100 text-purple-700'
                        }`}>
                        {item.type}
                    </span>
                    <h4 className="font-semibold text-gray-900 mt-1">{item.client_name}</h4>
                    <p className="text-sm text-gray-500">{item.phone}</p>
                </div>
                <div className="text-right">
                    <div className="text-sm font-medium text-gray-900 flex items-center gap-1 justify-end">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.scheduled_date)}
                    </div>
                    <span className="text-xs text-gray-500">
                        {item.assigned_to_name}
                    </span>
                </div>
            </div>
            {item.remarks && (
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded italic">"{item.remarks}"</p>
            )}
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
                {(['ALL', 'SALES', 'SERVICE', 'WARRANTY'] as const).map((type) => (
                    <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${filterType === type
                                ? 'bg-primary-100 text-primary-700'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        {type.charAt(0) + type.slice(1).toLowerCase()} Followups
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <h3 className="text-blue-900 font-semibold mb-1">Total Pending</h3>
                    <p className="text-2xl font-bold text-blue-700">{summary.total || 0}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                    <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <h3 className="text-red-900 font-semibold">Overdue</h3>
                    </div>
                    <p className="text-2xl font-bold text-red-700">{summary.overdue || 0}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <h3 className="text-green-900 font-semibold">Due Today</h3>
                    </div>
                    <p className="text-2xl font-bold text-green-700">{summary.today || 0}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        Overdue & Due Today
                    </h3>
                    <div className="space-y-3">
                        {overdue?.length > 0 ? (
                            overdue.map(renderFollowupCard)
                        ) : (
                            <p className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">No overdue followups</p>
                        )}
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-500" />
                        Upcoming
                    </h3>
                    <div className="space-y-3">
                        {upcoming?.length > 0 ? (
                            upcoming.map(renderFollowupCard)
                        ) : (
                            <p className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">No upcoming followups</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
