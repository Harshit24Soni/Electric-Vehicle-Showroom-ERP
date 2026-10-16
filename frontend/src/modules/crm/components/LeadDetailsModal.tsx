import React, { useState } from 'react'
import {
  X,
  Calendar,
  Car,
  FileCheck,
  UserCheck,
  Activity as ActivityIcon,
  Phone,
  Mail,
  User,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leadsApi } from '../api/leads'
import { crmApi, ActivityCreate } from '../api/crmApi'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import LeadConversionModal from './LeadConversionModal'
import { formatDate, formatDateTime } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'

interface PastFollowupItem {
  lead_followup_id: number
  outcome_status: string
  followup_date: string
  remarks: string
}

interface PastTestRideItem {
  test_ride_id: number
  chassis_no: string
  test_ride_date: string
  customer_feedback?: string
}

interface LeadActivityItem {
  activity_id: number
  lead_id: number
  activity_type: string
  performed_by_staff_id?: number
  activity_time: string
  outcome?: string
  next_action_date?: string
}

interface StaffOption {
  staff_id: number
  full_name: string
  designation: string
}

interface VehicleOption {
  chassis_no: string
  current_status: string
}

interface LeadDetailsModalProps {
  leadId: number
  onClose: () => void
}

export default function LeadDetailsModal({ leadId, onClose }: LeadDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'followups' | 'testrides' | 'activities'>('details')
  const [showConversionModal, setShowConversionModal] = useState(false)
  const [selectedNewOwnerId, setSelectedNewOwnerId] = useState<number | ''>('')

  // Activity form state
  const [activityType, setActivityType] = useState('NOTE')
  const [activityOutcome, setActivityOutcome] = useState('')
  const [activityNextDate, setActivityNextDate] = useState('')

  const queryClient = useQueryClient()

  const { data: lead, isLoading: leadLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => leadsApi.getById(leadId),
  })

  // Staff query for owner reassignment
  const { data: staffList = [] } = useQuery({
    queryKey: ['staff-list-crm'],
    queryFn: () => api.get<StaffOption[]>('/admin/staff'),
  })

  // Assign mutation
  const assignMutation = useMutation({
    mutationFn: (newOwnerId: number) => leadsApi.assign(leadId, newOwnerId),
    onSuccess: () => {
      toast.success('Lead owner reassigned successfully')
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['lead-activities', leadId] })
      setSelectedNewOwnerId('')
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to reassign lead')
    },
  })

  // Follow-ups state & query
  const [remarks, setRemarks] = useState('')
  const [outcomeStatus, setOutcomeStatus] = useState('WARM')
  const [nextDate, setNextDate] = useState('')

  const { data: followups = [], isLoading: followupsLoading } = useQuery({
    queryKey: ['lead-followups', leadId],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => api.get(`/crm/leads/${leadId}/followups`).then((res: any) => res.data || res),
  })

  const addFollowupMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (data: any) => leadsApi.addLeadFollowup(leadId, data),
    onSuccess: () => {
      toast.success('Follow-up recorded successfully')
      queryClient.invalidateQueries({ queryKey: ['lead-followups', leadId] })
      queryClient.invalidateQueries({ queryKey: ['lead-activities', leadId] })
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      setRemarks('')
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to add follow-up')
    },
  })

  // Test Rides state & query
  const [chassisNo, setChassisNo] = useState('')
  const [rideDate, setRideDate] = useState(new Date().toISOString().split('T')[0])
  const [feedback, setFeedback] = useState('')

  const { data: testRides = [], isLoading: testRidesLoading } = useQuery({
    queryKey: ['test-rides', leadId],
    queryFn: () => leadsApi.getTestRides(leadId),
  })

  // Activities state & query
  const { data: activities = [], isLoading: activitiesLoading } = useQuery({
    queryKey: ['lead-activities', leadId],
    queryFn: () => leadsApi.getActivities(leadId),
    enabled: activeTab === 'activities',
  })

  const addActivityMutation = useMutation({
    mutationFn: (data: ActivityCreate) => crmApi.addActivity(data),
    onSuccess: () => {
      toast.success('Activity logged')
      queryClient.invalidateQueries({ queryKey: ['lead-activities', leadId] })
      setActivityOutcome('')
      setActivityNextDate('')
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to record activity')
    },
  })

  // Fetch available vehicles for the model
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', lead?.vehicle_model_id],
    queryFn: () =>
      api.get<VehicleOption[]>(`/master/vehicles`, {
        params: { vehicle_model_id: lead?.vehicle_model_id, status: 'IN_STOCK,DEMO' },
      }),
    enabled: !!lead?.vehicle_model_id && activeTab === 'testrides',
  })

  const addTestRideMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: (data: any) => leadsApi.addTestRide(leadId, data),
    onSuccess: () => {
      toast.success('Test drive recorded successfully')
      queryClient.invalidateQueries({ queryKey: ['test-rides', leadId] })
      queryClient.invalidateQueries({ queryKey: ['lead-activities', leadId] })
      setChassisNo('')
      setFeedback('')
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to add test ride')
    },
  })

  if (leadLoading) {
    return (
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full space-y-4">
          <Skeleton className="h-6 w-3/4 rounded" />
          <Skeleton className="h-4 w-1/2 rounded" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (!lead) return null

  if (showConversionModal) {
    return (
      <LeadConversionModal
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lead={lead as any}
        onClose={() => setShowConversionModal(false)}
        onSuccess={() => {
          setShowConversionModal(false)
          onClose()
        }}
      />
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isConvertible = lead.lead_status !== 'SOLD' && lead.lead_status !== 'LOST' && !(lead as any).is_converted

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activityOutcome.trim()) {
      toast.error('Please enter activity notes/outcome')
      return
    }

    addActivityMutation.mutate({
      lead_id: leadId,
      activity_type: activityType,
      performed_by_staff_id: lead.owner_staff_id || 1,
      activity_time: new Date().toISOString(),
      outcome: activityOutcome.trim(),
      next_action_date: activityNextDate || undefined,
    })
  }

  const getStatusBadge = (statusName: string) => {
    const s = (statusName || '').toUpperCase()
    if (s.includes('HOT')) return <Badge variant="danger" dot pulse>{s}</Badge>
    if (s.includes('WARM')) return <Badge variant="warning" dot>{s}</Badge>
    if (s.includes('COLD') || s.includes('LOST')) return <Badge variant="neutral" dot>{s}</Badge>
    if (s.includes('SOLD') || s.includes('CONVERTED')) return <Badge variant="success" dot>{s}</Badge>
    return <Badge variant="info" dot>{s || 'NEW'}</Badge>
  }

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800/80 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
                {lead.name}
              </h2>
              {getStatusBadge(lead.lead_status || 'HOT')}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span className="flex items-center gap-1 font-mono">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {lead.phone}
              </span>
              <span>•</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Source: {lead.lead_source || 'Direct Walk-in'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isConvertible && (
              <Button
                onClick={() => setShowConversionModal(true)}
                variant="primary"
                size="sm"
                leftIcon={FileCheck}
                className="shadow-sm hover:shadow-glow-sm"
              >
                Convert to Customer
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'details'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Profile & Ownership
          </button>
          <button
            onClick={() => setActiveTab('followups')}
            className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'followups'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Follow-ups ({followups.length})
          </button>
          <button
            onClick={() => setActiveTab('testrides')}
            className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'testrides'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Car className="w-4 h-4" />
            Test Drives ({testRides.length})
          </button>
          <button
            onClick={() => setActiveTab('activities')}
            className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'activities'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ActivityIcon className="w-4 h-4" />
            Activity Log
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-950/40 space-y-6">
          {/* TAB 1: Profile & Ownership */}
          {activeTab === 'details' && (
            <div className="space-y-5 animate-fade-in">
              {/* Profile grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-1">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Customer Contact
                  </p>
                  <p className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-primary-500" />
                    {lead.phone}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {lead.email || 'No email registered'}
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-1">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Vehicle Interest
                  </p>
                  <p className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-primary-500" />
                    Model ID: #{lead.vehicle_model_id}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Target configuration
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-1">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Assigned Consultant
                  </p>
                  <p className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-primary-500" />
                    {lead.owner_staff_id ? `Staff #${lead.owner_staff_id}` : 'Unassigned'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Lead ownership
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-1">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Expected Purchase
                  </p>
                  <p className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary-500" />
                    {lead.expected_purchase_date ? formatDate(lead.expected_purchase_date) : 'Flexible'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Target delivery timeline
                  </p>
                </div>
              </div>

              {/* Owner Reassignment Card */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-primary-200/50 dark:border-primary-900/40 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400">
                    <UserCheck className="w-4 h-4" />
                  </span>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm font-heading">
                    Reassign Lead Ownership
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Assign this lead to another sales consultant or dealership staff member.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                  <select
                    value={selectedNewOwnerId}
                    onChange={(e) => setSelectedNewOwnerId(e.target.value ? Number(e.target.value) : '')}
                    className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 flex-1 transition-all"
                  >
                    <option value="">-- Select Target Staff Member --</option>
                    {staffList.map((s: StaffOption) => (
                      <option key={s.staff_id} value={s.staff_id}>
                        {s.full_name} ({s.designation}) — ID #{s.staff_id}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={() => {
                      if (selectedNewOwnerId) {
                        assignMutation.mutate(Number(selectedNewOwnerId))
                      }
                    }}
                    disabled={!selectedNewOwnerId || assignMutation.isPending}
                    variant="primary"
                    size="md"
                    isLoading={assignMutation.isPending}
                  >
                    Reassign Owner
                  </Button>
                </div>
              </div>

              {/* Remarks Note */}
              {lead.remarks && (
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-1">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Registration Remarks
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                    "{lead.remarks}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Follow-ups */}
          {activeTab === 'followups' && (
            <div className="space-y-6 animate-fade-in">
              {/* Log new follow-up form */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm font-heading flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary-500" />
                  Log New Follow-up
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Outcome Status *
                    </label>
                    <select
                      value={outcomeStatus}
                      onChange={(e) => setOutcomeStatus(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    >
                      <option value="HOT">HOT — High Purchase Intent</option>
                      <option value="WARM">WARM — Considering Options</option>
                      <option value="COLD">COLD — Indifferent / Delayed</option>
                      <option value="LOST">LOST — Chose Competitor / Dropped</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Next Follow-up Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={nextDate}
                      onChange={(e) => setNextDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Follow-up Remarks * <span className="text-slate-400 font-normal">(Min 10 characters)</span>
                    </label>
                    <span className={`text-[11px] font-mono ${remarks.length >= 10 ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {remarks.length} / 10 min
                    </span>
                  </div>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={2}
                    placeholder="Enter discussion summary, customer questions, or price quote details..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-slate-400"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() =>
                      addFollowupMutation.mutate({
                        remarks: remarks.trim(),
                        outcome_status: outcomeStatus,
                        next_followup_date: nextDate || undefined,
                      })
                    }
                    disabled={remarks.trim().length < 10 || addFollowupMutation.isPending}
                    variant="primary"
                    size="md"
                    isLoading={addFollowupMutation.isPending}
                  >
                    Save Follow-up
                  </Button>
                </div>
              </div>

              {/* Past follow-ups list */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm font-heading">
                  Follow-up History
                </h3>
                {followupsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                  </div>
                ) : followups.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 italic p-4 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                    No follow-ups recorded yet for this lead.
                  </p>
                ) : (
                  followups.map((f: PastFollowupItem) => (
                    <div
                      key={f.lead_followup_id}
                      className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-1.5"
                    >
                      <div className="flex justify-between items-center text-xs">
                        {getStatusBadge(f.outcome_status)}
                        <span className="text-slate-400 font-mono">
                          {formatDate(f.followup_date)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {f.remarks}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Test Rides */}
          {activeTab === 'testrides' && (
            <div className="space-y-6 animate-fade-in">
              {/* Record test ride form */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm font-heading flex items-center gap-2">
                  <Car className="w-4 h-4 text-primary-500" />
                  Record Physical Vehicle Test Drive
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Select Demo / In-Stock Chassis *
                    </label>
                    <select
                      value={chassisNo}
                      onChange={(e) => setChassisNo(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    >
                      <option value="">-- Choose available chassis --</option>
                      {vehicles.map((v: VehicleOption) => (
                        <option key={v.chassis_no} value={v.chassis_no}>
                          Chassis: {v.chassis_no} ({v.current_status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Test Ride Date *
                    </label>
                    <input
                      type="date"
                      value={rideDate}
                      onChange={(e) => setRideDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Customer Experience & Feedback
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={2}
                    placeholder="Describe customer impression of acceleration, braking, ergonomics, range comfort..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-slate-400"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() =>
                      addTestRideMutation.mutate({
                        chassis_no: chassisNo,
                        test_ride_date: rideDate,
                        customer_feedback: feedback.trim() || undefined,
                      })
                    }
                    disabled={!chassisNo || !rideDate || addTestRideMutation.isPending}
                    variant="primary"
                    size="md"
                    isLoading={addTestRideMutation.isPending}
                  >
                    Record Test Ride
                  </Button>
                </div>
              </div>

              {/* Past test rides history */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm font-heading">
                  Recorded Test Drives
                </h3>
                {testRidesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full rounded-xl" />
                  </div>
                ) : testRides.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 italic p-4 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                    No test drives logged yet for this lead.
                  </p>
                ) : (
                  testRides.map((tr: PastTestRideItem) => (
                    <div
                      key={tr.test_ride_id}
                      className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-1.5"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60">
                          Chassis #{tr.chassis_no}
                        </span>
                        <span className="text-slate-400 font-mono">
                          {formatDate(tr.test_ride_date)}
                        </span>
                      </div>
                      {tr.customer_feedback ? (
                        <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                          "{tr.customer_feedback}"
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No detailed feedback noted</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Activity Log */}
          {activeTab === 'activities' && (
            <div className="space-y-6 animate-fade-in">
              {/* Form */}
              <form
                onSubmit={handleAddActivity}
                className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4"
              >
                <h3 className="font-bold text-slate-900 dark:text-white text-sm font-heading flex items-center gap-2">
                  <ActivityIcon className="w-4 h-4 text-primary-500" />
                  Log Interaction Activity
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Activity Channel
                    </label>
                    <select
                      value={activityType}
                      onChange={(e) => setActivityType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="NOTE">Note / Showroom Observation</option>
                      <option value="PHONE_CALL">Phone Call</option>
                      <option value="SHOWROOM_VISIT">Showroom Walk-in Visit</option>
                      <option value="WHATSAPP">WhatsApp Conversation</option>
                      <option value="EMAIL">Email Follow-up</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Discussion Summary *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Discussed charging point and subsidy"
                      value={activityOutcome}
                      onChange={(e) => setActivityOutcome(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Next Action Date
                    </label>
                    <input
                      type="date"
                      value={activityNextDate}
                      onChange={(e) => setActivityNextDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={addActivityMutation.isPending}
                    variant="primary"
                    size="sm"
                    isLoading={addActivityMutation.isPending}
                  >
                    Log Activity
                  </Button>
                </div>
              </form>

              {/* Timeline list */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-sm font-heading">
                  Activity Timeline
                </h3>
                {activitiesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                  </div>
                ) : activities.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 italic p-4 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                    No interaction activities logged yet.
                  </p>
                ) : (
                  activities.map((act: LeadActivityItem) => (
                    <div
                      key={act.activity_id}
                      className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-1.5"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold px-2 py-0.5 rounded bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200/50 dark:border-primary-800/50">
                          {act.activity_type}
                        </span>
                        <span className="text-slate-400 font-mono">
                          {act.activity_time ? formatDateTime(act.activity_time) : 'N/A'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-800 dark:text-slate-200">
                        {act.outcome || 'Activity completed'}
                      </p>
                      {act.next_action_date && (
                        <p className="text-xs text-primary-600 dark:text-primary-400 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Next Action Date: {formatDate(act.next_action_date)}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
