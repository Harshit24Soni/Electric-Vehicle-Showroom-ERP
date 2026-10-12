import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import JobCardDetailPage from './JobCardDetailPage'
import { serviceApi, JobCard, SpareConsumption } from '../api/serviceApi'

vi.mock('../api/serviceApi', () => ({
  serviceApi: {
    getJobCardById: vi.fn(),
    listSpares: vi.fn(),
    consumeSpare: vi.fn(),
    reverseSpare: vi.fn(),
    removeDraftSpare: vi.fn(),
  }
}))

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}))

describe('JobCardDetailPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    vi.clearAllMocks()
  })

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/service/1']}>
          <Routes>
            <Route path="/service/:jobCardId" element={<JobCardDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  it('renders loading state initially', () => {
    vi.mocked(serviceApi.getJobCardById).mockImplementation(() => new Promise(() => {}))
    renderComponent()
    expect(screen.getByText('Loading Job Card...')).toBeInTheDocument()
  })

  it('renders job card details when loaded', async () => {
    const mockJobCard: JobCard = {
      job_card_id: 1,
      job_card_no: 'JC-1001',
      chassis_no: 'CH123',
      in_datetime: '2023-10-01T10:00:00Z',
      opening_km: 1500,
    }
    vi.mocked(serviceApi.getJobCardById).mockResolvedValue(mockJobCard)
    vi.mocked(serviceApi.listSpares).mockResolvedValue([])

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Job Card JC-1001')).toBeInTheDocument()
    })
    expect(screen.getByText('Chassis No: CH123')).toBeInTheDocument()
    expect(screen.getByText('1500')).toBeInTheDocument()
    expect(screen.getByText('Open')).toBeInTheDocument()
  })

  it('shows closed status if out_datetime is present', async () => {
    const mockJobCard: JobCard = {
      job_card_id: 1,
      job_card_no: 'JC-1001',
      chassis_no: 'CH123',
      in_datetime: '2023-10-01T10:00:00Z',
      out_datetime: '2023-10-02T10:00:00Z',
      opening_km: 1500,
    }
    vi.mocked(serviceApi.getJobCardById).mockResolvedValue(mockJobCard)
    vi.mocked(serviceApi.listSpares).mockResolvedValue([])

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Closed')).toBeInTheDocument()
    })
    expect(screen.getByText('Service Completed')).toBeInTheDocument()
  })

  it('renders spares list and handles actions', async () => {
    const mockJobCard: JobCard = {
      job_card_id: 1,
      job_card_no: 'JC-1001',
      chassis_no: 'CH123',
      in_datetime: '2023-10-01T10:00:00Z',
      opening_km: 1500,
    }
    const mockSpares: SpareConsumption[] = [
      {
        consumption_id: 101,
        job_card_id: 1,
        spare_id: 10,
        part_code_snapshot: 'P001',
        description_snapshot: 'Part 1',
        tracking_mode: 'QUANTITY',
        quantity: 2,
        status: 'DRAFT',
        created_at: '2023-10-01T10:00:00Z',
      },
      {
        consumption_id: 102,
        job_card_id: 1,
        spare_id: 20,
        part_code_snapshot: 'P002',
        description_snapshot: 'Part 2',
        tracking_mode: 'BATCH',
        quantity: 1,
        status: 'CONSUMED',
        created_at: '2023-10-01T10:00:00Z',
      }
    ]

    vi.mocked(serviceApi.getJobCardById).mockResolvedValue(mockJobCard)
    vi.mocked(serviceApi.listSpares).mockResolvedValue(mockSpares)

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('P001')).toBeInTheDocument()
    })
    expect(screen.getByText('P002')).toBeInTheDocument()
    expect(screen.getByText('DRAFT')).toBeInTheDocument()
    expect(screen.getByText('CONSUMED')).toBeInTheDocument()

    // Test Consume action for DRAFT
    vi.mocked(serviceApi.consumeSpare).mockResolvedValue(mockSpares[0])
    const consumeButtons = screen.getAllByTitle('Confirm Consumption')
    fireEvent.click(consumeButtons[0])

    await waitFor(() => {
      expect(serviceApi.consumeSpare).toHaveBeenCalledWith(1, 101)
    })

    // Test Reverse action for CONSUMED
    vi.mocked(serviceApi.reverseSpare).mockResolvedValue(mockSpares[1])
    const reverseButtons = screen.getAllByTitle('Reverse Consumption')
    fireEvent.click(reverseButtons[0])

    await waitFor(() => {
      expect(serviceApi.reverseSpare).toHaveBeenCalledWith(1, 102)
    })

    // Test Remove Draft action
    vi.mocked(serviceApi.removeDraftSpare).mockResolvedValue(undefined)
    const removeButtons = screen.getAllByTitle('Remove Draft')
    fireEvent.click(removeButtons[0])

    await waitFor(() => {
      expect(serviceApi.removeDraftSpare).toHaveBeenCalledWith(1, 101)
    })
  })
})
