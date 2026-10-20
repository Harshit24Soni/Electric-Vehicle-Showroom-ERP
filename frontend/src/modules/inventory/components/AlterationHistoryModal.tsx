import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  History,
  Clock,
  RotateCcw,
  FileText,
  FileSpreadsheet,
  Pencil,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  X,
  Check,
  Undo2,
  ArrowRight,
  ShieldCheck,
  Calendar,
  User,
  Layers,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  inventoryApi,
  MasterSheetItem,
  SparePartAlteration,
} from '../api/inventoryApi'

interface AlterationHistoryModalProps {
  item: MasterSheetItem | null
  onClose: () => void
  onSuccess?: () => void
}

const FIELD_LABELS: Record<string, string> = {
  dlp: 'Dealer Landing Price (DLP)',
  mrp: 'Customer MRP / Retail Price',
  ex_factory: 'Ex-Factory Purchase Price',
  ex_showroom: 'Ex-Showroom Price',
  gst_rate: 'GST Rate (%)',
  profit_margin_percent: 'Profit Margin (%)',
  description: 'Part Description / Name',
  category: 'Part Category',
  hsn_code: 'HSN / SAC Code',
  tracking_mode: 'Tracking Mode',
  status: 'Status',
  stock_quantity: 'Stock Quantity',
  remarks: 'Remarks / Notes',
  model_prices: 'EV Model Pricing Matrix',
}

const formatCurrency = (val: any): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(val))
}

const formatFieldValue = (field: string, val: any): string => {
  if (val === null || val === undefined) return '—'
  if (['dlp', 'mrp', 'ex_factory', 'ex_showroom'].includes(field)) {
    return formatCurrency(val)
  }
  if (field === 'gst_rate' || field === 'profit_margin_percent') {
    return `${val}%`
  }
  if (typeof val === 'object') {
    return JSON.stringify(val)
  }
  return String(val)
}

const formatDate = (isoStr: string): string => {
  if (!isoStr) return '—'
  try {
    const d = new Date(isoStr)
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d)
  } catch {
    return isoStr
  }
}

