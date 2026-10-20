import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Receipt,
  FileText,
  FileSpreadsheet,
  Calendar,
  Building2,
  Package,
  TrendingUp,
  Download,
  RotateCw,
  X,
  Layers,
  Percent,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  Tag,
  Search,
  ExternalLink,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  inventoryApi,
  MasterSheetItem,
  PartPurchaseBillRecord,
  PartPurchaseSummary,
} from '../api/inventoryApi'

export interface PartPurchaseTargetItem {
  part_code: string
  description?: string | null
  category?: string | null
  stock_quantity?: number | null
  hsn_code?: string | null
}

interface PartPurchaseHistoryModalProps {
  item: PartPurchaseTargetItem | MasterSheetItem | null
  onClose: () => void
}

const formatCurrency = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(val))
}

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d)
  } catch {
    return dateStr
  }
}

type RecordTab = 'ALL' | 'PO_BILLS' | 'DIRECT_ENTRIES'

export default function PartPurchaseHistoryModal({ item, onClose }: PartPurchaseHistoryModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<RecordTab>('ALL')

  const partCode = item?.part_code || ''

  // Fetch Part Purchase & Bill Summary from backend API
  const {
    data: summary,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery<PartPurchaseSummary>({
    queryKey: ['part-purchase-history', partCode],
    queryFn: () => inventoryApi.getPartPurchaseHistory(partCode),
    enabled: Boolean(partCode),
  })

  // Filtered bills by active tab and search query
  const filteredBills = useMemo(() => {
    if (!summary?.bills) return []
    let list = summary.bills
    if (activeTab === 'PO_BILLS') {
      list = list.filter((b) => b.is_po_bill)
    } else if (activeTab === 'DIRECT_ENTRIES') {
      list = list.filter((b) => !b.is_po_bill)
    }

    if (!searchTerm.trim()) return list
    const q = searchTerm.toLowerCase().trim()
    return list.filter((b: PartPurchaseBillRecord) => {
      const matchBill = b.bill_number?.toLowerCase().includes(q)
      const matchVendor = b.vendor_name?.toLowerCase().includes(q)
      const matchDate = b.bill_date?.toLowerCase().includes(q)
      const matchStatus = b.status?.toLowerCase().includes(q)
      const matchDocket = b.docket_reference?.toLowerCase().includes(q)
      const matchRemarks = b.remarks?.toLowerCase().includes(q)
      const matchLabel = b.source_label?.toLowerCase().includes(q)
      return (
        matchBill ||
        matchVendor ||
        matchDate ||
        matchStatus ||
        matchDocket ||
        matchRemarks ||
        matchLabel
      )
    })
  }, [summary?.bills, activeTab, searchTerm])

  // Export Bill History to CSV
  const handleExportCSV = () => {
    if (!filteredBills.length) {
      toast.error('No purchase bills to export')
      return
    }

    const headers = [
      'Classification',
      'Bill / Reference',
      'Bill Date',
      'Vendor / Origin',
      'Vendor GSTIN',
      'Quantity',
      'Purchase Rate (INR)',
      'GST Rate (%)',
      'Tax Amount (INR)',
      'Total Amount (INR)',
      'Landed Unit Rate (INR)',
      'Status',
      'Source Type',
      'Docket Ref',
      'Remarks',
    ]

    const csvRows = filteredBills.map((b: PartPurchaseBillRecord) => [
      `"${b.is_po_bill ? 'Vendor Purchase Bill (PO)' : 'Direct Entry / Import Studio'}"`,
      `"${b.bill_number || ''}"`,
      `"${b.bill_date || ''}"`,
      `"${(b.vendor_name || '').replace(/"/g, '""')}"`,
      `"${b.vendor_gstin || ''}"`,
      b.quantity,
      b.unit_rate,
      b.gst_percentage ?? 0,
      b.tax_amount ?? 0,
      b.total_amount,
      b.landed_cost_unit ?? b.unit_rate,
      `"${b.status || ''}"`,
      `"${b.source_label || b.source_type || ''}"`,
      `"${b.docket_reference || ''}"`,
      `"${(b.remarks || '').replace(/"/g, '""')}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `Purchase_Bills_${partCode}_${new Date().toISOString().slice(0, 10)}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Purchase bills exported to CSV!')
  }

  if (!item) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="purchase-history-modal-title"
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 backdrop-blur shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="purchase-history-modal-title"
                  className="text-lg font-bold text-slate-900 dark:text-white tracking-tight"
                >
                  Purchase Bill & Rate Summary
                </h2>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {partCode}
                </span>
                {item.category && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                    {item.category}
                  </span>
                )}
                {item.stock_quantity !== undefined && item.stock_quantity !== null && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      (item.stock_quantity || 0) > 0
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    In Stock: {item.stock_quantity}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-xl">
                {item.description}
                {item.hsn_code ? ` • HSN: ${item.hsn_code}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              title="Refresh Purchase Records"
              aria-label="Refresh Purchase Records"
            >
              <RotateCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              title="Close modal"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RotateCw className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-sm font-medium">Loading purchase bills and rate history...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>Failed to retrieve purchase bill records for this part.</p>
            </div>
          ) : (
            <>
              {/* Aggregated KPI Summary Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                {/* 1. Total Quantity Bought via PO */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                  <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      PO Inwarded
                    </span>
                    <Package className="w-4 h-4" />
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {summary?.total_quantity_bought ?? 0}{' '}
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400">units</span>
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    Across {summary?.total_bills_count ?? 0} PO Bills
                    {(summary?.direct_entries_count ?? 0) > 0 && (
                      <span className="text-purple-600 dark:text-purple-400">
                        {' '}
                        (+{summary?.direct_entries_count} Direct)
                      </span>
                    )}
                  </p>
                </div>

                {/* 2. Total Spend */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      PO Spend
                    </span>
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(summary?.total_spend)}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Authentic PO invoice cost
                  </p>
                </div>

                {/* 3. Last Rate */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                  <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Latest Rate
                    </span>
                    <Clock className="w-4 h-4" />
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(summary?.last_purchase_rate)}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {summary?.last_rate_source === 'PO_BILL'
                      ? `PO: ${summary?.last_bill_number || 'Bill'}`
                      : summary?.last_rate_source === 'IMPORT_STUDIO'
                      ? 'Import Studio Baseline'
                      : 'Catalog Baseline'}
                  </p>
                </div>

                {/* 4. Rate Range (Min -> Max) */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                  <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Rate Spread
                    </span>
                    <Layers className="w-4 h-4" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {formatCurrency(summary?.lowest_purchase_rate)} –{' '}
                    {formatCurrency(summary?.highest_purchase_rate)}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Min $\rightarrow$ Max Purchase
                  </p>
                </div>

                {/* 5. Weighted Average Cost */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between text-violet-600 dark:text-violet-400 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      WAC Rate
                    </span>
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(summary?.weighted_average_cost)}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Weighted Avg Valuation
                  </p>
                </div>
              </div>

              {/* Scope Tabs & Search Toolbar */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 pt-1">
                {/* 3 Scope Tabs: All, PO Bills, Direct Entries */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs shrink-0 self-start sm:self-auto overflow-x-auto max-w-full">
                  <button
                    onClick={() => setActiveTab('ALL')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      activeTab === 'ALL'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>All Records</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-slate-700">
                      {summary?.total_records_count ?? 0}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('PO_BILLS')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      activeTab === 'PO_BILLS'
                        ? 'bg-blue-600 text-white shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Vendor PO Bills</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-blue-700/80 text-white">
                      {summary?.total_bills_count ?? 0}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('DIRECT_ENTRIES')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                      activeTab === 'DIRECT_ENTRIES'
                        ? 'bg-purple-600 text-white shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Import Studio & Direct Entries</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-purple-700/80 text-white">
                      {summary?.direct_entries_count ?? 0}
                    </span>
                  </button>
                </div>

                {/* Search & Export Actions */}
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search bill number, vendor, or date..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleExportCSV}
                    disabled={!filteredBills.length}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs rounded-lg border border-slate-200 dark:border-slate-700 transition disabled:opacity-50 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Bill & Inward Details Table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-3 px-3.5 w-10 text-center">#</th>
                        <th className="py-3 px-3.5 min-w-[130px]">Classification</th>
                        <th className="py-3 px-3.5 min-w-[150px]">Bill / Reference</th>
                        <th className="py-3 px-3.5 min-w-[100px]">Date</th>
                        <th className="py-3 px-3.5 min-w-[170px]">Vendor / Origin</th>
                        <th className="py-3 px-3 text-center min-w-[80px]">Quantity</th>
                        <th className="py-3 px-3.5 text-right min-w-[110px]">Purchase Rate</th>
                        <th className="py-3 px-3 text-right min-w-[80px]">GST %</th>
                        <th className="py-3 px-3.5 text-right min-w-[110px]">Total Amount</th>
                        <th className="py-3 px-3 text-center min-w-[90px]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredBills.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-12 text-center text-slate-400">
                            <div className="flex flex-col items-center justify-center gap-2">
                              {activeTab === 'PO_BILLS' ? (
                                <>
                                  <Receipt className="w-8 h-8 text-blue-300 dark:text-blue-800" />
                                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                                    No Vendor PO Bills Found
                                  </p>
                                  <p className="text-xs text-slate-400 max-w-md">
                                    No authentic vendor purchase order (PO) bills have been posted yet for{' '}
                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                      {partCode}
                                    </span>
                                    . Existing rates were configured via Import Studio or direct showroom catalog entry.
                                  </p>
                                </>
                              ) : activeTab === 'DIRECT_ENTRIES' ? (
                                <>
                                  <FileSpreadsheet className="w-8 h-8 text-purple-300 dark:text-purple-800" />
                                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                                    No Direct Entries Recorded
                                  </p>
                                  <p className="text-xs text-slate-400 max-w-md">
                                    No worksheet or manual rate entries recorded for this part code.
                                  </p>
                                </>
                              ) : (
                                <>
                                  <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                                    No Transaction Records
                                  </p>
                                  <p className="text-xs text-slate-400 max-w-md">
                                    No transactions recorded yet for{' '}
                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                                      {partCode}
                                    </span>
                                    . Base reference cost is {formatCurrency(summary?.current_cost)}.
                                  </p>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredBills.map((b: PartPurchaseBillRecord, idx: number) => (
                          <tr
                            key={b.purchase_item_id || `${b.bill_number}-${idx}`}
                            className={`transition-colors ${
                              b.is_po_bill
                                ? 'hover:bg-blue-50/40 dark:hover:bg-blue-950/20'
                                : 'hover:bg-purple-50/40 dark:hover:bg-purple-950/20'
                            }`}
                          >
                            {/* # */}
                            <td className="py-3 px-3.5 text-center text-slate-400 font-mono">
                              {idx + 1}
                            </td>

                            {/* Classification Badge */}
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              {b.is_po_bill ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                                  <Receipt className="w-3 h-3 text-blue-500" />
                                  Vendor PO Bill
                                </span>
                              ) : b.source_type === 'IMPORT_STUDIO' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
                                  <FileSpreadsheet className="w-3 h-3 text-purple-500" />
                                  Import Studio
                                </span>
                              ) : b.source_type === 'STOCK_OPENING' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                                  <Package className="w-3 h-3 text-emerald-500" />
                                  Stock Opening
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  <Tag className="w-3 h-3 text-slate-500" />
                                  Direct Entry
                                </span>
                              )}
                            </td>

                            {/* Bill / Reference */}
                            <td className="py-3 px-3.5">
                              {b.is_po_bill ? (
                                <div>
                                  <div className="font-mono font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                    <span>{b.bill_number}</span>
                                  </div>
                                  {b.docket_reference && (
                                    <span className="text-[10px] text-slate-400 block mt-0.5">
                                      Docket: {b.docket_reference}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div>
                                  <div className="font-medium text-slate-900 dark:text-slate-100">
                                    {b.bill_number}
                                  </div>
                                  <span className="inline-block mt-0.5 text-[10px] text-purple-700 dark:text-purple-300 font-medium">
                                    Direct Rate Baseline (No PO)
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Date */}
                            <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                <span>{formatDate(b.bill_date)}</span>
                              </div>
                            </td>

                            {/* Vendor / Origin */}
                            <td className="py-3 px-3.5 text-slate-800 dark:text-slate-200">
                              <div className="font-medium truncate max-w-[180px]">
                                {b.vendor_name}
                              </div>
                              {b.vendor_gstin ? (
                                <span className="text-[10px] font-mono text-slate-400 block">
                                  GSTIN: {b.vendor_gstin}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 block">
                                  {b.is_po_bill ? 'OEM Direct' : 'Internal Showroom Entry'}
                                </span>
                              )}
                            </td>

                            {/* Quantity */}
                            <td className="py-3 px-3 text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold ${
                                  b.is_po_bill
                                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {b.quantity > 0 ? b.quantity : '—'}
                              </span>
                            </td>

                            {/* Purchase Rate (DLP / Cost to Dealer) */}
                            <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {formatCurrency(b.unit_rate)}
                              {b.ex_factory_unit && b.ex_factory_unit !== b.unit_rate ? (
                                <span className="text-[10px] text-slate-400 block font-normal" title="Manufacturer Ex-Factory Cost Before GST">
                                  Ex-Factory: {formatCurrency(b.ex_factory_unit)}
                                </span>
                              ) : b.landed_cost_unit && b.landed_cost_unit !== b.unit_rate ? (
                                <span className="text-[10px] text-slate-400 block font-normal">
                                  Landed: {formatCurrency(b.landed_cost_unit)}
                                </span>
                              ) : null}
                            </td>

                            {/* GST % */}
                            <td className="py-3 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                              {b.gst_percentage !== null && b.gst_percentage !== undefined && b.gst_percentage > 0 ? (
                                <span>{b.gst_percentage}%</span>
                              ) : (
                                '—'
                              )}
                            </td>

                            {/* Total Amount */}
                            <td className="py-3 px-3.5 text-right font-mono font-bold">
                              {b.total_amount > 0 ? (
                                <span className="text-emerald-700 dark:text-emerald-400">
                                  {formatCurrency(b.total_amount)}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-normal text-xs">—</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3 px-3 text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  b.is_po_bill
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300'
                                }`}
                              >
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing{' '}
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {filteredBills.length}
            </span>{' '}
            of {summary?.total_bills_count ?? 0} recorded bills
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-medium rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
