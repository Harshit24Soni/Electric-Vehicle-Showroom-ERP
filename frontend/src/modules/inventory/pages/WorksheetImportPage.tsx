import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  FileSpreadsheet,
  Upload,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  RefreshCw,
  Sliders,
  Layers,
  Car,
  Tag,
  Hash,
  DollarSign,
  Package,
  FileText,
  Eye,
  Database,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  Calculator,
  Check,
  TrendingUp,
  Percent,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  inventoryApi,
  WorkbookInspectionResponse,
  SheetSummary,
  SheetPreviewResponse,
  ParsedPreviewRow,
  ExecuteImportResponse,
  ImportEntireSheetRequest,
  ExecuteImportRequest,
} from '../api/inventoryApi'

interface ErpFieldDef {
  key: string
  label: string
  description: string
  required: boolean
  icon: React.ElementType
}

const ERP_FIELDS: ErpFieldDef[] = [
  { key: 'part_code', label: 'Part Code / SKU', description: 'Unique part number', required: true, icon: Hash },
  { key: 'description', label: 'Part Name / Description', description: 'Name of the spare part', required: true, icon: FileText },
  { key: 'hsn_code', label: 'HSN / SAC Code', description: 'GST billing code', required: false, icon: Tag },
  { key: 'gst_rate', label: 'GST Rate (%)', description: 'Tax percentage (e.g. 18%)', required: false, icon: Percent },
  { key: 'dlp', label: 'DLP / Landed Cost (₹)', description: 'Dealer Landing Price', required: false, icon: DollarSign },
  { key: 'mrp', label: 'Customer Price / MRP (₹)', description: 'Selling price to customer', required: false, icon: DollarSign },
  { key: 'ex_factory', label: 'Ex-Factory Price (₹)', description: 'Manufacturer cost benchmark', required: false, icon: DollarSign },
  { key: 'stock_quantity', label: 'Current Inventory', description: 'Initial stock balance', required: false, icon: Package },
  { key: 'category', label: 'Category', description: 'Part group / category', required: false, icon: Layers },
]

