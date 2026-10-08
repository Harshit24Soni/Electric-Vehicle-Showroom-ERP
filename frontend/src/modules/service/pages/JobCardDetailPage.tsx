// @ts-nocheck
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { serviceApi, SpareConsumption } from '../api/serviceApi'
import { ArrowLeft, Plus, CheckCircle, Undo, Trash2 } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import AddSpareModal from '../components/AddSpareModal'
import { toast } from 'react-hot-toast'

export default function JobCardDetailPage() {
  const { jobCardId } = useParams<{ jobCardId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showAddSpare, setShowAddSpare] = useState(false)

  const id = parseInt(jobCardId || '0', 10)

  const { data: jobCard, isLoading: loadingJob } = useQuery({
    queryKey: ['job-card', id],
    queryFn: () => serviceApi.getJobCardById(id),
    enabled: !!id,
  })

  const { data: spares = [], isLoading: loadingSpares } = useQuery({
    queryKey: ['job-card-spares', id],
    queryFn: () => serviceApi.listSpares(id),
    enabled: !!id,
  })

  const consumeMutation = useMutation({
    mutationFn: (consumptionId: number) => serviceApi.consumeSpare(id, consumptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-card-spares', id] })
      toast.success('Spare consumed successfully')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to consume spare')
    }
  })

  const reverseMutation = useMutation({
    mutationFn: (consumptionId: number) => serviceApi.reverseSpare(id, consumptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-card-spares', id] })
      toast.success('Spare reversed successfully')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to reverse spare')
    }
  })

  const removeDraftMutation = useMutation({
    mutationFn: (consumptionId: number) => serviceApi.removeDraftSpare(id, consumptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-card-spares', id] })
      toast.success('Draft spare removed')
    },
  })

  if (loadingJob) return <div className="p-8">Loading Job Card...</div>
  if (!jobCard) return <div className="p-8">Job Card not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/service')} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Card {jobCard.job_card_no || `JC-${String(jobCard.job_card_id).padStart(4, '0')}`}</h1>
          <p className="text-gray-500">Chassis No: {jobCard.chassis_no}</p>
        </div>
        <div className="ml-auto">
           <span className={`px-3 py-1 rounded-full text-sm font-medium ${jobCard.closed_at || jobCard.out_datetime ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {jobCard.closed_at || jobCard.out_datetime ? 'Closed' : 'Open'}
           </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="card">
            <h3 className="font-semibold text-lg mb-4">Details</h3>
            <div className="space-y-2 text-sm">
               <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">In Time</span>
                  <span className="font-medium">{(jobCard.opened_at || jobCard.in_datetime) ? formatDateTime(jobCard.opened_at || jobCard.in_datetime) : '-'}</span>
               </div>
               <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">Opening KM</span>
                  <span className="font-medium">{jobCard.opening_km || '-'}</span>
               </div>
               <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">Remarks</span>
                  <span className="font-medium">{jobCard.remarks || '-'}</span>
               </div>
            </div>
         </div>
         <div className="card flex flex-col items-center justify-center text-center">
            {(jobCard.closed_at || jobCard.out_datetime) ? (
                <div>
                   <h3 className="font-semibold text-lg text-green-700">Service Completed</h3>
                   <p className="text-sm text-gray-500 mt-1">Out Time: {formatDateTime(jobCard.closed_at || jobCard.out_datetime)}</p>
                </div>
            ) : (
                <div>
                   <h3 className="font-semibold text-lg text-yellow-700">Service In Progress</h3>
                   <p className="text-sm text-gray-500 mt-1">Spares can be added and consumed</p>
                </div>
            )}
         </div>
      </div>

      <div className="card">
         <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-lg">Spare Parts Consumption</h3>
            {!(jobCard.closed_at || jobCard.out_datetime) && (
                <button onClick={() => setShowAddSpare(true)} className="btn btn-primary flex items-center gap-2">
                   <Plus className="w-4 h-4" /> Add Spare
                </button>
            )}
         </div>

         {loadingSpares ? (
             <div className="text-center py-4 text-gray-500">Loading spares...</div>
         ) : spares.length === 0 ? (
             <div className="text-center py-8 text-gray-500">No spares consumed yet.</div>
         ) : (
             <div className="table-container">
               <table className="table">
                  <thead>
                     <tr>
                        <th>Part Code</th>
                        <th>Description</th>
                        <th>Tracking</th>
                        <th>Quantity</th>
                        <th>Status</th>
                        {!(jobCard.closed_at || jobCard.out_datetime) && <th className="text-right">Actions</th>}
                     </tr>
                  </thead>
                  <tbody>
                     {spares.map((spare: SpareConsumption) => (
                         <tr key={spare.consumption_id}>
                            <td className="font-mono text-sm">{spare.part_code_snapshot || 'N/A'}</td>
                            <td>{spare.description_snapshot || 'N/A'}</td>
                            <td>
                               <span className="px-2 py-0.5 text-xs bg-gray-100 rounded">
                                  {spare.tracking_mode}
                               </span>
                            </td>
                            <td>{spare.quantity}</td>
                            <td>
                               <span className={`px-2 py-1 text-xs rounded-full ${
                                  spare.status === 'CONSUMED' ? 'bg-green-100 text-green-800' :
                                  spare.status === 'REVERSED' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                               }`}>
                                  {spare.status}
                               </span>
                            </td>
                            {!(jobCard.closed_at || jobCard.out_datetime) && (
                                <td className="text-right">
                                   <div className="flex items-center justify-end gap-2">
                                      {spare.status === 'DRAFT' && (
                                          <>
                                             <button 
                                                onClick={() => consumeMutation.mutate(spare.consumption_id)}
                                                disabled={consumeMutation.isPending}
                                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                title="Confirm Consumption"
                                             >
                                                <CheckCircle className="w-4 h-4" />
                                             </button>
                                             <button 
                                                onClick={() => removeDraftMutation.mutate(spare.consumption_id)}
                                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                title="Remove Draft"
                                             >
                                                <Trash2 className="w-4 h-4" />
                                             </button>
                                          </>
                                      )}
                                      {spare.status === 'CONSUMED' && (
                                          <button 
                                             onClick={() => reverseMutation.mutate(spare.consumption_id)}
                                             disabled={reverseMutation.isPending}
                                             className="p-1 text-orange-600 hover:bg-orange-50 rounded"
                                             title="Reverse Consumption"
                                          >
                                             <Undo className="w-4 h-4" />
                                          </button>
                                      )}
                                   </div>
                                </td>
                            )}
                         </tr>
                     ))}
                  </tbody>
               </table>
             </div>
         )}
      </div>

      {showAddSpare && (
          <AddSpareModal 
             jobCardId={id} 
             onClose={() => setShowAddSpare(false)}
             onSuccess={() => {
                 setShowAddSpare(false)
                 queryClient.invalidateQueries({ queryKey: ['job-card-spares', id] })
             }}
          />
      )}
    </div>
  )
}
