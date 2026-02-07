import { api } from '@/lib/api'

export interface Enquiry {
    enquiry_id: number
    lead_id: number
    enquiry_source: string
    enquiry_status: string
    owner_staff_id: number
    last_followup_date?: string | null
    last_message_date?: string | null
    remarks?: string | null
    created_at: string
}

export interface EnquiryCreate {
    lead_id: number
    enquiry_source: string
    owner_staff_id: number
    remarks?: string
}

export interface EnquiryStats {
    active_enquiries: number
    converted_enquiries: number
    lost_enquiries: number
    total_enquiries: number
}

export const enquiriesApi = {
    create: async (data: EnquiryCreate): Promise<Enquiry> => {
        return api.post('/crm/enquiries', data)
    },

    list: async (statusFilter?: string): Promise<Enquiry[]> => {
        const params = new URLSearchParams()
        if (statusFilter) params.append('status_filter', statusFilter)

        const queryString = params.toString()
        const url = queryString ? `/crm/enquiries?${queryString}` : '/crm/enquiries'
        return api.get(url)
    },

    getById: async (id: number): Promise<Enquiry> => {
        return api.get(`/crm/enquiries/${id}`)
    },

    update: async (id: number, data: any): Promise<Enquiry> => {
        return api.put(`/crm/enquiries/${id}`, data)
    },

    getStats: async (): Promise<EnquiryStats> => {
        return api.get('/crm/enquiries/stats/summary')
    },
}
