import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Car,
  Package,
  LayoutDashboard,
  History,
  Layers,
  QrCode,
  Table as TableIcon,
  Search,
  Plus,
  FileSpreadsheet,
  PackageSearch,
  Warehouse,
  ArrowLeftRight,
  X,
  ExternalLink,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { inventoryApi, SpareMovementCreate } from '../api/inventoryApi'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import toast from 'react-hot-toast'

// Import subcomponents
import InventoryDashboard from '../components/InventoryDashboard'
import InventoryStock from '../components/InventoryStock'
import InventoryBatches from '../components/InventoryBatches'
import InventorySerials from '../components/InventorySerials'
import InventoryMovements from '../components/InventoryMovements'
import InventoryTags from '../components/InventoryTags'
import { SparePartsList } from '../components/SparePartsList'
import SpareMovementForm from '../components/SpareMovementForm'
import VehicleTransferModal from '../components/VehicleTransferModal'

interface Vehicle {
  vehicle_id: number
  chassis_no: string
  motor_no?: string
  battery_no?: string
  vehicle_status: string
  color: string
  model?: {
    model_id: number
    model_name: string
    manufacturer: string
  }
}

type InventoryTab =
  | 'dashboard'
  | 'vehicles'
  | 'spares'
  | 'stock'
  | 'movements'
  | 'batches'
  | 'serials'
  | 'tags'

