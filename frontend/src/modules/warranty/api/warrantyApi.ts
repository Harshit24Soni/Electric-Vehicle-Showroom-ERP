import { api } from '@/lib/api'

export interface ClaimCreate {
  job_spare_id: number
  so_number: string
  remarks?: string
}

export interface ComponentSwapRequest {
  job_card_id: number
  chassis_no: string
  component_type: 'battery' | 'motor' | 'controller' | 'charger' | 'convertor'
  old_serial_no: string
  new_serial_no: string
  remarks?: string
}

export interface Claim {
  claim_id: number
  job_spare_id: number
  claim_status: 'RAISED' | 'APPROVED' | 'REJECTED'
  portal_ref_no?: string
  approval_date?: string
  so_number: string
  remarks?: string
  created_at: string
}

export interface InwardItemCreate {
  spare_id: number
  quantity: number
  unit_cost?: number
}

export interface InwardCreate {
  oem_invoice_no: string
  oem_invoice_date: string
  remarks?: string
  items: InwardItemCreate[]
}

export interface ShipmentItemCreate {
  claim_id: number
}

export interface ShipmentCreate {
  courier_name: string
  docket_no: string
  dispatch_date: string
  items: ShipmentItemCreate[]
}

export const warrantyApi = {
  createClaim: (data: ClaimCreate) => api.post<Claim>('/warranty/claims', data),
  swapComponent: (data: ComponentSwapRequest) => api.post<Claim>('/warranty/swap-component', data),
  getClaims: (skip?: number, limit?: number) =>
    api.get<Claim[]>('/warranty/claims', { params: { skip, limit } }),
  createInward: (data: InwardCreate) => api.post('/warranty/inwards', data),
  createShipment: (data: ShipmentCreate) => api.post('/warranty/shipments', data),
  deleteClaim: (id: number, hardDelete?: boolean) =>
    api.delete(`/warranty/claims/${id}`, { params: { hard_delete: hardDelete } }),
}
