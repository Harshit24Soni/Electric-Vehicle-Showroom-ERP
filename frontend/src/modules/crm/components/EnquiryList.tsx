import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { enquiriesApi, Enquiry, EnquiryStats } from '@/modules/crm/api/enquiries'
import { formatDate } from '@/lib/utils'
import {
  Trash2,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Calendar,
  User,
} from 'lucide-react'
import toast from 'react-hot-toast'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import { MetricCard } from '@/components/ui/MetricCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

export default function EnquiryList() {
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<Enquiry | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // 1. Stats Query
  const { data: stats, isLoading: statsLoading } = useQuery<EnquiryStats>({
    queryKey: ['enquiry-stats'],
    queryFn: () => enquiriesApi.getStats(),
  })

  // 2. Enquiries List Query
  const { data: enquiries = [], isLoading: listLoading } = useQuery<Enquiry[]>({
    queryKey: ['enquiries-list', statusFilter],
    queryFn: () => enquiriesApi.list(statusFilter || undefined),
  })

  // 3. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: ({ id, hardDelete }: { id: number; hardDelete?: boolean }) =>
      enquiriesApi.delete(id, hardDelete),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiries-list'] })
      queryClient.invalidateQueries({ queryKey: ['enquiry-stats'] })
      toast.success('Enquiry deleted successfully')
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to delete enquiry')
    },
  })

  // 4. Update Status Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: number; newStatus: string }) => {
      const statusMap: Record<string, number> = { ACTIVE: 1, CONVERTED: 2, LOST: 3 }
      return enquiriesApi.update(id, {
        enquiry_status: newStatus,
        enquiry_status_id: statusMap[newStatus] || 1,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiries-list'] })
      queryClient.invalidateQueries({ queryKey: ['enquiry-stats'] })
      toast.success('Enquiry status updated')
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to update enquiry status')
    },
  })

  const handleDeleteConfirm = (hardDelete: boolean) => {
    if (deleteTarget) {
      deleteMutation.mutate({ id: deleteTarget.enquiry_id, hardDelete })
    }
    setDeleteTarget(null)
  }

  // Filter inquiries client-side by search term
  const filteredEnquiries = useMemo(() => {
    return enquiries.filter((e) => {
      const q = searchTerm.toLowerCase().trim()
      if (!q) return true
      return (
        e.enquiry_id.toString().includes(q) ||
        e.enquiry_source.toLowerCase().includes(q) ||
        (e.remarks && e.remarks.toLowerCase().includes(q)) ||
        (e.owner_staff_id && e.owner_staff_id.toString().includes(q))
      )
    })
  }, [enquiries, searchTerm])

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60'
      case 'CONVERTED':
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60'
      case 'LOST':
        return 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60'
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Enquiry Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Enquiries"
          value={stats?.total_enquiries ?? 0}
          icon={MessageSquare}
          subtitle="All inbound enquiries logged"
          iconBg="bg-blue-50 dark:bg-blue-950/50 border border-blue-200/50 dark:border-blue-800/40"
          iconColor="text-blue-600 dark:text-blue-400"
          isLoading={statsLoading}
        />
        <MetricCard
          title="Active / Open"
          value={stats?.active_enquiries !== undefined ? stats.active_enquiries : '—'}
          icon={Clock}
          subtitle={
            stats?.active_enquiries !== undefined
              ? 'Awaiting response or in-progress'
              : 'Not provided by summary API'
          }
          iconBg="bg-amber-50 dark:bg-amber-950/50 border border-amber-200/50 dark:border-amber-800/40"
          iconColor="text-amber-600 dark:text-amber-400"
          isLoading={statsLoading}
        />
        <MetricCard
          title="Converted"
          value={stats?.converted_enquiries !== undefined ? stats.converted_enquiries : '—'}
          icon={CheckCircle2}
          subtitle={
            stats?.converted_enquiries !== undefined
              ? 'Lead created & proceeding'
              : 'Not provided by summary API'
          }
          iconBg="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/50 dark:border-emerald-800/40"
          iconColor="text-emerald-600 dark:text-emerald-400"
          isLoading={statsLoading}
        />
        <MetricCard
          title="Lost / Dropped"
          value={stats?.lost_enquiries !== undefined ? stats.lost_enquiries : '—'}
          icon={AlertCircle}
          subtitle={
            stats?.lost_enquiries !== undefined
              ? 'Unresponsive or not interested'
              : 'Not provided by summary API'
          }
          iconBg="bg-rose-50 dark:bg-rose-950/50 border border-rose-200/50 dark:border-rose-800/40"
          iconColor="text-rose-600 dark:text-rose-400"
          isLoading={statsLoading}
        />
      </div>

      {/* Main Table Card */}
      <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {/* Header toolbar */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-heading">
              Inbound Enquiries
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Track showroom enquiries and customer requests
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search enquiries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8.5 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="CONVERTED">Converted</option>
              <option value="LOST">Lost</option>
            </select>
          </div>
        </div>

        {/* Content body */}
        {listLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-8 w-full rounded" />
            <Skeleton className="h-12 w-full rounded" />
            <Skeleton className="h-12 w-full rounded" />
            <Skeleton className="h-12 w-full rounded" />
          </div>
        ) : filteredEnquiries.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title={statusFilter || searchTerm ? 'No Enquiries Found' : 'No Enquiries Logged'}
            description={
              statusFilter || searchTerm
                ? 'No enquiry records match your current filter criteria.'
                : 'All inbound customer inquiries will be displayed here for management and follow-up.'
            }
            actionLabel={statusFilter || searchTerm ? 'Clear Filters' : undefined}
            onAction={
              statusFilter || searchTerm
                ? () => {
                    setStatusFilter('')
                    setSearchTerm('')
                  }
                : undefined
            }
            className="py-14"
          />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-16">ID</th>
                  <th>Source Channel</th>
                  <th>Status & Pipeline</th>
                  <th>Assigned Staff</th>
                  <th>Last Follow-up</th>
                  <th>Created Date</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEnquiries.map((e: Enquiry) => (
                  <tr
                    key={e.enquiry_id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        #{e.enquiry_id}
                      </span>
                    </td>
                    <td>
                      <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full font-medium bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200/50 dark:border-primary-800/50">
                        {e.enquiry_source || 'Direct Enquiry'}
                      </span>
                    </td>
                    <td>
                      {(() => {
                        const statusName =
                          e.enquiry_status ||
                          (e.enquiry_status_id === 2 ? 'CONVERTED' : e.enquiry_status_id === 3 ? 'LOST' : 'ACTIVE')
                        return (
                          <select
                            value={statusName}
                            onChange={(evt) =>
                              updateMutation.mutate({ id: e.enquiry_id, newStatus: evt.target.value })
                            }
                            className={`text-xs border rounded-md px-2.5 py-1 font-semibold cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-primary-500 ${getStatusColorClass(
                              statusName
                            )}`}
                          >
                            <option value="ACTIVE" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">ACTIVE</option>
                            <option value="CONVERTED" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">CONVERTED</option>
                            <option value="LOST" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">LOST</option>
                          </select>
                        )
                      })()}
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        Staff #{e.owner_staff_id}
                      </span>
                    </td>
                    <td className="text-xs text-slate-500 dark:text-slate-400">
                      {e.last_followup_date ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {formatDate(e.last_followup_date)}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600 italic">None</span>
                      )}
                    </td>
                    <td className="text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(e.created_at)}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => setDeleteTarget(e)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                        title="Delete Enquiry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        itemName={deleteTarget ? `Enquiry #${deleteTarget.enquiry_id}` : ''}
        isPending={deleteMutation.isPending}
      />
    </div>
  )
}