function VehicleInventory() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [transferChassis, setTransferChassis] = useState<string | null>(null)

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles-inventory', statusFilter],
    queryFn: async () => {
      const result = await api.get<Vehicle[]>('/master/vehicles')
      if (statusFilter) {
        return result.filter((v: Vehicle) => v.vehicle_status === statusFilter)
      }
      return result
    },
  })

  const filteredVehicles = vehicles.filter((v: Vehicle) => {
    const q = searchTerm.toLowerCase().trim()
    if (!q) return true
    return (
      v.chassis_no?.toLowerCase().includes(q) ||
      v.model?.model_name?.toLowerCase().includes(q) ||
      v.model?.manufacturer?.toLowerCase().includes(q) ||
      v.color?.toLowerCase().includes(q) ||
      (v.motor_no && v.motor_no.toLowerCase().includes(q))
    )
  })

  const statusCounts = {
    all: vehicles.length,
    IN_STOCK: vehicles.filter((v: Vehicle) => v.vehicle_status === 'IN_STOCK').length,
    BOOKED: vehicles.filter((v: Vehicle) => v.vehicle_status === 'BOOKED').length,
    SOLD: vehicles.filter((v: Vehicle) => v.vehicle_status === 'SOLD').length,
    IN_SERVICE: vehicles.filter((v: Vehicle) => v.vehicle_status === 'IN_SERVICE').length,
  }

  const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'info' | 'neutral' => {
    switch (status) {
      case 'IN_STOCK':
        return 'success'
      case 'BOOKED':
        return 'warning'
      case 'SOLD':
        return 'info'
      case 'IN_SERVICE':
        return 'neutral'
      default:
        return 'neutral'
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Space-Efficient Vehicle Inventory Container */}
      <div className="rounded-xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {/* Compact Integrated Toolbar */}
        <div className="p-3 sm:p-4 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar text-xs">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === ''
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              All Vehicles
              <span className="font-mono text-[11px] opacity-70">({statusCounts.all})</span>
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === 'IN_STOCK' ? '' : 'IN_STOCK')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'IN_STOCK'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              In Stock
              <span className="font-mono text-[11px] opacity-80">({statusCounts.IN_STOCK})</span>
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === 'BOOKED' ? '' : 'BOOKED')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'BOOKED'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              Booked
              <span className="font-mono text-[11px] opacity-80">({statusCounts.BOOKED})</span>
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === 'SOLD' ? '' : 'SOLD')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'SOLD'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              Sold
              <span className="font-mono text-[11px] opacity-80">({statusCounts.SOLD})</span>
            </button>

            <button
              onClick={() => setStatusFilter(statusFilter === 'IN_SERVICE' ? '' : 'IN_SERVICE')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'IN_SERVICE'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
              Service / Demo
              <span className="font-mono text-[11px] opacity-80">({statusCounts.IN_SERVICE})</span>
            </button>
          </div>

          {/* Search & Transfer Actions */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search chassis, model, motor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setTransferChassis('')}
              className="flex items-center gap-1.5 h-8 text-xs shrink-0"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Transfer Vehicle
            </Button>
          </div>
        </div>

        {/* Fleet Table Content */}
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        ) : filteredVehicles.length === 0 ? (
          <EmptyState
            icon={Car}
            title="No vehicles found"
            description={
              statusFilter || searchTerm
                ? 'No vehicle records matched your active filters. Try adjusting your search query.'
                : 'No vehicles are currently registered in this showroom inventory.'
            }
            actionLabel={statusFilter || searchTerm ? 'Reset Filters' : undefined}
            onAction={
              statusFilter || searchTerm
                ? () => {
                    setStatusFilter('')
                    setSearchTerm('')
                  }
                : undefined
            }
            className="py-12"
          />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Vehicle Model</th>
                  <th>Chassis No (VIN)</th>
                  <th>Color / Finish</th>
                  <th>Motor No</th>
                  <th>Battery No</th>
                  <th className="text-right">Status</th>
                  <th className="text-right">Transfer</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle: Vehicle) => (
                  <tr
                    key={vehicle.vehicle_id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">
                          {vehicle.model?.model_name || 'Generic EV Model'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {vehicle.model?.manufacturer || 'OEM Dealership'}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                        {vehicle.chassis_no}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-slate-300 dark:border-slate-600 shrink-0"
                          style={{
                            backgroundColor:
                              vehicle.color?.toLowerCase() === 'white'
                                ? '#ffffff'
                                : vehicle.color?.toLowerCase() === 'black'
                                ? '#0f172a'
                                : vehicle.color?.toLowerCase() === 'red'
                                ? '#ef4444'
                                : vehicle.color?.toLowerCase() === 'blue'
                                ? '#3b82f6'
                                : vehicle.color?.toLowerCase() === 'green'
                                ? '#10b981'
                                : '#64748b',
                          }}
                        />
                        <span className="capitalize">{vehicle.color || 'Standard'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                        {vehicle.motor_no || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                        {vehicle.battery_no || '—'}
                      </span>
                    </td>
                    <td className="text-right">
                      <Badge variant={getStatusBadgeVariant(vehicle.vehicle_status)}>
                        {vehicle.vehicle_status?.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => setTransferChassis(vehicle.chassis_no)}
                        className="p-1.5 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/50 rounded-lg transition-colors border border-transparent hover:border-primary-200/50"
                        title={`Transfer vehicle ${vehicle.chassis_no}`}
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vehicle Transfer Modal */}
      {transferChassis !== null && (
        <VehicleTransferModal
          initialChassisNo={transferChassis}
          onClose={() => setTransferChassis(null)}
        />
      )}
    </div>
  )
}

export default function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as InventoryTab) || 'dashboard'
  const [activeTab, setActiveTab] = useState<InventoryTab>(
    ['dashboard', 'vehicles', 'spares', 'stock', 'movements', 'batches', 'serials', 'tags'].includes(initialTab)
      ? initialTab
      : 'dashboard'
  )
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false)
  const queryClient = useQueryClient()

  // Sync tab with URL
  const handleSelectTab = (tab: InventoryTab) => {
    setActiveTab(tab)
    setSearchParams({ tab }, { replace: true })
  }

  useEffect(() => {
    const tabParam = searchParams.get('tab') as InventoryTab
    if (tabParam && tabParam !== activeTab) {
      if (['dashboard', 'vehicles', 'spares', 'stock', 'movements', 'batches', 'serials', 'tags'].includes(tabParam)) {
        setActiveTab(tabParam)
      }
    }
  }, [searchParams])

  const createMovementMutation = useMutation({
    mutationFn: (data: SpareMovementCreate) => inventoryApi.createSpareMovement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['spares-inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-batches'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-serials'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-stock-locations'] })
      queryClient.invalidateQueries({ queryKey: ['master-sheet-items'] })
      toast.success('Stock movement recorded successfully')
      setIsMovementModalOpen(false)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to record stock movement')
    },
  })

  // Logical 4-Group Architecture
  const NAV_GROUPS = [
    {
      group: 'Overview',
      tabs: [{ id: 'dashboard' as InventoryTab, label: 'Dashboard', icon: LayoutDashboard }],
    },
    {
      group: 'Stock Operations',
      tabs: [
        { id: 'vehicles' as InventoryTab, label: 'Vehicles', icon: Car },
        { id: 'spares' as InventoryTab, label: 'Spare Parts', icon: PackageSearch },
        { id: 'stock' as InventoryTab, label: 'Stock by Location', icon: Warehouse },
        { id: 'movements' as InventoryTab, label: 'Movements', icon: History },
      ],
    },
    {
      group: 'Tracking',
      tabs: [
        { id: 'batches' as InventoryTab, label: 'Batches & Lots', icon: Layers },
        { id: 'serials' as InventoryTab, label: 'Serial Numbers', icon: Package },
        { id: 'tags' as InventoryTab, label: 'Tags & Barcodes', icon: QrCode },
      ],
    },
  ]

  return (
    <div className="space-y-5">
      {/* Standardized ERP Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Operations</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-semibold">Inventory</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
            Inventory Management
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Fleet tracking, spare parts catalog, warehouse stock balances, and audit history
          </p>
        </div>

        {/* Primary and Contextual Action Area */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            to="/inventory/master-sheet"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs"
            title="Open Master Spreadsheet"
          >
            <TableIcon className="w-3.5 h-3.5 text-indigo-500" />
            Spreadsheet
          </Link>

          <Link
            to="/inventory/import"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs"
            title="Open Bulk Import Studio"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            Import
          </Link>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsMovementModalOpen(true)}
            className="flex items-center gap-1.5 h-8 text-xs font-medium shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Record Movement
          </Button>
        </div>
      </div>

      {/* Logical Grouped Navigation Ribbon */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar py-0.5">
          {NAV_GROUPS.map((group, gIdx) => (
            <div key={group.group} className="flex items-center gap-1 shrink-0">
              {/* Optional Group Label for large screens */}
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 hidden xl:inline-block mr-1">
                {group.group}
              </span>

              {group.tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    id={`tab-${tab.id}`}
                    onClick={() => handleSelectTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-primary-600 text-white shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                )
              })}

              {/* Group Separator Divider */}
              {gIdx < NAV_GROUPS.length - 1 && (
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1 shrink-0" />
              )}
            </div>
          ))}

          {/* Master Data & Tools Direct Access Group */}
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1 shrink-0" />
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 hidden xl:inline-block mr-1">
              Master Data & Tools
            </span>
            <Link
              to="/inventory/master-sheet"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <TableIcon className="w-3.5 h-3.5" />
              Master Spreadsheet
            </Link>
            <Link
              to="/inventory/import"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Import Studio
            </Link>
          </div>
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'dashboard' && (
          <InventoryDashboard
            onNavigateTab={(tab) => {
              if (tab === 'vehicles') handleSelectTab('vehicles')
              else if (tab === 'spares') handleSelectTab('spares')
              else if (tab === 'stock') handleSelectTab('stock')
              else if (tab === 'movements') handleSelectTab('movements')
            }}
            onOpenRecordMovement={() => setIsMovementModalOpen(true)}
          />
        )}
        {activeTab === 'vehicles' && <VehicleInventory />}
        {activeTab === 'spares' && <SparePartsList onOpenRecordMovement={() => setIsMovementModalOpen(true)} />}
        {activeTab === 'stock' && <InventoryStock />}
        {activeTab === 'batches' && <InventoryBatches />}
        {activeTab === 'serials' && <InventorySerials />}
        {activeTab === 'movements' && (
          <InventoryMovements onOpenRecordMovement={() => setIsMovementModalOpen(true)} />
        )}
        {activeTab === 'tags' && <InventoryTags />}
      </div>

      {/* Record Movement Modal */}
      {isMovementModalOpen && (
        <SpareMovementForm
          onClose={() => setIsMovementModalOpen(false)}
          onSubmit={(data) => createMovementMutation.mutate(data)}
          isLoading={createMovementMutation.isPending}
        />
      )}
    </div>
  )
}

