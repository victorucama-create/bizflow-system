import React, { useState, useEffect } from 'react'
import { 
  X,
  Save,
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  CreditCard,
  Calendar,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useMutation, useQueryClient } from 'react-query'
import Card from '../../../components/ui/Card'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import api from '../../../services/api'
import toast from 'react-hot-toast'
import { isValidCPF, isValidCNPJ } from '../../../utils/validators'

// Validation schema
const customerSchema = yup.object({
  name: yup.string().required('Nome é obrigatório'),
  email: yup.string().email('E-mail inválido').required('E-mail é obrigatório'),
  phone: yup.string().required('Telefone é obrigatório'),
  cpf_cnpj: yup.string()
    .test('document', 'CPF ou CNPJ inválido', (value) => {
      if (!value) return true
      const document = value.replace(/\D/g, '')
      return document.length === 11 ? isValidCPF(value) : isValidCNPJ(value)
    }),
  customer_type: yup.string().oneOf(['individual', 'business']).default('individual'),
  address: yup.string(),
  city: yup.string(),
  state: yup.string(),
  postal_code: yup.string(),
  country: yup.string().default('Brasil'),
  status: yup.string().oneOf(['active', 'inactive', 'pending']).default('active'),
  credit_limit: yup.number()
    .typeError('Limite deve ser um número')
    .min(0, 'Limite não pode ser negativo')
    .default(0),
  current_balance: yup.number()
    .typeError('Saldo deve ser um número')
    .default(0),
  notes: yup.string(),
  segment: yup.string(),
  company_name: yup.string().when('customer_type', {
    is: 'business',
    then: yup.string().required('Razão Social é obrigatória para empresas')
  }),
  contact_person: yup.string(),
  website: yup.string().url('URL inválida')
})

const CustomerModal = ({ customer, onClose, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCreditDetails, setShowCreditDetails] = useState(false)
  
  const queryClient = useQueryClient()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm({
    resolver: yupResolver(customerSchema),
    defaultValues: customer || {
      name: '',
      email: '',
      phone: '',
      cpf_cnpj: '',
      customer_type: 'individual',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'Brasil',
      status: 'active',
      credit_limit: 0,
      current_balance: 0,
      notes: '',
      segment: '',
      company_name: '',
      contact_person: '',
      website: ''
    }
  })

  const customerType = watch('customer_type')
  const creditLimit = watch('credit_limit') || 0
  const currentBalance = watch('current_balance') || 0
  const availableCredit = creditLimit - currentBalance

  // Customer mutation
  const customerMutation = useMutation(
    async (data) => {
      if (customer) {
        const response = await api.put(`/customers/${customer.id}`, data)
        return response.data
      } else {
        const response = await api.post('/customers', data)
        return response.data
      }
    },
    {
      onSuccess: () => {
        toast.success(customer ? 'Cliente atualizado!' : 'Cliente criado!')
        queryClient.invalidateQueries('customers')
        onSuccess()
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Erro ao salvar cliente')
      }
    }
  )

  useEffect(() => {
    if (customer) {
      reset(customer)
    }
  }, [customer, reset])

  const onSubmit = async (data) => {
    setIsSubmitting(true)
    try {
      await customerMutation.mutateAsync(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDocument = (value) => {
    const numbers = value.replace(/\D/g, '')
    
    if (numbers.length <= 11) {
      // CPF
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    } else {
      // CNPJ
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    }
  }

  const handleDocumentChange = (e) => {
    const formatted = formatDocument(e.target.value)
    setValue('cpf_cnpj', formatted, { shouldValidate: true })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {customer ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <p className="text-gray-600">
                {customer ? `ID: ${customer.id}` : 'Preencha os dados do cliente'}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Basic Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal/Business Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {customerType === 'business' ? 'Informações da Empresa' : 'Informações Pessoais'}
                </h3>
                
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="individual"
                      checked={customerType === 'individual'}
                      onChange={(e) => setValue('customer_type', e.target.value)}
                      className="h-4 w-4 text-primary border-gray-300 focus:ring-primary/50"
                    />
                    <span className="ml-2">Pessoa Física</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="business"
                      checked={customerType === 'business'}
                      onChange={(e) => setValue('customer_type', e.target.value)}
                      className="h-4 w-4 text-primary border-gray-300 focus:ring-primary/50"
                    />
                    <span className="ml-2">Empresa</span>
                  </label>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customerType === 'business' && (
                    <Input
                      label="Razão Social"
                      placeholder="Nome legal da empresa"
                      startIcon={Building}
                      {...register('company_name')}
                      error={errors.company_name?.message}
                    />
                  )}
                  
                  <Input
                    label={customerType === 'business' ? 'Nome Fantasia' : 'Nome Completo'}
                    placeholder={customerType === 'business' ? 'Nome comercial' : 'Nome completo'}
                    startIcon={User}
                    {...register('name')}
                    error={errors.name?.message}
                  />
                  
                  <Input
                    label={customerType === 'business' ? 'CNPJ' : 'CPF'}
                    placeholder={customerType === 'business' ? '00.000.000/0000-00' : '000.000.000-00'}
                    onChange={handleDocumentChange}
                    value={watch('cpf_cnpj')}
                    error={errors.cpf_cnpj?.message}
                  />
                  
                  {customerType === 'business' && (
                    <Input
                      label="Responsável"
                      placeholder="Nome do responsável"
                      {...register('contact_person')}
                    />
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Informações de Contato
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="E-mail"
                    type="email"
                    placeholder="cliente@email.com"
                    startIcon={Mail}
                    {...register('email')}
                    error={errors.email?.message}
                  />
                  
                  <Input
                    label="Telefone"
                    placeholder="(11) 99999-9999"
                    startIcon={Phone}
                    {...register('phone')}
                    error={errors.phone?.message}
                  />
                  
                  <Input
                    label="Website"
                    placeholder="https://empresa.com"
                    {...register('website')}
                    error={errors.website?.message}
                  />
                  
                  <Input
                    label="Segmento"
                    placeholder="Ex: Varejo, Indústria, Serviços"
                    {...register('segment')}
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Endereço
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <Input
                    label="Endereço"
                    placeholder="Rua, Número, Complemento"
                    startIcon={MapPin}
                    {...register('address')}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="Cidade"
                      placeholder="Cidade"
                      {...register('city')}
                    />
                    
                    <Input
                      label="Estado"
                      placeholder="UF"
                      {...register('state')}
                    />
                    
                    <Input
                      label="CEP"
                      placeholder="00000-000"
                      {...register('postal_code')}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Additional Info */}
            <div className="space-y-6">
              {/* Credit Info */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Crédito e Finanças
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowCreditDetails(!showCreditDetails)}
                    className="text-sm text-primary hover:text-primary/80"
                  >
                    {showCreditDetails ? (
                      <EyeOff className="h-4 w-4 inline mr-1" />
                    ) : (
                      <Eye className="h-4 w-4 inline mr-1" />
                    )}
                    {showCreditDetails ? 'Ocultar' : 'Detalhes'}
                  </button>
                </div>
                
                <div className="space-y-3">
                  <Input
                    label="Limite de Crédito"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    startIcon={CreditCard}
                   
