import { api } from '@/lib/api'

export interface LoginRequest {
  identifier: string
  pin: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  force_pin_change: boolean
}

export interface ChangePinRequest {
  old_pin: string
  new_pin: string
}

export interface ChangePinResponse {
  message: string
}

export const authApi = {
  login: (data: LoginRequest) => api.post<LoginResponse>('/auth/login-pin', data),
  changePin: (data: ChangePinRequest) => api.post<ChangePinResponse>('/auth/change-pin', data),
}
