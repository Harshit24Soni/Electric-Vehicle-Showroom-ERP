import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { masterApi, Customer } from '../api/masterApi'
import { X, User, Phone, Mail, MapPin, CreditCard, Car } from 'lucide-react'
import NomineeList from './NomineeList'
import { formatDate } from '@/lib/utils'

interface CustomerDetailModalProps {
    customerId: number
    onClose: () => void
}

export default function CustomerDetailModal({ customerId, onClose }: CustomerDetailModalProps) {
    const [activeTab, setActiveTab] = useState<'info' | 'nominees' | 'vehicles'>('info')

    const { data: customer, isLoading } = useQuery({
        queryKey: ['customer', customerId],
        queryFn: () => masterApi.getCustomer(customerId)
    })

    if (isLoading) return null // Or a spinner overlay

    if (!customer) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-2xl">
                            {customer.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{customer.name}</h2>
                            <div className="flex items-center gap-2 text-gray-500 text-sm mt-1">
                                <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-medium">{customer.customer_type}</span>
                                <span>•</span>
                                <span>ID: {customer.customer_id}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 px-6">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'info'
                                ? 'border-primary-500 text-primary-700'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Personal Info
                    </button>
                    <button
                        onClick={() => setActiveTab('nominees')}
                        className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'nominees'
                                ? 'border-primary-500 text-primary-700'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Nominees
                    </button>
                    <button
                        onClick={() => setActiveTab('vehicles')}
                        className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'vehicles'
                                ? 'border-primary-500 text-primary-700'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Vehicles & Service
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'info' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2 border-b pb-2">
                                    <User className="w-4 h-4 text-gray-500" />
                                    Contact Details
                                </h3>
                                <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                                    <span className="text-gray-500">Mobile</span>
                                    <span className="font-medium text-gray-900">{customer.primary_phone}</span>

                                    <span className="text-gray-500">Email</span>
                                    <span className="font-medium text-gray-900">{customer.email || '-'}</span>
                                </div>

                                <h3 className="font-semibold text-gray-900 flex items-center gap-2 border-b pb-2 pt-2">
                                    <MapPin className="w-4 h-4 text-gray-500" />
                                    Address
                                </h3>
                                <div className="text-sm text-gray-700">
                                    <p>{customer.address_line1}</p>
                                    <p>{customer.address_line2}</p>
                                    <p>{customer.city}, {customer.state} - {customer.pincode}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2 border-b pb-2">
                                    <CreditCard className="w-4 h-4 text-gray-500" />
                                    Identity & Tax
                                </h3>
                                <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                                    <span className="text-gray-500">AADHAAR</span>
                                    <span className="font-medium text-gray-900">{customer.aadhaar_no || '-'}</span>

                                    <span className="text-gray-500">PAN</span>
                                    <span className="font-medium text-gray-900">{customer.pan_no || '-'}</span>

                                    <span className="text-gray-500">GSTIN</span>
                                    <span className="font-medium text-gray-900">{customer.gstin || '-'}</span>
                                </div>

                                <h3 className="font-semibold text-gray-900 flex items-center gap-2 border-b pb-2 pt-2">
                                    <User className="w-4 h-4 text-gray-500" />
                                    Guardian / Parent
                                </h3>
                                <div className="text-sm">
                                    <span className="text-gray-500 mr-2">Guardian Name:</span>
                                    <span className="font-medium text-gray-900">{customer.guardian_name || '-'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'nominees' && (
                        <NomineeList customerId={customerId} />
                    )}

                    {activeTab === 'vehicles' && (
                        <div className="text-center py-8 text-gray-500">
                            <Car className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p className="font-medium">Vehicle History Integration Coming Soon</p>
                            <p className="text-sm mt-1">
                                This section will show purchased vehicles, service history, and warranty status.
                            </p>
                            {/* 
                    TODO: Implement VehicleList component here similar to NomineeList.
                    For now, focusing on Requirements MVP which emphasized Nominees.
                  */}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
