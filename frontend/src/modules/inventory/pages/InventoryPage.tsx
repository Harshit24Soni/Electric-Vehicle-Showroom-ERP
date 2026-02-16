import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Car, Search, Package } from 'lucide-react'
import { SkeletonTable } from '@/components/ui/SkeletonTable'

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

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

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

  const filteredVehicles = vehicles.filter((v: Vehicle) =>
    v.chassis_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.model?.model_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Status counts
  const statusCounts = {
    IN_STOCK: vehicles.filter((v: Vehicle) => v.vehicle_status === 'IN_STOCK').length,
    BOOKED: vehicles.filter((v: Vehicle) => v.vehicle_status === 'BOOKED').length,
    SOLD: vehicles.filter((v: Vehicle) => v.vehicle_status === 'SOLD').length,
    IN_SERVICE: vehicles.filter((v: Vehicle) => v.vehicle_status === 'IN_SERVICE').length,
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_STOCK':
        return 'bg-green-100 text-green-800'
      case 'BOOKED':
        return 'bg-yellow-100 text-yellow-800'
      case 'SOLD':
        return 'bg-blue-100 text-blue-800'
      case 'IN_SERVICE':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <p className="text-gray-500 text-sm mt-1">Vehicle stock and availability</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter(statusFilter === 'IN_STOCK' ? '' : 'IN_STOCK')}
          className={`card cursor-pointer transition-all ${statusFilter === 'IN_STOCK' ? 'ring-2 ring-green-500' : 'hover:shadow-lg'}`}
        >
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <Car className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{statusCounts.IN_STOCK}</p>
              <p className="text-sm text-gray-500">In Stock</p>
            </div>
          </div>
        </div>
        <div
          onClick={() => setStatusFilter(statusFilter === 'BOOKED' ? '' : 'BOOKED')}
          className={`card cursor-pointer transition-all ${statusFilter === 'BOOKED' ? 'ring-2 ring-yellow-500' : 'hover:shadow-lg'}`}
        >
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Car className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{statusCounts.BOOKED}</p>
              <p className="text-sm text-gray-500">Booked</p>
            </div>
          </div>
        </div>
        <div
          onClick={() => setStatusFilter(statusFilter === 'SOLD' ? '' : 'SOLD')}
          className={`card cursor-pointer transition-all ${statusFilter === 'SOLD' ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'}`}
        >
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Car className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{statusCounts.SOLD}</p>
              <p className="text-sm text-gray-500">Sold</p>
            </div>
          </div>
        </div>
        <div
          onClick={() => setStatusFilter(statusFilter === 'IN_SERVICE' ? '' : 'IN_SERVICE')}
          className={`card cursor-pointer transition-all ${statusFilter === 'IN_SERVICE' ? 'ring-2 ring-orange-500' : 'hover:shadow-lg'}`}
        >
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-3 rounded-lg">
              <Car className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{statusCounts.IN_SERVICE}</p>
              <p className="text-sm text-gray-500">In Service</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by chassis or model..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Vehicle List */}
      <div className="card">
        {isLoading ? (
          <SkeletonTable rows={5} />
        ) : filteredVehicles.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No vehicles found</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Chassis No</th>
                  <th>Color</th>
                  <th>Motor No</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle: Vehicle) => (
                  <tr key={vehicle.vehicle_id}>
                    <td className="font-medium">{vehicle.model?.model_name || '-'}</td>
                    <td className="font-mono text-sm">{vehicle.chassis_no}</td>
                    <td>{vehicle.color || '-'}</td>
                    <td className="font-mono text-sm text-gray-500">{vehicle.motor_no || '-'}</td>
                    <td>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(vehicle.vehicle_status)}`}>
                        {vehicle.vehicle_status?.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
