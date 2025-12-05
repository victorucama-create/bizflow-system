// Security utilities
import CryptoJS from 'crypto-js'

// Encryption key (in production, this should be from environment variables)
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'bizflow-secure-key-2024'

/**
 * Encrypt sensitive data
 * @param {string} data - Data to encrypt
 * @returns {string} Encrypted data
 */
export const encryptData = (data) => {
  try {
    return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString()
  } catch (error) {
    console.error('Encryption error:', error)
    return null
  }
}

/**
 * Decrypt encrypted data
 * @param {string} encryptedData - Encrypted data
 * @returns {any} Decrypted data
 */
export const decryptData = (encryptedData) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY)
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8))
  } catch (error) {
    console.error('Decryption error:', error)
    return null
  }
}

/**
 * Hash data (one-way)
 * @param {string} data - Data to hash
 * @returns {string} Hashed data
 */
export const hashData = (data) => {
  return CryptoJS.SHA256(data).toString()
}

/**
 * Sanitize input to prevent XSS
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input
  
  const div = document.createElement('div')
  div.textContent = input
  return div.innerHTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
export const validatePasswordStrength = (password) => {
  const errors = []
  const score = calculatePasswordScore(password)
  
  if (password.length < 8) {
    errors.push('A senha deve ter pelo menos 8 caracteres')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('A senha deve conter pelo menos uma letra maiúscula')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('A senha deve conter pelo menos uma letra minúscula')
  }
  
  if (!/\d/.test(password)) {
    errors.push('A senha deve conter pelo menos um número')
  }
  
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('A senha deve conter pelo menos um caractere especial')
  }
  
  let strength = 'weak'
  if (score >= 80) strength = 'strong'
  else if (score >= 60) strength = 'medium'
  else if (score >= 40) strength = 'fair'
  
  return {
    isValid: errors.length === 0,
    errors,
    score,
    strength
  }
}

/**
 * Calculate password score (0-100)
 * @param {string} password - Password to score
 * @returns {number} Password score
 */
export const calculatePasswordScore = (password) => {
  if (!password) return 0
  
  let score = 0
  
  // Length
  if (password.length >= 8) score += 20
  if (password.length >= 12) score += 20
  
  // Character variety
  if (/[A-Z]/.test(password)) score += 15
  if (/[a-z]/.test(password)) score += 15
  if (/\d/.test(password)) score += 15
  if (/[@$!%*?&]/.test(password)) score += 15
  
  // Bonus for mixed case and numbers
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 10
  if (/\d/.test(password) && /[A-Za-z]/.test(password)) score += 10
  
  return Math.min(score, 100)
}

/**
 * Generate secure random string
 * @param {number} length - Length of string
 * @returns {string} Random string
 */
export const generateSecureRandom = (length = 32) => {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate a secure session ID
 * @returns {string} Session ID
 */
export const generateSessionId = () => {
  return `sess_${Date.now()}_${generateSecureRandom(16)}`
}

/**
 * Check if JWT token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if expired
 */
export const isTokenExpired = (token) => {
  if (!token) return true
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

/**
 * Extract payload from JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} Token payload
 */
export const extractTokenPayload = (token) => {
  if (!token) return null
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload
  } catch {
    return null
  }
}

/**
 * Validate IP address format
 * @param {string} ip - IP address
 * @returns {boolean} True if valid
 */
export const isValidIP = (ip) => {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
}

/**
 * Mask sensitive information in logs
 * @param {any} data - Data to mask
 * @returns {any} Masked data
 */
export const maskSensitiveData = (data) => {
  if (typeof data !== 'object' || data === null) {
    return data
  }
  
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'creditCard',
    'cvv',
    'cpf',
    'cnpj',
    'email',
    'phone'
  ]
  
  const masked = { ...data }
  
  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = '***MASKED***'
    }
  }
  
  return masked
}
