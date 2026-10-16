import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: ThemeMode
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light'
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function applyThemeToDocument(resolved: 'light' | 'dark') {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (resolved === 'dark') {
    root.classList.add('dark')
    root.setAttribute('data-theme', 'dark')
  } else {
    root.classList.remove('dark')
    root.setAttribute('data-theme', 'light')
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: getSystemTheme(),

      setTheme: (newTheme: ThemeMode) => {
        const resolved = newTheme === 'system' ? getSystemTheme() : newTheme
        applyThemeToDocument(resolved)
        set({ theme: newTheme, resolvedTheme: resolved })
      },

      toggleTheme: () => {
        const current = get().resolvedTheme
        const nextTheme = current === 'dark' ? 'light' : 'dark'
        applyThemeToDocument(nextTheme)
        set({ theme: nextTheme, resolvedTheme: nextTheme })
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolved = state.theme === 'system' ? getSystemTheme() : state.theme
          applyThemeToDocument(resolved)
          state.resolvedTheme = resolved
        }
      },
    }
  )
)

// Setup system theme change listener if running in browser
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  try {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = (e: MediaQueryListEvent) => {
      const currentTheme = useThemeStore.getState().theme
      if (currentTheme === 'system') {
        const nextResolved = e.matches ? 'dark' : 'light'
        applyThemeToDocument(nextResolved)
        useThemeStore.setState({ resolvedTheme: nextResolved })
      }
    }

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', listener)
    } else if ('addListener' in mediaQuery) {
      // Fallback for older browsers
      (mediaQuery as any).addListener(listener)
    }
  } catch {
    // Ignore matchMedia listener setup errors in non-standard environments
  }
}

export function useTheme() {
  const theme = useThemeStore((s) => s.theme)
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)

  return {
    theme,
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
    setTheme,
    toggleTheme,
  }
}
