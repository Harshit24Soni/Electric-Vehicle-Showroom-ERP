import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import WorksheetImportPage from './WorksheetImportPage'
import { inventoryApi } from '../api/inventoryApi'

vi.mock('../api/inventoryApi', () => ({
  inventoryApi: {
    inspectDefaultWorkbook: vi.fn(),
    uploadCustomWorkbook: vi.fn(),
    getSheetPreview: vi.fn(),
    executeWorksheetImport: vi.fn(),
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

describe('WorksheetImportPage', () => {
  let queryClient: QueryClient

  const mockWorkbookInspection = {
    file_name: 'Inventory (22-09-25).xlsx',
    file_size: 1542300,
    file_token: 'default',
    sheet_count: 3,
    sheets: [
      {
        name: 'Master Inventory',
        row_count: 3909,
        col_count: 33,
        has_super_header: true,
        data_start_row: 2,
        sheet_type: 'MASTER_INVENTORY' as const,
        headers: ['Part Code', 'Description', 'Current Inventory', 'GST Rate', 'Final Rates - Customer Price'],
        sample_rows: [
          {
            'Part Code': 'BACBK00115',
            Description: 'Ladies Foot Rest',
            'Current Inventory': 10,
            'GST Rate': 18,
            'Final Rates - Customer Price': 687,
          },
        ],
        auto_mapping: {
          part_code: 'Part Code',
          description: 'Description',
          stock_quantity: 'Current Inventory',
          gst_rate: 'GST Rate',
          mrp: 'Final Rates - Customer Price',
        },
        model_columns: [],
      },
      {
        name: 'Magnus Neo',
        row_count: 267,
        col_count: 11,
        has_super_header: false,
        data_start_row: 1,
        sheet_type: 'MODEL_PRICE_LIST' as const,
        headers: ['Part Code', 'Part Name', 'HSN Code', 'Revised DLP', 'Revised MRP'],
        sample_rows: [
          {
            'Part Code': '800051211',
            'Part Name': 'Terminal HBSP',
            'HSN Code': '85369090',
            'Revised DLP': 5,
            'Revised MRP': 6,
          },
        ],
        auto_mapping: {
          part_code: 'Part Code',
          description: 'Part Name',
          hsn_code: 'HSN Code',
          dlp: 'Revised DLP',
          mrp: 'Revised MRP',
        },
        model_columns: [],
      },
      {
        name: 'Purchase Sheet',
        row_count: 922,
        col_count: 9,
        has_super_header: false,
        data_start_row: 1,
        sheet_type: 'PURCHASE_SHEET' as const,
        headers: ['Date', 'Bill No', 'Firm Name', 'Item Code', 'Description', 'Qty'],
        sample_rows: [],
        auto_mapping: {
          part_code: 'Item Code',
          description: 'Description',
          stock_quantity: 'Qty',
        },
        model_columns: [],
      },
    ],
  }

  const mockSheetPreview = {
    sheet_name: 'Master Inventory',
    total_rows: 1,
    page: 1,
    limit: 50,
    headers: ['Part Code', 'Description', 'Current Inventory', 'GST Rate', 'Final Rates - Customer Price'],
    applied_mapping: {
      part_code: 'Part Code',
      description: 'Description',
      stock_quantity: 'Current Inventory',
      gst_rate: 'GST Rate',
      mrp: 'Final Rates - Customer Price',
    },
    model_columns: [],
    counts: {
      total: 3909,
      ready: 3842,
      warning: 48,
      error: 19,
      filtered: 1,
    },
    rows: [
      {
        row_id: 1,
        part_code: 'BACBK00115',
        description: 'Ladies Foot Rest',
        category: 'General',
        tracking_mode: 'QUANTITY',
        hsn_code: '87141090',
        gst_rate: 18,
        dlp: 563,
        mrp: 687,
        ex_factory: 477,
        stock_quantity: 10,
        model_prices: {},
        status: 'READY' as const,
        validation_messages: [],
        selected: true,
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    })
    vi.mocked(inventoryApi.inspectDefaultWorkbook).mockResolvedValue(mockWorkbookInspection as any)
    vi.mocked(inventoryApi.getSheetPreview).mockResolvedValue(mockSheetPreview as any)
  })

  it('renders the Worksheet Import studio and sheet ribbon correctly', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <WorksheetImportPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    expect(screen.getByText(/Inventory Ingestion & Pricing Engine/i)).toBeInTheDocument()
    expect(screen.getByText(/Inventory \(22-09-25\)\.xlsx/i)).toBeInTheDocument()

    // Verify all sheets appear in the ribbon
    await waitFor(() => {
      expect(screen.getByText('Master Inventory')).toBeInTheDocument()
      expect(screen.getByText('Magnus Neo')).toBeInTheDocument()
      expect(screen.getByText('Purchase Sheet')).toBeInTheDocument()
    })
  })

  it('switches between 1-Click Ingestion, Review & Customize, and Margin Auto-Calculator tabs', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <WorksheetImportPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Master Inventory')).toBeInTheDocument()
    })

    // Check tabs exist
    expect(screen.getByText(/1-Click Ingestion/i)).toBeInTheDocument()
    expect(screen.getByText(/Review & Customize/i)).toBeInTheDocument()
    expect(screen.getByText(/Margin Auto-Calculator/i)).toBeInTheDocument()

    // Switch to Review & Customize
    fireEvent.click(screen.getByText(/Review & Customize/i))

    await waitFor(() => {
      expect(screen.getByText(/Mail Merge Column Mapping/i)).toBeInTheDocument()
      expect(screen.getByText('Part Code / SKU')).toBeInTheDocument()
    })

    // Switch to Margin Auto-Calculator
    fireEvent.click(screen.getByText(/Margin Auto-Calculator/i))
    expect(screen.getByText(/Dynamic Auto-Pricing Engine Simulator/i)).toBeInTheDocument()
  })

  it('allows inline editing in the Review Data table and commits selected records', async () => {
    vi.mocked(inventoryApi.executeWorksheetImport).mockResolvedValue({
      success: true,
      total_processed: 1,
      created_count: 1,
      updated_count: 0,
      skipped_count: 0,
      errors: [],
      message: 'Successfully imported 1 parts.',
    } as any)

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <WorksheetImportPage />
        </BrowserRouter>
      </QueryClientProvider>
    )

    // Navigate to Review & Customize tab
    fireEvent.click(screen.getByText(/Review & Customize/i))

    await waitFor(() => {
      expect(screen.getByDisplayValue('BACBK00115')).toBeInTheDocument()
    })

    // Edit Part Code directly in cell
    const partCodeInput = screen.getByDisplayValue('BACBK00115')
    fireEvent.change(partCodeInput, { target: { value: 'BACBK00115-MODIFIED' } })
    expect(screen.getByDisplayValue('BACBK00115-MODIFIED')).toBeInTheDocument()

    // Click commit selected rows button
    const commitBtn = await screen.findByRole('button', { name: /import selected/i })
    fireEvent.click(commitBtn)

    await waitFor(() => {
      expect(inventoryApi.executeWorksheetImport).toHaveBeenCalledWith(
        expect.objectContaining({
          sheet_name: 'Master Inventory',
          rows: expect.arrayContaining([
            expect.objectContaining({
              part_code: 'BACBK00115-MODIFIED',
            }),
          ]),
        })
      )
    })
  })
})
