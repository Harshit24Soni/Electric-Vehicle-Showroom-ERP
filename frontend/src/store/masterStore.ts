import { create } from 'zustand'
import { api } from '@/lib/api'

interface MasterState {
    leadStatuses: any[]
    enquiryStatuses: any[]
    brands: any[]
    vehicleModels: any[]

    // Flags
    isInitialized: boolean
    isLoading: boolean
    error: string | null

    // Actions
    fetchMasterData: () => Promise<void>
    getLeadStatusName: (id: number) => string
    getEnquiryStatusName: (id: number) => string
    getBrandName: (id: number) => string
    getVehicleModelName: (id: number) => string
}

export const useMasterStore = create<MasterState>((set, get) => ({
    leadStatuses: [],
    enquiryStatuses: [],
    brands: [],
    vehicleModels: [],
    isInitialized: false,
    isLoading: false,
    error: null,

    fetchMasterData: async () => {
        // Debounce if already initialized or loading
        if (get().isInitialized || get().isLoading) return

        set({ isLoading: true, error: null })
        try {
            // Parallel fetch for best performance
            const [lStatus, eStatus, brands, models] = await Promise.all([
                api.get('/crm/master/lead-statuses').catch(() => []),
                api.get('/crm/master/enquiry-statuses').catch(() => []),
                // We might need an endpoint for brands/models if they are not under /crm/master
                // Assuming endpoints exist, or we default to empty if not yet implemented
                Promise.resolve([]),
                Promise.resolve([])
            ])

            set({
                leadStatuses: lStatus,
                enquiryStatuses: eStatus,
                brands: brands,
                vehicleModels: models,
                isInitialized: true,
                isLoading: false
            })
        } catch (err: any) {
            set({ error: err.message || 'Failed to load master data', isLoading: false })
        }
    },

    getLeadStatusName: (id: number) => {
        const item = get().leadStatuses.find((s: any) => s.status_id === id)
        return item ? item.status_name : `ID: ${id}`
    },

    getEnquiryStatusName: (id: number) => {
        const item = get().enquiryStatuses.find((s: any) => s.status_id === id)
        return item ? item.status_name : `ID: ${id}`
    },

    getBrandName: (id: number) => {
        const item = get().brands.find((s: any) => s.brand_id === id)
        return item ? item.brand_name : `ID: ${id}`
    },

    getVehicleModelName: (id: number) => {
        const item = get().vehicleModels.find((s: any) => s.vehicle_model_id === id)
        return item ? item.model_name : `ID: ${id}`
    }
}))
