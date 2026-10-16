import { masterApi, Customer, CustomerDetailed, CustomerCreate, CustomerUpdate } from './masterApi'

export type { Customer, CustomerDetailed, CustomerCreate, CustomerUpdate }

export const customersApi = {
  create: (data: CustomerCreate): Promise<Customer> => masterApi.createCustomer(data),
  list: (): Promise<Customer[]> => masterApi.getCustomers(),
  getById: (id: number): Promise<CustomerDetailed> => masterApi.getCustomer(id),
  getDetailed: (id: number): Promise<CustomerDetailed> => masterApi.getCustomer(id),
  update: (id: number, data: CustomerUpdate): Promise<Customer> => masterApi.updateCustomer(id, data),
  delete: async (id: number, hardDelete?: boolean): Promise<void> => {
    await masterApi.deleteCustomer(id, hardDelete)
  },
}
