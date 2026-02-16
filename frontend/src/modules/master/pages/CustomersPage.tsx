import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { masterApi, Customer, CustomerCreate } from '../api/masterApi'
import { Plus, Search, Edit, Eye } from 'lucide-react'
import { formatDate } from '../../../lib/utils'
import CustomerForm from '../components/CustomerForm'
import CustomerDetailModal from '../components/CustomerDetailModal'
import { SkeletonTable } from '@/components/ui/SkeletonTable'

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: masterApi.getCustomers,
  })

  const createMutation = useMutation({
    mutationFn: (data: CustomerCreate) => masterApi.createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setShowForm(false)
      setSelectedCustomer(null)
    },
  })

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.primary_phone.includes(searchTerm) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSubmit = (data: CustomerCreate) => {
    createMutation.mutate(data)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">Manage customer information</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Customer
        </button>
      </div>

      <div className="card">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search customers by name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <SkeletonTable rows={5} />
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No customers found</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>City</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.customer_id}>
                    <td>{customer.customer_id}</td>
                    <td className="font-medium">{customer.name}</td>
                    <td>
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                        {customer.customer_type}
                      </span>
                    </td>
                    <td>{customer.primary_phone}</td>
                    <td>{customer.email || '-'}</td>
                    <td>{customer.city || '-'}</td>
                    <td>{formatDate(customer.created_at)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedCustomerId(customer.customer_id)
                            setShowDetail(true)
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCustomer(customer)
                            setShowForm(true)
                          }}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded"
                          title="Edit Customer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <CustomerForm
          customer={selectedCustomer}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowForm(false)
            setSelectedCustomer(null)
          }}
          isLoading={createMutation.isPending}
        />
      )}

      {showDetail && selectedCustomerId !== null && (
        <CustomerDetailModal
          customerId={selectedCustomerId}
          onClose={() => {
            setShowDetail(false)
            setSelectedCustomerId(null)
          }}
        />
      )}
    </div>
  )
}
