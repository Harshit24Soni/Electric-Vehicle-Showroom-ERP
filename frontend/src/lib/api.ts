import axios, { AxiosError, AxiosInstance } from 'axios'

// Use /api prefix which will be proxied by Vite to http://localhost:8000
// Or set VITE_API_URL=http://localhost:8000 in .env to call backend directly
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Helper to get token from Zustand's persisted auth-storage
function getAuthToken(): string | null {
  try {
    const authStorage = localStorage.getItem('auth-storage')
    if (authStorage) {
      const parsed = JSON.parse(authStorage)
      return parsed.state?.token || null
    }
  } catch (e) {
    console.error('Error reading auth token:', e)
  }
  return null
}

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = getAuthToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor to handle errors
    // NOTE: We do NOT redirect on 401 here - let React Router handle auth state
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        // Just reject the error, let the calling code handle it
        // The auth store and ProtectedRoute will handle logout/redirect
        return Promise.reject(error)
      }
    )
  }

  async get<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.get<T>(url, config)
    // If responseType is blob, return the blob data directly
    if (config?.responseType === 'blob') {
      return response.data as T
    }
    return response.data
  }

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post<T>(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.put<T>(url, data, config)
    return response.data
  }

  async patch<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.patch<T>(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete<T>(url, config)
    return response.data
  }
}

export const api = new ApiClient()

// API Response types
export interface ApiError {
  detail: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
