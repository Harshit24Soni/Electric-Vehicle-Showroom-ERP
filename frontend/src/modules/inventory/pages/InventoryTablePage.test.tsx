import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import InventoryTablePage from './InventoryTablePage'
import { inventoryApi } from '../api/inventoryApi'

vi.mock('../api/inventoryApi', () => ({
  inventoryApi: {
    getMasterSheet: vi.fn(),
    getActiveVehicleModels: vi.fn(),
    createMasterSheetItem: vi.fn(),
    updateMasterSheetItem: vi.fn(),
    deleteMasterSheetItem: vi.fn(),
  },
}))

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('InventoryTablePage', () => {
  let queryClient: QueryClient

  const mockItems = [
    {
      spare_id: 1,
      part_code: 'SP-BRK-001',
      description: 'Front Brake Pad Set',
      category: 'Brakes',
      tracking_mode: 'QUANTITY',
      status: 'ACTIVE',
      hsn_code: '87141090',
      gst_rate: 18,
      ex_factory: 450,
      dlp: 500,
      mrp: 750,
      stock_quantity: 24,
      compatible_models: ['Magnus Neo', 'Primus'],
      model_prices: {
        'Magnus Neo': 750,
        Primus: 780,
      },
      remarks: 'OEM standard',
      'Magnus Neo': 750,
      Primus: 780,
    },
    {
      spare_id: 2,
      part_code: 'SP-BAT-100',
      description: 'LFP Battery Cell Module',
      category: 'Battery',
      tracking_mode: 'SERIALIZED',
      status: 'ACTIVE',
      hsn_code: '85076000',
      gst_rate: 18,
      ex_factory: 12000,
      dlp: 13500,
      mrp: 18000,
      stock_quantity: 5,
      compatible_models: ['Nexus'],
      model_prices: {
        Nexus: 18000,
      },
      remarks: 'High capacity',
      Nexus: 18000,
    },
  ]

  const mockModels = ['Magnus Neo', 'Primus', 'Nexus']

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    vi.clearAllMocks()
    vi.mocked(inventoryApi.getMasterSheet).mockResolvedValue(mockItems as any)
    vi.mocked(inventoryApi.getActiveVehicleModels).mockResolvedValue(mockModels as any)
  })

  it('renders master inventory sheet table with KPI metrics and model columns', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <InventoryTablePage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    // Wait for async query data to render
    expect(await screen.findByText('SP-BRK-001')).toBeInTheDocument()
    expect(screen.getByText('Master Inventory Sheet')).toBeInTheDocument()
    expect(screen.getByText('Live Data Grid')).toBeInTheDocument()

    // Check part codes rendered
    expect(screen.getByText('SP-BAT-100')).toBeInTheDocument()
    expect(screen.getByText('Front Brake Pad Set')).toBeInTheDocument()
    expect(screen.getByText('LFP Battery Cell Module')).toBeInTheDocument()

    // Check dynamic vehicle model headers rendered
    expect(screen.getByText('Magnus Neo')).toBeInTheDocument()
    expect(screen.getByText('Primus')).toBeInTheDocument()
    expect(screen.getByText('Nexus')).toBeInTheDocument()
  })

  it('filters rows dynamically when searching by part code or description', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <InventoryTablePage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    await screen.findByText('SP-BRK-001')

    const searchInput = screen.getByPlaceholderText('Search by Part Code, Name or HSN...')
    fireEvent.change(searchInput, { target: { value: 'Battery' } })

    // Only Battery should remain
    expect(screen.queryByText('SP-BRK-001')).not.toBeInTheDocument()
    expect(screen.getByText('SP-BAT-100')).toBeInTheDocument()
  })

  it('opens Add Part Row modal and creates a new inventory part record', async () => {
    vi.mocked(inventoryApi.createMasterSheetItem).mockResolvedValue({
      spare_id: 3,
      part_code: 'SP-TYR-001',
      description: 'Tubeless Front Tyre 90/90-12',
      category: 'Tyres',
      tracking_mode: 'QUANTITY',
      status: 'ACTIVE',
      stock_quantity: 0,
      compatible_models: ['Magnus Neo'],
      model_prices: { 'Magnus Neo': 1500 },
    } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <InventoryTablePage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    await screen.findByText('Master Inventory Sheet')

    // Click Add Part Row
    const addBtn = screen.getByRole('button', { name: /add part row/i })
    fireEvent.click(addBtn)

    // Modal should be visible
    expect(screen.getByText('Add Master Inventory Part')).toBeInTheDocument()

    // Fill form
    fireEvent.change(screen.getByPlaceholderText('e.g. SP-BRK-001'), {
      target: { value: 'SP-TYR-001' },
    })
    fireEvent.change(screen.getByPlaceholderText('e.g. Front Disc Brake Pad Set'), {
      target: { value: 'Tubeless Front Tyre 90/90-12' },
    })
    fireEvent.change(screen.getByPlaceholderText('750.00'), {
      target: { value: '1500' },
    })

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /create part/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(inventoryApi.createMasterSheetItem).toHaveBeenCalledWith(
        expect.objectContaining({
          part_code: 'SP-TYR-001',
          description: 'Tubeless Front Tyre 90/90-12',
          mrp: 1500,
        })
      )
    })
  })

  it('deletes a part safely using the delete confirmation modal', async () => {
    vi.mocked(inventoryApi.deleteMasterSheetItem).mockResolvedValue({
      success: true,
      message: 'Deleted',
    } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <InventoryTablePage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    await screen.findByText('SP-BRK-001')

    // Click first delete button
    const deleteBtns = screen.getAllByTitle('Delete Part')
    fireEvent.click(deleteBtns[0])

    // Confirmation modal should appear
    expect(screen.getByText('Delete Part Record')).toBeInTheDocument()

    const confirmBtn = screen.getByRole('button', { name: /confirm delete/i })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(inventoryApi.deleteMasterSheetItem).toHaveBeenCalledWith('SP-BRK-001')
    })
  })
})
