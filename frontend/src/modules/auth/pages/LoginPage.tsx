import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore, UserRole } from '@/store/authStore'
import { authApi } from '../api/authApi'
import { Car } from 'lucide-react'
import ForgotPinModal from '../components/ForgotPinModal'

const loginSchema = z.object({
  identifier: z.string().min(1, 'Identifier is required'),
  pin: z.string().min(6, 'PIN must be 6 digits').max(6, 'PIN must be 6 digits'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showForgotPin, setShowForgotPin] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setError(null)
    setLoading(true)

    try {
      const response = await authApi.login(data)

      // Decode JWT to get user info
      const tokenParts = response.access_token.split('.')
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]))
        const user = {
          staff_id: payload.staff_id || payload.sub || 0,
          designation: payload.designation || '',
          role: (payload.role || 'STAFF') as UserRole,
          force_pin_change: response.force_pin_change || payload.force_pin_change || false,
        }
        setAuth(user, response.access_token)

        if (response.force_pin_change || payload.force_pin_change) {
          navigate('/change-pin')
        } else {
          navigate('/dashboard')
        }
      } else {
        throw new Error('Invalid token format')
      }
    } catch (err: any) {
      console.error('Login error:', err)
      const errorMessage = err.response?.data?.detail || err.message || 'Login failed. Please check your credentials.'
      setError(errorMessage)
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
              <Car className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">EV Showroom ERP</h1>
            <p className="text-gray-600">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
                Email or Mobile Number
              </label>
              <input
                id="identifier"
                type="text"
                {...register('identifier')}
                className="input"
                placeholder="Enter email or mobile number"
                autoComplete="username"
              />
              {errors.identifier && (
                <p className="mt-1 text-sm text-red-600">{errors.identifier.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
                PIN
              </label>
              <input
                id="pin"
                type="password"
                {...register('pin')}
                className="input"
                placeholder="Enter 6-digit PIN"
                maxLength={6}
                autoComplete="current-password"
              />
              {errors.pin && (
                <p className="mt-1 text-sm text-red-600">{errors.pin.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 flex flex-col items-center gap-4 text-sm text-gray-600">
            <button
              type="button"
              onClick={() => setShowForgotPin(true)}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Forgot PIN?
            </button>
            <p>Use your email or mobile number and PIN to login</p>
          </div>
        </div>
      </div>

      {showForgotPin && (
        <ForgotPinModal onClose={() => setShowForgotPin(false)} />
      )}
    </div>
  )
}
