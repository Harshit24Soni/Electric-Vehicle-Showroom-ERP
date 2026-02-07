import { api } from '@/lib/api'

export interface SpareStock {
  spare_id: number
  available_quantity: number
}

export interface SpareMaster {
  spare_id: number
  part_code: string
  description: string
  dealer_landing_price: number
  dealer_margin_percent: number
  gst_percentage: number
  is_active: boolean
  created_at: string
}

export interface SpareMovementCreate {
  spare_id: number
  quantity: number
  movement_type: 'PURCHASE' | 'SALE' | 'SERVICE_PAID' | 'SERVICE_INSURANCE' | 'ADJUSTMENT'
  serial_id?: number
  reference_type?: string
  reference_id?: number
  remarks?: string
}

export interface SpareMovement {
  movement_id: number
  spare_id: number
  serial_id?: number
  quantity: number
  movement_type: string
  reference_type?: string
  reference_id?: number
  movement_datetime: string
  remarks?: string
}

export interface VehicleMovementCreate {
  chassis_no: string
  movement_type: string
  reference_type?: string
  reference_id?: number
  from_location?: string
  to_location?: string
  remarks?: string
}

export const inventoryApi = {
  getSpareStock: (spareId: number) => api.get<SpareStock>(`/inventory/spare/${spareId}/stock`),
  createSpareMovement: (data: SpareMovementCreate) => api.post<SpareMovement>('/inventory/spare/movement', data),
  createVehicleMovement: (data: VehicleMovementCreate) => api.post('/inventory/vehicle/movement', data),
  checkVehicleAvailability: (chassisNo: string) => api.get(`/inventory/vehicle/${chassisNo}/availability`),
}
