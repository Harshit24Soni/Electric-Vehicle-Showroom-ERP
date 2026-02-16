import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leadsApi } from '../api/leads'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { Calendar, Plus, Bike, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'

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
        vehicle_model_id: '',
        test_ride_date: new Date().toISOString().split('T')[0],
        customer_feedback: '',
        lead_id: '',
    })

    const { data: leads = [] } = useQuery<any[]>({
        queryKey: ['leads'],
        queryFn: () => api.get<any[]>('/crm/leads'),
    })

    const { data: models = [] } = useQuery<any[]>({
        queryKey: ['vehicle-models'],
        queryFn: () => api.get<any[]>('/master/vehicle-models'),
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
                vehicle_model_id: parseInt(formData.vehicle_model_id),
                test_ride_date: formData.test_ride_date,
                customer_feedback: formData.customer_feedback || undefined,
            })
        },
        onSuccess: () => {
            toast.success('Test ride recorded')
            queryClient.invalidateQueries({ queryKey: ['test-rides'] })
            setShowForm(false)
            setFormData({
                vehicle_model_id: '',
                test_ride_date: new Date().toISOString().split('T')[0],
                customer_feedback: '',
                lead_id: '',
            })
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.detail || 'Failed to record test ride')
        },
    })

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-600">Filter by Lead:</label>
                    <select
                        value={selectedLeadId ?? ''}
                        onChange={(e) => setSelectedLeadId(e.target.value ? parseInt(e.target.value) : null)}
                        className="input max-w-xs"
                    >
                        <option value="">Select a lead</option>
                        {leads.map((lead: any) => (
                            <option key={lead.lead_id} value={lead.lead_id}>
                                {lead.name} — {lead.phone}
                            </option>
                        ))}
                    </select>
                </div>
                <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Record Test Ride
                </button>
            </div>

            {/* Test Ride Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold mb-4">Record Test Ride</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Lead *</label>
                                <select
                                    value={formData.lead_id}
                                    onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
                                    className="input"
                                >
                                    <option value="">Select lead</option>
                                    {leads.map((lead: any) => (
                                        <option key={lead.lead_id} value={lead.lead_id}>
                                            {lead.name} — {lead.phone}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Model *</label>
                                <select
                                    value={formData.vehicle_model_id}
                                    onChange={(e) => setFormData({ ...formData, vehicle_model_id: e.target.value })}
                                    className="input"
                                >
                                    <option value="">Select model</option>
                                    {models.map((m: any) => (
                                        <option key={m.model_id} value={m.model_id}>
                                            {m.brand?.brand_name || ''} {m.model_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                                <input
                                    type="date"
                                    value={formData.test_ride_date}
                                    onChange={(e) => setFormData({ ...formData, test_ride_date: e.target.value })}
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Feedback</label>
                                <textarea
                                    value={formData.customer_feedback}
                                    onChange={(e) => setFormData({ ...formData, customer_feedback: e.target.value })}
                                    className="input"
                                    rows={3}
                                    placeholder="How was the experience?"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
                            <button
                                onClick={() => addTestRideMutation.mutate()}
                                disabled={!formData.lead_id || !formData.vehicle_model_id || addTestRideMutation.isPending}
                                className="btn btn-primary"
                            >
                                {addTestRideMutation.isPending ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Test Rides List */}
            {!selectedLeadId ? (
                <div className="text-center py-12 text-gray-400">
                    <Bike className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Select a lead to view test rides</p>
                </div>
            ) : isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading test rides...</div>
            ) : testRides.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <Bike className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No test rides recorded for this lead</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {testRides.map((ride) => (
                        <div key={ride.test_ride_id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Bike className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">Model #{ride.vehicle_model_id}</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {formatDate(ride.test_ride_date)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            {ride.customer_feedback && (
                                <div className="mt-2 flex items-start gap-2 bg-gray-50 p-2 rounded">
                                    <MessageCircle className="w-4 h-4 text-gray-400 mt-0.5" />
                                    <p className="text-sm text-gray-600 italic">"{ride.customer_feedback}"</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
