import { api } from '@/lib/api'

export interface JobCardCreate {
  chassis_no: string
  is_free_service: boolean
  remarks?: string
}

export interface JobCard {
  job_card_id: number
  job_card_no: string
  chassis_no: string
  customer_id: number
  in_datetime: string
  out_datetime?: string
  opening_km: number
  next_service_date?: string
  next_service_km?: number
  remarks?: string
  created_at: string
}

export interface SpareConsumeCreate {
  spare_id: number
  quantity: number
  serial_id?: number
}

export const serviceApi = {
  createJobCard: (data: JobCardCreate) => api.post<JobCard>('/service/job-card', data),
  getJobCards: () => api.get<JobCard[]>('/service/job-cards'),
  consumeSpare: (jobCardId: number, data: SpareConsumeCreate) =>
    api.post(`/service/job-card/${jobCardId}/consume-spare`, data),
  closeJobCard: (jobCardId: number) => api.post(`/service/job-card/${jobCardId}/close`),
  deleteJobCard: (jobCardId: number, hardDelete?: boolean) =>
    api.delete(`/service/job-card/${jobCardId}`, { params: { hard_delete: hardDelete } }),
}
