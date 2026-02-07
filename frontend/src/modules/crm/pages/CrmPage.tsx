import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { leadsApi, LeadCreate } from '../api/leads'
import { Plus, Search } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import LeadForm from '../components/LeadForm'
import EnquiryList from '../components/EnquiryList'
import { useCrmStore } from '@/store/crmStore'
import { useMasterStore } from '@/store/masterStore'

export default function CrmPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<number | ''>('') // Filter by ID now
  const [showForm, setShowForm] = useState(false)
  const queryClient = useQueryClient()

  // Stores
  const { leads, fetchLeads, isLoading: leadsLoading } = useCrmStore()
  const {
    fetchMasterData,
    leadStatuses,
    getLeadStatusName,
    isInitialized: masterInitialized
  } = useMasterStore()

  useEffect(() => {
    fetchMasterData()
    fetchLeads()
  }, [])

  const createMutation = useMutation({
    mutationFn: (data: LeadCreate) => leadsApi.create(data),
    onSuccess: (newLead) => {
      // Optimistic update via store
      useCrmStore.getState().addLead(newLead)
      setShowForm(false)
    },
  })

  const filteredLeads = leads.filter((lead) => {
    // Lead Status is now an ID, mapping needed for search? 
    // Search is usually strictly on name/phone/source for now.
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm) ||
      lead.lead_source.toLowerCase().includes(searchTerm.toLowerCase())

    // Status Filter using ID
    const matchesStatus = statusFilter === '' || lead.lead_status_id === statusFilter

    return matchesSearch && matchesStatus
  })

  const isLoading = leadsLoading || !masterInitialized

  const [activeTab, setActiveTab] = useState<'leads' | 'enquiries'>('leads')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CRM</h1>
          <p className="text-gray-600 mt-1">Manage leads and customer relationships</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('leads')}
            className={`btn ${activeTab === 'leads' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Leads
          </button>
          <button
            onClick={() => setActiveTab('enquiries')}
            className={`btn ${activeTab === 'enquiries' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Enquiries
          </button>
          {activeTab === 'leads' && (
            <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
              <Plus className="w-5 h-5" />
              New Lead
            </button>
          )}
        </div>
      </div>

      {activeTab === 'leads' ? (
        <>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search leads (Name, Phone)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>
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
          </div>

          <div className="card">
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading CRM data...</p>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No leads found</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Lead ID</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Source</th>
                      <th>Status</th>
                      <th>Expected Purchase</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.map((lead) => (
                      <tr key={lead.lead_id}>
                        <td>{lead.lead_id}</td>
                        <td>{lead.name}</td>
                        <td>{lead.phone}</td>
                        <td>{lead.lead_source}</td>
                        <td>
                          <span className={`px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800`}>
                            {getLeadStatusName(lead.lead_status_id)}
                          </span>
                        </td>
                        <td>{lead.expected_purchase_date ? formatDate(lead.expected_purchase_date) : '-'}</td>
                        <td>{formatDate(lead.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {showForm && (
            <LeadForm
              onSubmit={(data) => createMutation.mutate(data)}
              onClose={() => setShowForm(false)}
              isLoading={createMutation.isPending}
            />
          )}
        </>
      ) : (
        <div className="mt-4">
          <EnquiryList />
        </div>
      )}
    </div>
  )
}
