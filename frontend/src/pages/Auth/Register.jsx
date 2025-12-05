import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { 
  User, 
  Mail, 
  Building, 
  Lock, 
  Eye, 
  EyeOff,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { registerSchema } from '../../utils/validators'
import { useAuthStore } from '../../store/authStore'
import { validatePasswordStrength } from '../../utils/security'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Card from '../../components/ui/Card'
import toast from 'react-hot-toast'

const Register = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const navigate = useNavigate()
  const { register: registerUser, isLoading } = useAuthStore()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(registerSchema)
  })

  const password = watch('password', '')

  const handlePasswordChange = (value) => {
    const validation = validatePasswordStrength(value)
    setPasswordStrength(validation.score)
  }

  const onSubmit = async (data) => {
    try {
      const result = await registerUser(data)
      if (result.success) {
        toast.success('Conta criada com sucesso!')
        navigate('/dashboard')
      }
    } catch (error) {
      // Error is handled by auth store
    }
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) return 'bg-red-500'
    if (passwordStrength < 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getPasswordStrengthText = () => {
    if (passwordStrength < 40) return 'Fraca'
    if (passwordStrength < 70) return 'Média'
    return 'Forte'
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
          <User className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Criar Conta Segura</h2>
        <p className="text-gray-600 mt-2">Preencha os dados para criar sua conta</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Name */}
        <Input
          label="Nome Completo"
          placeholder="Seu nome completo"
          startIcon={User}
          {...register('name')}
          error={errors.name?.message}
        />

        {/* Email */}
        <Input
          label="E-mail"
          type="email"
          placeholder="seu@email.com"
          startIcon={Mail}
          {...register('email')}
          error={errors.email?.message}
        />

        {/* Company */}
        <Input
          label="Nome da Empresa"
          placeholder="Nome da sua empresa"
          startIcon={Building}
          {...register('company')}
          error={errors.company?.message}
        />

        {/* Password */}
        <div>
          <Input
            label="Senha"
            type={showPassword ? 'text' : 'password'}
            placeholder="Crie uma senha forte"
            startIcon={Lock}
            endIcon={showPassword ? EyeOff : Eye}
            onEndIconClick={() => setShowPassword(!showPassword)}
            {...register('password', {
              onChange: (e) => handlePasswordChange(e.target.value)
            })}
            error={errors.password?.message}
          />
          
          {password && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Força da senha:</span>
                <span className={`text-sm font-medium ${
                  passwordStrength < 40 ? 'text-red-600' :
                  passwordStrength < 70 ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {getPasswordStrengthText()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                  style={{ width: `${passwordStrength}%` }}
                />
              </div>
              
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  {password.length >= 8 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-gray-300" />
                  )}
                  <span className={`text-sm ${password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                    Pelo menos 8 caracteres
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {/[A-Z]/.test(password) && /[a-z]/.test(password) ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-gray-300" />
                  )}
                  <span className={`text-sm ${/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
                    Letras maiúsculas e minúsculas
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {/\d/.test(password) ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-gray-300" />
                  )}
                  <span className={`text-sm ${/\d/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
                    Pelo menos um número
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {/[@$!%*?&]/.test(password) ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-gray-300" />
                  )}
                  <span className={`text-sm ${/[@$!%*?&]/.test(password) ? 'text-green-600' : 'text-gray-500'}`}>
                    Pelo menos um caractere especial (@$!%*?&)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <Input
          label="Confirmar Senha"
          type={showConfirm ? 'text' : 'password'}
          placeholder="Confirme sua senha"
          startIcon={Lock}
          endIcon={showConfirm ? EyeOff : Eye}
          onEndIconClick={() => setShowConfirm(!showConfirm)}
          {...register('confirmPassword')}
          error={errors.confirmPassword?.message}
        />

        {/* Terms */}
        <div className="space-y-2">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              {...register('terms')}
              className="mt-1 h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary/50"
            />
            <span className="text-sm text-gray-600">
              Aceito os{' '}
              <Link to="/terms" className="text-primary hover:text-primary/80">
                Termos de Uso
              </Link>
              {' '}e{' '}
              <Link to="/privacy" className="text-primary hover:text-primary/80">
                Política de Privacidade
              </Link>
            </span>
          </label>
          {errors.terms && (
            <p className="text-sm text-red-600">{errors.terms.message}</p>
          )}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={isLoading}
          fullWidth
        >
          Criar Conta Segura
        </Button>
      </form>

      {/* Already have account */}
      <div className="text-center pt-4 border-t">
        <p className="text-gray-600">
          Já tem uma conta?{' '}
          <Link to="/login" className="text-primary font-medium hover:text-primary/80">
            Faça login
          </Link>
        </p>
      </div>

      {/* Security Info */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-blue-500 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Importante</h3>
            <ul className="text-sm text-blue-800 space-y-1 mt-2">
              <li>• Use uma senha forte e única para esta conta</li>
              <li>• Ative a autenticação de dois fatores após o registro</li>
              <li>• Mantenha suas informações de contato atualizadas</li>
              <li>• Nunca compartilhe suas credenciais de acesso</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default Register
