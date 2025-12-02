import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Shield,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

const schema = yup.object({
  email: yup
    .string()
    .email('E-mail inválido')
    .required('E-mail é obrigatório'),
  password: yup
    .string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres')
    .required('Senha é obrigatória'),
  twoFactorCode: yup
    .string()
    .when('showTwoFactor', {
      is: true,
      then: yup
        .string()
        .length(6, 'Código deve ter 6 dígitos')
        .required('Código 2FA é obrigatório')
    })
})

const Login = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showTwoFactor, setShowTwoFactor] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      email: '',
      password: '',
      twoFactorCode: ''
    }
  })

  const emailValue = watch('email')

  const checkPasswordStrength = (password) => {
    let strength = 0
    if (password.length >= 8) strength += 25
    if (/[A-Z]/.test(password)) strength += 25
    if (/[a-z]/.test(password)) strength += 25
    if (/[0-9]/.test(password)) strength += 15
    if (/[^A-Za-z0-9]/.test(password)) strength += 10
    return Math.min(strength, 100)
  }

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      const result = await login(data.email, data.password, data.twoFactorCode)
      
      if (result.success) {
        toast.success('Login realizado com sucesso!')
        navigate('/dashboard')
      } else {
        if (result.twoFactorRequired) {
          setShowTwoFactor(true)
          toast.loading('Autenticação de dois fatores requerida')
        } else {
          setFailedAttempts(prev => prev + 1)
          toast.error(result.message || 'Credenciais inválidas')
        }
      }
    } catch (error) {
      toast.error('Erro ao fazer login. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Entrar no Sistema</h2>
        <p className="text-gray-600 mt-2">Use suas credenciais para acessar sua conta</p>
      </div>

      {/* Failed Attempts Warning */}
      {failedAttempts > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <p className="font-medium text-red-800">Tentativa falhada #{failedAttempts}</p>
              <p className="text-sm text-red-600">
                {failedAttempts >= 3 
                  ? 'Múltiplas tentativas falhadas. Verifique suas credenciais.' 
                  : 'Verifique seu e-mail e senha.'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Security Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-5 w-5 text-blue-500" />
          <h3 className="font-medium text-blue-800">Dicas de Segurança</h3>
        </div>
        <ul className="space-y-2 text-sm text-blue-600">
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Use senhas fortes com letras, números e símbolos
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Nunca compartilhe suas credenciais
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Verifique sempre o endereço do site
          </li>
        </ul>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            E-mail
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              {...register('email')}
              type="email"
              id="email"
              autoComplete="username"
              className="input-primary pl-10"
              placeholder="seu@email.com"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Senha
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              className="input-primary pl-10 pr-10"
              placeholder="Sua senha"
              onChange={(e) => {
                setValue('password', e.target.value)
                // Check password strength for demo
                const strength = checkPasswordStrength(e.target.value)
                // You could update UI based on strength
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        {/* Two Factor Authentication */}
        {showTwoFactor && (
          <div className="animate-fade-in">
            <label htmlFor="twoFactorCode" className="block text-sm font-medium text-gray-700 mb-1">
              Código de Autenticação
            </label>
            <input
              {...register('twoFactorCode')}
              type="text"
              id="twoFactorCode"
              maxLength="6"
              pattern="[0-9]{6}"
              className="input-primary text-center text-2xl tracking-widest"
              placeholder="000000"
            />
            <p className="mt-2 text-sm text-gray-500">
              Digite o código do seu aplicativo autenticador
            </p>
            {errors.twoFactorCode && (
              <p className="mt-1 text-sm text-red-600">{errors.twoFactorCode.message}</p>
            )}
          </div>
        )}

        {/* Remember & Forgot */}
        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary/50"
            />
            <span className="ml-2 text-sm text-gray-600">Lembrar-me</span>
          </label>
          <Link
            to="/forgot-password"
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            Esqueceu sua senha?
          </Link>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full btn-primary py-3 text-base"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              Entrando...
            </div>
          ) : (
            <>
              <Lock className="inline h-5 w-5 mr-2" />
              Entrar Seguro
            </>
          )}
        </button>
      </form>

      {/* Demo Credentials */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
          <h4 className="font-medium text-gray-800 mb-2">Credenciais para teste:</h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">E-mail:</span>
              <code className="ml-2 px-2 py-1 bg-gray-200 rounded">admin@bizflow.com</code>
            </div>
            <div>
              <span className="font-medium">Senha:</span>
              <code className="ml-2 px-2 py-1 bg-gray-200 rounded">BizFlowAdmin2023!</code>
            </div>
          </div>
        </div>
      )}

      {/* Footer Links */}
      <div className="text-center space-y-4 pt-6 border-t">
        <p className="text-gray-600">
          Não tem uma conta?{' '}
          <Link to="/register" className="text-primary font-medium hover:text-primary/80">
            Registre-se
          </Link>
        </p>
        
        <div className="text-xs text-gray-500">
          <p>Ao fazer login, você concorda com nossos</p>
          <p>
            <Link to="/terms" className="hover:text-gray-700">Termos de Uso</Link>
            {' e '}
            <Link to="/privacy" className="hover:text-gray-700">Política de Privacidade</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
