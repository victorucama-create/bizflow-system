// Validation utilities
import * as yup from 'yup'

// Common validation schemas
export const emailSchema = yup
  .string()
  .email('E-mail inválido')
  .required('E-mail é obrigatório')

export const passwordSchema = yup
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres')
  .matches(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
  .matches(/[a-z]/, 'A senha deve conter pelo menos uma letra minúscula')
  .matches(/\d/, 'A senha deve conter pelo menos um número')
  .matches(/[@$!%*?&]/, 'A senha deve conter pelo menos um caractere especial')
  .required('Senha é obrigatória')

export const cpfSchema = yup
  .string()
  .test('cpf', 'CPF inválido', (value) => {
    if (!value) return true
    
    const cpf = value.replace(/\D/g, '')
    
    if (cpf.length !== 11) return false
    
    // Check for known invalid CPFs
    if (/^(\d)\1{10}$/.test(cpf)) return false
    
    // Validate CPF digits
    let sum = 0
    let remainder
    
    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (11 - i)
    }
    
    remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(cpf.substring(9, 10))) return false
    
    sum = 0
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (12 - i)
    }
    
    remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(cpf.substring(10, 11))) return false
    
    return true
  })

export const cnpjSchema = yup
  .string()
  .test('cnpj', 'CNPJ inválido', (value) => {
    if (!value) return true
    
    const cnpj = value.replace(/\D/g, '')
    
    if (cnpj.length !== 14) return false
    
    // Check for known invalid CNPJs
    if (/^(\d)\1{13}$/.test(cnpj)) return false
    
    // Validate CNPJ digits
    let size = cnpj.length - 2
    let numbers = cnpj.substring(0, size)
    const digits = cnpj.substring(size)
    let sum = 0
    let pos = size - 7
    
    for (let i = size; i >= 1; i--) {
      sum += numbers.charAt(size - i) * pos--
      if (pos < 2) pos = 9
    }
    
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    if (result !== parseInt(digits.charAt(0))) return false
    
    size = size + 1
    numbers = cnpj.substring(0, size)
    sum = 0
    pos = size - 7
    
    for (let i = size; i >= 1; i--) {
      sum += numbers.charAt(size - i) * pos--
      if (pos < 2) pos = 9
    }
    
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    if (result !== parseInt(digits.charAt(1))) return false
    
    return true
  })

export const phoneSchema = yup
  .string()
  .test('phone', 'Telefone inválido', (value) => {
    if (!value) return true
    
    const numbers = value.replace(/\D/g, '')
    return numbers.length === 10 || numbers.length === 11
  })

// Validation functions
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export const isValidPassword = (password) => {
  if (!password || password.length < 8) return false
  
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSpecialChar = /[@$!%*?&]/.test(password)
  
  return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar
}

export const isValidCPF = (cpf) => {
  if (!cpf) return false
  
  const cleanCPF = cpf.replace(/\D/g, '')
  
  if (cleanCPF.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false
  
  let sum = 0
  let remainder
  
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i)
  }
  
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false
  
  sum = 0
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i)
  }
  
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false
  
  return true
}

export const isValidCNPJ = (cnpj) => {
  if (!cnpj) return false
  
  const cleanCNPJ = cnpj.replace(/\D/g, '')
  
  if (cleanCNPJ.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false
  
  let size = cleanCNPJ.length - 2
  let numbers = cleanCNPJ.substring(0, size)
  const digits = cleanCNPJ.substring(size)
  let sum = 0
  let pos = size - 7
  
  for (let i = size; i >= 1; i--) {
    sum += numbers.charAt(size - i) * pos--
    if (pos < 2) pos = 9
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(0))) return false
  
  size = size + 1
  numbers = cleanCNPJ.substring(0, size)
  sum = 0
  pos = size - 7
  
  for (let i = size; i >= 1; i--) {
    sum += numbers.charAt(size - i) * pos--
    if (pos < 2) pos = 9
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(1))) return false
  
  return true
}

export const isValidPhone = (phone) => {
  if (!phone) return false
  
  const numbers = phone.replace(/\D/g, '')
  return numbers.length === 10 || numbers.length === 11
}

export const isValidDate = (date) => {
  if (!date) return false
  
  const dateObj = new Date(date)
  return dateObj instanceof Date && !isNaN(dateObj)
}

export const isValidURL = (url) => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Form validation schemas
export const loginSchema = yup.object({
  email: emailSchema,
  password: yup.string().required('Senha é obrigatória')
})

export const registerSchema = yup.object({
  name: yup.string().required('Nome é obrigatório'),
  email: emailSchema,
  company: yup.string().required('Nome da empresa é obrigatório'),
  password: passwordSchema,
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password'), null], 'As senhas devem coincidir')
    .required('Confirmação de senha é obrigatória'),
  terms: yup.boolean().oneOf([true], 'Você deve aceitar os termos')
})

export const customerSchema = yup.object({
  name: yup.string().required('Nome é obrigatório'),
  email: emailSchema,
  phone: phoneSchema,
  cpf_cnpj: yup
    .string()
    .test('document', 'CPF ou CNPJ inválido', (value) => {
      if (!value) return true
      
      const document = value.replace(/\D/g, '')
      return document.length === 11 ? isValidCPF(value) : isValidCNPJ(value)
    }),
  address: yup.string(),
  city: yup.string(),
  state: yup.string(),
  postal_code: yup.string()
})
