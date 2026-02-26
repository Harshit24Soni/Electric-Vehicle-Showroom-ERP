import { useState } from 'react'
import { X, Calendar, Plus, MessageSquare, Car, FileCheck } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leadsApi } from '../api/leads'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import LeadConversionModal from './LeadConversionModal'
import { formatDate } from '@/lib/utils'

interface LeadDetailsModalProps {
    leadId: number
    onClose: () => void
}

export default function LeadDetailsModal({ leadId, onClose }: LeadDetailsModalProps) {
    const [activeTab, setActiveTab] = useState<'details' | 'followups' | 'testrides'>('details')
    const [showConversionModal, setShowConversionModal] = useState(false)
    const queryClient = useQueryClient()

    const { data: lead, isLoading: leadLoading } = useQuery({
        queryKey: ['lead', leadId],
        queryFn: () => leadsApi.getById(leadId),
    })

    // Follow-ups state
    const [remarks, setRemarks] = useState('')
    const [outcomeStatus, setOutcomeStatus] = useState('WARM')
    const [nextDate, setNextDate] = useState('')

    const { data: followups = [], isLoading: followupsLoading } = useQuery({
        queryKey: ['lead-followups', leadId],
        queryFn: () => api.get(`/crm/leads/${leadId}/followups`).then((res: any) => res.data),
    })

    const addFollowupMutation = useMutation({
        mutationFn: (data: any) => leadsApi.addLeadFollowup(leadId, data),
        onSuccess: () => {
            toast.success('Follow-up recorded')
            queryClient.invalidateQueries({ queryKey: ['lead-followups', leadId] })
            setRemarks('')
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.detail || 'Failed to add follow-up')
        }
    })

    // Test Rides state
    const [chassisNo, setChassisNo] = useState('')
    const [rideDate, setRideDate] = useState(new Date().toISOString().split('T')[0])
    const [feedback, setFeedback] = useState('')

    const { data: testRides = [], isLoading: testRidesLoading } = useQuery({
        queryKey: ['test-rides', leadId],
        queryFn: () => leadsApi.getTestRides(leadId),
    })

    // Fetch available vehicles for the model
    const { data: vehicles = [] } = useQuery({
        queryKey: ['vehicles', lead?.vehicle_model_id],
        queryFn: () => api.get(`/master/vehicles`, { params: { vehicle_model_id: lead?.vehicle_model_id, status: 'IN_STOCK,DEMO' } }).then((res: any) => res.data),
        enabled: !!lead?.vehicle_model_id && activeTab === 'testrides',
    })

    const addTestRideMutation = useMutation({
        mutationFn: (data: any) => leadsApi.addTestRide(leadId, data),
        onSuccess: () => {
            toast.success('Test ride recorded')
            queryClient.invalidateQueries({ queryKey: ['test-rides', leadId] })
            setChassisNo('')
            setFeedback('')
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.detail || 'Failed to add test ride')
        }
    })

    if (leadLoading) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg p-6">Loading lead details...</div>
            </div>
        )
    }

    if (!lead) return null;

    if (showConversionModal) {
        return (
            <LeadConversionModal
                lead={lead as any}
                onClose={() => setShowConversionModal(false)}
                onSuccess={() => {
                    setShowConversionModal(false)
                    onClose()
                }}
            />
        )
    }

    const isConvertible = lead.lead_status !== 'SOLD' && lead.lead_status !== 'LOST'

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-40">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            {lead.name}
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold
                                ${lead.lead_status === 'HOT' ? 'bg-red-100 text-red-800' :
                                    lead.lead_status === 'WARM' ? 'bg-yellow-100 text-yellow-800' :
                                        lead.lead_status === 'COLD' ? 'bg-blue-100 text-blue-800' :
                                            lead.lead_status === 'SOLD' ? 'bg-green-100 text-green-800' :
                                                'bg-gray-100 text-gray-800'
                                }`}>
                                {lead.lead_status || 'Unknown'}
                            </span>
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">{lead.phone} | {lead.lead_source}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {isConvertible && (
                            <button
                                onClick={() => setShowConversionModal(true)}
                                className="btn btn-primary flex items-center gap-2"
                            >
                                <FileCheck className="w-4 h-4" />
                                Convert to Customer
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button onClick={() => setActiveTab('details')} className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Details</button>
                    <button onClick={() => setActiveTab('followups')} className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'followups' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Follow-ups</button>
                    <button onClick={() => setActiveTab('testrides')} className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'testrides' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Test Rides</button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                    {activeTab === 'details' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-lg shadow-sm">
                                <div>
                                    <p className="text-sm text-gray-500">Contact</p>
                                    <p className="font-medium">{lead.phone}</p>
                                    <p className="text-sm">{lead.email || 'No email'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Interested Model</p>
                                    <p className="font-medium">Model ID: {lead.vehicle_model_id}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Owner Staff ID</p>
                                    <p className="font-medium">{lead.owner_staff_id}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Expected Purchase</p>
                                    <p className="font-medium">{lead.expected_purchase_date ? formatDate(lead.expected_purchase_date) : 'N/A'}</p>
                                </div>
                            </div>
                            {lead.remarks && (
                                <div className="bg-white p-4 rounded-lg shadow-sm">
                                    <p className="text-sm text-gray-500 mb-1">Remarks</p>
                                    <p className="text-sm">{lead.remarks}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'followups' && (
                        <div className="space-y-6">
                            <div className="bg-white p-4 rounded-lg shadow-sm space-y-3">
                                <h3 className="font-medium text-gray-800">Log New Follow-up</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Outcome</label>
                                        <select value={outcomeStatus} onChange={e => setOutcomeStatus(e.target.value)} className="input text-sm">
                                            <option value="HOT">HOT</option>
                                            <option value="WARM">WARM</option>
                                            <option value="COLD">COLD</option>
                                            <option value="LOST">LOST</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Next Follow-up Date</label>
                                        <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} className="input text-sm" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Remarks (Min 10 chars) *</label>
                                    <textarea value={remarks} onChange={e => setRemarks(e.target.value)} className="input text-sm" rows={2} placeholder="Summary of discussion..."></textarea>
                                </div>
                                <button
                                    onClick={() => addFollowupMutation.mutate({ remarks, outcome_status: outcomeStatus, next_followup_date: nextDate || undefined })}
                                    disabled={remarks.length < 10 || addFollowupMutation.isPending}
                                    className="btn btn-primary text-sm w-full"
                                >
                                    {addFollowupMutation.isPending ? 'Saving...' : 'Save Follow-up'}
                                </button>
                            </div>

                            <div className="space-y-3">
                                <h3 className="font-medium text-gray-700">Past Follow-ups</h3>
                                {followupsLoading ? <p className="text-sm text-gray-500">Loading...</p> : followups.length === 0 ? <p className="text-sm text-gray-500">No follow-ups recorded.</p> : followups.map((f: any) => (
                                    <div key={f.lead_followup_id} className="bg-white p-3 rounded-lg shadow-sm text-sm border-l-4 border-blue-500">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-medium text-blue-800">{f.outcome_status}</span>
                                            <span className="text-gray-400 text-xs">{formatDate(f.followup_date)}</span>
                                        </div>
                                        <p className="text-gray-700">{f.remarks}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'testrides' && (
                        <div className="space-y-6">
                            <div className="bg-white p-4 rounded-lg shadow-sm space-y-3">
                                <h3 className="font-medium text-gray-800">Record Test Ride</h3>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Select Physical Vehicle (Chassis) *</label>
                                    <select value={chassisNo} onChange={e => setChassisNo(e.target.value)} className="input text-sm">
                                        <option value="">-- Choose a vehicle --</option>
                                        {(vehicles?.data || vehicles).map((v: any) => (
                                            <option key={v.chassis_no} value={v.chassis_no}>
                                                {v.chassis_no} ({v.current_status})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Date *</label>
                                    <input type="date" value={rideDate} onChange={e => setRideDate(e.target.value)} className="input text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Customer Feedback</label>
                                    <textarea value={feedback} onChange={e => setFeedback(e.target.value)} className="input text-sm" rows={2} placeholder="How was the ride?"></textarea>
                                </div>
                                <button
                                    onClick={() => addTestRideMutation.mutate({ chassis_no: chassisNo, test_ride_date: rideDate, customer_feedback: feedback })}
                                    disabled={!chassisNo || !rideDate || addTestRideMutation.isPending}
                                    className="btn btn-primary text-sm w-full"
                                >
                                    {addTestRideMutation.isPending ? 'Saving...' : 'Record Test Ride'}
                                </button>
                            </div>

                            <div className="space-y-3">
                                <h3 className="font-medium text-gray-700">Past Test Rides</h3>
                                {testRidesLoading ? <p className="text-sm text-gray-500">Loading...</p> : testRides.length === 0 ? <p className="text-sm text-gray-500">No test rides recorded.</p> : testRides.map((tr: any) => (
                                    <div key={tr.test_ride_id} className="bg-white p-3 rounded-lg shadow-sm text-sm border-l-4 border-green-500">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-medium text-green-800">Chassis: {tr.chassis_no}</span>
                                            <span className="text-gray-400 text-xs">{formatDate(tr.test_ride_date)}</span>
                                        </div>
                                        {tr.customer_feedback && <p className="text-gray-700 italic">"{tr.customer_feedback}"</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
