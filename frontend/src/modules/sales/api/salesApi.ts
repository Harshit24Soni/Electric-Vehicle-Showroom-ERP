import { api } from '@/lib/api'

export interface SaleCreate {
  lead_id: number
  customer_id: number
  chassis_no: string
  sale_date: string
  total_amount: number
  booking_amount?: number
  remarks?: string
}

export interface ServiceSchedule {
  schedule_id: number
  service_number: number
  service_type: string
  due_date: string
  status: string
}

export interface Sale {
  sale_id: number
  lead_id: number
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

  customer?: {
    name: string
    guardian_name?: string
    primary_phone?: string
    address_line1?: string
    address_line2?: string
    city?: string
    state?: string
    pincode?: string
    district?: string // If backend sends district, ok. Model has city/state. 
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
  getSales: (status?: string) => api.get<Sale[]>(`/sales${status ? `?status=${status}` : ''}`),
  getSale: (id: number) => api.get<Sale>(`/sales/${id}`),
  addReceipt: (data: any) => api.post(`/sales/receipts`, data),
  generateInvoice: (id: number) => api.post<Sale>(`/sales/${id}/invoice`),
  generateChallan: (id: number) => api.post<Sale>(`/sales/${id}/challan`),
  generateServiceSchedule: (id: number) => api.post<Sale>(`/sales/${id}/service-schedule`),
  getDeliveryStatus: (id: number) => api.get<{ allowed: boolean, documents: any }>(`/sales/${id}/delivery-status`),
  deliverVehicle: (id: number, data: { remarks?: string }) => api.post<Sale>(`/sales/${id}/deliver${data.remarks ? `?remarks=${encodeURIComponent(data.remarks)}` : ''}`),
  getSaleDetail: (id: number) => api.get<Sale>(`/sales/${id}`),
  updateChecklist: (id: number, data: Partial<DeliveryChecklist>) => api.patch<DeliveryChecklist>(`/sales/${id}/checklist`, data),
}
