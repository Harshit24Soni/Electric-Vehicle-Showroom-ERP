import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { insuranceApi, PolicyCreate, InsuranceCompanyCreate } from '../api/insuranceApi'
import { Plus, Search, Building2 } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import PolicyForm from '../components/PolicyForm'
import { useForm } from 'react-hook-form'
import { X } from 'lucide-react'

export default function InsurancePage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showPolicyForm, setShowPolicyForm] = useState(false)
  const [showCompanyForm, setShowCompanyForm] = useState(false)
  const queryClient = useQueryClient()

  const { data: policies = [], isLoading: policiesLoading } = useQuery({
    queryKey: ['policies'],
    queryFn: insuranceApi.getPolicies,
  })

  const { data: companies = [] } = useQuery({
    queryKey: ['insurance-companies'],
    queryFn: insuranceApi.getCompanies,
  })

  const createPolicyMutation = useMutation({
    mutationFn: (data: PolicyCreate) => insuranceApi.createPolicy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] })
      setShowPolicyForm(false)
    },
  })

  const createCompanyMutation = useMutation({
    mutationFn: (data: InsuranceCompanyCreate) => insuranceApi.createCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-companies'] })
      setShowCompanyForm(false)
    },
  })

  const filteredPolicies = policies.filter((policy) =>
    policy.policy_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    policy.chassis_no.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Insurance</h1>
          <p className="text-gray-600 mt-1">Manage insurance policies</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCompanyForm(true)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Building2 className="w-5 h-5" />
            Add Company
          </button>
          <button onClick={() => setShowPolicyForm(true)} className="btn btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            New Policy
          </button>
        </div>
      </div>

      <div className="card">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search policies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {policiesLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading policies...</p>
          </div>
        ) : filteredPolicies.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No policies found</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Policy No</th>
                  <th>Chassis No</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Premium</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredPolicies.map((policy) => (
                  <tr key={policy.policy_id}>
                    <td className="font-medium">{policy.policy_number}</td>
                    <td>{policy.chassis_no}</td>
                    <td>{formatDate(policy.policy_start_date)}</td>
                    <td>{formatDate(policy.policy_end_date)}</td>
                    <td>{policy.premium_amount ? formatCurrency(policy.premium_amount) : '-'}</td>
                    <td>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        policy.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {policy.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{formatDate(policy.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showPolicyForm && (
        <PolicyForm
          onSubmit={(data) => createPolicyMutation.mutate(data)}
          onClose={() => setShowPolicyForm(false)}
          isLoading={createPolicyMutation.isPending}
        />
      )}

      {showCompanyForm && (
        <CompanyForm
          onSubmit={(data) => createCompanyMutation.mutate(data)}
          onClose={() => setShowCompanyForm(false)}
          isLoading={createCompanyMutation.isPending}
        />
      )}
    </div>
  )
}

function CompanyForm({
  onSubmit,
  onClose,
  isLoading,
}: {
  onSubmit: (data: InsuranceCompanyCreate) => void
  onClose: () => void
  isLoading?: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<InsuranceCompanyCreate>({
    defaultValues: {},
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Add Insurance Company</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
            <input {...register('company_name', { required: true })} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
            <input {...register('contact_phone')} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
            <input type="email" {...register('contact_email')} className="input" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" disabled={isLoading} className="btn btn-primary">
              {isLoading ? 'Creating...' : 'Create Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