export default function WorksheetImportPage() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // View state: 'one-click' (clean summary) | 'custom-review' (detailed table & column mapping)
  const [activeTab, setActiveTab] = useState<'one-click' | 'custom-review' | 'pricing-demo'>('one-click')
  const [selectedSheetName, setSelectedSheetName] = useState<string>('')
  const [activeFileToken, setActiveFileToken] = useState<string>('default')
  const [activeFileName, setActiveFileName] = useState<string>('')

  // Ingestion settings
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({})
  const [targetModelName, setTargetModelName] = useState<string>('')
  const [updateExisting, setUpdateExisting] = useState<boolean>(true)
  const [updateStock, setUpdateStock] = useState<boolean>(true)
  const [defaultCategory, setDefaultCategory] = useState<string>('Spare Parts')

  // Review table pagination & search
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'READY' | 'WARNING' | 'ERROR'>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  // In-memory cell edits
  const [editedRows, setEditedRows] = useState<Record<number, Partial<ParsedPreviewRow>>>({})
  const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set())

  // Dynamic pricing demo state
  const [demoCost, setDemoCost] = useState<number>(40)
  const [demoPrice, setDemoPrice] = useState<number>(60)
  const [demoNewCost, setDemoNewCost] = useState<number>(50)

  // Import Result modal
  const [importResult, setImportResult] = useState<ExecuteImportResponse | null>(null)

  // 1. Fetch workbook inspection
  const {
    data: workbookData,
    isLoading: isWorkbookLoading,
  } = useQuery<WorkbookInspectionResponse>({
    queryKey: ['worksheet-inspection', activeFileToken],
    queryFn: async () => {
      if (activeFileToken === 'default') {
        return await inventoryApi.inspectDefaultWorkbook()
      }
      throw new Error('Custom token inspection via direct upload')
    },
    enabled: activeFileToken === 'default',
    staleTime: 5 * 60 * 1000,
  })

  // Set default sheet once workbookData is loaded
  useEffect(() => {
    if (workbookData) {
      if (workbookData.file_name) {
        setActiveFileName(workbookData.file_name)
      }
      if (workbookData.sheets.length > 0 && !selectedSheetName) {
        const defaultSheet = workbookData.sheets[0]
        setSelectedSheetName(defaultSheet.name)
        setFieldMapping(defaultSheet.auto_mapping || {})
        if (defaultSheet.sheet_type === 'MODEL_PRICE_LIST') {
          setTargetModelName(defaultSheet.name)
        }
      }
    }
  }, [workbookData, selectedSheetName])

  const currentSheetMeta: SheetSummary | undefined = useMemo(() => {
    if (!workbookData) return undefined
    return workbookData.sheets.find((s) => s.name === selectedSheetName)
  }, [workbookData, selectedSheetName])

  // 2. Fetch sheet preview data for custom-review mode
  const {
    data: previewData,
    isLoading: isPreviewLoading,
    isFetching: isPreviewFetching,
  } = useQuery<SheetPreviewResponse>({
    queryKey: [
      'sheet-preview',
      activeFileToken,
      selectedSheetName,
      fieldMapping,
      currentPage,
      pageSize,
      searchTerm,
      statusFilter,
    ],
    queryFn: async () => {
      if (!selectedSheetName) throw new Error('No sheet selected')
      return await inventoryApi.getSheetPreview({
        file_token: activeFileToken,
        sheet_name: selectedSheetName,
        field_mapping: fieldMapping,
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        filter_status: statusFilter,
      })
    },
    enabled: Boolean(selectedSheetName) && activeTab === 'custom-review',
  })

  useEffect(() => {
    if (previewData?.rows) {
      const validIds = new Set<number>()
      previewData.rows.forEach((r) => {
        if (r.status !== 'ERROR') validIds.add(r.row_id)
      })
      setSelectedRowIds(validIds)
    }
  }, [previewData?.rows])

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => inventoryApi.uploadCustomWorkbook(file),
    onSuccess: (data) => {
      setActiveFileToken(data.file_token)
      setActiveFileName(data.file_name)
      queryClient.setQueryData(['worksheet-inspection', data.file_token], data)
      if (data.sheets.length > 0) {
        setSelectedSheetName(data.sheets[0].name)
        setFieldMapping(data.sheets[0].auto_mapping || {})
      }
      toast.success(`Workbook "${data.file_name}" loaded (${data.sheet_count} sheets found)`)
    },
     
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to upload workbook.'
      toast.error(msg)
    },
  })

  // Full-Sheet Ingestion Mutation (Solves Issue 1: imports all 3,909 rows with 1 click)
  const importEntireSheetMutation = useMutation({
    mutationFn: (payload: ImportEntireSheetRequest) => inventoryApi.importEntireSheet(payload),
    onSuccess: (data) => {
      setImportResult(data)
      queryClient.invalidateQueries({ queryKey: ['master-sheet-items'] })
      queryClient.invalidateQueries({ queryKey: ['model-pricing-matrix'] })
      toast.success(data.message)
    },
     
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Full sheet import failed.'
      toast.error(msg)
    },
  })

  // Batch Ingestion Mutation for selected rows
  const importSelectedRowsMutation = useMutation({
    mutationFn: (payload: ExecuteImportRequest) => inventoryApi.executeWorksheetImport(payload),
    onSuccess: (data) => {
      setImportResult(data)
      queryClient.invalidateQueries({ queryKey: ['master-sheet-items'] })
      queryClient.invalidateQueries({ queryKey: ['model-pricing-matrix'] })
      toast.success(data.message)
    },
     
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Selected rows import failed.'
      toast.error(msg)
    },
  })

  // Handle Sheet selection
  const handleSelectSheet = (sheet: SheetSummary) => {
    setSelectedSheetName(sheet.name)
    setFieldMapping(sheet.auto_mapping || {})
    setCurrentPage(1)
    setEditedRows({})
    if (sheet.sheet_type === 'MODEL_PRICE_LIST') {
      setTargetModelName(sheet.name)
    } else {
      setTargetModelName('')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadMutation.mutate(file)
  }

  // Handle Full Sheet 1-Click Import
  const handleImportEntireSheet = () => {
    if (!selectedSheetName) return
    importEntireSheetMutation.mutate({
      file_token: activeFileToken,
      sheet_name: selectedSheetName,
      field_mapping: Object.keys(fieldMapping).length > 0 ? fieldMapping : undefined,
      target_model_name: targetModelName.trim() || undefined,
      default_category: defaultCategory,
      update_existing: updateExisting,
      update_stock: updateStock,
    })
  }

  // Handle Selected Rows Commit
  const handleImportSelectedRows = () => {
    if (!previewData?.rows) return
    const rowsToCommit: ParsedPreviewRow[] = []
    previewData.rows.forEach((baseRow) => {
      if (selectedRowIds.has(baseRow.row_id)) {
        const edits = editedRows[baseRow.row_id] || {}
        rowsToCommit.push({ ...baseRow, ...edits })
      }
    })

    if (rowsToCommit.length === 0) {
      toast.error('Please select at least one row to import.')
      return
    }

    importSelectedRowsMutation.mutate({
      sheet_name: selectedSheetName,
      target_model_name: targetModelName.trim() || undefined,
      update_existing: updateExisting,
      update_stock: updateStock,
      default_category: defaultCategory,
      rows: rowsToCommit.map((r) => ({
        part_code: r.part_code,
        description: r.description,
        category: r.category || defaultCategory,
        tracking_mode: r.tracking_mode || 'QUANTITY',
        hsn_code: r.hsn_code,
        gst_rate: r.gst_rate,
        ex_factory: r.ex_factory,
        dlp: r.dlp,
        mrp: r.mrp,
        stock_quantity: r.stock_quantity,
        model_prices: r.model_prices,
      })),
    })
  }

  // Live Pricing Calculation Demo (Requirement 2c)
  const demoObservedMargin = useMemo(() => {
    if (demoCost <= 0) return 0
    return Math.round(((demoPrice - demoCost) / demoCost) * 100 * 100) / 100
  }, [demoCost, demoPrice])

  const demoRecomputedSelling = useMemo(() => {
    const exShowroom = Math.round(demoNewCost * (1 + demoObservedMargin / 100) * 100) / 100
    const gst = Math.round(exShowroom * 0.18 * 100) / 100
    const mrp = Math.round((exShowroom + gst) * 100) / 100
    return { exShowroom, gst, mrp }
  }, [demoNewCost, demoObservedMargin])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Header */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <Link to="/inventory" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Inventory</Link>
              <span>/</span>
              <Link to="/inventory/master-sheet" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Master Sheet</Link>
              <span>/</span>
              <span className="text-slate-800 dark:text-slate-200 font-medium">Import Studio</span>
            </nav>
            <div className="flex items-center gap-3">
              <Link
                to="/inventory/master-sheet"
                className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Back to Master Sheet"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div className="p-1.5 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg shadow-sm text-white">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Inventory Ingestion & Pricing Engine</h1>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-semibold">
                    Relational Domain Ingestion
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Multi-model compatibility, auto-computed profit margins, and full-sheet bulk imports
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.xlsm"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              Upload Different File
            </button>
            <Link
              to="/inventory/master-sheet"
              className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              Master Sheet
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-6 py-6 space-y-6 flex-1">
        {/* Source File & Mode Switcher Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Source:</span>
            <span className="text-sm font-medium text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-950 px-3 py-1 rounded-md border border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              {workbookData?.file_name || activeFileName || 'No workbook loaded'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              ({workbookData?.sheet_count || 16} sheets)
            </span>
          </div>

          {/* Clean View Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('one-click')}
              className={`px-3.5 py-1.5 font-medium rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'one-click'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              1-Click Ingestion
            </button>
            <button
              onClick={() => setActiveTab('custom-review')}
              className={`px-3.5 py-1.5 font-medium rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'custom-review'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Review & Customize
            </button>
            <button
              onClick={() => setActiveTab('pricing-demo')}
              className={`px-3.5 py-1.5 font-medium rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'pricing-demo'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-900'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 text-amber-500" />
              Margin Auto-Calculator
            </button>
          </div>
        </div>

        {/* Clean Sheet Ribbon */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              Select Worksheet:
            </span>
            {currentSheetMeta && (
              <span className="text-slate-500 dark:text-slate-400 font-mono">
                Active: <strong className="text-slate-900 dark:text-white">{currentSheetMeta.name}</strong> •{' '}
                {currentSheetMeta.row_count.toLocaleString()} rows • {currentSheetMeta.col_count} columns
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
            {isWorkbookLoading ? (
              <div className="text-xs text-slate-500 py-3 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                Reading sheets...
              </div>
            ) : (
              workbookData?.sheets.map((sheet) => {
                const isActive = sheet.name === selectedSheetName
                return (
                  <button
                    key={sheet.name}
                    onClick={() => handleSelectSheet(sheet)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-white border-blue-300 dark:border-blue-500/70 shadow-sm ring-1 ring-blue-500/30'
                        : 'bg-white dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>{sheet.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-blue-200 dark:bg-blue-500/40 text-blue-800 dark:text-blue-200 font-bold' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {sheet.row_count.toLocaleString()}
                    </span>
                    {sheet.sheet_type === 'MASTER_INVENTORY' && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono">
                        Master
                      </span>
                    )}
                    {sheet.sheet_type === 'MODEL_PRICE_LIST' && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono">
                        Model
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODE 1: ONE-CLICK ENTIRE SHEET INGESTION */}
        {/* ========================================================================= */}
        {activeTab === 'one-click' && currentSheetMeta && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Primary Action Card */}
            <div className="md:col-span-2 space-y-5">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        Full Ingestion: {currentSheetMeta.name}
                      </h2>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold font-mono">
                        {currentSheetMeta.row_count.toLocaleString()} Records
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Imports all {currentSheetMeta.row_count.toLocaleString()} parts directly from the workbook
                      into the relational schema with multi-vehicle compatibility and computed profit margins.
                    </p>
                  </div>
                </div>

                {/* Relational Features Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white block">Multi-Model Pricing Matrix</span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                        Parts are linked to vehicles with individual model prices & margins.
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
                    <TrendingUp className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white block">Auto-Computed Profit Margins</span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                        Observed markup % (e.g. 40 cost $\rightarrow$ 60 selling = 50% margin) is saved.
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
                    <Package className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white block">Full Sheet Scope (All Rows)</span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                        Streams all {currentSheetMeta.row_count.toLocaleString()} rows in batches, not just 50.
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
                    <Database className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-900 dark:text-white block">Relational Deduplication</span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                        Updates existing parts cleanly without creating duplicates.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="pt-2">
                  <button
                    onClick={handleImportEntireSheet}
                    disabled={importEntireSheetMutation.isPending}
                    className="w-full py-4 text-sm font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {importEntireSheetMutation.isPending ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin text-white" />
                        Ingesting all {currentSheetMeta.row_count.toLocaleString()} rows into database...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 text-amber-300" />
                        Import Entire Sheet ({currentSheetMeta.row_count.toLocaleString()} Rows)
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Ingestion Settings Sidebar */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-500" />
                  Ingestion Options
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Link Vehicle Model:
                    </label>
                    <input
                      type="text"
                      value={targetModelName}
                      onChange={(e) => setTargetModelName(e.target.value)}
                      placeholder="e.g. Magnus Neo, Primus (Auto-detected)"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Default Category:
                    </label>
                    <input
                      type="text"
                      value={defaultCategory}
                      onChange={(e) => setDefaultCategory(e.target.value)}
                      placeholder="e.g. Spare Parts"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={updateExisting}
                      onChange={(e) => setUpdateExisting(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-blue-600 focus:ring-0"
                    />
                    <span>Update existing part codes & prices</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={updateStock}
                      onChange={(e) => setUpdateStock(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-blue-600 focus:ring-0"
                    />
                    <span>Sync current inventory to stock balance</span>
                  </label>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => setActiveTab('custom-review')}
                    className="w-full py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 rounded-lg transition-colors"
                  >
                    Customize Column Mappings →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 2: REVIEW & CUSTOMIZE GRID */}
        {/* ========================================================================= */}
        {activeTab === 'custom-review' && (
          <div className="space-y-4">
            {/* Field Mapping Accordion */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-500" />
                  Mail Merge Column Mapping ({selectedSheetName})
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                  {Object.keys(fieldMapping).length} fields mapped
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {ERP_FIELDS.slice(0, 6).map((field) => (
                  <div key={field.key} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{field.label}</span>
                      {field.required && (
                        <span className="text-[10px] text-rose-500 font-semibold">*Required</span>
                      )}
                    </div>
                    <select
                      value={fieldMapping[field.key] || ''}
                      onChange={(e) =>
                        setFieldMapping((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- Unmapped --</option>
                      {currentSheetMeta?.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Filter & Selection Toolbar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setCurrentPage(1)
                    }}
                    placeholder="Search part code or description..."
                    className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none w-56"
                  />
                </div>

                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    statusFilter === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All ({previewData?.counts.total || 0})
                </button>
                <button
                  onClick={() => setStatusFilter('READY')}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    statusFilter === 'READY' ? 'bg-emerald-600 text-white' : 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-white'
                  }`}
                >
                  Ready ({previewData?.counts.ready || 0})
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-slate-500 dark:text-slate-400">
                  Selected on page:{' '}
                  <strong className="text-slate-900 dark:text-white font-mono">{selectedRowIds.size}</strong> rows
                </span>
                <button
                  onClick={handleImportSelectedRows}
                  disabled={importSelectedRowsMutation.isPending || selectedRowIds.size === 0}
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-40 shadow-sm"
                >
                  {importSelectedRowsMutation.isPending ? 'Importing...' : `Import Selected (${selectedRowIds.size})`}
                </button>
              </div>
            </div>

            {/* Review Data Grid */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            previewData?.rows?.length
                              ? previewData.rows.every((r) => selectedRowIds.has(r.row_id))
                              : false
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              const next = new Set(selectedRowIds)
                              previewData?.rows.forEach((r) => next.add(r.row_id))
                              setSelectedRowIds(next)
                            } else {
                              const next = new Set(selectedRowIds)
                              previewData?.rows.forEach((r) => next.delete(r.row_id))
                              setSelectedRowIds(next)
                            }
                          }}
                          className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-blue-600 focus:ring-0"
                        />
                      </th>
                      <th className="p-3 font-semibold">Status</th>
                      <th className="p-3 font-semibold">Part Code *</th>
                      <th className="p-3 font-semibold">Description *</th>
                      <th className="p-3 font-semibold text-right">Cost / DLP (₹)</th>
                      <th className="p-3 font-semibold text-right">Selling MRP (₹)</th>
                      <th className="p-3 font-semibold text-right">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-xs">
                    {isPreviewLoading || isPreviewFetching ? (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-400">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-500 mb-2" />
                          Loading preview rows...
                        </td>
                      </tr>
                    ) : (
                      previewData?.rows.map((row) => {
                        const edits = editedRows[row.row_id] || {}
                        const part_code = edits.part_code !== undefined ? edits.part_code : row.part_code
                        const description = edits.description !== undefined ? edits.description : row.description
                        const dlp = edits.dlp !== undefined ? edits.dlp : row.dlp
                        const mrp = edits.mrp !== undefined ? edits.mrp : row.mrp
                        const stock_quantity =
                          edits.stock_quantity !== undefined ? edits.stock_quantity : row.stock_quantity
                        const isSelected = selectedRowIds.has(row.row_id)

                        return (
                          <tr
                            key={row.row_id}
                            className={`transition-colors ${
                              isSelected ? 'bg-blue-50/70 dark:bg-slate-900/60' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setSelectedRowIds((prev) => {
                                    const next = new Set(prev)
                                    if (next.has(row.row_id)) next.delete(row.row_id)
                                    else next.add(row.row_id)
                                    return next
                                  })
                                }}
                                className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-blue-600 focus:ring-0"
                              />
                            </td>
                            <td className="p-3">
                              {row.status === 'READY' ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-sans font-medium">✓ Ready</span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 font-sans font-medium">⚠ Warning</span>
                              )}
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={part_code}
                                onChange={(e) =>
                                  setEditedRows((prev) => ({
                                    ...prev,
                                    [row.row_id]: { ...prev[row.row_id], part_code: e.target.value },
                                  }))
                                }
                                className="bg-transparent px-2 py-1 rounded text-slate-900 dark:text-white outline-none focus:bg-slate-100 dark:focus:bg-slate-950 focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={description}
                                onChange={(e) =>
                                  setEditedRows((prev) => ({
                                    ...prev,
                                    [row.row_id]: { ...prev[row.row_id], description: e.target.value },
                                  }))
                                }
                                className="w-full bg-transparent px-2 py-1 rounded text-slate-800 dark:text-slate-200 outline-none focus:bg-slate-100 dark:focus:bg-slate-950 focus:ring-1 focus:ring-blue-500 truncate"
                              />
                            </td>
                            <td className="p-2 text-right">
                              <input
                                type="number"
                                value={dlp ?? ''}
                                onChange={(e) =>
                                  setEditedRows((prev) => ({
                                    ...prev,
                                    [row.row_id]: {
                                      ...prev[row.row_id],
                                      dlp: e.target.value ? Number(e.target.value) : null,
                                    },
                                  }))
                                }
                                placeholder="0.00"
                                className="w-20 bg-transparent px-2 py-1 rounded text-right text-slate-700 dark:text-slate-300 outline-none focus:bg-slate-100 dark:focus:bg-slate-950"
                              />
                            </td>
                            <td className="p-2 text-right">
                              <input
                                type="number"
                                value={mrp ?? ''}
                                onChange={(e) =>
                                  setEditedRows((prev) => ({
                                    ...prev,
                                    [row.row_id]: {
                                      ...prev[row.row_id],
                                      mrp: e.target.value ? Number(e.target.value) : null,
                                    },
                                  }))
                                }
                                placeholder="0.00"
                                className="w-20 bg-transparent px-2 py-1 rounded text-right text-emerald-600 dark:text-emerald-400 font-semibold outline-none focus:bg-slate-100 dark:focus:bg-slate-950"
                              />
                            </td>
                            <td className="p-2 text-right text-blue-600 dark:text-blue-400 font-semibold pr-4">
                              {stock_quantity}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-slate-50 dark:bg-slate-950 px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Page {currentPage} of {Math.ceil((previewData?.counts.filtered || 1) / pageSize)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="px-3 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 text-slate-700 dark:text-slate-300 shadow-sm"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={currentPage >= Math.ceil((previewData?.counts.filtered || 1) / pageSize)}
                    className="px-3 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 text-slate-700 dark:text-slate-300 shadow-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODE 3: DYNAMIC PRICING ENGINE & PROFIT MARGIN DEMO */}
        {/* ========================================================================= */}
        {activeTab === 'pricing-demo' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-amber-500" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Dynamic Auto-Pricing Engine Simulator
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Calculates selling price updates in real-time as purchase cost changes, preserving the
                  individually observed profit margin for each spare.
                </p>
              </div>

              {/* Interactive Formula Card */}
              <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  1. Baseline Observed Profit Margin
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Original Cost (₹):</label>
                    <input
                      type="number"
                      value={demoCost}
                      onChange={(e) => setDemoCost(Number(e.target.value) || 1)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-lg p-2.5 text-sm font-mono outline-none shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">Showroom Selling (₹):</label>
                    <input
                      type="number"
                      value={demoPrice}
                      onChange={(e) => setDemoPrice(Number(e.target.value) || 1)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-lg p-2.5 text-sm font-mono outline-none shadow-sm"
                    />
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col justify-center text-center shadow-sm">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Observed Markup</span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      +{demoObservedMargin}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Re-calculation Output */}
              <div className="p-5 bg-blue-50/50 dark:bg-slate-950 rounded-xl border border-blue-200 dark:border-blue-900/40 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    2. When New Purchase Value is Provided
                  </h4>
                  <span className="text-[11px] text-blue-600 dark:text-slate-400 font-medium">Auto-Recomputed</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div>
                    <label className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">
                      New Purchase Value (₹):
                    </label>
                    <input
                      type="number"
                      value={demoNewCost}
                      onChange={(e) => setDemoNewCost(Number(e.target.value) || 1)}
                      className="w-full bg-white dark:bg-slate-900 border border-blue-400 dark:border-blue-500/50 text-slate-900 dark:text-white rounded-lg p-2.5 text-sm font-mono outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                    />
                  </div>

                  <div className="sm:col-span-2 grid grid-cols-2 gap-2 text-center">
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase block">New Ex-Showroom</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                        ₹{demoRecomputedSelling.exShowroom.toFixed(2)}
                      </span>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-gradient-to-tr dark:from-emerald-950/40 dark:to-slate-900 rounded-lg border border-emerald-200 dark:border-emerald-500/30 shadow-sm">
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase block">New MRP (incl. GST)</span>
                      <span className="text-base font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                        ₹{demoRecomputedSelling.mrp.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  Formula: Cost ₹{demoNewCost} $\times$ (1 + {demoObservedMargin}%) = ₹{demoRecomputedSelling.exShowroom.toFixed(2)} + 18% GST $\rightarrow$ ₹{demoRecomputedSelling.mrp.toFixed(2)}.
                  This dynamic engine updates prices automatically during procurement and purchase logs.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SUCCESS CONFIRMATION MODAL */}
        {importResult && (
          <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Ingestion Completed Successfully!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{importResult.message}</p>
              </div>

              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-center font-mono">
                <div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{importResult.created_count}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase mt-0.5">Created</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{importResult.updated_count}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase mt-0.5">Updated</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-500 dark:text-slate-400">{importResult.skipped_count}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase mt-0.5">Skipped</div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Link
                  to="/inventory/master-sheet"
                  className="w-full py-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Open Master Spreadsheet View
                </Link>
                <button
                  onClick={() => setImportResult(null)}
                  className="w-full py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition-colors"
                >
                  Close & Import Another Sheet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
