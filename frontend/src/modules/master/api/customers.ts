import { api } from '@/lib/api'

export interface Customer {
    customer_id: number
    lead_reference_id?: number | null
    customer_type?: string | null
    name: string
    primary_phone: string
    email?: string | null
    created_at: string
    is_active: boolean
}

export interface CustomerDetailed extends Customer {
    guardian_name?: string | null
    address_line1?: string | null
    address_line2?: string | null
    city?: string | null
    state?: string | null
    pincode?: string | null
    aadhaar_no?: string | null
    pan_no?: string | null
    gstin?: string | null
    nominees: any[]
    vehicle_count: number
    last_service_date?: string | null
    last_warranty_date?: string | null
}

export interface CustomerCreate {
    customer_type?: string
    name: string
    guardian_name?: string
    primary_phone: string
    email?: string
    address_line1?: string
    address_line2?: string
    city?: string
    state?: string
    pincode?: string
    aadhaar_no?: string
    pan_no?: string
    gstin?: string
    lead_reference_id?: number
}

export interface CustomerUpdate {
    customer_type?: string
    name?: string
    guardian_name?: string
    primary_phone?: string
    email?: string
    address_line1?: string
    address_line2?: string
    city?: string
    state?: string
    pincode?: string
    aadhaar_no?: string
    pan_no?: string
    gstin?: string
}

export const customersApi = {
    create: async (data: CustomerCreate): Promise<Customer> => {
        return api.post('/master/customers', data)
    },

    list: async (): Promise<Customer[]> => {
        return api.get('/master/customers')
    },

    getById: async (id: number): Promise<Customer> => {
        return api.get(`/master/customers/${id}`)
    },

    getDetailed: async (id: number): Promise<CustomerDetailed> => {
        return api.get(`/master/customers/${id}`)
    },

    update: async (id: number, data: CustomerUpdate): Promise<Customer> => {
        return api.put(`/master/customers/${id}`, data)
    },

    delete: async (id: number, hardDelete?: boolean): Promise<void> => {
        return api.delete(`/master/customers/${id}`, { params: { hard_delete: hardDelete } })
    },
}
