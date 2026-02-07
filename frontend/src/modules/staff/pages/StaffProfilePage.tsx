import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { api } from '../../../lib/api'
import { User } from 'lucide-react'

export default function StaffProfilePage() {
  const { user } = useAuthStore()

  const { data: profile } = useQuery<Record<string, any>>({
    queryKey: ['staff-profile'],
    queryFn: () => api.get<Record<string, any>>('/staff/me'),
    enabled: !!user,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-1">View your profile information</p>
      </div>

      <div className="card max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-primary-600" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold">Staff Profile</h2>
            <p className="text-gray-600">Staff ID: {user?.staff_id}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Staff ID</label>
            <p className="text-gray-900">{user?.staff_id}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
            <p className="text-gray-900">{user?.designation}</p>
          </div>
          {profile && (
            <>
              {Object.entries(profile as Record<string, any>).map(([key, value]) => {
                const displayValue = value != null ? String(value) : '-'
                return (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </label>
                    <p className="text-gray-900">{displayValue}</p>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
