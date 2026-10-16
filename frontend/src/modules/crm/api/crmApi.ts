import { api } from '@/lib/api'
import { leadsApi, Lead, LeadCreate, LeadUpdate } from './leads'

export type { Lead, LeadCreate, LeadUpdate }

export interface FollowupCreate {
  lead_id: number
  scheduled_date: string
  assigned_staff_id: number
  remarks?: string
}

export interface Followup {
  followup_id: number
  lead_id: number
  scheduled_date: string
  assigned_staff_id: number
  followup_status: string
  completed_at?: string
  remarks?: string
  created_at: string
}

export interface ActivityCreate {
  lead_id: number
  activity_type: string
  performed_by_staff_id: number
  activity_time: string
  outcome?: string
  next_action_date?: string
}

export const crmApi = {
  // Delegate lead operations to canonical leadsApi
  createLead: (data: LeadCreate) => leadsApi.create(data),
  getLeads: () => leadsApi.list(),
  getLead: (leadId: number) => leadsApi.getById(leadId),
  assignLead: (leadId: number, newOwnerId: number) => leadsApi.assign(leadId, newOwnerId),
  deleteLead: (leadId: number, hardDelete?: boolean) => leadsApi.delete(leadId, hardDelete),

  // Follow-ups and activities
  createFollowup: (data: FollowupCreate) => api.post<Followup>('/crm/followups', data),
  getPendingFollowups: () => api.get<Followup[]>('/crm/followups/pending'),
  updateFollowup: (id: number, data: Partial<Followup>) => api.put<Followup>(`/crm/followups/${id}`, data),
  getFollowupDashboard: (type: string = 'ALL') =>
    api.get<{ sales_followups: Followup[] }>(`/crm/followups/dashboard?followup_type=${type}`),
  addActivity: (data: ActivityCreate) => api.post('/crm/activities', data),
  deleteFollowup: (id: number, hardDelete?: boolean) =>
    api.delete(`/crm/followups/${id}`, { params: { hard_delete: hardDelete } }),
}
