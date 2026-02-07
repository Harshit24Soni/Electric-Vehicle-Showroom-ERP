import { api } from '@/lib/api'

export interface Lead {
    lead_id: number
    customer_id: number | null
    name: string
    phone: string
    email?: string
    vehicle_model_id: number
    lead_source: string
    lead_status_id: number
    owner_staff_id: number
    expected_purchase_date?: string | null
    remarks?: string | null
    created_at: string
}

export interface LeadCreate {
    name: string
    customer_id?: number
    phone: string
    email?: string
    vehicle_model_id: number
    lead_source: string
    lead_status_id?: number
    owner_staff_id: number
    expected_purchase_date?: string
    remarks?: string
}

export interface LeadUpdate {
    name?: string
    phone?: string
    email?: string
    vehicle_model_id?: number
    lead_source?: string
    lead_status?: string
    expected_purchase_date?: string
    remarks?: string
}

export const leadsApi = {
    create: async (data: LeadCreate): Promise<Lead> => {
        return api.post('/crm/leads', data)
    },

    list: async (statusFilter?: string, ownerId?: number): Promise<Lead[]> => {
        const params = new URLSearchParams()
        if (statusFilter) params.append('status_filter', statusFilter)
        if (ownerId) params.append('owner_id', ownerId.toString())

        const queryString = params.toString()
        const url = queryString ? `/crm/leads?${queryString}` : '/crm/leads'
        return api.get(url)
    },

    getById: async (id: number): Promise<Lead> => {
        return api.get(`/crm/leads/${id}`)
    },

    update: async (id: number, data: LeadUpdate): Promise<Lead> => {
        return api.put(`/crm/leads/${id}`, data)
    },

    delete: async (id: number): Promise<void> => {
        return api.delete(`/crm/leads/${id}`)
    },

    convert: async (id: number, useLeadData: boolean = true): Promise<any> => {
        return api.post(`/crm/leads/${id}/convert`, { use_lead_data: useLeadData })
    },

    getActivities: async (id: number): Promise<any[]> => {
        return api.get(`/crm/leads/${id}/activities`)
    },

    assign: async (id: number, newOwnerId: number): Promise<any> => {
        return api.post(`/crm/leads/${id}/assign`, { new_owner_id: newOwnerId })
    },
}
