import { api } from '@/lib/api'

export interface Nominee {
    nominee_id: number
    customer_id: number
    nominee_name: string
    nominee_dob: string
    relation: string
    is_primary: boolean
    is_active: boolean
    created_at: string
}

export interface NomineeCreate {
    nominee_name: string
    nominee_dob: string
    relation: string
    is_primary?: boolean
}

export interface NomineeUpdate {
    nominee_name?: string
    nominee_dob?: string
    relation?: string
    is_primary?: boolean
}

export const nomineesApi = {
    createForCustomer: async (customerId: number, data: NomineeCreate): Promise<Nominee> => {
        return api.post(`/master/customers/${customerId}/nominees`, data)
    },

    listForCustomer: async (customerId: number): Promise<Nominee[]> => {
        return api.get(`/master/customers/${customerId}/nominees`)
    },

    getById: async (customerId: number, nomineeId: number): Promise<Nominee> => {
        return api.get(`/master/customers/${customerId}/nominees/${nomineeId}`)
    },

    update: async (customerId: number, nomineeId: number, data: NomineeUpdate): Promise<Nominee> => {
        return api.put(`/master/customers/${customerId}/nominees/${nomineeId}`, data)
    },

    delete: async (customerId: number, nomineeId: number, hardDelete?: boolean): Promise<void> => {
        return api.delete(`/master/customers/${customerId}/nominees/${nomineeId}`, { params: { hard_delete: hardDelete } })
    },
}
