import { api } from '../../../lib/api'

export interface SpareSaleItemPayload {
  spare_id: number;
  part_code: string;
  quantity: number;
  batch_id?: number;
  serial_id?: number;
  unit_selling_price: number;
}

export interface CreateSpareSalePayload {
  customer_id: number;
  items: SpareSaleItemPayload[];
}

export interface SpareSaleItemResponse {
  sale_item_id: number;
  sale_id: number;
  spare_id: number;
  part_code: string;
  spare_name: string;
  tracking_mode: string;
  batch_id?: number;
  serial_id?: number;
  quantity: number;
  unit_selling_price: number;
  discount: number;
  tax: number;
  line_total: number;
}

export interface SpareSaleResponse {
  sale_id: number;
  customer_id: number;
  remarks?: string;
  sale_date: string;
  status: string;
  subtotal: number;
  discount: number;
  tax: number;
  grand_total: number;
  invoice_number?: string;
  created_by_staff_id: number;
  items: SpareSaleItemResponse[];
}

export const spareSalesApi = {
  createDraftSale: async (payload: CreateSpareSalePayload) => {
    return api.post<SpareSaleResponse>('/sales/spares', payload);
  },
  
  confirmSale: async (saleId: number) => {
    return api.post<SpareSaleResponse>(`/sales/spares/${saleId}/confirm`);
  },
  
  cancelSale: async (saleId: number) => {
    return api.post<SpareSaleResponse>(`/sales/spares/${saleId}/cancel`);
  },
  
  getSales: async () => {
    return api.get<SpareSaleResponse[]>('/sales/spares');
  },
  
  getSale: async (saleId: number) => {
    return api.get<SpareSaleResponse>(`/sales/spares/${saleId}`);
  }
};
