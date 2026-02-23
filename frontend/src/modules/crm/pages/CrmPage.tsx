import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { leadsApi, LeadCreate } from '../api/leads'
import { Plus, Search, Eye, UserPlus, Trash2, ClipboardList } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import LeadForm from '../components/LeadForm'
import LeadConversionModal from '../components/LeadConversionModal'
import LeadFollowupModal from '../components/LeadFollowupModal'
import TestRideList from '../components/TestRideList'
import { useCrmStore } from '@/store/crmStore'
import { useMasterStore } from '@/store/masterStore'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'

export default function CrmPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<number | ''>('')
  const [showForm, setShowForm] = useState(false)
  const [convertingLead, setConvertingLead] = useState<any>(null)
  const [selectedLead, setSelectedLead] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'leads' | 'testrides'>('leads')
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [followupLead, setFollowupLead] = useState<any>(null)

  const { leads, fetchLeads, isLoading: leadsLoading } = useCrmStore()
  const {
    fetchMasterData,
    leadStatuses,
    getLeadStatusName,
    isInitialized: masterInitialized
  } = useMasterStore()

  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    fetchMasterData()
    fetchLeads()
  }, [])

  // Auto-open form when navigated with ?action=new
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setShowForm(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams])

  const createMutation = useMutation({
    mutationFn: (data: LeadCreate) => leadsApi.create(data),
    onSuccess: (newLead) => {
      useCrmStore.getState().addLead(newLead)
      setShowForm(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, hardDelete }: { id: number; hardDelete?: boolean }) =>
      leadsApi.delete(id, hardDelete),
    onSuccess: () => {
      fetchLeads()
      setDeleteTarget(null)
    },
  })

  const handleDeleteConfirm = (hardDelete: boolean) => {
    if (deleteTarget) {
      deleteMutation.mutate({ id: deleteTarget.lead_id, hardDelete })
    }
  }

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm) ||
      lead.lead_source.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === '' || lead.lead_status_id === statusFilter
    return matchesSearch && matchesStatus
  })

  const isLoading = leadsLoading || !masterInitialized

  const getStatusColor = (statusName: string) => {
    const name = statusName.toLowerCase()
    if (name.includes('hot') || name.includes('converted')) return 'bg-green-100 text-green-800'
    if (name.includes('warm')) return 'bg-yellow-100 text-yellow-800'
    if (name.includes('cold') || name.includes('lost')) return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  const tabs = [
    { key: 'leads', label: 'Leads', count: leads.length },
    { key: 'testrides', label: 'Test Rides', count: null },
  ] as const

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 text-sm mt-1">Manage leads and test rides</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key
                ? 'bg-white shadow text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="ml-1 text-xs bg-gray-200 px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Tab */}
      {activeTab === 'leads' && (
        <>
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, phone, or source..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value ? Number(e.target.value) : '')}
              className="input sm:w-48"
            >
              <option value="">All Status</option>
              {leadStatuses.map((status) => (
                <option key={status.status_id} value={status.status_id}>
                  {status.status_name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Lead
            </button>
          </div>

          {/* Leads Table */}
          <div className="card">
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading leads...</p>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No leads found</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="btn btn-primary mt-4"
                >
                  Create First Lead
                </button>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>S.No.</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Source</th>
                      <th>Status</th>
                      <th>Expected Date</th>
                      <th>Owner</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead, index) => {
                      const statusName = getLeadStatusName(lead.lead_status_id)
                      return (
                        <tr key={lead.lead_id}>
                          <td className="text-gray-500 text-center">{index + 1}</td>
                          <td className="font-medium">{lead.name}</td>
                          <td>{lead.phone}</td>
                          <td className="text-gray-600">{lead.lead_source}</td>
                          <td>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(statusName)}`}>
                              {statusName}
                            </span>
                          </td>
                          <td>{lead.expected_purchase_date ? formatDate(lead.expected_purchase_date) : '-'}</td>
                          <td className="text-gray-600">{lead.owner_staff_id || 'Unassigned'}</td>
                          <td>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSelectedLead(lead)}
                                className="p-1 text-gray-500 hover:text-blue-600"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setFollowupLead(lead)}
                                className="p-1 text-gray-500 hover:text-indigo-600"
                                title="Log Follow-up"
                              >
                                <ClipboardList className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setConvertingLead(lead)}
                                className={`p-1 ${(lead as any).is_converted ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-green-600'}`}
                                title={(lead as any).is_converted ? 'Already Converted' : 'Convert to Customer'}
                                disabled={(lead as any).is_converted}
                              >
                                <UserPlus className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(lead)}
                                className="p-1 text-gray-500 hover:text-red-600"
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
                fetchLeads()
              }}
            />
          )}

          {/* Lead Follow-up Modal */}
          {followupLead && (
            <LeadFollowupModal
              leadId={followupLead.lead_id}
              leadName={followupLead.name}
              onClose={() => setFollowupLead(null)}
            />
          )}

          <DeleteConfirmModal
            isOpen={!!deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDeleteConfirm}
            itemName={deleteTarget?.name || ''}
            isPending={deleteMutation.isPending}
          />
        </>
      )}

      {/* Test Rides Tab */}
      {activeTab === 'testrides' && (
        <div className="card">
          <TestRideList />
        </div>
      )}
    </div>
  )
}
