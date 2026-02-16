import { useEffect, useState } from 'react'
import { CalendarCheck, AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import followupApi, { UnifiedFollowupDashboard, FollowupItem } from '../api/followupApi'
import { formatDate } from '@/lib/utils'

function StatusBadge({ type }: { type: string }) {
    const colors: Record<string, string> = {
        LEAD: 'bg-blue-100 text-blue-700',
        SERVICE: 'bg-purple-100 text-purple-700',
        INSURANCE: 'bg-amber-100 text-amber-700',
    }
    return (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[type] || 'bg-gray-100 text-gray-600'}`}>
            {type}
        </span>
    )
}

function FollowupCard({ item, isOverdue }: { item: FollowupItem; isOverdue: boolean }) {
    return (
        <div
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white hover:border-blue-300'
                }`}
        >
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <StatusBadge type={item.followup_type} />
                    <span className="text-sm font-medium text-gray-900 truncate">{item.entity_label}</span>
                </div>
                {item.remarks && (
                    <p className="text-xs text-gray-500 truncate">{item.remarks}</p>
                )}
            </div>
            <div className="flex items-center gap-2 ml-3 shrink-0">
                {isOverdue && <AlertTriangle className="w-4 h-4 text-red-500" />}
                <span className={`text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                    {formatDate(item.due_date)}
                </span>
            </div>
        </div>
    )
}

export default function FollowupDashboardPage() {
    const [data, setData] = useState<UnifiedFollowupDashboard | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'ALL' | 'LEAD' | 'SERVICE' | 'INSURANCE'>('ALL')

    useEffect(() => {
        loadDashboard()
    }, [])

    const loadDashboard = async () => {
        try {
            setLoading(true)
            const res = await followupApi.getUnifiedDashboard()
            setData(res)
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Failed to load followup dashboard')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="p-6">
                <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error || 'No data'}</div>
            </div>
        )
    }

    const today = new Date().toISOString().split('T')[0]

    const allItems: (FollowupItem & { isOverdue: boolean })[] = [
        ...data.lead_followups.map(f => ({ ...f, isOverdue: f.due_date < today })),
        ...data.service_followups.map(f => ({ ...f, isOverdue: f.due_date < today })),
        ...data.insurance_followups.map(f => ({ ...f, isOverdue: f.due_date < today })),
    ].sort((a, b) => a.due_date.localeCompare(b.due_date))

    const filtered =
        activeTab === 'ALL'
            ? allItems
            : allItems.filter(f => f.followup_type === activeTab)

    const tabs = [
        { key: 'ALL' as const, label: 'All', count: allItems.length },
        { key: 'LEAD' as const, label: 'Leads', count: data.lead_followups.length },
        { key: 'SERVICE' as const, label: 'Service', count: data.service_followups.length },
        { key: 'INSURANCE' as const, label: 'Insurance', count: data.insurance_followups.length },
    ]

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <CalendarCheck className="w-7 h-7 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">Unified Follow-up Dashboard</h1>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-gray-900">{data.total_pending}</p>
                        <p className="text-sm text-gray-500">Total Pending</p>
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-red-600">{data.total_overdue}</p>
                        <p className="text-sm text-gray-500">Overdue</p>
                    </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-green-600">
                            {data.total_pending - data.total_overdue}
                        </p>
                        <p className="text-sm text-gray-500">On Track</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-4">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${activeTab === tab.key
                            ? 'bg-white text-blue-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab.label}
                        <span className="ml-1.5 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="space-y-2">
                {filtered.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <CalendarCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No pending follow-ups in this category</p>
                    </div>
                ) : (
                    filtered.map((item, idx) => (
                        <FollowupCard key={`${item.followup_type}-${item.entity_id}-${idx}`} item={item} isOverdue={item.isOverdue} />
                    ))
                )}
            </div>
        </div>
    )
}
