import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
  withCredentials: false
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Get token from store or localStorage
    const token = localStorage.getItem('access_token') || useAuthStore.getState().token
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Add timestamp for cache busting
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      }
    }
    
    // Log request in development
    if (import.meta.env.DEV) {
      console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`, config.data || config.params)
    }
    
    return config
  },
  (error) => {
    console.error('❌ Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Log response in development
    if (import.meta.env.DEV) {
      console.log(`📥 ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data)
    }
    
    // Handle success messages from server
    if (response.data?.message && response.config.method !== 'get') {
      toast.success(response.data.message)
    }
    
    return response
  },
  async (error) => {
    const originalRequest = error.config
    
    // Log error
    console.error('❌ API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    })
    
    // Handle 401 Unauthorized (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        const refreshToken = localStorage.getItem('refresh_token')
        
        if (!refreshToken) {
          throw new Error('No refresh token')
        }
        
        // Try to refresh token
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken
        })
        
        const { accessToken, refreshToken: newRefreshToken } = response.data
        
        // Update tokens
        localStorage.setItem('access_token', accessToken)
        if (newRefreshToken) {
          localStorage.setItem('refresh_token', newRefreshToken)
        }
        
        // Update store
        useAuthStore.getState().setToken(accessToken)
        
        // Retry original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
        
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError)
        
        // Logout user
        useAuthStore.getState().logout()
        
        // Redirect to login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login?session=expired'
        }
        
        return Promise.reject(refreshError)
      }
    }
    
    // Handle other errors
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        error.message || 
                        'Erro na conexão com o servidor'
    
    // Don't show toast for 401 errors (handled above)
    if (error.response?.status !== 401) {
      toast.error(errorMessage)
    }
    
    // Special handling for specific status codes
    switch (error.response?.status) {
      case 403:
        toast.error('Acesso negado. Você não tem permissão para esta ação.')
        break
      case 404:
        toast.error('Recurso não encontrado.')
        break
      case 422:
        // Validation errors - show first error
        const validationErrors = error.response?.data?.errors
        if (validationErrors && Array.isArray(validationErrors)) {
          toast.error(validationErrors[0]?.msg || 'Erro de validação')
        }
        break
      case 429:
        toast.error('Muitas requisições. Aguarde alguns instantes.')
        break
      case 500:
        toast.error('Erro interno do servidor. Tente novamente mais tarde.')
        break
      case 503:
        toast.error('Serviço temporariamente indisponível.')
        break
    }
    
    return Promise.reject(error)
  }
)

// API helper functions
export const apiHelper = {
  // GET request with caching
  get: async (url, params = {}, config = {}) => {
    const response = await api.get(url, { params, ...config })
    return response.data
  },
  
  // POST request
  post: async (url, data = {}, config = {}) => {
    const response = await api.post(url, data, config)
    return response.data
  },
  
  // PUT request
  put: async (url, data = {}, config = {}) => {
    const response = await api.put(url, data, config)
    return response.data
  },
  
  // PATCH request
  patch: async (url, data = {}, config = {}) => {
    const response = await api.patch(url, data, config)
    return response.data
  },
  
  // DELETE request
  delete: async (url, config = {}) => {
    const response = await api.delete(url, config)
    return response.data
  },
  
  // Upload file
  upload: async (url, file, onProgress = null) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(percentCompleted)
        }
      }
    })
    
    return response.data
  },
  
  // Download file
  download: async (url, filename = 'download') => {
    const response = await api.get(url, {
      responseType: 'blob'
    })
    
    const blob = new Blob([response.data])
    const downloadUrl = window.URL.createObjectURL(blob)
    const link =
