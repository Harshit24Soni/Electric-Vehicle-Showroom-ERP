import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { leadsApi, LeadCreate } from '../api/leads'
import {
  Plus,
  Search,
  Eye,
  UserPlus,
  Trash2,
  ClipboardList,
  Users,
  Flame,
  Clock,
  CheckCircle2,
  MessageSquare,
  CalendarCheck,
  Bike,
  Sparkles,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import LeadForm from '../components/LeadForm'
import LeadConversionModal from '../components/LeadConversionModal'
import LeadFollowupModal from '../components/LeadFollowupModal'
import LeadDetailsModal from '../components/LeadDetailsModal'
import TestRideList from '../components/TestRideList'
import EnquiryList from '../components/EnquiryList'
import FollowupDashboard from '../components/FollowupDashboard'
import { useCrmStore } from '@/store/crmStore'
import { useMasterStore } from '@/store/masterStore'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'
import { MetricCard } from '@/components/ui/MetricCard'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

type CrmTab = 'leads' | 'enquiries' | 'followups' | 'testrides'

export default function CrmPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as CrmTab) || 'leads'
  const [activeTab, setActiveTab] = useState<CrmTab>(
    ['leads', 'enquiries', 'followups', 'testrides'].includes(initialTab) ? initialTab : 'leads'
  )

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<number | ''>('')
  const [showForm, setShowForm] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- CRM lead model
  const [convertingLead, setConvertingLead] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- CRM lead model
  const [selectedLead, setSelectedLead] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- CRM lead model
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- CRM lead model
  const [followupLead, setFollowupLead] = useState<any>(null)

  const { leads, fetchLeads, isLoading: leadsLoading } = useCrmStore()
  const {
    fetchMasterData,
    leadStatuses,
    getLeadStatusName,
    isInitialized: masterInitialized,
  } = useMasterStore()

  useEffect(() => {
    fetchMasterData()
    fetchLeads()
  }, [fetchMasterData, fetchLeads])

  // Sync tab with URL parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab') as CrmTab
    if (tabParam && ['leads', 'enquiries', 'followups', 'testrides'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  // Auto-open form when navigated with ?action=new
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setShowForm(true)
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('action')
      setSearchParams(newParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const handleTabChange = (tab: CrmTab) => {
    setActiveTab(tab)
    const newParams = new URLSearchParams(searchParams)
    newParams.set('tab', tab)
    setSearchParams(newParams, { replace: true })
  }

  const createMutation = useMutation({
    mutationFn: (data: LeadCreate) => leadsApi.create(data),
    onSuccess: (newLead) => {
      useCrmStore.getState().addLead(newLead)
      setShowForm(false)
      fetchLeads(true)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, hardDelete }: { id: number; hardDelete?: boolean }) =>
      leadsApi.delete(id, hardDelete),
    onSuccess: () => {
      fetchLeads(true)
      setDeleteTarget(null)
    },
  })

  const handleDeleteConfirm = (hardDelete: boolean) => {
    if (deleteTarget) {
      deleteMutation.mutate({ id: deleteTarget.lead_id, hardDelete })
    }
  }

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const query = searchTerm.toLowerCase().trim()
      const matchesSearch =
        !query ||
        lead.name.toLowerCase().includes(query) ||
        lead.phone.includes(query) ||
        (lead.lead_source && lead.lead_source.toLowerCase().includes(query)) ||
        (lead.email && lead.email.toLowerCase().includes(query))
      const matchesStatus = statusFilter === '' || lead.lead_status_id === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [leads, searchTerm, statusFilter])

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = leads.length
    const hot = leads.filter((l) => {
      const statusName = getLeadStatusName(l.lead_status_id).toLowerCase()
      const rawStatus = (l.lead_status || '').toLowerCase()
      return statusName.includes('hot') || rawStatus.includes('hot')
    }).length

    const converted = leads.filter((l) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isConv = (l as any).is_converted === true
      const statusName = getLeadStatusName(l.lead_status_id).toLowerCase()
      const rawStatus = (l.lead_status || '').toLowerCase()
      return isConv || statusName.includes('convert') || statusName.includes('sold') || rawStatus === 'sold'
    }).length

    const active = Math.max(0, total - converted)

    return { total, hot, active, converted }
  }, [leads, getLeadStatusName])

  const isLoading = leadsLoading || !masterInitialized

  const getStatusBadge = (leadStatusId: number, rawStatus?: string) => {
    const statusName = getLeadStatusName(leadStatusId) || rawStatus || 'New'
    const name = statusName.toLowerCase()

    if (name.includes('hot')) {
      return (
        <Badge variant="danger" dot pulse>
          {statusName}
        </Badge>
      )
    }
    if (name.includes('warm')) {
      return (
        <Badge variant="warning" dot>
          {statusName}
        </Badge>
      )
    }
    if (name.includes('cold') || name.includes('lost')) {
      return (
        <Badge variant="neutral" dot>
          {statusName}
        </Badge>
      )
    }
    if (name.includes('converted') || name.includes('sold')) {
      return (
        <Badge variant="success" dot>
          {statusName}
        </Badge>
      )
    }
    return (
      <Badge variant="info" dot>
        {statusName}
      </Badge>
    )
  }

  const tabs: { key: CrmTab; label: string; icon: typeof Users; count: number | null }[] = [
    { key: 'leads', label: 'Leads Pipeline', icon: Users, count: leads.length },
    { key: 'enquiries', label: 'Enquiries', icon: MessageSquare, count: null },
    { key: 'followups', label: 'Follow-ups', icon: CalendarCheck, count: null },
    { key: 'testrides', label: 'Test Drives', icon: Bike, count: null },
  ]

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-heading">
              CRM & Lead Operations
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200/50 dark:border-primary-800/50">
              <Sparkles className="w-3 h-3" />
              Automotive Hub
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage showroom leads, inbound enquiries, follow-up queues, and test drive experiences
          </p>
        </div>

        {/* Global Action */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowForm(true)}
            variant="primary"
            leftIcon={Plus}
            className="shadow-sm hover:shadow-glow-sm"
          >
            New Lead
          </Button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400 font-semibold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-primary-500' : 'text-slate-400 dark:text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                    isActive
                      ? 'bg-primary-100 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300 font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Leads Tab */}
      {activeTab === 'leads' && (
        <div className="space-y-6">
          {/* Quick Metrics Ribbon */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Leads"
              value={metrics.total}
              icon={Users}
              subtitle="All registered showroom leads"
              iconBg="bg-blue-50 dark:bg-blue-950/50 border border-blue-200/50 dark:border-blue-800/40"
              iconColor="text-blue-600 dark:text-blue-400"
              isLoading={isLoading}
            />
            <MetricCard
              title="Hot Leads"
              value={metrics.hot}
              icon={Flame}
              subtitle="High purchase intent"
              iconBg="bg-rose-50 dark:bg-rose-950/50 border border-rose-200/50 dark:border-rose-800/40"
              iconColor="text-rose-600 dark:text-rose-400"
              isLoading={isLoading}
            />
            <MetricCard
              title="Active Pipeline"
              value={metrics.active}
              icon={Clock}
              subtitle="Pending follow-up or test drive"
              iconBg="bg-amber-50 dark:bg-amber-950/50 border border-amber-200/50 dark:border-amber-800/40"
              iconColor="text-amber-600 dark:text-amber-400"
              isLoading={isLoading}
            />
            <MetricCard
              title="Converted / Won"
              value={metrics.converted}
              icon={CheckCircle2}
              subtitle="Successfully transitioned to sale"
              iconBg="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/50 dark:border-emerald-800/40"
              iconColor="text-emerald-600 dark:text-emerald-400"
              isLoading={isLoading}
            />
          </div>

          {/* Search, Filter & Actions Toolbar */}
          <div className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search leads by customer name, phone, email, or source..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 dark:focus:border-primary-400 transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value ? Number(e.target.value) : '')}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all cursor-pointer min-w-[140px]"
              >
                <option value="">All Statuses</option>
                {leadStatuses.map((status) => (
                  <option key={status.status_id} value={status.status_id}>
                    {status.status_name}
                  </option>
                ))}
              </select>

              {(searchTerm || statusFilter !== '') && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('')
                  }}
                  className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors whitespace-nowrap"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Leads Pipeline Table */}
          <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="p-8 space-y-4">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>
            ) : filteredLeads.length === 0 ? (
              <EmptyState
                icon={Users}
                title={searchTerm || statusFilter !== '' ? 'No Matching Leads' : 'No Leads Registered Yet'}
                description={
                  searchTerm || statusFilter !== ''
                    ? 'No customer records match your filter criteria. Try resetting the filters or searching for another keyword.'
                    : 'Get started by creating your first showroom lead to track enquiries and test rides.'
                }
                actionLabel={searchTerm || statusFilter !== '' ? 'Reset Filters' : 'Create First Lead'}
                onAction={() => {
                  if (searchTerm || statusFilter !== '') {
                    setSearchTerm('')
                    setStatusFilter('')
                  } else {
                    setShowForm(true)
                  }
                }}
                actionIcon={searchTerm || statusFilter !== '' ? undefined : Plus}
                className="py-16"
              />
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="w-12 text-center">#</th>
                      <th>Lead / Customer</th>
                      <th>Contact Details</th>
                      <th>Lead Source</th>
                      <th>Status</th>
                      <th>Expected Purchase</th>
                      <th>Consultant ID</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead, index) => {
                      // Initials for avatar
                      const initials = lead.name
                        .split(' ')
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()

                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const isConverted = (lead as any).is_converted === true

                      return (
                        <tr key={lead.lead_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="text-slate-400 dark:text-slate-500 text-center font-mono text-xs">
                            {index + 1}
                          </td>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-300 font-bold text-xs flex items-center justify-center border border-primary-200/50 dark:border-primary-800/50 shrink-0">
                                {initials || 'EV'}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-white text-sm">
                                  {lead.name}
                                </p>
                                {lead.vehicle_model_id ? (
                                  <p className="text-xs text-slate-400 dark:text-slate-500">
                                    Model ID: #{lead.vehicle_model_id}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                              {lead.phone}
                            </p>
                            {lead.email ? (
                              <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[160px]">
                                {lead.email}
                              </p>
                            ) : null}
                          </td>
                          <td>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                              {lead.lead_source || 'Direct Walk-in'}
                            </span>
                          </td>
                          <td>{getStatusBadge(lead.lead_status_id, lead.lead_status)}</td>
                          <td className="text-sm text-slate-600 dark:text-slate-400">
                            {lead.expected_purchase_date ? (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                {formatDate(lead.expected_purchase_date)}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-600 italic text-xs">Unspecified</span>
                            )}
                          </td>
                          <td className="text-sm text-slate-600 dark:text-slate-400">
                            {lead.owner_staff_id ? (
                              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                Staff #{lead.owner_staff_id}
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">Unassigned</span>
                            )}
                          </td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setSelectedLead(lead)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/50 dark:hover:text-primary-300 transition-colors"
                                title="View Lead Details & Timeline"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setFollowupLead(lead)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300 transition-colors"
                                title="Log Follow-up Activity"
                              >
                                <ClipboardList className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setConvertingLead(lead)}
                                disabled={isConverted}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isConverted
                                    ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                    : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300'
                                }`}
                                title={isConverted ? 'Already Converted' : 'Convert Lead to Customer'}
                              >
                                <UserPlus className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(lead)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 dark:hover:text-rose-300 transition-colors"
                                title="Delete Lead"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enquiries Tab */}
      {activeTab === 'enquiries' && <EnquiryList />}

      {/* Follow-ups Queue Tab */}
      {activeTab === 'followups' && <FollowupDashboard />}

      {/* Test Drives Tab */}
      {activeTab === 'testrides' && (
        <div className="p-6 rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 shadow-sm">
          <TestRideList />
        </div>
      )}

      {/* Lead Form Modal */}
      {showForm && (
        <LeadForm
          onSubmit={(data) => createMutation.mutate(data)}
          onClose={() => setShowForm(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Lead Conversion Modal */}
      {convertingLead && (
        <LeadConversionModal
          lead={convertingLead}
          onClose={() => setConvertingLead(null)}
          onSuccess={() => {
            setConvertingLead(null)
            fetchLeads(true)
          }}
        />
      )}

      {/* Lead Follow-up Modal */}
      {followupLead && (
        <LeadFollowupModal
          leadId={followupLead.lead_id}
          leadName={followupLead.name}
          onClose={() => {
            setFollowupLead(null)
            fetchLeads(true)
          }}
        />
      )}

      {/* Lead Details Dashboard Modal */}
      {selectedLead && (
        <LeadDetailsModal
          leadId={selectedLead.lead_id}
          onClose={() => {
            setSelectedLead(null)
            fetchLeads(true)
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        itemName={deleteTarget?.name || 'Selected Lead'}
        isPending={deleteMutation.isPending}
      />
    </div>
  )
}
