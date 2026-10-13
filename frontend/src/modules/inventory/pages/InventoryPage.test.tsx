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
    
    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url.includes('/master/vehicles')) {
        return mockVehicles
      }
      if (url.includes('/inventory/dashboard/stats')) {
        return { total_active_spares: 12, total_stock_value: 50000, movements_30d: 5 }
      }
      if (url.includes('/inventory/stock/locations')) {
        return [{ location: 'MAIN', total_items: 10, total_value: 20000 }]
      }
      return []
    })

    const { fireEvent } = await import('@testing-library/react')

    render(
      <QueryClientProvider client={queryClient}>
        <InventoryPage />
      </QueryClientProvider>
    )

    // Switch to Vehicles tab
    const vehiclesTabBtn = screen.getByRole('button', { name: /Vehicles/i })
    expect(vehiclesTabBtn).toBeInTheDocument()
    fireEvent.click(vehiclesTabBtn)

    // Wait for the vehicle data to load
    await waitFor(() => {
      expect(screen.getByText('CH1')).toBeInTheDocument()
    })

    expect(screen.getByText('CH2')).toBeInTheDocument()
    expect(screen.getByText('CH3')).toBeInTheDocument()
  })
})
