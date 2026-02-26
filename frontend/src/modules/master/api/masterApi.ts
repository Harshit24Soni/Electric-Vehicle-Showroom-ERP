import { api } from '../../../lib/api'

export interface Customer {
  customer_id: number
  customer_type: 'INDIVIDUAL' | 'BUSINESS'
  name: string
  guardian_name?: string
  primary_phone: string
  email?: string
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  pincode?: string
  aadhaar_no?: string
  pan_no?: string
  gstin?: string
  created_at: string
  is_active: boolean
}

export interface CustomerCreate {
  customer_type: 'INDIVIDUAL' | 'BUSINESS'
  name: string
  guardian_name?: string
  primary_phone: string
  email?: string
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  pincode?: string
  aadhaar_no?: string
  pan_no?: string
  gstin?: string
}

export interface VehicleModel {
  vehicle_model_id: number
  brand_id: number
  brand_name: string
  model_name: string
  material_number: string
  colour: string
  battery_type?: string
  laden_weight?: number
  unladen_weight?: number
  hsn_code?: string
  is_active: boolean
  is_deleted: boolean
  created_at: string
}

export interface VehicleModelCreate {
  brand_id: number
  model_name: string
  material_number: string
  colour: string
  battery_type?: string
  laden_weight?: number
  unladen_weight?: number
  hsn_code?: string
}

export interface VehicleModelUpdate {
  model_name?: string
  material_number?: string
  colour?: string
  battery_type?: string
  laden_weight?: number
  unladen_weight?: number
  hsn_code?: string
}

export interface Vehicle {
  chassis_no: string
  vehicle_model_id: number
  motor_serial_no?: string
  convertor_serial_no?: string
  charger_serial_no?: string
  controller_serial_no?: string
  battery_serial_no?: string
  date_of_manufacture?: string
  current_status: 'IN_STOCK' | 'SOLD' | 'SERVICE'
  created_at: string
}

export interface VehicleCreate {
  chassis_no: string
  vehicle_model_id: number
  motor_serial_no?: string
  convertor_serial_no?: string
  charger_serial_no?: string
  controller_serial_no?: string
  battery_serial_no?: string
  date_of_manufacture?: string
}

export type VendorType = 'OEM' | 'SPARE_PART' | 'FINANCIER' | 'OTHER'

export interface Vendor {
  vendor_id: number
  vendor_name: string
  vendor_type: VendorType
  gstin?: string
  pan_no?: string
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  pincode?: string
  is_active: boolean
  is_deleted: boolean
  created_at: string
}

export interface VendorCreate {
  vendor_name: string
  vendor_type: VendorType
  gstin?: string
  pan_no?: string
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  pincode?: string
}

export interface VendorUpdate {
  vendor_name?: string
  vendor_type?: VendorType
  gstin?: string
  pan_no?: string
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  pincode?: string
}

export interface Nominee {
  nominee_id: number
  customer_id: number
  nominee_name: string
  nominee_dob: string
  relation: string
  is_primary: boolean
  is_active: boolean
}

export interface NomineeCreate {
  nominee_name: string
  nominee_dob: string
  relation: string
  is_primary?: boolean
}

export interface CustomerDetailed extends Customer {
  nominees: Nominee[]
  vehicle_count: number
  last_service_date?: string
  warranty_status?: string
}

export const masterApi = {
  // Customers
  getCustomers: () => api.get<Customer[]>('/master/customers'),
  getCustomer: (id: number) => api.get<CustomerDetailed>(`/master/customers/${id}`),
  createCustomer: (data: CustomerCreate) => api.post<Customer>('/master/customers', data),
  updateCustomer: (id: number, data: Partial<CustomerCreate>) => api.put<Customer>(`/master/customers/${id}`, data),

  // Nominees
  getNominees: (customerId: number) => api.get<Nominee[]>(`/master/customers/${customerId}/nominees`),
  createNominee: (customerId: number, data: NomineeCreate) => api.post<Nominee>(`/master/customers/${customerId}/nominees`, data),
  updateNominee: (customerId: number, nomineeId: number, data: Partial<NomineeCreate>) =>
    api.put<Nominee>(`/master/customers/${customerId}/nominees/${nomineeId}`, data),
  deleteNominee: (customerId: number, nomineeId: number, hardDelete?: boolean) =>
    api.delete(`/master/customers/${customerId}/nominees/${nomineeId}`, { params: { hard_delete: hardDelete } }),

  // Vehicle Models
  getVehicleModels: (includeDeleted = false) =>
    api.get<VehicleModel[]>('/master/vehicle-models', { params: { include_deleted: includeDeleted } }),
  getVehicleModel: (id: number) => api.get<VehicleModel>(`/master/vehicle-models/${id}`),
  createVehicleModel: (data: VehicleModelCreate) => api.post<VehicleModel>('/master/vehicle-models', data),
  updateVehicleModel: (id: number, data: VehicleModelUpdate) => api.put<VehicleModel>(`/master/vehicle-models/${id}`, data),
  deleteVehicleModel: (id: number, hardDelete?: boolean) =>
    api.delete(`/master/vehicle-models/${id}`, { params: { hard_delete: hardDelete } }),
  restoreVehicleModel: (id: number) => api.post(`/master/vehicle-models/${id}/restore`),

  // Vehicles
  getVehicles: (status?: string) => api.get<Vehicle[]>(`/master/vehicles${status ? `?status=${status}` : ''}`),
  getVehicle: (chassisNo: string) => api.get<Vehicle>(`/master/vehicles/${chassisNo}`),
  createVehicle: (data: VehicleCreate) => api.post<Vehicle>('/master/vehicles', data),

  // Vendors
  getVendors: (includeDeleted = false) =>
    api.get<Vendor[]>('/master/vendors', { params: { include_deleted: includeDeleted } }),
  getVendor: (id: number) => api.get<Vendor>(`/master/vendors/${id}`),
  createVendor: (data: VendorCreate) => api.post<Vendor>('/master/vendors', data),
  updateVendor: (id: number, data: VendorUpdate) => api.put<Vendor>(`/master/vendors/${id}`, data),
  deleteVendor: (id: number, hardDelete?: boolean) =>
    api.delete(`/master/vendors/${id}`, { params: { hard_delete: hardDelete } }),
  restoreVendor: (id: number) => api.post(`/master/vendors/${id}/restore`),
}
