import { api } from '@/lib/api'

// ==================== TYPES ====================

export interface PaymentMode {
    payment_mode_id: number
    mode_name: string
    description: string | null
    is_active: boolean
    is_deleted?: boolean
    created_at: string
}

export interface ExpenseCategory {
    expense_category_id: number
    category_name: string
    description: string | null
    is_active: boolean
    is_deleted?: boolean
    created_at: string
}

export interface JobCardCategory {
    job_card_category_id: number
    category_name: string
    description: string | null
    is_active: boolean
    is_deleted?: boolean
    created_at: string
}

export interface InsuranceCompany {
    insurance_company_id: number
    company_name: string
    contact_person: string | null
    contact_number: string | null
    email: string | null
    address: string | null
    gstin: string | null
    is_active: boolean
    is_deleted?: boolean
    created_at: string
}

export interface Bank {
    bank_id: number
    bank_name: string
    branch: string | null
    ifsc_code: string
    address: string | null
    contact_number: string | null
    is_active: boolean
    is_deleted?: boolean
    created_at: string
}

export interface DocumentType {
    document_type_id: number
    type_name: string
    description: string | null
    applicable_to: string | null
    is_mandatory: boolean
    is_active: boolean
    is_deleted?: boolean
    created_at: string
}

export interface Brand {
    brand_id: number
    brand_name: string
    is_deleted?: boolean
    is_active?: boolean
}

export interface StaffSummary {
    active_count: number
    deleted_count: number
    total_count: number
}

// ==================== API CALLS ====================

export const setupApi = {
    // Brands
    listBrands: () => api.get<Brand[]>('/setup/brands'),
    createBrand: (data: { brand_name: string }) => api.post<Brand>('/setup/brands', data),
    updateBrand: (id: number, data: Partial<Brand>) => api.put<Brand>(`/setup/brands/${id}`, data),
    deleteBrand: (id: number) => api.delete(`/setup/brands/${id}`),
    restoreBrand: (id: number) => api.post(`/setup/brands/${id}/restore`),

    // Payment Modes
    listPaymentModes: () => api.get<PaymentMode[]>('/setup/payment-modes'),
    createPaymentMode: (data: { mode_name: string; description?: string }) =>
        api.post<PaymentMode>('/setup/payment-modes', data),
    updatePaymentMode: (id: number, data: Partial<PaymentMode>) =>
        api.put<PaymentMode>(`/setup/payment-modes/${id}`, data),
    deletePaymentMode: (id: number) => api.delete(`/setup/payment-modes/${id}`),
    restorePaymentMode: (id: number) => api.post(`/setup/payment-modes/${id}/restore`),

    // Expense Categories
    listExpenseCategories: () => api.get<ExpenseCategory[]>('/setup/expense-categories'),
    createExpenseCategory: (data: { category_name: string; description?: string }) =>
        api.post<ExpenseCategory>('/setup/expense-categories', data),
    updateExpenseCategory: (id: number, data: Partial<ExpenseCategory>) =>
        api.put<ExpenseCategory>(`/setup/expense-categories/${id}`, data),
    deleteExpenseCategory: (id: number) => api.delete(`/setup/expense-categories/${id}`),
    restoreExpenseCategory: (id: number) => api.post(`/setup/expense-categories/${id}/restore`),

    // Job Card Categories
    listJobCardCategories: () => api.get<JobCardCategory[]>('/setup/job-card-categories'),
    createJobCardCategory: (data: { category_name: string; description?: string }) =>
        api.post<JobCardCategory>('/setup/job-card-categories', data),
    updateJobCardCategory: (id: number, data: Partial<JobCardCategory>) =>
        api.put<JobCardCategory>(`/setup/job-card-categories/${id}`, data),
    deleteJobCardCategory: (id: number) => api.delete(`/setup/job-card-categories/${id}`),
    restoreJobCardCategory: (id: number) => api.post(`/setup/job-card-categories/${id}/restore`),

    // Insurance Companies
    listInsuranceCompanies: () => api.get<InsuranceCompany[]>('/setup/insurance-companies'),
    createInsuranceCompany: (data: Partial<InsuranceCompany>) =>
        api.post<InsuranceCompany>('/setup/insurance-companies', data),
    updateInsuranceCompany: (id: number, data: Partial<InsuranceCompany>) =>
        api.put<InsuranceCompany>(`/setup/insurance-companies/${id}`, data),
    deleteInsuranceCompany: (id: number) => api.delete(`/setup/insurance-companies/${id}`),
    restoreInsuranceCompany: (id: number) => api.post(`/setup/insurance-companies/${id}/restore`),

    // Banks
    listBanks: () => api.get<Bank[]>('/setup/banks'),
    createBank: (data: Partial<Bank>) => api.post<Bank>('/setup/banks', data),
    updateBank: (id: number, data: Partial<Bank>) => api.put<Bank>(`/setup/banks/${id}`, data),
    deleteBank: (id: number) => api.delete(`/setup/banks/${id}`),
    restoreBank: (id: number) => api.post(`/setup/banks/${id}/restore`),

    // Document Types
    listDocumentTypes: () => api.get<DocumentType[]>('/setup/document-types'),
    createDocumentType: (data: Partial<DocumentType>) =>
        api.post<DocumentType>('/setup/document-types', data),
    updateDocumentType: (id: number, data: Partial<DocumentType>) =>
        api.put<DocumentType>(`/setup/document-types/${id}`, data),
    deleteDocumentType: (id: number) => api.delete(`/setup/document-types/${id}`),
    restoreDocumentType: (id: number) => api.post(`/setup/document-types/${id}/restore`),

    // Staff Summary
    getStaffSummary: () => api.get<StaffSummary>('/setup/staff-summary'),
}
