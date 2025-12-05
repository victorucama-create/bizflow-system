// Date and currency formatters
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Format a date string to Brazilian format
 * @param {string|Date} date - Date to format
 * @param {string} formatString - Date format string
 * @returns {string} Formatted date
 */
export const formatDate = (date, formatString = 'dd/MM/yyyy') => {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return format(dateObj, formatString, { locale: ptBR })
  } catch (error) {
    console.error('Error formatting date:', error)
    return ''
  }
}

/**
 * Format a date string with time
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted datetime
 */
export const formatDateTime = (date) => {
  return formatDate(date, "dd/MM/yyyy 'às' HH:mm")
}

/**
 * Format a date as relative time (e.g., "2 horas atrás")
 * @param {string|Date} date - Date to format
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date) => {
  if (!date) return ''
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    return formatDistanceToNow(dateObj, { 
      addSuffix: true,
      locale: ptBR 
    })
  } catch (error) {
    console.error('Error formatting relative time:', error)
    return ''
  }
}

/**
 * Format currency in Brazilian Real
 * @param {number} value - Amount to format
 * @param {boolean} showSymbol - Whether to show currency symbol
 * @returns {string} Formatted currency
 */
export const formatCurrency = (value, showSymbol = true) => {
  if (value === null || value === undefined) return showSymbol ? 'R$ 0,00' : '0,00'
  
  const options = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }
  
  if (showSymbol) {
    options.style = 'currency'
    options.currency = 'BRL'
  }
  
  return new Intl.NumberFormat('pt-BR', options).format(value)
}

/**
 * Format percentage
 * @param {number} value - Percentage value
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage
 */
export const formatPercentage = (value, decimals = 2) => {
  if (value === null || value === undefined) return '0%'
  
  return `${value.toFixed(decimals)}%`
}

/**
 * Format file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Format phone number to Brazilian format
 * @param {string} phone - Phone number string
 * @returns {string} Formatted phone number
 */
export const formatPhone = (phone) => {
  if (!phone) return ''
  
  // Remove all non-numeric characters
  const numbers = phone.replace(/\D/g, '')
  
  // Format based on length
  if (numbers.length === 11) {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  } else if (numbers.length === 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  
  return phone
}

/**
 * Format CPF or CNPJ
 * @param {string} document - CPF or CNPJ string
 * @returns {string} Formatted document
 */
export const formatDocument = (document) => {
  if (!document) return ''
  
  const numbers = document.replace(/\D/g, '')
  
  if (numbers.length === 11) {
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  } else if (numbers.length === 14) {
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  
  return document
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  
  return text.substring(0, maxLength) + '...'
}

/**
 * Format credit card number (mask all but last 4 digits)
 * @param {string} cardNumber - Credit card number
 * @returns {string} Masked card number
 */
export const maskCardNumber = (cardNumber) => {
  if (!cardNumber) return ''
  
  const last4 = cardNumber.slice(-4)
  return `•••• •••• •••• ${last4}`
}

/**
 * Format bank account number
 * @param {string} account - Account number
 * @param {string} agency - Agency number (optional)
 * @returns {string} Formatted account
 */
export const formatBankAccount = (account, agency = '') => {
  let formatted = account
  
  if (agency) {
    formatted = `${agency} / ${account}`
  }
  
  return formatted
}
