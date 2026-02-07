import { api } from '@/lib/api'

export interface VehicleSaleCreate {
  lead_id: number
  chassis_no: string
  booking_amount: number
  remarks?: string
}

export interface VehicleDeliveryConfirm {
  remarks?: string
}

export interface VehicleSale {
  vehicle_sale_id: number
  invoice_number: string
  invoice_date: string
  delivery_challan_no: string
  delivery_challan_date?: string
  customer_id: number
  chassis_no: string
  sale_price: number
  discount_amount: number
  is_financed: boolean
  sale_channel?: string
  created_at: string
}

export interface VehicleSaleListItem {
  sale_id: number
  lead_id: number
  chassis_no: string
  sale_status: string
  booking_amount: number
  created_at: string
  delivered_at?: string
}

export interface VehicleSaleDetail {
  sale_id: number
  lead_id: number
  chassis_no: string
  sale_status: string
  booking_amount: number
  created_at: string
  delivered_at?: string
  remarks?: string
  vehicle_available: boolean
}

export const salesApi = {
  createSale: (data: VehicleSaleCreate) => api.post<VehicleSaleListItem>('/sales/vehicle/book', data),
  getSales: (status?: string) => api.get<VehicleSaleListItem[]>('/sales/vehicle', { params: { status } }),
  getSaleDetail: (saleId: number) => api.get<VehicleSaleDetail>(`/sales/vehicle/${saleId}`),
  deliverVehicle: (saleId: number, data: VehicleDeliveryConfirm) => 
    api.post(`/sales/vehicle/${saleId}/deliver`, data),
}
