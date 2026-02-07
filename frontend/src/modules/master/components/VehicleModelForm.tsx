import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { VehicleModel, VehicleModelCreate } from '../api/masterApi'

const vehicleModelSchema = z.object({
  brand: z.string().min(1, 'Brand is required'),
  model_name: z.string().min(1, 'Model name is required'),
  material_number: z.string().min(1, 'Material number is required'),
  colour: z.string().min(1, 'Color is required'),
  battery_type: z.string().optional(),
  laden_weight: z.number().optional(),
  unladen_weight: z.number().optional(),
  hsn_code: z.string().optional(),
})

type VehicleModelFormData = z.infer<typeof vehicleModelSchema>

interface VehicleModelFormProps {
  model?: VehicleModel | null
  onSubmit: (data: VehicleModelCreate) => void
  onClose: () => void
  isLoading?: boolean
}

export default function VehicleModelForm({ model, onSubmit, onClose, isLoading }: VehicleModelFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<VehicleModelFormData>({
    resolver: zodResolver(vehicleModelSchema),
    defaultValues: model
      ? {
          brand: model.brand,
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

  useEffect(() => {
    if (model) {
      reset({
        brand: model.brand,
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
      brand: data.brand,
      model_name: data.model_name,
      material_number: data.material_number,
      colour: data.colour,
      battery_type: data.battery_type || undefined,
      laden_weight: data.laden_weight,
      unladen_weight: data.unladen_weight,
      hsn_code: data.hsn_code || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{model ? 'View Vehicle Model' : 'Add Vehicle Model'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Brand *</label>
              <input {...register('brand')} className="input" disabled={!!model} />
              {errors.brand && <p className="mt-1 text-sm text-red-600">{errors.brand.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Model Name *</label>
              <input {...register('model_name')} className="input" disabled={!!model} />
              {errors.model_name && (
                <p className="mt-1 text-sm text-red-600">{errors.model_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Material Number *</label>
              <input {...register('material_number')} className="input" disabled={!!model} />
              {errors.material_number && (
                <p className="mt-1 text-sm text-red-600">{errors.material_number.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color *</label>
              <input {...register('colour')} className="input" disabled={!!model} />
              {errors.colour && <p className="mt-1 text-sm text-red-600">{errors.colour.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Battery Type</label>
              <input {...register('battery_type')} className="input" disabled={!!model} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">HSN Code</label>
              <input {...register('hsn_code')} className="input" disabled={!!model} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Laden Weight (kg)</label>
              <input
                type="number"
                step="0.01"
                {...register('laden_weight', { valueAsNumber: true, setValueAs: (v) => v === '' ? undefined : Number(v) })}
                className="input"
                disabled={!!model}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unladen Weight (kg)</label>
              <input
                type="number"
                step="0.01"
                {...register('unladen_weight', { valueAsNumber: true, setValueAs: (v) => v === '' ? undefined : Number(v) })}
                className="input"
                disabled={!!model}
              />
            </div>
          </div>

          {!model && (
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={isLoading} className="btn btn-primary">
                {isLoading ? 'Creating...' : 'Create Model'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
