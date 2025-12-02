import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Update activity timestamp
    const authStore = useAuthStore.getState()
    authStore.updateActivity()

    // Add security headers
    config.headers['X-CSRF-Protection'] = '1'
    config.headers['X-Content-Type-Options'] = 'nosniff'
    
    // Add timestamp to prevent caching of sensitive requests
    if (config.method !== 'get') {
      config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
      config.headers['Pragma'] = 'no-cache'
      config.headers['Expires'] = '0'
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Handle successful responses
    if (response.data?.message && response.config.method !== 'get') {
      // Don't show toast for background requests
      if (!response.config.headers['X-Silent-Request']) {
        toast.success(response.data.message)
      }
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Handle 401 Unauthorized (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const authStore = useAuthStore.getState()
        const refreshToken = authStore.refreshToken

        if (refreshToken) {
          // Try to refresh token
          const response = await axios.post(
            `${import.meta.env.VITE_API_URL}/auth/refresh`,
            { refreshToken },
            { headers: { 'X-Silent-Request': 'true' } }
          )

          const { token, refreshToken: newRefreshToken } = response.data

          // Update store
          authStore.setToken(token)
          if (newRefreshToken) {
            // Update refresh token if provided
            // Note: You might need to update your store structure
          }

          // Update axios default header
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`

          // Retry original request
          originalRequest.headers['Authorization'] = `Bearer ${token}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
        
        // Logout user on refresh failure
        useAuthStore.getState().logout()
        toast.error('Sessão expirada. Por favor, faça login novamente.')
        
        // Redirect to login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        
        return Promise.reject(refreshError)
      }
    }

    // Handle other errors
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        'Ocorreu um erro. Tente novamente.'

    // Don't show toast for silent requests
    if (!originalRequest.headers['X-Silent-Request']) {
      if (error.response?.status === 403) {
        toast.error('Acesso não autorizado')
      } else if (error.response?.status === 404) {
        toast.error('Recurso não encontrado')
      } else if (error.response?.status === 429) {
        toast.error('Muitas tentativas. Aguarde alguns minutos.')
      } else if (error.response?.status >= 500) {
        toast.error('Erro no servidor. Tente novamente mais tarde.')
      } else {
        toast.error(errorMessage)
      }
    }

    // Log error for monitoring
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', {
        url: originalRequest.url,
        method: originalRequest.method,
        status: error.response?.status,
        message: errorMessage,
        error: error.response?.data
      })
    }

    return Promise.reject(error)
  }
)

// Security headers helper
api.setSecurityHeaders = () => {
  api.defaults.headers.common['X-Frame-Options'] = 'DENY'
  api.defaults.headers.common['X-XSS-Protection'] = '1; mode=block'
  api.defaults.headers.common['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
}

// Initialize security headers
api.setSecurityHeaders()

export default api
