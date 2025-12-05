import React, { useState, useEffect } from 'react'
import { 
  Clock, 
  LogOut, 
  RefreshCw,
  AlertTriangle
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import Button from '../ui/Button'

const SessionTimeoutWarning = () => {
  const [showWarning, setShowWarning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes in seconds
  const [isExtending, setIsExtending] = useState(false)

  const { logout, updateActivity } = useAuthStore()

  useEffect(() => {
    // Check session every minute
    const checkInterval = setInterval(() => {
      const lastActivity = localStorage.getItem('lastActivity')
      if (lastActivity) {
        const elapsed = Date.now() - parseInt(lastActivity, 10)
        const warningTime = 25 * 60 * 1000 // 25 minutes
        const timeoutTime = 30 * 60 * 1000 // 30 minutes

        if (elapsed > warningTime && elapsed < timeoutTime) {
          const remaining = Math.floor((timeoutTime - elapsed) / 1000)
          setTimeLeft(remaining)
          setShowWarning(true)
        } else if (elapsed >= timeoutTime) {
          handleLogout()
        }
      }
    }, 60000) // Check every minute

    return () => clearInterval(checkInterval)
  }, [])

  useEffect(() => {
    let countdownInterval
    if (showWarning && timeLeft > 0) {
      countdownInterval = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
    } else if (timeLeft <= 0) {
      handleLogout()
    }

    return () => {
      if (countdownInterval) clearInterval(countdownInterval)
    }
  }, [showWarning, timeLeft])

  const handleExtendSession = async () => {
    setIsExtending(true)
    try {
      // Update activity timestamp
      updateActivity()
      localStorage.setItem('lastActivity', Date.now().toString())
      
      // Reset warning
      setShowWarning(false)
      setTimeLeft(300)
      
      // Show success message
      console.log('Sessão estendida')
    } catch (error) {
      console.error('Erro ao estender sessão:', error)
    } finally {
      setIsExtending(false)
    }
  }

  const handleLogout = () => {
    setShowWarning(false)
    logout()
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!showWarning) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Sessão Expirando
          </h2>
          
          <div className="flex items-center justify-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <p className="text-gray-600">
              Sua sessão irá expirar em
            </p>
          </div>

          {/* Countdown Timer */}
          <div className="mb-6">
            <div className="text-5xl font-bold text-gray-900 mb-2">
              {formatTime(timeLeft)}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-yellow-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${(timeLeft / 300) * 100}%` }}
              />
            </div>
          </div>

          <p className="text-gray-600 mb-6">
            Por motivos de segurança, sua sessão será encerrada automaticamente.
            Deseja continuar conectado?
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="primary"
            icon={RefreshCw}
            loading={isExtending}
            onClick={handleExtendSession}
            className="flex-1"
          >
            Continuar Conectado
          </Button>
          
          <Button
            variant="outline"
            icon={LogOut}
            onClick={handleLogout}
            className="flex-1"
          >
            Sair Agora
          </Button>
        </div>

        <div className="mt-6 pt-6 border-t text-center">
          <p className="text-sm text-gray-500">
            Sua sessão expira após 30 minutos de inatividade
          </p>
        </div>
      </div>
    </div>
  )
}

export default SessionTimeoutWarning
