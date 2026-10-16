import { create } from 'zustand'
import { leadsApi, Lead } from '@/modules/crm/api/leads'
import { enquiriesApi, Enquiry } from '@/modules/crm/api/enquiries'

interface CrmState {
  leads: Lead[]
  enquiries: Enquiry[]
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
    const isCacheValid = state.lastFetched && Date.now() - state.lastFetched < 5 * 60 * 1000

    if (!force && isCacheValid && state.leads.length > 0) {
      return
    }

    set({ isLoading: true, error: null })
    try {
      const data = await leadsApi.list()
      set({
        leads: data,
        lastFetched: Date.now(),
        isLoading: false,
      })
       
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  fetchEnquiries: async (_force = false) => {
    set({ isLoading: true, error: null })
    try {
      const data = await enquiriesApi.list()
      set({ enquiries: data, isLoading: false })
       
    } catch (err: any) {
      set({ error: err.message, isLoading: false })
    }
  },

  addLead: (lead) =>
    set((state) => ({
      leads: [lead, ...state.leads],
    })),

  updateLead: (lead_id, data) =>
    set((state) => ({
      leads: state.leads.map((l) => (l.lead_id === lead_id ? { ...l, ...data } : l)),
    })),

  removeLead: (lead_id) =>
    set((state) => ({
      leads: state.leads.filter((l) => l.lead_id !== lead_id),
    })),
}))
