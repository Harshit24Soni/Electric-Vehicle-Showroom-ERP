import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useEffect, useState } from 'react'

export type UserRole = 'ADMIN' | 'DEALER' | 'STAFF'

export interface User {
  staff_id: number
  name?: string
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
        console.log('Decoded Token:', decoded) // Debugging
        if (decoded) {
          const rawRole = decoded.role || decoded.designation || 'STAFF'
          const user: User = {
            staff_id: decoded.staff_id || decoded.sub || 0,
            name: decoded.name || decoded.designation || '',
            designation: decoded.designation || '',
            role: rawRole.toUpperCase() as UserRole,
            force_pin_change: decoded.force_pin_change || false,
          }
          console.log('User Role Set To:', user.role) // Debugging
          set({ token, user, isAuthenticated: true })
        } else {
          set({ token: null, user: null, isAuthenticated: false })
        }
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false })
      },

      hasRole: (roles: UserRole[] | UserRole) => {
        const { user } = get()
        if (!user || !user.role) return false

        // Admin bypasses all checks in frontend
        if (user.role.toUpperCase() === 'ADMIN' || user.designation?.toUpperCase() === 'ADMIN') {
          return true;
        }

        // Add array-type safety to prevent .includes crash
        const rolesArray = Array.isArray(roles) ? roles : [roles]

        // Check exact match OR uppercase match (for legacy state)
        return rolesArray.includes(user.role as UserRole) || rolesArray.includes(user.role.toUpperCase() as UserRole)
      },

      setAuth: (user: User, token: string) => {
        set({ token, user, isAuthenticated: true })
      },

      clearAuth: () => {
        set({ token: null, user: null, isAuthenticated: false })
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
)

// Custom hook to wait for hydration
export const useAuthHydration = () => {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // Check if already hydrated via persist API
    const unsubFinishHydration = useAuthStore.persist.onFinishHydration(() => {
      setHydrated(true)
    })

    // If already hydrated (happens on fast loads)
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true)
    }

    return () => {
      unsubFinishHydration()
    }
  }, [])

  return hydrated
}
