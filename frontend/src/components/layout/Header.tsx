import { useAuthStore } from '@/store/authStore'
import { Link } from 'react-router-dom'

export function Header() {
  const { user } = useAuthStore()

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Welcome back!</h2>
          <p className="text-sm text-gray-500">
            {user?.designation} - Staff ID: {user?.staff_id}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">Current Time</p>
            <p className="text-xs text-gray-500">{new Date().toLocaleTimeString()}</p>
          </div>
          <Link to="/staff/profile" className="p-2 hover:bg-gray-100 rounded-full" title="My Profile">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold border border-primary-200">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          </Link>
        </div>
      </div>
    </header>
  )
}
