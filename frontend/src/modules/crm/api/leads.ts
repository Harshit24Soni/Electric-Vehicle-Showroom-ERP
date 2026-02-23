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
    assigned_staff_id?: number
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
    owner_staff_id?: number
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

export interface LeadConvertPayload {
    name: string
    phone: string
    email?: string
    customer_type: string
    address_line1: string
    city: string
    state: string
    pincode: string
    aadhaar_no: string
    pan_no: string
    nominee: {
        nominee_name: string
        nominee_dob: string
        relation: string
    }
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

    delete: async (id: number, hardDelete?: boolean): Promise<void> => {
        return api.delete(`/crm/leads/${id}`, { params: { hard_delete: hardDelete } })
    },

    convert: async (id: number, payload: LeadConvertPayload): Promise<any> => {
        return api.post(`/crm/leads/${id}/convert`, payload)
    },

    getActivities: async (id: number): Promise<any[]> => {
        return api.get(`/crm/leads/${id}/activities`)
    },

    assign: async (id: number, newOwnerId: number): Promise<any> => {
        return api.post(`/crm/leads/${id}/assign`, { new_owner_id: newOwnerId })
    },

    getFollowups: async (type: string = 'ALL'): Promise<any> => {
        return api.get(`/crm/followups/dashboard?followup_type=${type}`)
    },

    getPendingFollowups: async (): Promise<any[]> => {
        return api.get('/crm/followups/pending')
    },

    // Test ride methods
    getTestRides: async (leadId: number): Promise<any[]> => {
        return api.get(`/crm/leads/${leadId}/test-rides`)
    },

    addTestRide: async (leadId: number, data: {
        vehicle_model_id: number
        test_ride_date: string
        customer_feedback?: string
    }): Promise<any> => {
        return api.post(`/crm/leads/${leadId}/test-rides`, data)
    },

    // Lead followup with mandatory remarks
    addLeadFollowup: async (leadId: number, data: {
        remarks: string
        outcome_status: string
        next_followup_date?: string
    }): Promise<any> => {
        return api.post(`/crm/leads/${leadId}/followups`, data)
    },
}
