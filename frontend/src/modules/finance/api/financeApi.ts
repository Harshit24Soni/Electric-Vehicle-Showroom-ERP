import { api } from '@/lib/api'

export interface FinanceCreate {
  sale_id: number
  financer_name: string
  financer_contact?: string
  loan_amount: number
  down_payment: number
  remarks?: string
}

export interface FinanceStatusUpdate {
  finance_status: string
  reference_number?: string
  remarks?: string
}

export interface FinanceResponse {
  finance_id: number
  sale_id: number
  financer_name: string
  loan_amount: number
  down_payment: number
  finance_status: string
  reference_number?: string
}

export const financeApi = {
  createFinance: (data: FinanceCreate) => api.post<FinanceResponse>('/finance/', data),
  getFinances: () => api.get<FinanceResponse[]>('/finance/'),
  updateFinanceStatus: (financeId: number, data: FinanceStatusUpdate) =>
    api.put(`/finance/${financeId}/status`, data),
  deleteFinance: (financeId: number, hardDelete?: boolean) =>
    api.delete(`/finance/${financeId}`, { params: { hard_delete: hardDelete } }),
}
