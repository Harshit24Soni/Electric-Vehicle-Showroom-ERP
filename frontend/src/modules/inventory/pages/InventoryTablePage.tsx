import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Download,
  RotateCw,
  Table as TableIcon,
  CheckCircle2,
  AlertCircle,
  Car,
  Layers,
  Tag,
  DollarSign,
  Package,
  FileSpreadsheet,
  Calculator,
  TrendingUp,
  Percent,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  inventoryApi,
  MasterSheetItem,
  MasterSheetItemCreate,
  MasterSheetItemUpdate,
  ModelPricingRecord,
} from '../api/inventoryApi'

const formatCurrency = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(val)
}

export default function InventoryTablePage() {
  const queryClient = useQueryClient()

  // Primary Tab Navigation
  const [activeTab, setActiveTab] = useState<'catalog' | 'model-matrix' | 'margin-simulator'>('catalog')

  // Filters & Pagination State for Spares Catalog
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedModelFilter, setSelectedModelFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  // Modals & Active Actions
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MasterSheetItem | null>(null)
  const [deletingPartCode, setDeletingPartCode] = useState<string | null>(null)

  // Dedicated Vehicle Model Matrix Filter
  const [matrixModelFilter, setMatrixModelFilter] = useState<string>('ALL')

  // Dynamic Margin Simulator State (Requirement 2c)
  const [simulatorSelectedSpareId, setSimulatorSelectedSpareId] = useState<number | null>(null)
  const [simulatorNewCost, setSimulatorNewCost] = useState<number>(50)
  const [simulatorSourceRef, setSimulatorSourceRef] = useState<string>('Supplier Purchase Invoice')

  // 1. Fetch Master Sheet Items
  const {
    data: items = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<MasterSheetItem[]>({
    queryKey: ['master-sheet-items'],
    queryFn: () => inventoryApi.getMasterSheet(),
  })

  // 2. Fetch active Vehicle Models
  const { data: vehicleModels = [] } = useQuery<string[]>({
    queryKey: ['master-sheet-models'],
    queryFn: () => inventoryApi.getActiveVehicleModels(),
  })

  // 3. Fetch Model Pricing Matrix records
  const { data: matrixRecords = [], isLoading: isMatrixLoading, refetch: refetchMatrix } = useQuery<ModelPricingRecord[]>({
    queryKey: ['model-pricing-matrix'],
    queryFn: () => inventoryApi.getModelPricingMatrix(),
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: MasterSheetItemCreate) => inventoryApi.createMasterSheetItem(payload),
    onSuccess: (data: MasterSheetItem) => {
      queryClient.invalidateQueries({ queryKey: ['master-sheet-items'] })
      queryClient.invalidateQueries({ queryKey: ['model-pricing-matrix'] })
      toast.success(`Part '${data.part_code}' added successfully!`)
      setIsAddModalOpen(false)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to add part record.'
      toast.error(msg)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ partCode, payload }: { partCode: string; payload: MasterSheetItemUpdate }) =>
      inventoryApi.updateMasterSheetItem(partCode, payload),
    onSuccess: (data: MasterSheetItem) => {
      queryClient.invalidateQueries({ queryKey: ['master-sheet-items'] })
      queryClient.invalidateQueries({ queryKey: ['model-pricing-matrix'] })
      toast.success(`Part '${data.part_code}' updated successfully!`)
      setEditingItem(null)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to update part record.'
      toast.error(msg)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (partCode: string) => inventoryApi.deleteMasterSheetItem(partCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-sheet-items'] })
      queryClient.invalidateQueries({ queryKey: ['model-pricing-matrix'] })
      toast.success('Part deleted successfully!')
      setDeletingPartCode(null)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to delete part.'
      toast.error(msg)
    },
  })

  // Dynamic Purchase Cost & Auto-Pricing Mutation (Requirement 2c)
  const applyCostMutation = useMutation({
    mutationFn: (payload: { spare_id: number; new_cost: number; source_reference?: string }) =>
      inventoryApi.applyPurchaseCost(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['master-sheet-items'] })
      queryClient.invalidateQueries({ queryKey: ['model-pricing-matrix'] })
      toast.success(res.message || 'Pricing recomputed & updated successfully!')
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to apply new purchase cost.'
      toast.error(msg)
    },
  })

  // Unique categories for filtering
  const categories = useMemo(() => {
    const set = new Set<string>()
    items.forEach((item: MasterSheetItem) => {
      if (item.category) set.add(item.category)
    })
    return Array.from(set).sort()
  }, [items])

  // Filtered rows for Catalog
  const filteredItems = useMemo(() => {
    return items.filter((item: MasterSheetItem) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        const matchesCode = item.part_code?.toLowerCase().includes(q)
        const matchesDesc = item.description?.toLowerCase().includes(q)
        const matchesHsn = item.hsn_code?.toLowerCase().includes(q)
        if (!matchesCode && !matchesDesc && !matchesHsn) return false
      }
      if (selectedCategory && item.category !== selectedCategory) {
        return false
      }
      if (selectedModelFilter) {
        const isCompatible = item.compatible_models?.includes(selectedModelFilter)
        if (!isCompatible) return false
      }
      return true
    })
  }, [items, searchTerm, selectedCategory, selectedModelFilter])

  // Pagination for Catalog
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredItems.slice(start, start + pageSize)
  }, [filteredItems, currentPage, pageSize])

  // Reset page when filter changes
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCategory, selectedModelFilter, pageSize])

  // Active Simulator Spare
  const simulatorSpare = useMemo(() => {
    if (!simulatorSelectedSpareId) {
      return items[0] || null
    }
    return items.find((i) => i.spare_id === simulatorSelectedSpareId) || items[0] || null
  }, [items, simulatorSelectedSpareId])

  // Initialize simulator cost when selected spare changes
  React.useEffect(() => {
    if (simulatorSpare) {
      const baseCost = Number(simulatorSpare.ex_factory || simulatorSpare.dlp || 40)
      setSimulatorNewCost(Math.round(baseCost * 1.15) || 50)
    }
  }, [simulatorSpare?.spare_id])

  // Simulator computed values (Requirement 2c)
  const simulatorResults = useMemo(() => {
    if (!simulatorSpare) return null
    const cost = Number(simulatorSpare.ex_factory || simulatorSpare.dlp || 0)
    const selling = Number(simulatorSpare.ex_showroom || simulatorSpare.mrp || 0)
    const margin = simulatorSpare.profit_margin_percent != null
      ? Number(simulatorSpare.profit_margin_percent)
      : (cost > 0 && selling > 0 ? Math.round(((selling - cost) / cost) * 10000) / 100 : 50.0)

    const newCost = Number(simulatorNewCost) || 0
    const gstRate = Number(simulatorSpare.gst_rate) || 18.0

    const computedExShowroom = Math.round(newCost * (1.0 + margin / 100.0) * 100) / 100
    const gstAmount = Math.round(computedExShowroom * (gstRate / 100.0) * 100) / 100
    const computedMrp = Math.round((computedExShowroom + gstAmount) * 100) / 100
    const profitPerUnit = Math.round((computedExShowroom - newCost) * 100) / 100

    return {
      recordedCost: cost,
      recordedSelling: selling,
      recordedMargin: margin,
      gstRate,
      newCost,
      computedExShowroom,
      gstAmount,
      computedMrp,
      profitPerUnit,
    }
  }, [simulatorSpare, simulatorNewCost])

  // CSV Export handler
  const handleExportCSV = () => {
    if (!filteredItems.length) {
      toast.error('No items to export')
      return
    }

    const headers = [
      'Part Code',
      'Description',
      'Category',
      'HSN Code',
      'GST Rate (%)',
      'Cost / Ex-Factory (INR)',
      'DLP (INR)',
      'Ex-Showroom (INR)',
      'MRP (INR)',
      'Profit Margin (%)',
      'Stock Qty',
      ...vehicleModels.map((vm: string) => `${vm} Price`),
      'Remarks',
    ]

    const csvRows = filteredItems.map((item: MasterSheetItem) => {
      const modelCols = vehicleModels.map((vm: string) => {
        const p = item.model_prices?.[vm] ?? item[vm]
        return p !== null && p !== undefined ? String(p) : ''
      })

      return [
        `"${item.part_code || ''}"`,
        `"${(item.description || '').replace(/"/g, '""')}"`,
        `"${item.category || ''}"`,
        `"${item.hsn_code || ''}"`,
        item.gst_rate ?? '',
        item.ex_factory ?? '',
        item.dlp ?? '',
        item.ex_showroom ?? '',
        item.mrp ?? '',
        item.profit_margin_percent ?? '',
        item.stock_quantity ?? 0,
        ...modelCols,
        `"${(item.remarks || '').replace(/"/g, '""')}"`,
      ].join(',')
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvRows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Master_Inventory_Sheet_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Spreadsheet exported to CSV!')
  }

  // Filtered Model Matrix records
  const filteredMatrix = useMemo(() => {
    return matrixRecords.filter((rec) => {
      if (matrixModelFilter !== 'ALL' && rec.model_name !== matrixModelFilter) {
        return false
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        const matchesCode = rec.part_code?.toLowerCase().includes(q)
        const matchesName = rec.part_name?.toLowerCase().includes(q)
        if (!matchesCode && !matchesName) return false
      }
      return true
    })
  }, [matrixRecords, matrixModelFilter, searchTerm])

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 p-4 md:p-6 space-y-4 text-slate-900 dark:text-slate-100 animate-fade-in">
      {/* ERP Standard Header with Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 px-5 py-4 rounded-xl shadow-sm border border-slate-200/80 dark:border-slate-800">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <Link to="/inventory" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Inventory</Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-medium">Master Sheet</span>
          </nav>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <TableIcon className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Master Inventory Sheet</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              Live Data Grid
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
              {items.length} Parts
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Vehicle model compatibility, multi-model pricing matrix, and dynamic margin calculation.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              refetch()
              refetchMatrix()
            }}
            disabled={isRefetching}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition"
            title="Refresh Data"
            aria-label="Refresh Data"
          >
            <RotateCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>

          <Link
            to="/inventory/import"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs rounded-lg border border-slate-200 dark:border-slate-700 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500" />
            Import Studio
          </Link>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-medium text-xs border border-slate-200 dark:border-slate-700 rounded-lg transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-xs rounded-lg shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Part Row
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 rounded-xl shadow-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 py-4 px-4 font-semibold text-sm border-b-2 transition whitespace-nowrap ${
            activeTab === 'catalog'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          Spares Catalog & Pricing
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
            {filteredItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('model-matrix')}
          className={`flex items-center gap-2 py-4 px-4 font-semibold text-sm border-b-2 transition whitespace-nowrap ${
            activeTab === 'model-matrix'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Car className="w-4 h-4" />
          Vehicle Model Pricing Matrix
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono">
            {matrixRecords.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('margin-simulator')}
          className={`flex items-center gap-2 py-4 px-4 font-semibold text-sm border-b-2 transition whitespace-nowrap ${
            activeTab === 'margin-simulator'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Calculator className="w-4 h-4" />
          Margin Auto-Calculator & Cost Inward
        </button>
      </div>

      {/* TAB 1: SPARES CATALOG & PRICING */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Part Rows</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{items.length}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 rounded-lg">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Categories</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{categories.length}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">EV Models Linked</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{vehicleModels.length}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Filtered View</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{filteredItems.length} records</p>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-1 flex-col sm:flex-row items-center gap-3 w-full">
              {/* Search Box */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Part Code, Name or HSN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition"
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

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-48 py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition"
              >
                <option value="">All Categories ({categories.length})</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* EV Model Filter */}
              {vehicleModels.length > 0 && (
                <select
                  value={selectedModelFilter}
                  onChange={(e) => setSelectedModelFilter(e.target.value)}
                  className="w-full sm:w-48 py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition"
                >
                  <option value="">All EV Models ({vehicleModels.length})</option>
                  {vehicleModels.map((vm: string) => (
                    <option key={vm} value={vm}>
                      Model: {vm}
                    </option>
                  ))}
                </select>
              )}

              {(searchTerm || selectedCategory || selectedModelFilter) && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedCategory('')
                    setSelectedModelFilter('')
                  }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium px-2 py-1 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded"
                >
                  Reset Filters
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Per Page:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="py-1 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-2">
                Showing <span className="text-slate-900 dark:text-white font-bold">{filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredItems.length)}</span> of {filteredItems.length}
              </div>
            </div>
          </div>

          {/* Clean Data Grid Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh]">
              <table className="w-full text-left text-sm border-collapse">
                {/* Sticky Table Header */}
                <thead className="bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                    <th className="py-3.5 px-4 min-w-[130px]">Part Code</th>
                    <th className="py-3.5 px-4 min-w-[200px]">Description</th>
                    <th className="py-3.5 px-4 min-w-[120px]">Category</th>
                    <th className="py-3.5 px-4 min-w-[100px]">HSN Code</th>
                    <th className="py-3.5 px-3 min-w-[80px] text-right">GST %</th>
                    <th className="py-3.5 px-4 min-w-[110px] text-right">Ex-Factory</th>
                    <th className="py-3.5 px-4 min-w-[110px] text-right">DLP (Cost)</th>
                    <th className="py-3.5 px-4 min-w-[110px] text-right">MRP (Retail)</th>
                    <th className="py-3.5 px-4 min-w-[110px] text-center">Observed Margin</th>
                    <th className="py-3.5 px-3 min-w-[80px] text-center">Stock</th>
                    <th className="py-3.5 px-4 min-w-[180px]">Vehicle Compatibility</th>
                    <th className="py-3.5 px-4 min-w-[120px] text-center sticky right-0 bg-slate-100/95 dark:bg-slate-800/95 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                      Actions
                    </th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={13} className="py-12 text-center text-slate-500 dark:text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RotateCw className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
                          <p className="text-sm font-medium">Loading Master Spreadsheet...</p>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="py-12 text-center text-slate-500 dark:text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">No inventory parts found</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            {searchTerm || selectedCategory
                              ? 'Try adjusting your search or filters.'
                              : 'Click "Add Part Row" above or import a worksheet.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item: MasterSheetItem, idx: number) => {
                      const absoluteIdx = (currentPage - 1) * pageSize + idx + 1
                      const margin = item.profit_margin_percent

                      return (
                        <tr
                          key={item.spare_id}
                          className={`group hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 transition-colors ${
                            idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-850/40'
                          }`}
                        >
                          {/* Index */}
                          <td className="py-3 px-4 text-center text-xs text-slate-400 dark:text-slate-500 font-mono">{absoluteIdx}</td>

                          {/* Part Code */}
                          <td className="py-3 px-4">
                            <span className="font-mono font-semibold text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/50 px-2.5 py-1 rounded-md">
                              {item.part_code}
                            </span>
                          </td>

                          {/* Description */}
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900 dark:text-white">{item.description}</div>
                            {item.remarks && <div className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-xs">{item.remarks}</div>}
                          </td>

                          {/* Category */}
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {item.category || 'General'}
                            </span>
                          </td>

                          {/* HSN Code */}
                          <td className="py-3 px-4">
                            {item.hsn_code ? (
                              <span className="font-mono text-xs text-slate-600 dark:text-slate-400 bg-amber-50/80 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/50 px-2 py-0.5 rounded">
                                {item.hsn_code}
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </td>

                          {/* GST % */}
                          <td className="py-3 px-3 text-right text-xs text-slate-600 dark:text-slate-400 font-medium">
                            {item.gst_rate !== null && item.gst_rate !== undefined ? `${item.gst_rate}%` : '18%'}
                          </td>

                          {/* Ex-Factory */}
                          <td className="py-3 px-4 text-right font-mono text-xs text-slate-600 dark:text-slate-400">
                            {formatCurrency(item.ex_factory)}
                          </td>

                          {/* DLP */}
                          <td className="py-3 px-4 text-right font-mono text-xs font-medium text-slate-800 dark:text-slate-200">
                            {formatCurrency(item.dlp)}
                          </td>

                          {/* MRP */}
                          <td className="py-3 px-4 text-right font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(item.mrp || item.ex_showroom)}
                          </td>

                          {/* Observed Profit Margin */}
                          <td className="py-3 px-4 text-center">
                            {margin !== null && margin !== undefined ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  margin >= 35
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                                    : margin >= 15
                                    ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
                                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                                }`}
                              >
                                <TrendingUp className="w-3 h-3" />
                                {margin > 0 ? `+${margin}%` : `${margin}%`}
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                            )}
                          </td>

                          {/* Stock Quantity */}
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                item.stock_quantity > 0
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {item.stock_quantity}
                            </span>
                          </td>

                          {/* Compatible Vehicles */}
                          <td className="py-3 px-4">
                            {item.compatible_models && item.compatible_models.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {item.compatible_models.map((m: string) => (
                                  <span
                                    key={m}
                                    className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50 rounded text-[11px] font-medium"
                                  >
                                    {m}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 dark:text-slate-500 italic">Universal / General</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center sticky right-0 bg-white dark:bg-slate-900 group-hover:bg-indigo-50/40 dark:group-hover:bg-indigo-950/30 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setSimulatorSelectedSpareId(item.spare_id)
                                  setActiveTab('margin-simulator')
                                }}
                                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition"
                                title="Recompute Margin & Inward Cost"
                              >
                                <Calculator className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingItem(item)}
                                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition"
                                title="Edit Part Row"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeletingPartCode(item.part_code)}
                                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                                title="Delete Part"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Page <span className="font-bold text-slate-800 dark:text-slate-200">{currentPage}</span> of {totalPages}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 disabled:pointer-events-none transition"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum = i + 1
                      if (totalPages > 5 && currentPage > 3) {
                        pageNum = Math.min(totalPages, currentPage - 2 + i)
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-xs font-semibold transition ${
                            currentPage === pageNum
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 text-slate-600 hover:bg-white border border-slate-200 rounded-lg disabled:opacity-40 disabled:pointer-events-none transition"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: VEHICLE MODEL COMPATIBILITY & PRICING MATRIX */}
      {activeTab === 'model-matrix' && (
        <div className="space-y-6">
          <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-5 flex items-start gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-sm">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-indigo-950 dark:text-indigo-100">Relational Vehicle Model Pricing Matrix</h2>
              <p className="text-sm text-indigo-800/80 dark:text-indigo-300 mt-1">
                Each spare part is linked to one or multiple vehicle models (e.g. Magnus Neo, Primus, Nexus).
                Model-specific prices vary per model, and our pricing engine calculates each observed profit margin individually.
              </p>
            </div>
          </div>

          {/* Model Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setMatrixModelFilter('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
                matrixModelFilter === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
            >
              All Models ({matrixRecords.length})
            </button>
            {vehicleModels.map((vm) => {
              const count = matrixRecords.filter((r) => r.model_name === vm).length
              return (
                <button
                  key={vm}
                  onClick={() => setMatrixModelFilter(vm)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition shrink-0 ${
                    matrixModelFilter === vm
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750'
                  }`}
                >
                  {vm} ({count})
                </button>
              )
            })}
          </div>

          {/* Matrix Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh]">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-100/95 dark:bg-slate-800/95 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                    <th className="py-3.5 px-4 min-w-[130px]">Part Code</th>
                    <th className="py-3.5 px-4 min-w-[200px]">Part Name</th>
                    <th className="py-3.5 px-4 min-w-[140px]">Vehicle Model</th>
                    <th className="py-3.5 px-4 min-w-[110px] text-right">Model Cost</th>
                    <th className="py-3.5 px-4 min-w-[110px] text-right">Model DLP</th>
                    <th className="py-3.5 px-4 min-w-[120px] text-right">Model Ex-Showroom</th>
                    <th className="py-3.5 px-4 min-w-[120px] text-right">Customer MRP</th>
                    <th className="py-3.5 px-4 min-w-[110px] text-center">Observed Margin</th>
                    <th className="py-3.5 px-4 min-w-[90px] text-center">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isMatrixLoading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500 dark:text-slate-400">
                        <RotateCw className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
                        <p>Loading Model Pricing Matrix...</p>
                      </td>
                    </tr>
                  ) : filteredMatrix.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500 dark:text-slate-400">
                        <AlertCircle className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300">No model-specific records found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredMatrix.map((rec, idx) => (
                      <tr key={rec.compatibility_id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition">
                        <td className="py-3 px-4 text-center font-mono text-xs text-slate-400 dark:text-slate-500">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-xs text-indigo-700 dark:text-indigo-300">
                          {rec.part_code || '—'}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{rec.part_name}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50">
                            <Car className="w-3.5 h-3.5 text-indigo-500" />
                            {rec.model_name}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs text-slate-600 dark:text-slate-400">
                          {formatCurrency(rec.ex_factory_price)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs font-medium text-slate-800 dark:text-slate-200">
                          {formatCurrency(rec.dlp)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                          {formatCurrency(rec.ex_showroom_price)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(rec.customer_mrp)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {rec.profit_margin_percent !== null && rec.profit_margin_percent !== undefined ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                              +{rec.profit_margin_percent}%
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {rec.stock_quantity}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DYNAMIC MARGIN AUTO-CALCULATOR & COST INWARD (Requirement 2c) */}
      {activeTab === 'margin-simulator' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl p-6 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur">
                <Calculator className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Dynamic Margin Auto-Computing Engine</h2>
                <p className="text-sm text-indigo-100 mt-1">
                  When new supplier purchase values arrive (e.g. Ex-Factory ₹40 $\rightarrow$ ₹50), this engine preserves each
                  part’s observed profit margin (+50.0%) and automatically updates Ex-Showroom (₹75.00) and Customer MRP (₹88.50).
                </p>
              </div>
            </div>
          </div>

          {/* Simulator Content Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Select Part */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Select Part to Update
              </h3>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Quick search part to test..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Part List for selection */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl">
                {filteredItems.slice(0, 15).map((part) => (
                  <button
                    key={part.spare_id}
                    onClick={() => setSimulatorSelectedSpareId(part.spare_id)}
                    className={`w-full p-3 text-left transition flex items-center justify-between ${
                      simulatorSpare?.spare_id === part.spare_id
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-l-4 border-indigo-600'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div>
                      <div className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300">{part.part_code}</div>
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
                        {part.description}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{formatCurrency(part.mrp)}</div>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        {part.profit_margin_percent ? `+${part.profit_margin_percent}%` : 'Standard'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Recorded Baseline Card */}
              {simulatorResults && (
                <div className="p-4 bg-slate-50 dark:bg-slate-850/60 rounded-xl border border-slate-200/70 dark:border-slate-800 space-y-2">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Current Baseline in ERP
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400">Base Cost / Ex-Factory:</span>
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(simulatorResults.recordedCost)}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Base Ex-Showroom:</span>
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(simulatorResults.recordedSelling)}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Observed Margin:</span>
                      <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        +{simulatorResults.recordedMargin}%
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Applicable GST:</span>
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{simulatorResults.gstRate}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Inward Cost Entry & Live Projected Auto-Calculation */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  New Purchase Value Inward Entry
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enter new invoiced purchase cost. The selling price and model pricing recompute instantly.
                </p>
              </div>

              {simulatorResults && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        New Purchase Inward Cost (₹) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={simulatorNewCost}
                          onChange={(e) => setSimulatorNewCost(parseFloat(e.target.value) || 0)}
                          className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-indigo-300 dark:border-indigo-600 rounded-xl font-mono font-bold text-lg text-indigo-900 dark:text-indigo-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Invoice / Inward Reference
                      </label>
                      <input
                        type="text"
                        value={simulatorSourceRef}
                        onChange={(e) => setSimulatorSourceRef(e.target.value)}
                        placeholder="e.g. PO-2026-OCT-882"
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Auto-Recomputation Preview Box */}
                  <div className="p-5 bg-gradient-to-tr from-slate-900 to-indigo-950 text-white rounded-2xl shadow-lg space-y-4">
                    <div className="flex items-center justify-between border-b border-indigo-800/60 pb-3">
                      <div>
                        <span className="text-xs text-indigo-300 uppercase tracking-wider font-semibold">
                          Auto-Computed Pricing Engine
                        </span>
                        <h4 className="text-lg font-bold">{simulatorSpare?.description}</h4>
                      </div>
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full text-xs font-bold">
                        Margin Preserved: +{simulatorResults.recordedMargin}%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                      <div className="bg-white/10 p-3 rounded-xl backdrop-blur">
                        <span className="text-[11px] text-indigo-200">New Cost (INR)</span>
                        <p className="text-lg font-mono font-bold text-white mt-0.5">
                          {formatCurrency(simulatorResults.newCost)}
                        </p>
                      </div>

                      <div className="bg-white/10 p-3 rounded-xl backdrop-blur">
                        <span className="text-[11px] text-indigo-200">Ex-Showroom Price</span>
                        <p className="text-lg font-mono font-bold text-indigo-300 mt-0.5">
                          {formatCurrency(simulatorResults.computedExShowroom)}
                        </p>
                      </div>

                      <div className="bg-white/10 p-3 rounded-xl backdrop-blur">
                        <span className="text-[11px] text-indigo-200">18% GST Amount</span>
                        <p className="text-lg font-mono font-bold text-indigo-300 mt-0.5">
                          {formatCurrency(simulatorResults.gstAmount)}
                        </p>
                      </div>

                      <div className="bg-emerald-500/20 border border-emerald-500/40 p-3 rounded-xl backdrop-blur">
                        <span className="text-[11px] text-emerald-300">Customer MRP</span>
                        <p className="text-xl font-mono font-bold text-emerald-400 mt-0.5">
                          {formatCurrency(simulatorResults.computedMrp)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-indigo-200/80 pt-1 border-t border-indigo-900">
                      <span>Unit Profit: <strong className="text-white">{formatCurrency(simulatorResults.profitPerUnit)}</strong></span>
                      <span>Formula: <code className="text-indigo-300">Cost × (1 + {simulatorResults.recordedMargin}%) + GST</code></span>
                    </div>
                  </div>

                  {/* Impact on Compatible Vehicle Models */}
                  {simulatorSpare?.compatible_models && simulatorSpare.compatible_models.length > 0 && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Car className="w-4 h-4 text-indigo-600" />
                        Linked Vehicle Models Automatically Synchronized:
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {simulatorSpare.compatible_models.map((modelName: string) => (
                          <div
                            key={modelName}
                            className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs shadow-xs"
                          >
                            <span className="font-semibold text-slate-800">{modelName}</span>
                            <div className="flex items-center justify-between text-slate-500 text-[11px] mt-1">
                              <span>Price:</span>
                              <span className="font-mono font-bold text-indigo-700">
                                {formatCurrency(simulatorResults.computedMrp)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Commit Button */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={() => {
                        if (!simulatorSpare) return
                        applyCostMutation.mutate({
                          spare_id: simulatorSpare.spare_id,
                          new_cost: simulatorNewCost,
                          source_reference: simulatorSourceRef,
                        })
                      }}
                      disabled={applyCostMutation.isPending}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-emerald-200 transition disabled:opacity-50"
                    >
                      {applyCostMutation.isPending ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin" />
                          Recomputing & Updating ERP...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Apply & Commit New Pricing to Database
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD PART MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Add Master Inventory Part</h3>
                  <p className="text-xs text-slate-500">Create new part with pricing & model compatibility</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const formData = new FormData(form)

                const mrpVal = formData.get('mrp') ? parseFloat(formData.get('mrp') as string) : undefined
                const dlpVal = formData.get('dlp') ? parseFloat(formData.get('dlp') as string) : undefined
                const exFactoryVal = formData.get('ex_factory') ? parseFloat(formData.get('ex_factory') as string) : undefined

                const payload: MasterSheetItemCreate = {
                  part_code: (formData.get('part_code') as string).trim(),
                  description: (formData.get('description') as string).trim(),
                  category: (formData.get('category') as string) || 'General',
                  hsn_code: (formData.get('hsn_code') as string) || null,
                  gst_rate: formData.get('gst_rate') ? parseFloat(formData.get('gst_rate') as string) : 18.0,
                  ex_factory: exFactoryVal,
                  dlp: dlpVal,
                  mrp: mrpVal,
                  remarks: (formData.get('remarks') as string) || null,
                  compatible_models: formData.getAll('compatible_models') as string[],
                }
                createMutation.mutate(payload)
              }}
              className="p-6 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Part Code / SKU *</label>
                  <input
                    type="text"
                    name="part_code"
                    required
                    placeholder="e.g. SP-BRK-001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Part Description *</label>
                  <input
                    type="text"
                    name="description"
                    required
                    placeholder="e.g. Front Disc Brake Pad Set"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    name="category"
                    placeholder="e.g. Brakes"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">HSN Code</label>
                  <input
                    type="text"
                    name="hsn_code"
                    placeholder="e.g. 87141090"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GST Rate (%)</label>
                  <input
                    type="number"
                    name="gst_rate"
                    step="0.1"
                    defaultValue={18}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ex-Factory Price (₹)</label>
                  <input
                    type="number"
                    name="ex_factory"
                    step="0.01"
                    placeholder="450.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">DLP / Landed Cost (₹)</label>
                  <input
                    type="number"
                    name="dlp"
                    step="0.01"
                    placeholder="500.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">MRP / Retail Price (₹)</label>
                  <input
                    type="number"
                    name="mrp"
                    step="0.01"
                    placeholder="750.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Compatible Vehicle Models */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Compatible EV Models</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-36 overflow-y-auto">
                  {vehicleModels.map((vm) => (
                    <label key={vm} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        name="compatible_models"
                        value={vm}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{vm}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks / Notes</label>
                <input
                  type="text"
                  name="remarks"
                  placeholder="e.g. Standard OEM specification"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-md shadow-indigo-100 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating Part...' : 'Create Part'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PART MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Edit Part: {editingItem.part_code}</h3>
                  <p className="text-xs text-slate-500">Update pricing, description and vehicle compatibility</p>
                </div>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const formData = new FormData(form)

                const mrpVal = formData.get('mrp') ? parseFloat(formData.get('mrp') as string) : undefined
                const dlpVal = formData.get('dlp') ? parseFloat(formData.get('dlp') as string) : undefined
                const exFactoryVal = formData.get('ex_factory') ? parseFloat(formData.get('ex_factory') as string) : undefined

                const payload: MasterSheetItemUpdate = {
                  description: (formData.get('description') as string).trim(),
                  category: (formData.get('category') as string) || 'General',
                  hsn_code: (formData.get('hsn_code') as string) || null,
                  gst_rate: formData.get('gst_rate') ? parseFloat(formData.get('gst_rate') as string) : 18.0,
                  ex_factory: exFactoryVal,
                  dlp: dlpVal,
                  mrp: mrpVal,
                  remarks: (formData.get('remarks') as string) || null,
                  compatible_models: formData.getAll('compatible_models') as string[],
                }
                updateMutation.mutate({ partCode: editingItem.part_code, payload })
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Part Description *</label>
                <input
                  type="text"
                  name="description"
                  required
                  defaultValue={editingItem.description}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    name="category"
                    defaultValue={editingItem.category}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">HSN Code</label>
                  <input
                    type="text"
                    name="hsn_code"
                    defaultValue={editingItem.hsn_code || ''}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GST Rate (%)</label>
                  <input
                    type="number"
                    name="gst_rate"
                    step="0.1"
                    defaultValue={editingItem.gst_rate || 18}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ex-Factory Price (₹)</label>
                  <input
                    type="number"
                    name="ex_factory"
                    step="0.01"
                    defaultValue={editingItem.ex_factory || ''}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">DLP / Landed Cost (₹)</label>
                  <input
                    type="number"
                    name="dlp"
                    step="0.01"
                    defaultValue={editingItem.dlp || ''}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">MRP / Retail Price (₹)</label>
                  <input
                    type="number"
                    name="mrp"
                    step="0.01"
                    defaultValue={editingItem.mrp || ''}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Compatible Vehicle Models */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Compatible EV Models</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-36 overflow-y-auto">
                  {vehicleModels.map((vm) => {
                    const isChecked = editingItem.compatible_models?.includes(vm)
                    return (
                      <label key={vm} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          name="compatible_models"
                          value={vm}
                          defaultChecked={isChecked}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{vm}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks / Notes</label>
                <input
                  type="text"
                  name="remarks"
                  defaultValue={editingItem.remarks || ''}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-md shadow-indigo-100 disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingPartCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete Part Record</h3>
                <p className="text-xs text-slate-500">This will soft-delete the record safely from ERP inventory</p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Are you sure you want to delete part <strong className="font-mono text-slate-900">{deletingPartCode}</strong>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingPartCode(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletingPartCode)}
                disabled={deleteMutation.isPending}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm rounded-xl shadow-md shadow-rose-200 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
