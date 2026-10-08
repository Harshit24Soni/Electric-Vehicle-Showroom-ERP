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

export const spareSalesApi = {
  createDraftSale: async (payload: CreateSpareSalePayload) => {
    return api.post<any>('/sales/spares', payload);
  },
  
  confirmSale: async (saleId: number) => {
    return api.post<any>(`/sales/spares/${saleId}/confirm`);
  },
  
  cancelSale: async (saleId: number) => {
    return api.post<any>(`/sales/spares/${saleId}/cancel`);
  },
  
  // You might want an endpoint to list sales.
  // We didn't explicitly implement `GET /sales/spares` in the backend, but if it exists we can call it.
  getSales: async () => {
    return api.get<any>('/sales/spares');
  },
  
  getSale: async (saleId: number) => {
    return api.get<any>(`/sales/spares/${saleId}`);
  }
};
