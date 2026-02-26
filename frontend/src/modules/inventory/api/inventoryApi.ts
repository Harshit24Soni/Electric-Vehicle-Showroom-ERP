import { api } from '@/lib/api'

export interface SpareStock {
  spare_id: number
  available_quantity: number
}

export interface SpareMasterItem {
  spare_id: number
  spare_code: string
  spare_name: string
  category?: string
  is_serialized: boolean
  is_temporary: boolean
  is_verified: boolean
  is_active: boolean
  is_deleted: boolean
}

export interface SpareMovementCreate {
  spare_id: number
  quantity: number
  movement_type: 'PURCHASE' | 'SALE' | 'SERVICE_CONSUMPTION' | 'WARRANTY_INWARD' | 'WARRANTY_OUTWARD' | 'ADJUSTMENT'
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
  getSpares: (includeDeleted = false) =>
    api.get<SpareMasterItem[]>('/inventory/spares', { params: { include_deleted: includeDeleted } }),
  getSpareStock: (spareId: number) => api.get<SpareStock>(`/inventory/spare/${spareId}/stock`),
  createSpareMovement: (data: SpareMovementCreate) => api.post<SpareMovement>('/inventory/spare/movement', data),
  createVehicleMovement: (data: VehicleMovementCreate) => api.post('/inventory/vehicle/movement', data),
  checkVehicleAvailability: (chassisNo: string) => api.get(`/inventory/vehicle/${chassisNo}/availability`),
}
