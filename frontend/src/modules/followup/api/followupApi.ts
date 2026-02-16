import { api } from '@/lib/api'

export interface FollowupItem {
    followup_type: string  // LEAD | SERVICE | INSURANCE
    entity_id: number
    entity_label: string
    due_date: string
    status: string
    is_completed: boolean
    remarks: string | null
}

export interface UnifiedFollowupDashboard {
    lead_followups: FollowupItem[]
    service_followups: FollowupItem[]
    insurance_followups: FollowupItem[]
    total_pending: number
    total_overdue: number
}

export const followupApi = {
    getUnifiedDashboard: () =>
        api.get<UnifiedFollowupDashboard>('/followups/dashboard'),
}

export default followupApi
