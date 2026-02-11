import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { serviceApi, JobCardCreate } from '../api/serviceApi'
import { Plus, Search, CheckCircle, Wrench } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import JobCardForm from '../components/JobCardForm'

export default function ServicePage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all')
  const [showForm, setShowForm] = useState(false)
  const queryClient = useQueryClient()

  const { data: jobCards = [], isLoading } = useQuery({
    queryKey: ['job-cards'],
    queryFn: serviceApi.getJobCards,
  })

  const createMutation = useMutation({
    mutationFn: (data: JobCardCreate) => serviceApi.createJobCard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-cards'] })
      setShowForm(false)
    },
  })

  const closeMutation = useMutation({
    mutationFn: (jobCardId: number) => serviceApi.closeJobCard(jobCardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-cards'] })
    },
  })

  // Status counts
  const openCount = jobCards.filter((j: any) => !j.out_datetime).length
  const closedCount = jobCards.filter((j: any) => j.out_datetime).length

  const filteredJobCards = jobCards.filter((job: any) => {
    const matchesSearch =
      job.job_card_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.chassis_no?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'open' && !job.out_datetime) ||
      (statusFilter === 'closed' && job.out_datetime)

    return matchesSearch && matchesStatus
  })

  const handleClose = (jobCardId: number) => {
    if (confirm('Close this job card?')) {
      closeMutation.mutate(jobCardId)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service</h1>
          <p className="text-gray-500 text-sm mt-1">Manage service job cards</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Job Card
        </button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${statusFilter === 'all' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          All ({jobCards.length})
        </button>
        <button
          onClick={() => setStatusFilter('open')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${statusFilter === 'open' ? 'bg-white shadow text-yellow-700' : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          Open ({openCount})
        </button>
        <button
          onClick={() => setStatusFilter('closed')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${statusFilter === 'closed' ? 'bg-white shadow text-green-700' : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          Closed ({closedCount})
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by job card or chassis..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Job Cards Table */}
      <div className="card">
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading job cards...</p>
          </div>
        ) : filteredJobCards.length === 0 ? (
          <div className="text-center py-8">
            <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No job cards found</p>
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              Create First Job Card
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Job Card No</th>
                  <th>Chassis No</th>
                  <th>In Date/Time</th>
                  <th>Out Date/Time</th>
                  <th>Opening KM</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobCards.map((job: any) => (
                  <tr key={job.job_card_id}>
                    <td className="font-medium">{job.job_card_no}</td>
                    <td className="font-mono text-sm">{job.chassis_no}</td>
                    <td>{formatDateTime(job.in_datetime)}</td>
                    <td>{job.out_datetime ? formatDateTime(job.out_datetime) : '-'}</td>
                    <td>{job.opening_km}</td>
                    <td>
                      <span className={`px-2 py-1 text-xs rounded-full ${job.out_datetime
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        {job.out_datetime ? 'Closed' : 'Open'}
                      </span>
                    </td>
                    <td>
                      {!job.out_datetime && (
                        <button
                          onClick={() => handleClose(job.job_card_id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded"
                          title="Close Job Card"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Job Card Form Modal */}
      {showForm && (
        <JobCardForm
          onSubmit={(data) => createMutation.mutate(data)}
          onClose={() => setShowForm(false)}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  )
}
