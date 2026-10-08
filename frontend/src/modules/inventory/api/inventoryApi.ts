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
  tracking_mode?: string
  is_serialized: boolean
  is_temporary: boolean
  is_verified: boolean
  is_active: boolean
  is_deleted: boolean
}

export interface SpareMasterCreate {
  spare_name: string
  initial_code: string
  category?: string
  tracking_mode: string
  remarks?: string
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

// Phase 4 Backend Contracts
export interface InventoryDashboardStats {
  total_active_spares: number
  total_stock_value: number
  total_movements_last_30d: number
}

export interface StockLocationStat {
  location: string
  total_quantity: number
  total_value: number
}

export interface StockItem {
  spare_id: number
  spare_name: string
  part_code?: string
  tracking_mode: string
  location: string
  quantity: number
  unit_cost: number
  total_value: number
}

export interface StockListResponse {
  items: StockItem[]
}

export interface BatchItem {
  batch_id: number
  spare_id: number
  spare_name: string
  part_code?: string
  batch_number: string
  location: string
  quantity: number
  unit_cost: number
  total_value: number
  expiry_date?: string
}

export interface BatchListResponse {
  items: BatchItem[]
}

export interface SerialItem {
  serial_id: number
  spare_id: number
  spare_name: string
  part_code?: string
  serial_number: string
  location: string
  status: string
  unit_cost: number
}

export interface SerialListResponse {
  items: SerialItem[]
}

export interface MovementHistoryItem {
  movement_id: number
  movement_datetime: string
  movement_type: string
  spare_id: number
  spare_name: string
  part_code?: string
  quantity: number
  from_location?: string
  to_location?: string
  batch_number?: string
  serial_number?: string
  unit_cost?: number
  total_cost?: number
  reference_type?: string
  reference_id?: string
  remarks?: string
}

export interface MovementHistoryListResponse {
  items: MovementHistoryItem[]
  total: number
  page: number
  size: number
}


export const inventoryApi = {
  getSpares: (includeDeleted = false) =>
    api.get<SpareMasterItem[]>('/inventory/spares', { params: { include_deleted: includeDeleted } }),
  createSpare: (data: SpareMasterCreate) => api.post<SpareMasterItem>('/inventory/spares', data),
  getSpareStock: (spareId: number) => api.get<SpareStock>(`/inventory/spare/${spareId}/stock`),
  createSpareMovement: (data: SpareMovementCreate) => api.post<SpareMovement>('/inventory/spare/movement', data),
  createVehicleMovement: (data: VehicleMovementCreate) => api.post('/inventory/vehicle/movement', data),
  checkVehicleAvailability: (chassisNo: string) => api.get(`/inventory/vehicle/${chassisNo}/availability`),
  
  // Phase 4
  getDashboardStats: () => api.get<InventoryDashboardStats>('/inventory/dashboard/stats'),
  getStockByLocation: (location?: string) => api.get<StockLocationStat[]>('/inventory/stock/locations', { params: { location } }),
  getStock: (spare_id?: number, location?: string) => api.get<StockListResponse>('/inventory/stock', { params: { spare_id, location } }),
  getBatches: (spare_id?: number, location?: string) => api.get<BatchListResponse>('/inventory/batches', { params: { spare_id, location } }),
  getSerials: (spare_id?: number, location?: string, serial_number?: string) => api.get<SerialListResponse>('/inventory/serials', { params: { spare_id, location, serial_number } }),
  getMovements: (page: number = 1, size: number = 50, spare_id?: number) => api.get<MovementHistoryListResponse>('/inventory/movements', { params: { page, size, spare_id } })
}
