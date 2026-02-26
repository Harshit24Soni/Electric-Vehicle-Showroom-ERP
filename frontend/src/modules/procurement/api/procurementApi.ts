import { api } from '../../../lib/api'

// ==================== Types ====================

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

export interface SparePurchaseItemResponse {
    purchase_item_id: number
    spare_id: number
    spare_name?: string
    spare_code?: string
    quantity: number
    unit_cost: number
    gst_percentage: number
    total_cost: number
}

export interface SparePurchaseResponse {
    spare_purchase_id: number
    vendor_id: number
    vendor_name?: string
    vendor_invoice_no?: string
    vendor_invoice_date?: string
    purchase_date: string
    remarks?: string
    is_deleted: boolean
    created_at: string
    items: SparePurchaseItemResponse[]
}

export interface VehiclePurchaseDetailResponse {
    vehicle_purchase_detail_id: number
    chassis_no: string
    cost_price: number
    motor_serial_no?: string
    battery_serial_no?: string
}

export interface VehiclePurchaseResponse {
    vehicle_purchase_id: number
    vendor_id: number
    vendor_name?: string
    invoice_number: string
    invoice_date: string
    invoice_amount?: number
    is_deleted: boolean
    created_at: string
    details: VehiclePurchaseDetailResponse[]
}

export interface TemporaryItemCreate {
    spare_name: string
    spare_code: string
    category?: string
    remarks?: string
    price?: number
}

export interface TemporaryItem {
    spare_id: number
    spare_code: string
    spare_name: string
    category?: string
    is_verified: boolean
    is_temporary: boolean
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

// ==================== API ====================

export const procurementApi = {
    // Spares
    createSparePurchase: async (data: SparePurchaseCreate) => {
        return api.post('/procurement/purchases/spares', data)
    },

    getSparePurchases: async () => {
        return api.get<SparePurchaseResponse[]>('/procurement/purchases/spares')
    },

    getVehiclePurchases: async () => {
        return api.get<VehiclePurchaseResponse[]>('/procurement/purchases/vehicles')
    },

    deleteSparePurchase: async (id: number, hardDelete?: boolean) => {
        return api.delete(`/procurement/purchases/spares/${id}`, { params: { hard_delete: hardDelete } })
    },

    deleteVehiclePurchase: async (id: number, hardDelete?: boolean) => {
        return api.delete(`/procurement/purchases/vehicles/${id}`, { params: { hard_delete: hardDelete } })
    },

    // Temporary Items
    createTemporaryItem: async (data: TemporaryItemCreate) => {
        return api.post('/procurement/temporary-items', data)
    },

    getTemporaryItems: async () => {
        return api.get<TemporaryItem[]>('/procurement/temporary-items')
    },

    approveTemporaryItem: async (id: number) => {
        return api.put(`/procurement/temporary-items/${id}/approve`)
    },

    // Vehicle Intake (OEM)
    intakeVehicles: async (data: VehicleIntakePayload) => {
        return api.post('/procurement/purchases/vehicles/intake', data)
    },
}
