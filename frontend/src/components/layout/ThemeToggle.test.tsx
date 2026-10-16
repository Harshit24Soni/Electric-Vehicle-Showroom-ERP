import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from './ThemeToggle'
import { useThemeStore } from '@/store/themeStore'

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
    useThemeStore.getState().setTheme('light')
  })

  it('renders theme options and updates store on click', () => {
    render(<ThemeToggle variant="segmented" />)

    const darkBtn = screen.getByRole('radio', { name: /dark/i })
    expect(darkBtn).toBeInTheDocument()

    fireEvent.click(darkBtn)
    expect(useThemeStore.getState().theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    const lightBtn = screen.getByRole('radio', { name: /light/i })
    fireEvent.click(lightBtn)
    expect(useThemeStore.getState().theme).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
