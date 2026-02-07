import { api } from '@/lib/api'

export interface InvoiceCreate {
  sale_id: number
  taxable_amount: number
  gst_rate: number
  remarks?: string
}

export interface InvoiceUpdate {
  taxable_amount: number
  gst_rate: number
  remarks?: string
}

export interface Invoice {
  invoice_id: number
  invoice_number: string
  invoice_date: string
  invoice_type: 'SERVICE' | 'SPARE' | 'INSURANCE'
  invoice_status: 'DRAFT' | 'FINALIZED' | 'CANCELLED'
  customer_id: number
  job_card_id?: number
  total_amount: number
  finalized_at?: string
  remarks?: string
  created_at: string
}

export interface InvoiceResponse {
  invoice_id: number
  sale_id: number
  invoice_number: string
  invoice_date?: string
  taxable_amount: number
  gst_rate: number
  gst_amount: number
  total_amount: number
  is_final: boolean
  revision_no: number
}

export const billingApi = {
  createInvoice: (data: InvoiceCreate) => api.post<InvoiceResponse>('/billing/invoice', data),
  updateInvoice: (invoiceId: number, data: InvoiceUpdate) =>
    api.put(`/billing/invoice/${invoiceId}`, data),
  finalizeInvoice: (invoiceId: number) => api.post(`/billing/invoice/${invoiceId}/finalize`),
}
