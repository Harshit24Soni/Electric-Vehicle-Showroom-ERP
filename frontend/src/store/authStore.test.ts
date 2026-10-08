import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore, User } from './authStore'

describe('authStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.getState().clearAuth()
  })

  it('should logout correctly', () => {
    const user: User = { staff_id: 1, designation: 'Manager', role: 'ADMIN', force_pin_change: false }
    useAuthStore.getState().setAuth(user, 'dummy-token')
    
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(useAuthStore.getState().token).toBe('dummy-token')
    
    useAuthStore.getState().logout()
    
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
  })
})
