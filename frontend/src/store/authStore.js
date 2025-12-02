import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from '../services/api'
import toast from 'react-hot-toast'

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      lastActivity: Date.now(),
      sessionTimeout: 30 * 60 * 1000, // 30 minutes

      // Actions
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      
      login: async (email, password, twoFactorCode = null) => {
        set({ isLoading: true })
        try {
          const payload = { email, password }
          if (twoFactorCode) {
            payload.twoFactorCode = twoFactorCode
          }

          const response = await axios.post('/auth/login', payload)
          
          const { user, token, refreshToken } = response.data
          
          // Set authorization header for future requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
          
          set({ 
            user, 
            token, 
            refreshToken,
            isLoading: false,
            lastActivity: Date.now()
          })
          
          toast.success('Login realizado com sucesso!')
          return { success: true, user }
        } catch (error) {
          set({ isLoading: false })
          
          // Check if 2FA is required
          if (error.response?.data?.twoFactorRequired) {
            return { 
              success: false, 
              twoFactorRequired: true,
              message: 'Autenticação de dois fatores requerida'
            }
          }
          
          toast.error(error.response?.data?.message || 'Erro ao fazer login')
          return { success: false, message: error.response?.data?.message }
        }
      },

      logout: async () => {
        try {
          const token = get().token
          if (token) {
            await axios.post('/auth/logout', {}, {
              headers: { Authorization: `Bearer ${token}` }
            })
          }
        } catch (error) {
          console.error('Logout error:', error)
        } finally {
          // Clear store
          set({ 
            user: null, 
            token: null, 
            refreshToken: null,
            lastActivity: null 
          })
          
          // Clear axios header
          delete axios.defaults.headers.common['Authorization']
          
          // Clear localStorage via persist
          localStorage.removeItem('auth-storage')
          
          toast.success('Logout realizado com sucesso')
        }
      },

      register: async (userData) => {
        set({ isLoading: true })
        try {
          const response = await axios.post('/auth/register', userData)
          const { user, token } = response.data
          
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
          
          set({ 
            user, 
            token,
            isLoading: false,
            lastActivity: Date.now()
          })
          
          toast.success('Conta criada com sucesso!')
          return { success: true, user }
        } catch (error) {
          set({ isLoading: false })
          toast.error(error.response?.data?.message || 'Erro ao criar conta')
          return { success: false, message: error.response?.data?.message }
        }
      },

      checkAuth: async () => {
        const { token, lastActivity } = get()
        
        // Check if token exists
        if (!token) {
          return false
        }

        // Check session timeout
        if (lastActivity && Date.now() - lastActivity > get().sessionTimeout) {
          toast.error('Sessão expirada. Por favor, faça login novamente.')
          get().logout()
          return false
        }

        // Try to refresh token if needed
        try {
          const response = await axios.get('/auth/verify', {
            headers: { Authorization: `Bearer ${token}` }
          })
          
          if (response.data.valid) {
            set({ lastActivity: Date.now() })
            return true
          }
        } catch (error) {
          console.error('Auth verification failed:', error)
        }

        return false
      },

      updateActivity: () => {
        set({ lastActivity: Date.now() })
      },

      updateProfile: async (profileData) => {
        try {
          const response = await axios.put('/users/profile', profileData)
          const updatedUser = response.data
          
          set({ user: updatedUser })
          toast.success('Perfil atualizado com sucesso!')
          return { success: true, user: updatedUser }
        } catch (error) {
          toast.error(error.response?.data?.message || 'Erro ao atualizar perfil')
          return { success: false, message: error.response?.data?.message }
        }
      },

      changePassword: async (currentPassword, newPassword) => {
        try {
          await axios.put('/auth/change-password', {
            currentPassword,
            newPassword
          })
          
          toast.success('Senha alterada com sucesso!')
          return { success: true }
        } catch (error) {
          toast.error(error.response?.data?.message || 'Erro ao alterar senha')
          return { success: false, message: error.response?.data?.message }
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        lastActivity: state.lastActivity
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
        }
      }
    }
  )
)

export default useAuthStore
