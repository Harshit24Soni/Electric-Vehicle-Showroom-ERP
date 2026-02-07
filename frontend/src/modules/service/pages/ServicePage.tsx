import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { serviceApi, JobCardCreate } from '../api/serviceApi'
import { Plus, Search, XCircle, CheckCircle } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'
import JobCardForm from '../components/JobCardForm'

export default function ServicePage() {
  const [searchTerm, setSearchTerm] = useState('')
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

  const filteredJobCards = jobCards.filter((job) =>
    job.job_card_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.chassis_no.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleClose = (jobCardId: number) => {
    if (confirm('Close this job card?')) {
      closeMutation.mutate(jobCardId)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Service</h1>
          <p className="text-gray-600 mt-1">Manage service job cards</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New Job Card
        </button>
      </div>

      <div className="card">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search job cards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading job cards...</p>
          </div>
        ) : filteredJobCards.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No job cards found</p>
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
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobCards.map((job) => (
                  <tr key={job.job_card_id}>
                    <td className="font-medium">{job.job_card_no}</td>
                    <td>{job.chassis_no}</td>
                    <td>{formatDateTime(job.in_datetime)}</td>
                    <td>{job.out_datetime ? formatDateTime(job.out_datetime) : '-'}</td>
                    <td>{job.opening_km}</td>
                    <td>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        job.out_datetime
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {job.out_datetime ? 'Closed' : 'Open'}
                      </span>
                    </td>
                    <td>{formatDate(job.created_at)}</td>
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
