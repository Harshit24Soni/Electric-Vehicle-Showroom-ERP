import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '../api/authApi'
import { Lock } from 'lucide-react'

const changePinSchema = z.object({
  old_pin: z.string().min(6, 'PIN must be 6 digits').max(6, 'PIN must be 6 digits'),
  new_pin: z.string().min(6, 'PIN must be 6 digits').max(6, 'PIN must be 6 digits'),
  confirm_pin: z.string().min(6, 'PIN must be 6 digits').max(6, 'PIN must be 6 digits'),
}).refine((data) => data.new_pin === data.confirm_pin, {
  message: "PINs don't match",
  path: ['confirm_pin'],
}).refine((data) => data.old_pin !== data.new_pin, {
  message: 'New PIN must be different from old PIN',
  path: ['new_pin'],
})

type ChangePinForm = z.infer<typeof changePinSchema>

export default function ChangePinPage() {
  const navigate = useNavigate()
  const { clearAuth } = useAuthStore()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePinForm>({
    resolver: zodResolver(changePinSchema),
  })

  const onSubmit = async (data: ChangePinForm) => {
    setError(null)
    setLoading(true)

    try {
      await authApi.changePin({
        old_pin: data.old_pin,
        new_pin: data.new_pin,
      })
      clearAuth()
      navigate('/login', { state: { message: 'PIN changed successfully. Please login again.' } })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to change PIN. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
              <Lock className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Change PIN</h1>
            <p className="text-gray-600">You must change your PIN before continuing</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="old_pin" className="block text-sm font-medium text-gray-700 mb-2">
                Current PIN
              </label>
              <input
                id="old_pin"
                type="password"
                {...register('old_pin')}
                className="input"
                placeholder="Enter current PIN"
                maxLength={6}
              />
              {errors.old_pin && (
                <p className="mt-1 text-sm text-red-600">{errors.old_pin.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="new_pin" className="block text-sm font-medium text-gray-700 mb-2">
                New PIN
              </label>
              <input
                id="new_pin"
                type="password"
                {...register('new_pin')}
                className="input"
                placeholder="Enter new PIN"
                maxLength={6}
              />
              {errors.new_pin && (
                <p className="mt-1 text-sm text-red-600">{errors.new_pin.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirm_pin" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New PIN
              </label>
              <input
                id="confirm_pin"
                type="password"
                {...register('confirm_pin')}
                className="input"
                placeholder="Confirm new PIN"
                maxLength={6}
              />
              {errors.confirm_pin && (
                <p className="mt-1 text-sm text-red-600">{errors.confirm_pin.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Changing PIN...' : 'Change PIN'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
