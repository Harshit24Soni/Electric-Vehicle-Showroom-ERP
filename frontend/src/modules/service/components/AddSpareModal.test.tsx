import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AddSpareModal from './AddSpareModal'
import { serviceApi, SpareConsumption } from '../api/serviceApi'
import { inventoryApi, StockListResponse } from '../../inventory/api/inventoryApi'
import { toast } from 'react-hot-toast'

vi.mock('../api/serviceApi', () => ({
  serviceApi: {
    draftSpare: vi.fn(),
  }
}))

vi.mock('../../inventory/api/inventoryApi', () => ({
  inventoryApi: {
    getStock: vi.fn(),
  }
}))

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}))

describe('AddSpareModal', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    vi.clearAllMocks()
  })

  const renderComponent = (onClose = vi.fn(), onSuccess = vi.fn()) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AddSpareModal jobCardId={1} onClose={onClose} onSuccess={onSuccess} />
      </QueryClientProvider>
    )
  }

  const mockStock: StockListResponse = {
    items: [
      {
        spare_id: 1,
        part_code: 'P001',
        spare_name: 'Part 1',
        quantity: 10,
        tracking_mode: 'QUANTITY',
        location: 'MAIN',
        unit_cost: 100,
        total_value: 1000,
      }
    ]
  }

  it('renders modal and loads stock items', async () => {
    vi.mocked(inventoryApi.getStock).mockResolvedValue(mockStock)

    renderComponent()

    expect(await screen.findByText(/P001 - Part 1/)).toBeInTheDocument()
  })

  it('handles selecting a spare part from dropdown and displays stock details', async () => {
    vi.mocked(inventoryApi.getStock).mockResolvedValue(mockStock)

    renderComponent()

    expect(await screen.findByText(/P001 - Part 1/)).toBeInTheDocument()

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: '1' } })

    expect(await screen.findByText('Available in Stock: 10')).toBeInTheDocument()
    expect(screen.getByText('Part 1')).toBeInTheDocument()
  })

  it('opens inventory tag scanner modal when Scan Inventory Tag button is clicked', async () => {
    vi.mocked(inventoryApi.getStock).mockResolvedValue(mockStock)

    renderComponent()

    const scanBtn = await screen.findByRole('button', { name: /Scan Inventory Tag/i })
    fireEvent.click(scanBtn)

    expect(await screen.findByText('Scan Tag for Service')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Scan identifier...')).toBeInTheDocument()
  })

  it('handles adding a spare to job card successfully', async () => {
    vi.mocked(inventoryApi.getStock).mockResolvedValue(mockStock)
    vi.mocked(serviceApi.draftSpare).mockResolvedValue({} as unknown as SpareConsumption)

    const onSuccess = vi.fn()
    renderComponent(vi.fn(), onSuccess)

    expect(await screen.findByText(/P001 - Part 1/)).toBeInTheDocument()

    // Select from dropdown
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: '1' } })

    const submitBtn = screen.getByText('Add to Job Card')
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(serviceApi.draftSpare).toHaveBeenCalledWith(1, {
        spare_id: 1,
        quantity: 1,
        tracking_mode: 'QUANTITY'
      })
      expect(toast.success).toHaveBeenCalledWith('Spare added as draft')
      expect(onSuccess).toHaveBeenCalled()
    })
  })
})
