import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import DashboardPage from './DashboardPage'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}))

vi.mock('@/modules/crm/components/FollowupDashboard', () => ({
  default: () => <div data-testid="mock-followup-dashboard">Mock Followup Dashboard</div>,
}))

vi.mock('@/modules/admin/components/PinResetRequests', () => ({
  default: () => <div data-testid="mock-pin-reset-requests">Mock PIN Reset Requests</div>,
}))

describe('DashboardPage (Phase 2)', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    useAuthStore.setState({
      user: {
        staff_id: 1,
        name: 'Arun Kumar',
        designation: 'General Manager',
        role: 'ADMIN',
        force_pin_change: false,
      },
      isAuthenticated: true,
    })
  })

  const renderDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DashboardPage />
        </BrowserRouter>
      </QueryClientProvider>
    )
  }

  it('renders operations console header, greeting, and live telemetry indicator', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/reports/dashboard-stats') {
        return Promise.resolve({
          revenue: 1250000,
          active_leads: 18,
          conversion_ratio: 24.5,
          in_stock_inventory: 14,
        })
      }
      if (url === '/reports/alerts') {
        return Promise.resolve({ aging_inventory: [], upcoming_renewals: [] })
      }
      return Promise.resolve({})
    })

    renderDashboard()

    expect(screen.getByText('Operations Console')).toBeInTheDocument()
    expect(screen.getByText('Live Telemetry')).toBeInTheDocument()
    expect(screen.getByText(/Arun Kumar/)).toBeInTheDocument()
    expect(screen.getByText('Staff Management')).toBeInTheDocument()
  })

  it('renders all 4 business KPI metric cards with formatted API values', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/reports/dashboard-stats') {
        return Promise.resolve({
          revenue: 2500000,
          active_leads: 32,
          conversion_ratio: 28.5,
          in_stock_inventory: 9,
        })
      }
      if (url === '/reports/alerts') {
        return Promise.resolve({ aging_inventory: [], upcoming_renewals: [] })
      }
      return Promise.resolve({})
    })

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText(/current month revenue/i)).toBeInTheDocument()
      expect(screen.getByText(/active leads/i)).toBeInTheDocument()
      expect(screen.getByText(/conversion ratio/i)).toBeInTheDocument()
      expect(screen.getByText(/in-stock fleet/i)).toBeInTheDocument()
      expect(screen.getByText('32')).toBeInTheDocument()
      expect(screen.getByText('28.5%')).toBeInTheDocument()
      expect(screen.getByText('9')).toBeInTheDocument()
    })
  })

  it('renders quick action buttons with dealer-specific workflows when ADMIN/DEALER', async () => {
    vi.mocked(api.get).mockResolvedValue({
      revenue: 0,
      active_leads: 0,
      conversion_ratio: 0,
      in_stock_inventory: 0,
      aging_inventory: [],
      upcoming_renewals: [],
    })

    renderDashboard()

    expect(screen.getByText('New Lead')).toBeInTheDocument()
    expect(screen.getByText('Vehicle Sale')).toBeInTheDocument()
    expect(screen.getByText('Log Follow-up')).toBeInTheDocument()
    expect(screen.getByText('New Job Card')).toBeInTheDocument()
    expect(screen.getByText('Create PO')).toBeInTheDocument()
    expect(screen.getByText('Master Inventory')).toBeInTheDocument()
  })

  it('hides dealer workflows when user role is STAFF', async () => {
    useAuthStore.setState({
      user: {
        staff_id: 2,
        name: 'Ravi Verma',
        designation: 'Sales Representative',
        role: 'STAFF',
        force_pin_change: false,
      },
      isAuthenticated: true,
    })

    vi.mocked(api.get).mockResolvedValue({
      revenue: 0,
      active_leads: 0,
      conversion_ratio: 0,
      in_stock_inventory: 0,
      aging_inventory: [],
      upcoming_renewals: [],
    })

    renderDashboard()

    expect(screen.getByText('New Lead')).toBeInTheDocument()
    expect(screen.getByText('Vehicle Sale')).toBeInTheDocument()
    expect(screen.queryByText('Create PO')).not.toBeInTheDocument()
    expect(screen.queryByText('Master Inventory')).not.toBeInTheDocument()
    expect(screen.queryByText('Staff Management')).not.toBeInTheDocument()
  })

  it('renders aging inventory alerts and upcoming renewals list when populated', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/reports/dashboard-stats') {
        return Promise.resolve({
          revenue: 100000,
          active_leads: 5,
          conversion_ratio: 10,
          in_stock_inventory: 4,
        })
      }
      if (url === '/reports/alerts') {
        return Promise.resolve({
          aging_inventory: [
            {
              chassis_no: 'CHAS-998877',
              model_name: 'Magnus EX (Glossy Red)',
              days_in_stock: 65,
              age_category: '>60 Days',
            },
          ],
          upcoming_renewals: [
            {
              chassis_no: 'CHAS-112233',
              type: 'INSURANCE',
              due_date: '2026-11-01',
              details: 'Comprehensive Policy #POL-10029',
            },
          ],
        })
      }
      return Promise.resolve({})
    })

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Magnus EX (Glossy Red)')).toBeInTheDocument()
      expect(screen.getByText(/CHAS-998877/)).toBeInTheDocument()
      expect(screen.getByText('>60 Days')).toBeInTheDocument()
      expect(screen.getByText('65 days')).toBeInTheDocument()

      expect(screen.getByText('Comprehensive Policy #POL-10029')).toBeInTheDocument()
      expect(screen.getByText(/CHAS-112233/)).toBeInTheDocument()
    })
  })

  it('renders clean empty states when no alerts or renewals exist', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/reports/dashboard-stats') {
        return Promise.resolve({ revenue: 0, active_leads: 0, conversion_ratio: 0, in_stock_inventory: 0 })
      }
      if (url === '/reports/alerts') {
        return Promise.resolve({ aging_inventory: [], upcoming_renewals: [] })
      }
      return Promise.resolve({})
    })

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Optimal Fleet Turnover')).toBeInTheDocument()
      expect(screen.getByText('All Coverage Current')).toBeInTheDocument()
    })
  })
})
