import { api } from '@/lib/api'

export interface InsuranceCompanyCreate {
  company_name: string
  contact_phone?: string
  contact_email?: string
}

export interface InsuranceCompany {
  insurance_company_id: number
  company_name: string
  contact_phone?: string
  contact_email?: string
  is_active: boolean
  created_at: string
}

export interface PolicyCreate {
  vehicle_sale_id: number
  chassis_no: string
  insurance_company_id: number
  policy_number: string
  policy_start_date: string
  policy_end_date: string
  premium_amount?: number
}

export interface Policy {
  policy_id: number
  vehicle_sale_id: number
  chassis_no: string
  insurance_company_id: number
  policy_number: string
  policy_start_date: string
  policy_end_date: string
  premium_amount?: number
  is_active: boolean
  created_at: string
}

export const insuranceApi = {
  createCompany: (data: InsuranceCompanyCreate) =>
    api.post<InsuranceCompany>('/insurance/companies', data),
  getCompanies: () => api.get<InsuranceCompany[]>('/insurance/companies'),
  createPolicy: (data: PolicyCreate) => api.post<Policy>('/insurance/policies', data),
  getPolicies: () => api.get<Policy[]>('/insurance/policies'),
  deleteCompany: (id: number, hardDelete?: boolean) =>
    api.delete(`/insurance/companies/${id}`, { params: { hard_delete: hardDelete } }),
  deletePolicy: (id: number, hardDelete?: boolean) =>
    api.delete(`/insurance/policies/${id}`, { params: { hard_delete: hardDelete } }),
}
