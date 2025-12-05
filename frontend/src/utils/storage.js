// Local storage utilities with encryption
import { encryptData, decryptData } from './security'

/**
 * Safely store data in localStorage
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 * @param {boolean} encrypt - Whether to encrypt the data
 */
export const setStorageItem = (key, value, encrypt = true) => {
  try {
    const data = encrypt ? encryptData(value) : JSON.stringify(value)
    localStorage.setItem(key, data)
    return true
  } catch (error) {
    console.error('Error storing data:', error)
    return false
  }
}

/**
 * Safely retrieve data from localStorage
 * @param {string} key - Storage key
 * @param {boolean} encrypted - Whether the data is encrypted
 * @returns {any} Retrieved data
 */
export const getStorageItem = (key, encrypted = true) => {
  try {
    const data = localStorage.getItem(key)
    
    if (!data) return null
    
    if (encrypted) {
      return decryptData(data)
    } else {
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Error retrieving data:', error)
    return null
  }
}

/**
 * Remove item from localStorage
 * @param {string} key - Storage key
 */
export const removeStorageItem = (key) => {
  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error('Error removing data:', error)
    return false
  }
}

/**
 * Clear all application data from localStorage
 */
export const clearAppStorage = () => {
  try {
    const keys = Object.keys(localStorage)
    
    // Only remove app-specific keys
    const appKeys = keys.filter(key => 
      key.startsWith('bizflow-') || 
      key.startsWith('auth-') ||
      key.includes('_storage')
    )
    
    appKeys.forEach(key => localStorage.removeItem(key))
    return true
  } catch (error) {
    console.error('Error clearing storage:', error)
    return false
  }
}

/**
 * Check if localStorage is available
 * @returns {boolean} True if available
 */
export const isStorageAvailable = () => {
  try {
    const testKey = '__storage_test__'
    localStorage.setItem(testKey, testKey)
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

/**
 * Get storage usage information
 * @returns {Object} Storage usage stats
 */
export const getStorageUsage = () => {
  try {
    let total = 0
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      const value = localStorage.getItem(key)
      total += key.length + value.length
    }
    
    const totalKB = (total * 2) / 1024 // UTF-16 uses 2 bytes per char
    const limitKB = 5 * 1024 // 5MB typical limit
    
    return {
      usedKB: totalKB,
      limitKB,
      percentage: (totalKB / limitKB) * 100,
      items: localStorage.length
    }
  } catch {
    return null
  }
}

/**
 * Store session data with expiration
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 * @param {number} ttl - Time to live in milliseconds
 */
export const setSessionData = (key, value, ttl = 24 * 60 * 60 * 1000) => {
  const data = {
    value,
    expires: Date.now() + ttl
  }
  
  return setStorageItem(key, data)
}

/**
 * Get session data (checks expiration)
 * @param {string} key - Storage key
 * @returns {any} Retrieved data or null if expired
 */
export const getSessionData = (key) => {
  const data = getStorageItem(key)
  
  if (!data || !data.expires) {
    return null
  }
  
  if (Date.now() > data.expires) {
    removeStorageItem(key)
    return null
  }
  
  return data.value
}

/**
 * Store pagination state
 * @param {string} page - Page identifier
 * @param {Object} state - Pagination state
 */
export const storePaginationState = (page, state) => {
  const key = `pagination_${page}`
  return setStorageItem(key, state, false)
}

/**
 * Retrieve pagination state
 * @param {string} page - Page identifier
 * @returns {Object} Pagination state
 */
export const getPaginationState = (page) => {
  const key = `pagination_${page}`
  return getStorageItem(key, false) || {}
}

/**
 * Store form state temporarily
 * @param {string} formId - Form identifier
 * @param {Object} data - Form data
 */
export const storeFormState = (formId, data) => {
  const key = `form_${formId}`
  return setStorageItem(key, data, false)
}

/**
 * Retrieve form state
 * @param {string} formId - Form identifier
 * @returns {Object} Form data
 */
export const getFormState = (formId) => {
  const key = `form_${formId}`
  return getStorageItem(key, false) || {}
}

/**
 * Clear form state
 * @param {string} formId - Form identifier
 */
export const clearFormState = (formId) => {
  const key = `form_${formId}`
  removeStorageItem(key)
}
