import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leadsApi } from '../api/leads'
import { Lead } from '../api/leads'
import { Vehicle } from '../../master/api/masterApi'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Calendar, Plus, Bike, MessageCircle, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'

interface TestRide {
  test_ride_id: number
  lead_id: number
  vehicle_model_id: number
  test_ride_date: string
  customer_feedback?: string
  created_at: string
}

export default function TestRideList() {
  const queryClient = useQueryClient()
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    chassis_no: '',
    test_ride_date: new Date().toISOString().split('T')[0],
    customer_feedback: '',
    lead_id: '',
  })

   
  const { data: leads = [] } = useQuery<any[]>({
    queryKey: ['leads'],
     
    queryFn: () => api.get<any[]>('/crm/leads'),
  })

   
  const selectedLeadObj = leads.find((l: any) => l.lead_id === parseInt(formData.lead_id))

   
  const { data: vehicles = [] } = useQuery<any[]>({
    queryKey: ['vehicles', selectedLeadObj?.vehicle_model_id],
    queryFn: () =>
      api.get<any[]>('/master/vehicles', {
        params: { vehicle_model_id: selectedLeadObj?.vehicle_model_id, status: 'IN_STOCK,DEMO' },
      }),
    enabled: !!selectedLeadObj?.vehicle_model_id,
  })

  const { data: testRides = [], isLoading } = useQuery<TestRide[]>({
    queryKey: ['test-rides', selectedLeadId],
    queryFn: () => leadsApi.getTestRides(selectedLeadId!),
    enabled: !!selectedLeadId,
  })

  const addTestRideMutation = useMutation({
    mutationFn: () => {
      const leadId = parseInt(formData.lead_id)
      return leadsApi.addTestRide(leadId, {
        chassis_no: formData.chassis_no,
        test_ride_date: formData.test_ride_date,
        customer_feedback: formData.customer_feedback || undefined,
      })
    },
    onSuccess: () => {
      toast.success('Test drive recorded successfully')
      queryClient.invalidateQueries({ queryKey: ['test-rides'] })
      setShowForm(false)
      setFormData({
        chassis_no: '',
        test_ride_date: new Date().toISOString().split('T')[0],
        customer_feedback: '',
        lead_id: '',
      })
    },
     
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to record test drive')
    },
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">
            Filter by Lead:
          </label>
          <select
            value={selectedLeadId ?? ''}
            onChange={(e) => setSelectedLeadId(e.target.value ? parseInt(e.target.value) : null)}
            className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 min-w-[220px] transition-all cursor-pointer"
          >
            <option value="">-- All / Select a Lead --</option>
            {leads.map((lead: Lead) => (
              <option key={lead.lead_id} value={lead.lead_id}>
                {lead.name} — {lead.phone}
              </option>
            ))}
          </select>
        </div>

        <Button
          onClick={() => setShowForm(true)}
          variant="primary"
          size="md"
          leftIcon={Plus}
          className="shadow-sm hover:shadow-glow-sm"
        >
          Record Test Drive
        </Button>
      </div>

      {/* Test Ride Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400">
                  <Bike className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white font-heading">
                    Record Test Drive
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Log physical vehicle demo experience
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Lead *
                </label>
                <select
                  value={formData.lead_id}
                  onChange={(e) => setFormData({ ...formData, lead_id: e.target.value, chassis_no: '' })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all cursor-pointer"
                >
                  <option value="">-- Choose lead --</option>
                  {leads.map((lead: Lead) => (
                    <option key={lead.lead_id} value={lead.lead_id}>
                      {lead.name} — {lead.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Available Vehicle Chassis *
                </label>
                <select
                  value={formData.chassis_no}
                  onChange={(e) => setFormData({ ...formData, chassis_no: e.target.value })}
                  disabled={!formData.lead_id}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all cursor-pointer disabled:opacity-50"
                >
                  <option value="">
                    {formData.lead_id ? '-- Select chassis --' : 'First select a lead'}
                  </option>
                  {((vehicles as { data?: Vehicle[] })?.data || (vehicles as Vehicle[]) || []).map((v: Vehicle) => (
                    <option key={v.chassis_no} value={v.chassis_no}>
                      {v.chassis_no} ({v.current_status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Test Drive Date *
                </label>
                <input
                  type="date"
                  value={formData.test_ride_date}
                  onChange={(e) => setFormData({ ...formData, test_ride_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Customer Feedback & Ride Observations
                </label>
                <textarea
                  value={formData.customer_feedback}
                  onChange={(e) => setFormData({ ...formData, customer_feedback: e.target.value })}
                  rows={2}
                  placeholder="e.g. Liked regenerative braking, requested test of sport mode..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button onClick={() => setShowForm(false)} variant="secondary" size="md">
                  Cancel
                </Button>
                <Button
                  onClick={() => addTestRideMutation.mutate()}
                  disabled={!formData.lead_id || !formData.chassis_no || addTestRideMutation.isPending}
                  isLoading={addTestRideMutation.isPending}
                  variant="primary"
                  size="md"
                >
                  Save Test Drive
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Rides List */}
      {!selectedLeadId ? (
        <EmptyState
          icon={Bike}
          title="Select a Lead to View Test Drives"
          description="Use the filter above to inspect all physical vehicle test drives recorded for that customer."
          className="py-16"
        />
      ) : isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : testRides.length === 0 ? (
        <EmptyState
          icon={Bike}
          title="No Test Drives Recorded"
          description="This lead has not taken any vehicle test drives yet. Click 'Record Test Drive' to log a ride."
          actionLabel="Record Test Drive"
          onAction={() => setShowForm(true)}
          actionIcon={Plus}
          className="py-16"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {testRides.map((ride) => (
            <div
              key={ride.test_ride_id}
              className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm space-y-3 hover:border-primary-500/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-200/50 dark:border-primary-800/50">
                    <Bike className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">
                      Model #{ride.vehicle_model_id}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDate(ride.test_ride_date)}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">
                  Drive #{ride.test_ride_id}
                </span>
              </div>

              {ride.customer_feedback ? (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start gap-2">
                  <MessageCircle className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                    "{ride.customer_feedback}"
                  </p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
