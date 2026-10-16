import { Sun, Moon, Laptop } from 'lucide-react'
import { useTheme, ThemeMode } from '@/store/themeStore'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
  variant?: 'segmented' | 'compact'
}

export function ThemeToggle({ className, variant = 'segmented' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()

  const options: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
    { mode: 'light', label: 'Light', icon: Sun },
    { mode: 'system', label: 'Auto', icon: Laptop },
    { mode: 'dark', label: 'Dark', icon: Moon },
  ]

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700/60', className)}>
        {options.map(({ mode, label, icon: Icon }) => {
          const isActive = theme === mode
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setTheme(mode)}
              title={`${label} Mode`}
              aria-label={`${label} Mode`}
              className={cn(
                'p-1.5 rounded-md transition-all duration-150',
                isActive
                  ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              <Icon className="w-4 h-4" />
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'inline-flex items-center bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs font-medium',
        className
      )}
      role="radiogroup"
      aria-label="Theme selection"
    >
      {options.map(({ mode, label, icon: Icon }) => {
        const isActive = theme === mode
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => setTheme(mode)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-150',
              isActive
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-primary-600 dark:text-primary-400' : '')} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
