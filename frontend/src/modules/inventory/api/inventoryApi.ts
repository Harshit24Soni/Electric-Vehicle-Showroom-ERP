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


// Master Inventory Sheet Contracts
export interface MasterSheetPaginatedResponse {
  items: MasterSheetItem[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface MasterSheetItem {
  spare_id: number
  part_code: string
  description: string
  category: string
  tracking_mode: string
  status: string
  is_deleted?: boolean
  deleted_at?: string | null
  hsn_code?: string | null
  gst_rate?: number | null
  ex_factory?: number | null
  dlp?: number | null
  mrp?: number | null
  ex_showroom?: number | null
  profit_margin_percent?: number | null
  stock_quantity: number
  compatible_models: string[]
  model_prices: Record<string, number | null>
  remarks?: string | null
   
  [key: string]: any
}

export interface MasterSheetItemCreate {
  part_code: string
  description: string
  category?: string
  tracking_mode?: string
  hsn_code?: string | null
  gst_rate?: number | null
  ex_factory?: number | null
  dlp?: number | null
  mrp?: number | null
  ex_showroom?: number | null
  profit_margin_percent?: number | null
  model_prices?: Record<string, number | null>
  compatible_models?: string[]
  remarks?: string | null
}

export interface MasterSheetItemUpdate {
  description?: string
  category?: string
  tracking_mode?: string
  status?: string
  hsn_code?: string | null
  gst_rate?: number | null
  ex_factory?: number | null
  dlp?: number | null
  mrp?: number | null
  ex_showroom?: number | null
  profit_margin_percent?: number | null
  model_prices?: Record<string, number | null>
  compatible_models?: string[]
  remarks?: string | null
}

export const inventoryApi = {
  getSpares: (includeDeleted = false) =>
    api.get<SpareMasterItem[]>('/inventory/spares', { params: { include_deleted: includeDeleted } }),
  createSpare: (data: SpareMasterCreate) => api.post<SpareMasterItem>('/inventory/spares', data),
  deactivateSpare: (spareId: number) => api.delete<SpareMasterItem>(`/inventory/spares/${spareId}`),
  restoreSpare: (spareId: number) => api.post<SpareMasterItem>(`/inventory/spares/${spareId}/restore`),
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
  getMovements: (page: number = 1, size: number = 50, spare_id?: number) => api.get<MovementHistoryListResponse>('/inventory/movements', { params: { page, size, spare_id } }),

  // Master Inventory Sheet API
  getMasterSheet: (params?: {
    search?: string
    category?: string
    model?: string
    page?: number
    page_size?: number
    include_inactive?: boolean
  }) =>
    api.get<MasterSheetPaginatedResponse | MasterSheetItem[]>('/inventory/master-sheet', { params }),
  getMasterSheetCategories: () =>
    api.get<string[]>('/inventory/master-sheet/categories'),
  getActiveVehicleModels: () =>
    api.get<string[]>('/inventory/master-sheet/models'),
  createMasterSheetItem: (payload: MasterSheetItemCreate) =>
    api.post<MasterSheetItem>('/inventory/master-sheet', payload),
  updateMasterSheetItem: (partCode: string, payload: MasterSheetItemUpdate) =>
    api.put<MasterSheetItem>(`/inventory/master-sheet/${encodeURIComponent(partCode)}`, payload),
  deleteMasterSheetItem: (partCode: string) =>
    api.delete<{ success: boolean; message: string; part_code: string }>(`/inventory/master-sheet/${encodeURIComponent(partCode)}`),
  restoreMasterSheetItem: (partCode: string) =>
    api.post<{ success: boolean; message: string; part_code: string }>(`/inventory/master-sheet/${encodeURIComponent(partCode)}/restore`),
  getItemAlterations: (partCode: string) =>
    api.get<SparePartAlteration[]>(`/inventory/master-sheet/${encodeURIComponent(partCode)}/alterations`),
  revertAlteration: (alterationId: number, payload: RevertAlterationPayload) =>
    api.post<RevertAlterationResponse>(`/inventory/master-sheet/alterations/${alterationId}/revert`, payload),
  getPartPurchaseHistory: (partCode: string) =>
    api.get<PartPurchaseSummary>(`/inventory/master-sheet/${encodeURIComponent(partCode)}/purchase-history`),

  // Worksheet Import (Mail Merge) & Dynamic Pricing Engine
  inspectDefaultWorkbook: () =>
    api.get<WorkbookInspectionResponse>('/inventory/worksheet-import/inspect-default'),
  uploadCustomWorkbook: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<WorkbookInspectionResponse>('/inventory/worksheet-import/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getSheetPreview: (req: SheetPreviewRequest) =>
    api.post<SheetPreviewResponse>('/inventory/worksheet-import/sheet-preview', req),
  executeWorksheetImport: (req: ExecuteImportRequest) =>
    api.post<ExecuteImportResponse>('/inventory/worksheet-import/execute-import', req),
  importEntireSheet: (req: ImportEntireSheetRequest) =>
    api.post<ExecuteImportResponse>('/inventory/worksheet-import/import-entire-sheet', req),
  applyPurchaseCost: (req: ApplyPurchaseCostRequest) =>
    api.post<ApplyPurchaseCostResponse>('/inventory/worksheet-import/apply-purchase-cost', req),
  getModelPricingMatrix: (params?: { vehicle_model_id?: number; search?: string }) =>
    api.get<ModelPricingRecord[]>('/inventory/worksheet-import/model-pricing-matrix', { params }),
}

// ---------------------------------------------------------------------------
// Worksheet Import (Mail Merge) Types
// ---------------------------------------------------------------------------

export interface SheetSummary {
  name: string
  row_count: number
  col_count: number
  has_super_header: boolean
  data_start_row: number
  sheet_type: 'MASTER_INVENTORY' | 'MODEL_PRICE_LIST' | 'PURCHASE_SHEET' | 'SALES_SHEET' | 'GENERAL'
  headers: string[]
   
  sample_rows: Record<string, any>[]
  auto_mapping: Record<string, string>
  model_columns: { model_name: string; field_type: string; column_name: string }[]
}

export interface WorkbookInspectionResponse {
  file_name: string
  file_size: number
  file_token: string
  sheet_count: number
  sheets: SheetSummary[]
}

export interface SheetPreviewRequest {
  file_token?: string
  sheet_name: string
  field_mapping?: Record<string, string>
  page?: number
  limit?: number
  search?: string
  filter_status?: 'ALL' | 'READY' | 'WARNING' | 'ERROR'
}

export interface SheetCounts {
  total: number
  ready: number
  warning: number
  error: number
  filtered: number
}

export interface ParsedPreviewRow {
  row_id: number
  part_code: string
  description: string
  category: string
  tracking_mode: string
  hsn_code?: string | null
  gst_rate?: number | null
  dlp?: number | null
  mrp?: number | null
  ex_factory?: number | null
  ex_showroom?: number | null
  dealer_margin_percent?: number | null
  stock_quantity?: number | null
  model_prices: Record<string, number | null>
  status: 'READY' | 'WARNING' | 'ERROR'
  validation_messages: string[]
  selected?: boolean
}

export interface SheetPreviewResponse {
  sheet_name: string
  total_rows: number
  page: number
  limit: number
  headers: string[]
  applied_mapping: Record<string, string>
  model_columns: { model_name: string; field_type: string; column_name: string }[]
  counts: SheetCounts
  rows: ParsedPreviewRow[]
}

export interface ImportRowPayload {
  part_code: string
  description: string
  category?: string
  tracking_mode?: string
  hsn_code?: string | null
  gst_rate?: number | null
  ex_factory?: number | null
  dlp?: number | null
  ex_showroom?: number | null
  dealer_margin_percent?: number | null
  mrp?: number | null
  stock_quantity?: number | null
  model_prices?: Record<string, number | null>
  remarks?: string | null
}

export interface ExecuteImportRequest {
  sheet_name: string
  target_model_name?: string | null
  update_existing: boolean
  update_stock: boolean
  default_category?: string
  rows: ImportRowPayload[]
}

export interface ExecuteImportResponse {
  success: boolean
  total_processed: number
  created_count: number
  updated_count: number
  skipped_count: number
  errors: string[]
  message: string
}

export interface ImportEntireSheetRequest {
  file_token?: string
  sheet_name: string
  field_mapping?: Record<string, string>
  target_model_name?: string | null
  default_category?: string
  update_existing?: boolean
  update_stock?: boolean
}

export interface ApplyPurchaseCostRequest {
  spare_id: number
  new_cost: number
  source_reference?: string
}

export interface ApplyPurchaseCostResponse {
  success: boolean
  data: {
    spare_id: number
    part_code: string
    spare_name: string
    new_cost: number
    profit_margin_percent: number
    new_ex_showroom: number
    new_customer_mrp: number
    updated_models: {
      model_name: string
      new_price: number
      margin_percent: number
    }[]
  }
  message: string
}

export interface ModelPricingRecord {
  compatibility_id: number
  spare_id: number
  part_code?: string
  part_name: string
  category?: string
  vehicle_model_id: number
  model_name: string
  ex_factory_price?: number | null
  dlp?: number | null
  ex_showroom_price?: number | null
  customer_mrp?: number | null
  gst_rate: number
  profit_margin_percent?: number | null
  stock_quantity: number
}

export interface SparePartAlteration {
  alteration_id: number
  spare_id: number
  part_code: string
  timestamp: string
  action_type: 'IMPORT_PDF' | 'IMPORT_EXCEL' | 'MANUAL_EDIT' | 'COST_INWARD' | 'REVERSION' | string
  source_reference?: string | null
  altered_by_id?: number | null
  altered_by_name?: string | null
  changes: Record<string, { old: any; new: any }>
  snapshot_before: Record<string, any>
  snapshot_after: Record<string, any>
  is_reverted: boolean
  reverted_at?: string | null
  reverted_by_id?: number | null
}

export interface RevertAlterationPayload {
  fields_to_revert?: string[]
}

export interface RevertAlterationResponse {
  success: boolean
  alteration_id: number
  reverted_fields: string[]
  reversion_alteration_id?: number | null
  message: string
}

export interface PartPurchaseBillRecord {
  purchase_item_id?: number | null
  spare_purchase_id?: number | null
  bill_number: string
  bill_date?: string | null
  vendor_name?: string | null
  vendor_id?: number | null
  vendor_gstin?: string | null
  quantity: number
  unit_rate: number
  gst_percentage?: number | null
  tax_amount?: number | null
  total_amount: number
  landed_cost_unit?: number | null
  ex_factory_unit?: number | null
  status: string
  verification_status?: string | null
  source_type: string
  source_label?: string | null
  is_po_bill: boolean
  docket_reference?: string | null
  remarks?: string | null
}

export interface PartPurchaseSummary {
  spare_id: number
  part_code: string
  part_name: string
  category?: string | null
  hsn_code?: string | null
  tracking_mode: string
  current_stock: number
  current_cost?: number | null
  current_dlp?: number | null
  current_mrp?: number | null
  current_margin_percent?: number | null
  total_bills_count: number
  direct_entries_count: number
  total_records_count: number
  total_quantity_bought: number
  total_spend: number
  last_purchase_rate?: number | null
  last_purchase_date?: string | null
  last_bill_number?: string | null
  last_vendor_name?: string | null
  last_rate_source?: string | null
  lowest_purchase_rate?: number | null
  highest_purchase_rate?: number | null
  weighted_average_cost?: number | null
  bills: PartPurchaseBillRecord[]
}



