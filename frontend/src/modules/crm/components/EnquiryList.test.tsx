import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import EnquiryList from './EnquiryList'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('EnquiryList (Phase 3 Redesign)', () => {
  let queryClient: QueryClient

  const mockStats = {
    total_enquiries: 24,
    active_enquiries: 14,
    converted_enquiries: 7,
    lost_enquiries: 3,
  }

  const mockEnquiries = [
    {
      enquiry_id: 101,
      lead_id: 1,
      enquiry_source: 'Website Form',
      enquiry_status: 'ACTIVE',
      owner_staff_id: 2,
      last_followup_date: '2026-10-14',
      created_at: '2026-10-10T12:00:00Z',
    },
    {
      enquiry_id: 102,
      lead_id: 2,
      enquiry_source: 'Direct Walk-in',
      enquiry_status: 'CONVERTED',
      owner_staff_id: 3,
      last_followup_date: null,
      created_at: '2026-10-12T14:30:00Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/crm/enquiries/stats/summary')) {
        return Promise.resolve(mockStats)
      }
      if (url.includes('/crm/enquiries')) {
        return Promise.resolve(mockEnquiries)
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`))
    })
  })

  const renderEnquiryList = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <EnquiryList />
      </QueryClientProvider>
    )
  }

  it('renders all 4 enquiry summary KPI metric cards with API data', async () => {
    renderEnquiryList()

    await waitFor(() => {
      expect(screen.getByText('Total Enquiries')).toBeInTheDocument()
      expect(screen.getByText('24')).toBeInTheDocument()
      expect(screen.getByText('Active / Open')).toBeInTheDocument()
      expect(screen.getByText('14')).toBeInTheDocument()
      expect(screen.getAllByText('Converted').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('7')).toBeInTheDocument()
      expect(screen.getByText('Lost / Dropped')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  it('renders enquiries table with source channel, status selector, and staff assignment', async () => {
    renderEnquiryList()

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument()
      expect(screen.getByText('Website Form')).toBeInTheDocument()
      expect(screen.getByText('Staff #2')).toBeInTheDocument()

      expect(screen.getByText('#102')).toBeInTheDocument()
      expect(screen.getByText('Direct Walk-in')).toBeInTheDocument()
      expect(screen.getByText('Staff #3')).toBeInTheDocument()
    })
  })

  it('filters enquiries using the search bar', async () => {
    renderEnquiryList()

    await waitFor(() => {
      expect(screen.getByText('Website Form')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/search enquiries/i)
    fireEvent.change(searchInput, { target: { value: 'Direct Walk-in' } })

    expect(screen.getByText('Direct Walk-in')).toBeInTheDocument()
    expect(screen.queryByText('Website Form')).not.toBeInTheDocument()
  })

  it('triggers update mutation when status dropdown changes', async () => {
    vi.mocked(api.put).mockResolvedValueOnce({
      ...mockEnquiries[0],
      enquiry_status: 'CONVERTED',
    })

    renderEnquiryList()

    await waitFor(() => {
      expect(screen.getByText('#101')).toBeInTheDocument()
    })

    const statusSelects = screen.getAllByRole('combobox')
    // Find the select for enquiry 101 with value ACTIVE
    const activeSelect = statusSelects.find((s) => (s as HTMLSelectElement).value === 'ACTIVE')
    expect(activeSelect).toBeDefined()

    if (activeSelect) {
      fireEvent.change(activeSelect, { target: { value: 'CONVERTED' } })
      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith('/crm/enquiries/101', {
          enquiry_status: 'CONVERTED',
          enquiry_status_id: 2,
        })
      })
    }
  })

  it('renders unsupported placeholder when backend stats returns only total_enquiries', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('/crm/enquiries/stats/summary')) {
        // Real backend behavior: only returns {"total_enquiries": 42}
        return Promise.resolve({ total_enquiries: 42 })
      }
      if (url.includes('/crm/enquiries')) {
        return Promise.resolve([])
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`))
    })

    renderEnquiryList()

    await waitFor(() => {
      expect(screen.getByText('Total Enquiries')).toBeInTheDocument()
      expect(screen.getByText('42')).toBeInTheDocument()
      // Should show '—' for unsupported metrics rather than fabricating 0
      const unsupportedPlaceholders = screen.getAllByText('—')
      expect(unsupportedPlaceholders.length).toBe(3)
      const unsupportedNotices = screen.getAllByText('Not provided by summary API')
      expect(unsupportedNotices.length).toBe(3)
    })
  })
})
