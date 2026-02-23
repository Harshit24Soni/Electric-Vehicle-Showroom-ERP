import { api } from '@/lib/api'

export interface LeadCreate {
  customer_id: number
  vehicle_model_id: number
  lead_source: string
  lead_status?: string
  owner_staff_id: number
  expected_purchase_date?: string
  remarks?: string
}

export interface Lead {
  lead_id: number
  customer_id: number
  vehicle_model_id: number
  lead_source: string
  lead_status: string
  owner_staff_id: number
  expected_purchase_date?: string
  remarks?: string
  created_at: string
}

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
  createLead: (data: LeadCreate) => api.post<Lead>('/crm/leads', data),
  getLeads: () => api.get<Lead[]>('/crm/leads'),
  getLead: (leadId: number) => api.get<Lead>(`/crm/leads/${leadId}`),
  assignLead: (leadId: number, newOwnerId: number) =>
    api.post(`/crm/leads/${leadId}/assign?new_owner_id=${newOwnerId}`),
  createFollowup: (data: FollowupCreate) => api.post<Followup>('/crm/followups', data),
  getPendingFollowups: () => api.get<Followup[]>('/crm/followups/pending'),
  updateFollowup: (id: number, data: Partial<Followup>) => api.put<Followup>(`/crm/followups/${id}`, data),
  getFollowupDashboard: (type: string = 'ALL') => api.get<{ sales_followups: any[] }>(`/crm/followups/dashboard?followup_type=${type}`),
  addActivity: (data: ActivityCreate) => api.post('/crm/activities', data),
  deleteLead: (leadId: number, hardDelete?: boolean) =>
    api.delete(`/crm/leads/${leadId}`, { params: { hard_delete: hardDelete } }),
  deleteFollowup: (id: number, hardDelete?: boolean) =>
    api.delete(`/crm/followups/${id}`, { params: { hard_delete: hardDelete } }),
}
