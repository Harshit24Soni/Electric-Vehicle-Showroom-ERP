import { api } from '../../../lib/api'

// Types
export interface SparePurchaseItem {
    spare_id: number
    quantity: number
    unit_cost: number
    gst_percentage?: number
}

export interface SparePurchaseCreate {
    vendor_id: number
    vendor_invoice_no?: string
    vendor_invoice_date?: string
    purchase_date: string
    remarks?: string
    include_in_accounting: boolean
    items: SparePurchaseItem[]
}

export interface VehicleDetail {
    chassis_no: string
    vehicle_model_id: number
    motor_serial_no?: string
    battery_serial_no?: string
    charger_serial_no?: string
    controller_serial_no?: string
    convertor_serial_no?: string
    color?: string
    cost_price?: number
}

export interface VehiclePurchaseCreate {
    vendor_id: number
    invoice_number: string
    invoice_date: string
    invoice_amount?: number
    include_in_accounting: boolean
    details: VehicleDetail[]
}

export interface TemporaryItemCreate {
    part_code: string
    description: string
    category?: string
    dealer_landing_price?: number
    dealer_margin_percent?: number
    gst_percentage?: number
    remarks?: string
}

export interface TemporaryItem {
    spare_id: number
    spare_code: string
    spare_name: string
    category?: string
    is_verified: boolean
    is_temporary: boolean
}

// API
export const procurementApi = {
    // Spares
    createSparePurchase: async (data: SparePurchaseCreate) => {
        const response = await api.post('/procurement/purchases/spares', data)
        return response
    },

    // Vehicles
    createVehiclePurchase: async (data: VehiclePurchaseCreate) => {
        const response = await api.post('/procurement/purchases/vehicles', data)
        return response
    },

    // Temporary Items
    createTemporaryItem: async (data: TemporaryItemCreate) => {
        const response = await api.post('/procurement/temporary-items', data)
        return response
    },

    getTemporaryItems: async () => {
        const response = await api.get<TemporaryItem[]>('/procurement/temporary-items')
        return response
    },

    approveTemporaryItem: async (id: number) => {
        const response = await api.put(`/procurement/temporary-items/${id}/approve`)
        return response
    },

    getSparePurchases: async () => {
        const response = await api.get<any[]>('/procurement/purchases/spares')
        return response
    },

    getVehiclePurchases: async () => {
        const response = await api.get<any[]>('/procurement/purchases/vehicles')
        return response
    },

    deleteSparePurchase: async (id: number, hardDelete?: boolean) => {
        const response = await api.delete(`/procurement/purchases/spares/${id}`, { params: { hard_delete: hardDelete } })
        return response
    },

    deleteVehiclePurchase: async (id: number, hardDelete?: boolean) => {
        const response = await api.delete(`/procurement/purchases/vehicles/${id}`, { params: { hard_delete: hardDelete } })
        return response
    },

    // Vehicle Intake (OEM)
    intakeVehicles: async (data: VehicleIntakePayload) => {
        return api.post('/procurement/purchases/vehicles/intake', data)
    },
}

// ==================== Vehicle Intake Types ====================

export interface VehicleIntakeItem {
    chassis_no: string
    motor_no?: string
    vehicle_model_id: number
    color: string
    battery_serial_no?: string
    purchase_price: number
}

export interface VehicleIntakePayload {
    oem_invoice_no: string
    oem_invoice_date: string
    vendor_id: number
    vehicles: VehicleIntakeItem[]
}
