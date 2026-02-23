import { api } from '@/lib/api'

export interface SaleCreate {
  lead_id?: number | null
  customer_id: number
  chassis_no: string
  sale_date: string
  total_amount: number
  booking_amount?: number
  remarks?: string
  is_direct_sale?: boolean
}

export interface SaleCreatePayload {
  customer_id: number
  chassis_no: string
  sale_date: string
  base_price: number
  taxes: number
  total_amount: number
  payment_mode: string
  financier_name?: string
  down_payment_amount: number
  remarks?: string
  lead_id?: number | null
  is_direct_sale?: boolean
}

export interface ServiceSchedule {
  schedule_id: number
  service_number: number
  service_type: string
  due_date: string
  status: string
}

export interface SalePayment {
  sale_payment_id: number
  sale_id: number
  payment_type: string
  payment_mode: string
  amount: number
  reference_number?: string
  payment_date: string
  bank_name?: string
  remarks?: string
  created_by_staff_id: number
  created_at: string
}

export interface SaleDocument {
  sale_document_id: number
  sale_id: number
  document_type: string
  document_number: string
  generated_date: string
  generated_by_staff_id: number
  is_printed: boolean
  print_count: number
  last_printed_at?: string
}

export interface PortalTracking {
  portal_tracking_id: number
  sale_id: number
  insurance_status: string
  insurance_completed_date?: string
  insurance_policy_number?: string
  subsidy_status: string
  subsidy_completed_date?: string
  subsidy_reference?: string
  rto_status: string
  rto_completed_date?: string
  registration_number?: string
  celex_status: string
  celex_completed_date?: string
  number_plate_ordered_date?: string
  number_plate_fixed_date?: string
  form_20_generated: boolean
  helmet_invoice_generated: boolean
  all_portals_completed: boolean
}

export interface StageHistory {
  stage_history_id: number
  sale_id: number
  from_stage?: string
  to_stage: string
  changed_by_staff_id: number
  remarks?: string
  created_at: string
}

export interface SaleProgress {
  sale_id: number
  sale_stage?: string
  completion_percentage: number
  is_direct_sale?: boolean
  stage_history: StageHistory[]
  payments: SalePayment[]
  documents: SaleDocument[]
  portal_tracking?: PortalTracking
}

export interface Sale {
  sale_id: number
  lead_id?: number | null
  customer_id: number
  chassis_no: string
  sale_date: string
  total_amount: number
  sale_status: string
  invoice_number?: string
  challan_number?: string
  delivery_challan_number?: string
  is_invoice_generated: boolean
  is_receipt_generated: boolean
  is_challan_generated: boolean
  is_insurance_generated: boolean
  is_service_schedule_generated: boolean
  receipts?: any[]
  vehicle_available?: boolean
  booking_amount?: number
  remarks?: string
  created_at: string
  delivered_at?: string
  // New workflow fields
  sale_stage?: string
  stage_updated_at?: string
  is_direct_sale?: boolean

  customer?: {
    name: string
    guardian_name?: string
    primary_phone?: string
    address_line1?: string
    address_line2?: string
    city?: string
    state?: string
    pincode?: string
    district?: string
  }
  vehicle?: {
    chassis_no: string
    color: string
    motor_serial_no?: string
    battery_serial_no?: string
    controller_serial_no?: string
    charger_serial_no?: string
    model?: {
      model_name: string
      brand?: {
        brand_name: string
      }
    }
  }
  service_schedules?: ServiceSchedule[]
  delivery_checklist?: DeliveryChecklist
}

// Alias for compatibility
export type VehicleSaleCreate = SaleCreate

export interface DeliveryChecklist {
  checklist_id: number
  sale_id: number
  insurance_completed: boolean
  insurance_details?: string
  subsidy_completed: boolean
  subsidy_details?: string
  rto_completed: boolean
  rto_details?: string
  celex_plate_ordered: boolean
  celex_subsidy_completed: boolean
  celex_details?: string
  plate_fixation_date?: string
}

export const salesApi = {
  createSale: (data: SaleCreate) => api.post<Sale>('/sales', data),
  createSaleBilling: (data: SaleCreatePayload) => api.post<Sale>('/sales/billing', data),
  getSales: (status?: string) => api.get<Sale[]>(`/sales${status ? `?status=${status}` : ''}`),
  getSale: (id: number) => api.get<Sale>(`/sales/${id}`),
  addReceipt: (data: any) => api.post(`/sales/receipts`, data),
  generateInvoice: (id: number) => api.post<Sale>(`/sales/${id}/invoice`),
  generateChallan: (id: number) => api.post<Sale>(`/sales/${id}/challan`),
  generateServiceSchedule: (id: number) => api.post<Sale>(`/sales/${id}/service-schedule`),
  getDeliveryStatus: (id: number) => api.get<{ allowed: boolean; documents: any }>(`/sales/${id}/delivery-status`),
  deliverVehicle: (id: number, data: { remarks?: string }) =>
    api.post<Sale>(`/sales/${id}/deliver${data.remarks ? `?remarks=${encodeURIComponent(data.remarks)}` : ''}`),
  getSaleDetail: (id: number) => api.get<Sale>(`/sales/${id}`),
  updateChecklist: (id: number, data: Partial<DeliveryChecklist>) =>
    api.patch<DeliveryChecklist>(`/sales/${id}/checklist`, data),

  // ——— New workflow endpoints ———
  advanceStage: (id: number, toStage: string, remarks?: string) =>
    api.post<Sale>(`/sales/${id}/stage`, { to_stage: toStage, remarks }),
  addPayment: (id: number, data: {
    payment_type: string
    payment_mode: string
    amount: number
    reference_number?: string
    bank_name?: string
    remarks?: string
  }) => api.post<SalePayment>(`/sales/${id}/payments`, data),
  generateDocument: (id: number, documentType: string) =>
    api.post<SaleDocument>(`/sales/${id}/documents`, { document_type: documentType }),
  getPortalTracking: (id: number) => api.get<PortalTracking>(`/sales/${id}/portal`),
  updatePortalTracking: (id: number, data: Partial<PortalTracking>) =>
    api.patch<PortalTracking>(`/sales/${id}/portal`, data),
  getSaleProgress: (id: number) => api.get<SaleProgress>(`/sales/${id}/progress`),
  deleteSale: (id: number, hardDelete?: boolean) =>
    api.delete(`/sales/${id}`, { params: { hard_delete: hardDelete } }),
}
