import * as React from 'react'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from './Skeleton'

export interface MetricCardProps {
  title: string
  value: string | number | React.ReactNode
  subtitle?: string
  icon: LucideIcon | React.ComponentType<{ className?: string }>
  iconColor?: string
  iconBg?: string
  trend?: {
    value: string | number
    isPositive?: boolean
    label?: string
  }
  isLoading?: boolean
  className?: string
  onClick?: () => void
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-primary-600 dark:text-primary-400',
  iconBg = 'bg-primary-50 dark:bg-primary-950/50 border border-primary-200/50 dark:border-primary-800/40',
  trend,
  isLoading = false,
  className,
  onClick,
}: MetricCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 p-5 shadow-sm dark:shadow-card-dark transition-all duration-200',
        onClick && 'cursor-pointer hover:border-primary-500/50 hover:shadow-md dark:hover:shadow-glow-sm',
        className
      )}
    >
      {/* Subtle automotive top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {isLoading ? <Skeleton className="h-8 w-24 rounded-md" /> : value}
          </div>
        </div>
        <div className={cn('p-3 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
          {trend && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 font-semibold px-1.5 py-0.5 rounded',
                trend.isPositive
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
              )}
            >
              {trend.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trend.value}
            </span>
          )}
          {trend?.label && <span className="text-slate-400 dark:text-slate-500">{trend.label}</span>}
          {subtitle && !trend && <span className="text-slate-500 dark:text-slate-400">{subtitle}</span>}
        </div>
      )}
    </div>
  )
}
