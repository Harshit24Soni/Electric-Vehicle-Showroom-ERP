import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { VehicleCreate } from '../api/masterApi'
import { useQuery } from '@tanstack/react-query'
import { masterApi } from '../api/masterApi'

const vehicleSchema = z.object({
  chassis_no: z.string().min(1, 'Chassis number is required'),
  vehicle_model_id: z.number().min(1, 'Vehicle model is required'),
  motor_serial_no: z.string().optional(),
  convertor_serial_no: z.string().optional(),
  charger_serial_no: z.string().optional(),
  controller_serial_no: z.string().optional(),
  battery_serial_no: z.string().optional(),
  date_of_manufacture: z.string().optional(),
})

type VehicleFormData = z.infer<typeof vehicleSchema>

interface VehicleFormProps {
  onSubmit: (data: VehicleCreate) => void
  onClose: () => void
  isLoading?: boolean
}

export default function VehicleForm({ onSubmit, onClose, isLoading }: VehicleFormProps) {
  const { data: models = [] } = useQuery({
    queryKey: ['vehicle-models'],
    queryFn: masterApi.getVehicleModels,
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
  })

  const onFormSubmit = (data: VehicleFormData) => {
    onSubmit({
      chassis_no: data.chassis_no,
      vehicle_model_id: data.vehicle_model_id,
      motor_serial_no: data.motor_serial_no || undefined,
      convertor_serial_no: data.convertor_serial_no || undefined,
      charger_serial_no: data.charger_serial_no || undefined,
      controller_serial_no: data.controller_serial_no || undefined,
      battery_serial_no: data.battery_serial_no || undefined,
      date_of_manufacture: data.date_of_manufacture || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Add Vehicle</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chassis Number *</label>
            <input {...register('chassis_no')} className="input" placeholder="Enter chassis number" />
            {errors.chassis_no && <p className="mt-1 text-sm text-red-600">{errors.chassis_no.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Model *</label>
            <select {...register('vehicle_model_id', { valueAsNumber: true })} className="input">
              <option value="">Select a vehicle model</option>
              {models.map((model) => (
                <option key={model.vehicle_model_id} value={model.vehicle_model_id}>
                  {model.brand} {model.model_name} - {model.colour}
                </option>
              ))}
            </select>
            {errors.vehicle_model_id && (
              <p className="mt-1 text-sm text-red-600">{errors.vehicle_model_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Motor Serial No</label>
              <input {...register('motor_serial_no')} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Battery Serial No</label>
              <input {...register('battery_serial_no')} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Controller Serial No</label>
              <input {...register('controller_serial_no')} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Charger Serial No</label>
              <input {...register('charger_serial_no')} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Convertor Serial No</label>
              <input {...register('convertor_serial_no')} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date of Manufacture</label>
              <input type="date" {...register('date_of_manufacture')} className="input" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn btn-primary">
              {isLoading ? 'Creating...' : 'Create Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
