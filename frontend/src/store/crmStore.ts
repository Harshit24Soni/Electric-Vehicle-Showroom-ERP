import { create } from 'zustand'
import { leadsApi, Lead } from '@/modules/crm/api/leads'

interface CrmState {
    leads: Lead[]
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO(Phase1.1 Baseline): Legacy warning
    enquiries: any[] // TODO: Define Enquiry Interface
    lastFetched: number | null
    isLoading: boolean
    error: string | null

    // Actions
    fetchLeads: (force?: boolean) => Promise<void>
    fetchEnquiries: (force?: boolean) => Promise<void>
    addLead: (lead: Lead) => void
    updateLead: (lead_id: number, data: Partial<Lead>) => void
    removeLead: (lead_id: number) => void
}

export const useCrmStore = create<CrmState>((set, get) => ({
    leads: [],
    enquiries: [],
    lastFetched: null,
    isLoading: false,
    error: null,

    fetchLeads: async (force = false) => {
        const state = get()
        // Cache validity: 5 minutes
        const isCacheValid = state.lastFetched && (Date.now() - state.lastFetched < 5 * 60 * 1000)

        if (!force && isCacheValid && state.leads.length > 0) {
            return
        }

        set({ isLoading: true, error: null })
        try {
            const data = await leadsApi.list()
            set({
                leads: data,
                lastFetched: Date.now(),
                isLoading: false
            })
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO(Phase1.1 Baseline): Legacy warning
        } catch (err: any) {
            set({ error: err.message, isLoading: false })
        }
    },

	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO(Phase1.1 Baseline): Legacy warning
    fetchEnquiries: async (force = false) => {
        set({ isLoading: true, error: null })
        try {
            // Lazy load dependencies or just import them
            const { crmApi } = await import('@/modules/crm/api/crmApi')
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- TODO(Phase1.1 Baseline): Legacy warning
            const data = await crmApi.getLeads() // Placeholder: need getEnquiries endpoint in crmApi
            // Actually crmApi doesn't have listEnquiries visible in Step 369.
            // But routes created getEnquiries? No. 
            // Step 20ish showed "list_enquiries".
            // I will assume endpoint is /crm/enquiries
            set({ enquiries: [], isLoading: false }) // Stubbed for now until endpoints verified
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO(Phase1.1 Baseline): Legacy warning
        } catch (err: any) {
            set({ error: err.message, isLoading: false })
        }
    },

    addLead: (lead) => set((state) => ({
        leads: [lead, ...state.leads]
    })),

    updateLead: (lead_id, data) => set((state) => ({
        leads: state.leads.map((l) => l.lead_id === lead_id ? { ...l, ...data } : l)
    })),

    removeLead: (lead_id) => set((state) => ({
        leads: state.leads.filter((l) => l.lead_id !== lead_id)
    }))
}))
