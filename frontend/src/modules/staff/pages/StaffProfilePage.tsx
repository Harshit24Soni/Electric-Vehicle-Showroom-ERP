import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { api } from '../../../lib/api'
import { User, Save } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { useEffect } from 'react'

export default function StaffProfilePage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const { register, handleSubmit, reset } = useForm()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['staff-profile'],
    queryFn: () => api.get('/staff/me'),
    enabled: !!user,
  })

  useEffect(() => {
    if (profile) {
      reset(profile)
    }
  }, [profile, reset])

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => api.put('/staff/me', data),
    onSuccess: () => {
      toast.success('Profile updated successfully')
      queryClient.invalidateQueries({ queryKey: ['staff-profile'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update profile')
    }
  })

  const onSubmit = (data: any) => {
    // Filter out read-only fields if necessary, or backend handles it
    updateProfileMutation.mutate(data)
  }

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-1">Manage your personal information</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Basic Info Card */}
        <div className="card md:col-span-1 h-fit">
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <User className="w-12 h-12 text-primary-600" />
            </div>
            <h2 className="text-xl font-semibold">{user?.name || 'User'}</h2>
            <p className="text-gray-500">{user?.designation}</p>
            <div className="mt-4 w-full">
              <div className="text-sm text-gray-500">Staff ID: {user?.staff_id}</div>
              {(profile as any)?.dealer_id && <div className="text-sm text-gray-500">Dealer ID: {(profile as any).dealer_id}</div>}
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="card md:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* Contact */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Full Name</label>
                  <input {...register('full_name')} className="input" />
                </div>
                <div>
                  <label className="label">Mobile No</label>
                  <input {...register('mobile_no')} className="input" />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input {...register('email')} className="input" />
                </div>
              </div>
            </div>

            <div className="divider"></div>

            {/* Personal Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Aadhaar No</label>
                  <input {...register('aadhaar_no')} className="input" />
                </div>
                <div>
                  <label className="label">PAN No</label>
                  <input {...register('pan_no')} className="input" />
                </div>
              </div>
            </div>

            <div className="divider"></div>

            {/* Address */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Address</h3>
              <div className="space-y-4">
                <input {...register('address_line1')} className="input" placeholder="Address Line 1" />
                <input {...register('address_line2')} className="input" placeholder="Address Line 2" />
                <div className="grid grid-cols-3 gap-4">
                  <input {...register('city')} className="input" placeholder="City" />
                  <input {...register('state')} className="input" placeholder="State" />
                  <input {...register('pincode')} className="input" placeholder="Pincode" />
                </div>
              </div>
            </div>

            <div className="divider"></div>

            {/* Bank Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Bank Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Bank Name</label>
                  <input {...register('bank_name')} className="input" />
                </div>
                <div>
                  <label className="label">Account No</label>
                  <input {...register('bank_account_no')} className="input" />
                </div>
                <div>
                  <label className="label">IFSC Code</label>
                  <input {...register('ifsc_code')} className="input" />
                </div>
                <div>
                  <label className="label">UPI ID</label>
                  <input {...register('upi_id')} className="input" />
                </div>
              </div>
            </div>

            <div className="divider"></div>

            {/* Emergency Contact */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Contact Name</label>
                  <input {...register('emergency_contact_name')} className="input" />
                </div>
                <div>
                  <label className="label">Contact No</label>
                  <input {...register('emergency_contact_no')} className="input" />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                className="btn btn-primary flex items-center gap-2"
                disabled={updateProfileMutation.isPending}
              >
                <Save className="w-4 h-4" />
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
