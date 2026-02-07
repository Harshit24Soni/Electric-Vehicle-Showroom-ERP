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
  brand: string
  model_name: string
  material_number: string
  colour: string
  battery_type?: string
  laden_weight?: number
  unladen_weight?: number
  hsn_code?: string
  is_active: boolean
  created_at: string
}

export interface VehicleModelCreate {
  brand: string
  model_name: string
  material_number: string
  colour: string
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

export interface Vendor {
  vendor_id: number
  vendor_name: string
  vendor_type: 'OEM' | 'DEALER' | 'LOCAL'
  gstin?: string
  pan_no?: string
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  pincode?: string
  is_active: boolean
  created_at: string
}

export interface VendorCreate {
  vendor_name: string
  vendor_type: 'OEM' | 'DEALER' | 'LOCAL'
  gstin?: string
  pan_no?: string
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  pincode?: string
}

export const masterApi = {
  // Customers
  getCustomers: () => api.get<Customer[]>('/master/customers'),
  getCustomer: (id: number) => api.get<Customer>(`/master/customers/${id}`),
  createCustomer: (data: CustomerCreate) => api.post<Customer>('/master/customers', data),

  // Vehicle Models
  getVehicleModels: () => api.get<VehicleModel[]>('/master/vehicle-models'),
  createVehicleModel: (data: VehicleModelCreate) => api.post<VehicleModel>('/master/vehicle-models', data),

  // Vehicles
  getVehicle: (chassisNo: string) => api.get<Vehicle>(`/master/vehicles/${chassisNo}`),
  createVehicle: (data: VehicleCreate) => api.post<Vehicle>('/master/vehicles', data),

  // Vendors
  getVendors: () => api.get<Vendor[]>('/master/vendors'),
  createVendor: (data: VendorCreate) => api.post<Vendor>('/master/vendors', data),
}
