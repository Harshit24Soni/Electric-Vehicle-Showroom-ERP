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

export interface ForgotPinResponse {
  action: 'TOTP_REQUIRED' | 'CONTACT_ADMIN' | 'CONTACT_DEALER' | 'NONE'
  message: string
}

export interface TOTPSetupResponse {
  secret: string
  provisioning_uri: string
}

export interface TOTPVerifyRequest {
  secret: string
  code: string
}

export interface AuthenticatorSetupResponse {
  secret: string
  provisioning_uri: string
}

export interface VerifyAuthenticatorRequest {
  secret: string
  code: string
}

export const authApi = {
  login: (data: LoginRequest) => api.post<LoginResponse>('/auth/login-pin', data),

  changePin: (data: ChangePinRequest) => api.post<ChangePinResponse>('/auth/change-pin', data),

  forgotPin: (identifier: string) => api.post<ForgotPinResponse>('/auth/forgot-pin', { identifier }),

  // Legacy or simplified OTP (if needed)
  sendOtp: (identifier: string) => api.post<{ message: string }>('/auth/send-otp', { identifier }),

  resetDealerPin: (data: { identifier: string; totp_code: string; new_pin: string }) =>
    api.post<{ message: string }>('/auth/reset-pin/dealer', data),

  // TOTP Setup (Dealer only)
  setupTotp: () => api.post<TOTPSetupResponse>('/auth/totp/setup', {}),

  verifyTotp: (data: TOTPVerifyRequest) => api.post<{ message: string }>('/auth/totp/verify', data),
}
