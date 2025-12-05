import React, { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import SecurityIndicator from '../security/SecurityIndicator'
import SessionTimeoutWarning from '../security/SessionTimeoutWarning'

const SecurityProvider = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, checkAuth } = useAuthStore()

  // Monitor user activity
  useEffect(() => {
    const updateActivity = () => {
      localStorage.setItem('lastActivity', Date.now().toString())
    }

    // Events that indicate user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    
    activityEvents.forEach(event => {
      document.addEventListener(event, updateActivity)
    })

    // Initial activity
    updateActivity()

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, updateActivity)
      })
    }
  }, [])

  // Check authentication on route change
  useEffect(() => {
    const verifyAuth = async () => {
      const isAuthenticated = await checkAuth()
      
      if (!isAuthenticated && location.pathname !== '/login') {
        navigate('/login', { 
          state: { from: location.pathname },
          replace: true 
        })
      }
    }

    verifyAuth()
  }, [location.pathname, checkAuth, navigate])

  // Log page views for security audit
  useEffect(() => {
    if (user) {
      console.log(`🔒 [SECURITY] User ${user.email} accessed ${location.pathname}`)
      // In production, send this to your audit log service
    }
  }, [location.pathname, user])

  return (
    <>
      {children}
      <SecurityIndicator />
      <SessionTimeoutWarning />
    </>
  )
}

export default SecurityProvider
