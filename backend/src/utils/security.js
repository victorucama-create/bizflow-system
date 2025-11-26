const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Gerar hash seguro
exports.generateHash = async (data) => {
    return bcrypt.hash(data, 12);
};

// Verificar hash
exports.verifyHash = async (data, hash) => {
    return bcrypt.compare(data, hash);
};

// Gerar token seguro
exports.generateSecureToken = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

// Gerar código numérico seguro
exports.generateNumericCode = (length = 6) => {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
};

// Validar força da senha
exports.validatePasswordStrength = (password) => {
    const requirements = {
        minLength: 8,
        hasUpperCase: /[A-Z]/.test(password),
        hasLowerCase: /[a-z]/.test(password),
        hasNumbers: /\d/.test(password),
        hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
    
    const score = Object.values(requirements).filter(Boolean).length;
    
    let strength = 'weak';
    if (score >= 4) strength = 'strong';
    else if (score >= 3) strength = 'medium';
    
    return {
        strength,
        score,
        requirements,
        isValid: password.length >= requirements.minLength && score >= 3
    };
};

// Sanitizar dados para prevenir XSS
exports.sanitize = (input) => {
    if (typeof input !== 'string') return input;
    
    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();
};

// Validar email
exports.isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Validar CPF/CNPJ (Brasil)
exports.isValidBrazilianTaxId = (taxId) => {
    if (!taxId) return false;
    
    const cleanTaxId = taxId.replace(/\D/g, '');
    
    if (cleanTaxId.length === 11) {
        // Validar CPF
        return validateCPF(cleanTaxId);
    } else if (cleanTaxId.length === 14) {
        // Validar CNPJ
        return validateCNPJ(cleanTaxId);
    }
    
    return false;
};

// Funções auxiliares para validação de CPF/CNPJ
function validateCPF(cpf) {
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    
    return remainder === parseInt(cpf.charAt(10));
}

function validateCNPJ(cnpj) {
    if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
    
    let length = cnpj.length - 2;
    let numbers = cnpj.substring(0, length);
    const digits = cnpj.substring(length);
    let sum = 0;
    let pos = length - 7;
    
    for (let i = length; i >= 1; i--) {
        sum += numbers.charAt(length - i) * pos--;
        if (pos < 2) pos = 9;
    }
    
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;
    
    length = length + 1;
    numbers = cnpj.substring(0, length);
    sum = 0;
    pos = length - 7;
    
    for (let i = length; i >= 1; i--) {
        sum += numbers.charAt(length - i) * pos--;
        if (pos < 2) pos = 9;
    }
    
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return result === parseInt(digits.charAt(1));
}
