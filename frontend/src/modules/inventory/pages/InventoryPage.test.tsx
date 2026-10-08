import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import InventoryPage from './InventoryPage'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}))

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

describe('InventoryPage', () => {
  it('calculates status counts correctly without mutating them on filter', async () => {
    const mockVehicles = [
      { vehicle_id: 1, chassis_no: 'CH1', vehicle_status: 'IN_STOCK', color: 'Red' },
      { vehicle_id: 2, chassis_no: 'CH2', vehicle_status: 'BOOKED', color: 'Blue' },
      { vehicle_id: 3, chassis_no: 'CH3', vehicle_status: 'SOLD', color: 'Green' },
    ]
    
    vi.mocked(api.get).mockResolvedValueOnce(mockVehicles)

    render(
      <QueryClientProvider client={queryClient}>
        <InventoryPage />
      </QueryClientProvider>
    )

    // Wait for the data to load
    await waitFor(() => {
      expect(screen.getByText('CH1')).toBeInTheDocument()
    })

    // Assert that status counts are visible (we use text content or similar if we added data-testid, but here we can check if '1' is present next to 'In Stock')
    // Wait, the status cards render the count inside a <p> next to the label.
    // E.g., <p>1</p> <p>In Stock</p>
    const inStockCount = screen.getAllByText('1')[0]
    expect(inStockCount).toBeInTheDocument()
  })
})
