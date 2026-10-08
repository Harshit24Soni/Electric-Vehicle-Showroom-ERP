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
  tracking_mode: string
  batch_id?: number
  serial_id?: number
}

export interface SpareConsumption {
  consumption_id: number
  job_card_id: number
  spare_id: number
  quantity: number
  status: string
  tracking_mode: string
  batch_id?: number
  serial_id?: number
  part_code_snapshot?: string
  description_snapshot?: string
  unit_cost_snapshot?: number
  stock_movement_id?: number
  created_at: string
}

export const serviceApi = {
  createJobCard: (data: JobCardCreate) => api.post<JobCard>('/service/job-card', data),
  getJobCards: () => api.get<JobCard[]>('/service/job-cards'),
  getJobCardById: (jobCardId: number) => api.get<JobCard>(`/service/job-cards/${jobCardId}`),
  closeJobCard: (jobCardId: number) => api.post(`/service/job-card/${jobCardId}/close`),
  deleteJobCard: (jobCardId: number, hardDelete?: boolean) =>
    api.delete(`/service/job-card/${jobCardId}`, { params: { hard_delete: hardDelete } }),

  // Spare consumption
  listSpares: (jobCardId: number) =>
    api.get<SpareConsumption[]>(`/service/job-cards/${jobCardId}/spares`),
  draftSpare: (jobCardId: number, data: SpareConsumeCreate) =>
    api.post<SpareConsumption>(`/service/job-cards/${jobCardId}/spares`, data),
  consumeSpare: (jobCardId: number, consumptionId: number) =>
    api.post<SpareConsumption>(`/service/job-cards/${jobCardId}/spares/${consumptionId}/consume`),
  reverseSpare: (jobCardId: number, consumptionId: number) =>
    api.post<SpareConsumption>(`/service/job-cards/${jobCardId}/spares/${consumptionId}/reverse`),
  removeDraftSpare: (jobCardId: number, consumptionId: number) =>
    api.delete(`/service/job-cards/${jobCardId}/spares/${consumptionId}`),
}
