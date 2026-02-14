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

  // PIN Reset Request Flow (Staff)
  requestPinReset: (mobile: string) =>
    api.post<{ message: string }>('/auth/pin/request-reset', { mobile }),

  // PIN Reset Requests (Admin/Dealer)
  getResetRequests: () =>
    api.get<{
      requests: Array<{
        id: number; staff_id: number; staff_name: string;
        staff_mobile: string; requested_at: string; hours_ago: number
      }>
    }>('/auth/pin/reset-requests'),

  approveReset: (requestId: number) =>
    api.post<{ message: string; staff_name: string; temp_pin: string }>(`/auth/pin/approve-reset/${requestId}`, {}),

  denyReset: (requestId: number) =>
    api.post<{ message: string }>(`/auth/pin/deny-reset/${requestId}`, {}),

  // Self-reset PIN with TOTP (Admin/Dealer)
  resetPinSelf: (data: { mobile: string; totp_code: string; new_pin: string; confirm_pin: string }) =>
    api.post<{ message: string }>('/auth/pin/reset-self', data),
}
