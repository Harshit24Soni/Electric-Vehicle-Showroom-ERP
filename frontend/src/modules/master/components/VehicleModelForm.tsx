import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { VehicleModel, VehicleModelCreate } from '../api/masterApi'
import { useQuery } from '@tanstack/react-query'
import { setupApi } from '../../setup/api/setupApi'

const vehicleModelSchema = z.object({
  brand_id: z.number({ required_error: 'Brand is required' }).int().positive('Brand is required'),
  model_name: z.string().min(1, 'Model name is required').max(100),
  material_number: z.string().min(1, 'Material number is required').max(100),
  colour: z.string().min(1, 'Color is required').max(50),
  battery_type: z.string().max(50).optional().or(z.literal('')),
  laden_weight: z.number().positive().optional().or(z.nan()),
  unladen_weight: z.number().positive().optional().or(z.nan()),
  hsn_code: z.string().max(20).optional().or(z.literal('')),
})

type VehicleModelFormData = z.infer<typeof vehicleModelSchema>

interface VehicleModelFormProps {
  model?: VehicleModel | null
  isEditing?: boolean
  onSubmit: (data: VehicleModelCreate) => void
  onClose: () => void
  isLoading?: boolean
}

export default function VehicleModelForm({ model, isEditing = false, onSubmit, onClose, isLoading }: VehicleModelFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<VehicleModelFormData>({
    resolver: zodResolver(vehicleModelSchema),
    defaultValues: model
      ? {
        brand_id: model.brand_id,
        model_name: model.model_name,
        material_number: model.material_number,
        colour: model.colour,
        battery_type: model.battery_type || '',
        laden_weight: model.laden_weight,
        unladen_weight: model.unladen_weight,
        hsn_code: model.hsn_code || '',
      }
      : undefined,
  })

  // Fetch brands for dropdown
  const { data: brands = [] } = useQuery({
    queryKey: ['setup-brands'],
    queryFn: setupApi.listBrands,
  })

  useEffect(() => {
    if (model) {
      reset({
        brand_id: model.brand_id,
        model_name: model.model_name,
        material_number: model.material_number,
        colour: model.colour,
        battery_type: model.battery_type || '',
        laden_weight: model.laden_weight,
        unladen_weight: model.unladen_weight,
        hsn_code: model.hsn_code || '',
      })
    }
  }, [model, reset])

  const onFormSubmit = (data: VehicleModelFormData) => {
    onSubmit({
      brand_id: data.brand_id,
      model_name: data.model_name,
      material_number: data.material_number,
      colour: data.colour,
      battery_type: data.battery_type || undefined,
      laden_weight: data.laden_weight && !isNaN(data.laden_weight) ? data.laden_weight : undefined,
      unladen_weight: data.unladen_weight && !isNaN(data.unladen_weight) ? data.unladen_weight : undefined,
      hsn_code: data.hsn_code || undefined,
    })
  }

  const isReadOnly = !!model && !isEditing

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {isReadOnly ? 'View Vehicle Model' : isEditing ? 'Edit Vehicle Model' : 'Add Vehicle Model'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Brand *</label>
              <select
                {...register('brand_id', { valueAsNumber: true })}
                className="input"
                disabled={isReadOnly}
              >
                <option value="">— Select Brand —</option>
                {brands
                  .filter((b: any) => !b.is_deleted && b.is_active !== false)
                  .map((b: any) => (
                    <option key={b.brand_id} value={b.brand_id}>{b.brand_name}</option>
                  ))
                }
              </select>
              {errors.brand_id && <p className="mt-1 text-sm text-red-600">{errors.brand_id.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Model Name *</label>
              <input {...register('model_name')} className="input" disabled={isReadOnly} />
              {errors.model_name && (
                <p className="mt-1 text-sm text-red-600">{errors.model_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Material Number *</label>
              <input {...register('material_number')} className="input" disabled={isReadOnly} />
              {errors.material_number && (
                <p className="mt-1 text-sm text-red-600">{errors.material_number.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color *</label>
              <input {...register('colour')} className="input" disabled={isReadOnly} />
              {errors.colour && <p className="mt-1 text-sm text-red-600">{errors.colour.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Battery Type</label>
              <input {...register('battery_type')} className="input" disabled={isReadOnly} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">HSN Code</label>
              <input {...register('hsn_code')} className="input" disabled={isReadOnly} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Laden Weight (kg)</label>
              <input
                type="number"
                step="0.01"
                {...register('laden_weight', { valueAsNumber: true, setValueAs: (v) => v === '' ? undefined : Number(v) })}
                className="input"
                disabled={isReadOnly}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unladen Weight (kg)</label>
              <input
                type="number"
                step="0.01"
                {...register('unladen_weight', { valueAsNumber: true, setValueAs: (v) => v === '' ? undefined : Number(v) })}
                className="input"
                disabled={isReadOnly}
              />
            </div>
          </div>

          {!isReadOnly && (
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={isLoading} className="btn btn-primary">
                {isLoading ? 'Saving...' : isEditing ? 'Update Model' : 'Create Model'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