export default function AlterationHistoryModal({ item, onClose, onSuccess }: AlterationHistoryModalProps) {
  const queryClient = useQueryClient()

  // Track checked fields per alteration_id: { [altId]: Set<fieldName> }
  const [selectedFieldsMap, setSelectedFieldsMap] = useState<Record<number, Set<string>>>({})

  // Fetch alterations
  const {
    data: alterations = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<SparePartAlteration[]>({
    queryKey: ['part-alterations', item?.part_code],
    queryFn: async () => {
      if (!item?.part_code) return []
      return await inventoryApi.getItemAlterations(item.part_code)
    },
    enabled: !!item?.part_code,
  })

  // Reversion Mutation
  const revertMutation = useMutation({
    mutationFn: ({ alterationId, fields }: { alterationId: number; fields?: string[] }) =>
      inventoryApi.revertAlteration(alterationId, { fields_to_revert: fields }),
    onSuccess: (res) => {
      toast.success(res.message || 'Alteration successfully reverted.')
      queryClient.invalidateQueries({ queryKey: ['master-sheet-items'] })
      queryClient.invalidateQueries({ queryKey: ['model-pricing-matrix'] })
      refetch()
      if (onSuccess) onSuccess()
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to revert alteration.'
      toast.error(msg)
    },
  })

  if (!item) return null

  const getActionBadge = (actionType: string) => {
    switch (actionType) {
      case 'IMPORT_PDF':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <FileText className="w-3.5 h-3.5 text-rose-500" />
            PDF Rate Import
          </span>
        )
      case 'IMPORT_EXCEL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            Excel Rate Ingestion
          </span>
        )
      case 'COST_INWARD':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
            Cost Inward / Margin Update
          </span>
        )
      case 'REVERSION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <RotateCcw className="w-3.5 h-3.5 text-purple-500" />
            Audit Reversion
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <Pencil className="w-3.5 h-3.5 text-indigo-500" />
            Manual Edit
          </span>
        )
    }
  }

  // Field selection helpers
  const isFieldChecked = (altId: number, field: string): boolean => {
    const set = selectedFieldsMap[altId]
    if (!set) return true // default checked
    return set.has(field)
  }

  const toggleField = (altId: number, field: string, allFields: string[]) => {
    setSelectedFieldsMap((prev) => {
      const current = prev[altId] ? new Set(prev[altId]) : new Set(allFields)
      if (current.has(field)) {
        current.delete(field)
      } else {
        current.add(field)
      }
      return { ...prev, [altId]: current }
    })
  }

  const handleRevertSelected = (alt: SparePartAlteration) => {
    const changedKeys = Object.keys(alt.changes || {})
    const checkedSet = selectedFieldsMap[alt.alteration_id] || new Set(changedKeys)
    const selectedFields = Array.from(checkedSet)
    if (selectedFields.length === 0) {
      toast.error('Please select at least one field to revert.')
      return
    }

    if (
      window.confirm(
        `Are you sure you want to revert ${selectedFields.length} field(s) on part "${item.part_code}" to their prior state?`
      )
    ) {
      revertMutation.mutate({
        alterationId: alt.alteration_id,
        fields: selectedFields,
      })
    }
  }

  const handleRevertAll = (alt: SparePartAlteration) => {
    const changedKeys = Object.keys(alt.changes || {})
    if (
      window.confirm(
        `Are you sure you want to revert all ${changedKeys.length} changed fields on part "${item.part_code}" to their prior state?`
      )
    ) {
      revertMutation.mutate({
        alterationId: alt.alteration_id,
        fields: undefined, // Reverts all
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-800">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Alteration Audit & Reversion
                </h3>
                <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {item.part_code}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
                {item.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isLoading || isRefetching}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
              title="Refresh Alterations"
            >
              <RotateCcw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ACTIVE ITEM CURRENT RATES SUMMARY */}
        <div className="px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-400 dark:text-slate-500 font-medium">Current DLP:</span>
            <div className="font-mono font-semibold text-slate-900 dark:text-white">{formatCurrency(item.dlp)}</div>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 font-medium">Current MRP:</span>
            <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(item.mrp || item.ex_showroom)}</div>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 font-medium">GST Rate:</span>
            <div className="font-mono text-slate-800 dark:text-slate-200">{item.gst_rate || 18}%</div>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500 font-medium">Current Stock:</span>
            <div className="font-semibold text-indigo-600 dark:text-indigo-400">{item.stock_quantity || 0} Units</div>
          </div>
        </div>

        {/* TIMELINE BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Loading alteration timeline...</p>
            </div>
          ) : alterations.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-500 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No alterations recorded yet</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                Any modifications made through PDF / Excel rate sheet imports, manual master sheet edits, or margin simulators will automatically generate an immutable audit log here.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {alterations.map((alt) => {
                const changedKeys = Object.keys(alt.changes || {})
                const checkedSet = selectedFieldsMap[alt.alteration_id] || new Set(changedKeys)
                const isPartiallyOrFullyReverted = alt.is_reverted

                return (
                  <div key={alt.alteration_id} className="relative group">
                    {/* TIMELINE BULLET */}
                    <div className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-600 dark:border-indigo-400 shadow-sm flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                    </div>

                    {/* ALTERATION CARD */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition">
                      
                      {/* CARD HEADER */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex flex-wrap items-center gap-2">
                          {getActionBadge(alt.action_type)}

                          {alt.source_reference && (
                            <span className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              {alt.source_reference}
                            </span>
                          )}

                          {isPartiallyOrFullyReverted && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              Reverted
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDate(alt.timestamp)}
                          </span>
                          {alt.altered_by_name && (
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              {alt.altered_by_name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* DIFF VIEWER */}
                      <div className="py-3 space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                          <span>Changed Attributes ({changedKeys.length} fields):</span>
                          {changedKeys.length > 1 && !isPartiallyOrFullyReverted && (
                            <span className="text-[11px] text-indigo-600 dark:text-indigo-400">
                              Select fields below to selectively revert
                            </span>
                          )}
                        </div>

                        <div className="overflow-hidden border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
                          {changedKeys.map((field) => {
                            const change = alt.changes[field]
                            const checked = isFieldChecked(alt.alteration_id, field)

                            return (
                              <div
                                key={field}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 text-xs gap-2 transition ${
                                  checked
                                    ? 'bg-slate-50/50 dark:bg-slate-850/50'
                                    : 'opacity-60 bg-white dark:bg-slate-900'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-[200px]">
                                  {!isPartiallyOrFullyReverted && (
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleField(alt.alteration_id, field, changedKeys)}
                                      className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                  )}
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {FIELD_LABELS[field] || field}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 font-mono">
                                  {/* OLD VALUE */}
                                  <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 line-through border border-rose-200/60 dark:border-rose-900/40">
                                    {formatFieldValue(field, change.old)}
                                  </span>

                                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                                  {/* NEW VALUE */}
                                  <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200/60 dark:border-emerald-900/40">
                                    {formatFieldValue(field, change.new)}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* CARD FOOTER & REVERT CONTROLS */}
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                          ID: #{alt.alteration_id}
                        </div>

                        {alt.action_type !== 'REVERSION' && (
                          <div className="flex items-center gap-2">
                            {changedKeys.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRevertSelected(alt)}
                                disabled={revertMutation.isPending || checkedSet.size === 0}
                                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition disabled:opacity-50"
                              >
                                <Undo2 className="w-3.5 h-3.5 text-amber-500" />
                                Revert Selected ({checkedSet.size})
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRevertAll(alt)}
                              disabled={revertMutation.isPending}
                              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-lg shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              {revertMutation.isPending ? 'Reverting...' : 'Revert All Fields'}
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Append-only audit trail • Every rollback is logged as a reversible event
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}
