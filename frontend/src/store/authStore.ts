import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'ADMIN' | 'DEALER' | 'STAFF'

export interface User {
  staff_id: number
  designation: string
  role: UserRole
  force_pin_change: boolean
}

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  login: (token: string) => void
  logout: () => void
  hasRole: (roles: UserRole[]) => boolean
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
}

// Helper function to decode JWT token
function decodeJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Error decoding JWT:', error)
    return null
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      login: (token: string) => {
        const decoded = decodeJWT(token)
        if (decoded) {
          const user: User = {
            staff_id: decoded.staff_id || decoded.sub || 0,
            designation: decoded.designation || '',
            role: decoded.role || 'STAFF',
            force_pin_change: decoded.force_pin_change || false,
          }
          set({ token, user, isAuthenticated: true })
        } else {
          set({ token, user: null, isAuthenticated: false })
        }
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false })
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      },

      hasRole: (roles: UserRole[]) => {
        const { user } = get()
        if (!user) return false
        return roles.includes(user.role)
      },

      setAuth: (user: User, token: string) => {
        set({ token, user, isAuthenticated: true })
        localStorage.setItem('token', token)
      },

      clearAuth: () => {
        set({ token: null, user: null, isAuthenticated: false })
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)
