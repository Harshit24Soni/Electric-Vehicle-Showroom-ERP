import { api } from '@/lib/api'
import { masterApi, Nominee, NomineeCreate } from './masterApi'

export type { Nominee, NomineeCreate }
export type NomineeUpdate = Partial<NomineeCreate>

export const nomineesApi = {
  createForCustomer: (customerId: number, data: NomineeCreate): Promise<Nominee> =>
    masterApi.createNominee(customerId, data),
  listForCustomer: (customerId: number): Promise<Nominee[]> =>
    masterApi.getNominees(customerId),
  getById: (customerId: number, nomineeId: number): Promise<Nominee> =>
    api.get<Nominee>(`/master/customers/${customerId}/nominees/${nomineeId}`),
  update: (customerId: number, nomineeId: number, data: Partial<NomineeCreate>): Promise<Nominee> =>
    masterApi.updateNominee(customerId, nomineeId, data),
  delete: async (customerId: number, nomineeId: number, hardDelete?: boolean): Promise<void> => {
    await masterApi.deleteNominee(customerId, nomineeId, hardDelete)
  },
}
