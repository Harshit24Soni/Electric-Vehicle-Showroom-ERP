import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CrmPage from './CrmPage'
import { useCrmStore } from '@/store/crmStore'
import { useMasterStore } from '@/store/masterStore'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('../components/EnquiryList', () => ({
  default: () => <div data-testid="mock-enquiry-list">Mock Enquiry List Component</div>,
}))

vi.mock('../components/FollowupDashboard', () => ({
  default: () => <div data-testid="mock-followup-dashboard">Mock Followup Dashboard Component</div>,
}))

vi.mock('../components/TestRideList', () => ({
  default: () => <div data-testid="mock-testride-list">Mock Test Ride List Component</div>,
}))

describe('CrmPage (Phase 3 Redesign)', () => {
  let queryClient: QueryClient

  const mockLeads = [
    {
      lead_id: 1,
      customer_id: null,
      name: 'Aditya Verma',
      phone: '9876543210',
      email: 'aditya@example.com',
      vehicle_model_id: 1,
      lead_source: 'Walk-in',
      lead_status_id: 1,
      lead_status: 'HOT',
      owner_staff_id: 2,
      expected_purchase_date: '2026-10-25',
      created_at: '2026-10-15T10:00:00Z',
    },
    {
      lead_id: 2,
      customer_id: null,
      name: 'Priya Sharma',
      phone: '9123456789',
      email: 'priya@example.com',
      vehicle_model_id: 2,
      lead_source: 'Website',
      lead_status_id: 2,
      lead_status: 'WARM',
      owner_staff_id: 3,
      expected_purchase_date: '2026-11-05',
      created_at: '2026-10-14T11:30:00Z',
    },
    {
      lead_id: 3,
      customer_id: 101,
      name: 'Suresh Patel',
      phone: '9988776655',
      email: 'suresh@example.com',
      vehicle_model_id: 1,
      lead_source: 'Referral',
      lead_status_id: 3,
      lead_status: 'SOLD',
      owner_staff_id: 2,
      expected_purchase_date: '2026-10-20',
      created_at: '2026-10-10T09:00:00Z',
      is_converted: true,
    },
  ]

  const mockLeadStatuses = [
    { status_id: 1, status_name: 'HOT' },
    { status_id: 2, status_name: 'WARM' },
    { status_id: 3, status_name: 'SOLD' },
    { status_id: 4, status_name: 'COLD' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    useMasterStore.setState({
      leadStatuses: mockLeadStatuses,
      isInitialized: true,
      getLeadStatusName: (id: number) => {
        const found = mockLeadStatuses.find((s) => s.status_id === id)
        return found ? found.status_name : 'Unknown'
      },
      fetchMasterData: vi.fn(),
    })

    useCrmStore.setState({
      leads: mockLeads,
      isLoading: false,
      fetchLeads: vi.fn(),
    })
  })

  const renderCrmPage = (initialEntries: string[] = ['/crm']) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <CrmPage />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  it('renders CRM operations header, tab ribbon, and action button', () => {
    renderCrmPage()

    expect(screen.getByText('CRM & Lead Operations')).toBeInTheDocument()
    expect(screen.getByText('Automotive Hub')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new lead/i })).toBeInTheDocument()

    // Tabs
    expect(screen.getByText('Leads Pipeline')).toBeInTheDocument()
    expect(screen.getByText('Enquiries')).toBeInTheDocument()
    expect(screen.getByText('Follow-ups')).toBeInTheDocument()
    expect(screen.getByText('Test Drives')).toBeInTheDocument()
  })

  it('calculates and renders the 4 pipeline KPI metric cards', () => {
    renderCrmPage()

    // Total: 3
    expect(screen.getByText('Total Leads')).toBeInTheDocument()
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1)

    // Hot: 1
    expect(screen.getByText('Hot Leads')).toBeInTheDocument()
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1)

    // Active: 2 (total 3 - converted 1)
    expect(screen.getByText('Active Pipeline')).toBeInTheDocument()
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1)

    // Converted: 1
    expect(screen.getByText('Converted / Won')).toBeInTheDocument()
  })

  it('renders leads table with customer details and status badges', () => {
    renderCrmPage()

    expect(screen.getByText('Aditya Verma')).toBeInTheDocument()
    expect(screen.getByText('9876543210')).toBeInTheDocument()
    expect(screen.getByText('Priya Sharma')).toBeInTheDocument()
    expect(screen.getByText('9123456789')).toBeInTheDocument()
    expect(screen.getByText('Suresh Patel')).toBeInTheDocument()

    // Status badges
    expect(screen.getAllByText('HOT').length).toBeGreaterThan(0)
    expect(screen.getAllByText('WARM').length).toBeGreaterThan(0)
    expect(screen.getAllByText('SOLD').length).toBeGreaterThan(0)
  })

  it('filters leads by search input keyword', async () => {
    renderCrmPage()

    const searchInput = screen.getByPlaceholderText(/search leads by customer name/i)
    fireEvent.change(searchInput, { target: { value: 'Priya' } })

    expect(screen.getByText('Priya Sharma')).toBeInTheDocument()
    expect(screen.queryByText('Aditya Verma')).not.toBeInTheDocument()
    expect(screen.queryByText('Suresh Patel')).not.toBeInTheDocument()
  })

  it('switches between tabs to display Enquiries, Follow-ups, and Test Drives', async () => {
    renderCrmPage()

    // Click Enquiries tab
    fireEvent.click(screen.getByText('Enquiries'))
    await waitFor(() => {
      expect(screen.getByTestId('mock-enquiry-list')).toBeInTheDocument()
    })

    // Click Follow-ups tab
    fireEvent.click(screen.getByText('Follow-ups'))
    await waitFor(() => {
      expect(screen.getByTestId('mock-followup-dashboard')).toBeInTheDocument()
    })

    // Click Test Drives tab
    fireEvent.click(screen.getByText('Test Drives'))
    await waitFor(() => {
      expect(screen.getByTestId('mock-testride-list')).toBeInTheDocument()
    })
  })

  it('renders empty state when search produces no matching leads', async () => {
    renderCrmPage()

    const searchInput = screen.getByPlaceholderText(/search leads by customer name/i)
    fireEvent.change(searchInput, { target: { value: 'Nonexistent Customer' } })

    expect(screen.getByText('No Matching Leads')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reset filters/i })).toBeInTheDocument()
  })
})
