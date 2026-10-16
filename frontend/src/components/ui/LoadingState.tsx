import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LoadingStateProps {
  message?: string
  className?: string
}

export function LoadingState({ message = 'Loading EV Showroom data...', className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center p-12 text-center', className)}>
      <div className="relative flex items-center justify-center w-14 h-14 mb-4">
        {/* Glowing pulse ring */}
        <div className="absolute inset-0 rounded-full bg-primary-500/20 animate-ping" />
        <div className="relative w-12 h-12 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin flex items-center justify-center" />
        <Zap className="absolute w-5 h-5 text-primary-500 animate-pulse" />
      </div>
      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{message}</p>
      <span className="text-xs text-slate-400 dark:text-slate-500 mt-1">Automotive Dealership Management System</span>
    </div>
  )
}
