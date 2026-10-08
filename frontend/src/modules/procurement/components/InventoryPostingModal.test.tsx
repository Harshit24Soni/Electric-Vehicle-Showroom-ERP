import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import InventoryPostingModal from './InventoryPostingModal'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({ hasRole: () => true })
}))

const queryClient = new QueryClient()

const mockPurchase = {
  spare_purchase_id: 1,
  vendor_id: 1,
  vendor_name: 'Vendor A',
  invoice_number: 'INV-123',
  invoice_date: '2023-10-01',
  status: 'APPROVED',
  items: [
    {
      purchase_item_id: 1,
      spare_id: 1,
      spare_name: 'Engine Oil',
      quantity: 10,
      unit_cost: 500,
    }
  ]
}

describe('InventoryPostingModal', () => {
  it('renders correctly', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <InventoryPostingModal purchase={mockPurchase as any} onClose={vi.fn()} />
      </QueryClientProvider>
    )
    
    expect(screen.getByText('Post to Inventory')).toBeInTheDocument()
    expect(screen.getByText('Confirm & Post')).toBeInTheDocument()
  })
})
