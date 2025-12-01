const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const moment = require('moment');

class Helpers {
    /**
     * Generate a secure random token
     */
    static generateToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Generate a unique reference number
     */
    static generateReference(prefix = 'REF') {
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${prefix}-${timestamp}-${random}`;
    }

    /**
     * Generate sale number
     */
    static generateSaleNumber(userId) {
        const date = moment().format('YYYYMMDD');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `SALE-${date}-${random}`;
    }

    /**
     * Generate invoice number
     */
    static generateInvoiceNumber() {
        const year = moment().format('YYYY');
        const month = moment().format('MM');
        const sequence = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `INV-${year}${month}-${sequence}`;
    }

    /**
     * Format currency
     */
    static formatCurrency(amount, currency = 'BRL') {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    /**
     * Format date
     */
    static formatDate(date, format = 'DD/MM/YYYY') {
        return moment(date).format(format);
    }

    /**
     * Format datetime
     */
    static formatDateTime(date, format = 'DD/MM/YYYY HH:mm:ss') {
        return moment(date).format(format);
    }

    /**
     * Calculate age from date
     */
    static calculateAge(birthDate) {
        return moment().diff(birthDate, 'years');
    }

    /**
     * Calculate days between dates
     */
    static daysBetween(startDate, endDate) {
        return moment(endDate).diff(moment(startDate), 'days');
    }

    /**
     * Validate CPF (Brazilian ID)
     */
    static validateCPF(cpf) {
        cpf = cpf.replace(/[^\d]/g, '');
        
        if (cpf.length !== 11) return false;
        
        // Check for known invalid patterns
        if (/^(\d)\1+$/.test(cpf)) return false;
        
        let sum = 0;
        let remainder;
        
        // Validate first digit
        for (let i = 1; i <= 9; i++) {
            sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
        }
        
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.substring(9, 10))) return false;
        
        // Validate second digit
        sum = 0;
        for (let i = 1; i <= 10; i++) {
            sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
        }
        
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.substring(10, 11))) return false;
        
        return true;
    }

    /**
     * Validate CNPJ (Brazilian Company ID)
     */
    static validateCNPJ(cnpj) {
        cnpj = cnpj.replace(/[^\d]/g, '');
        
        if (cnpj.length !== 14) return false;
        
        // Check for known invalid patterns
        if (/^(\d)\1+$/.test(cnpj)) return false;
        
        let size = cnpj.length - 2;
        let numbers = cnpj.substring(0, size);
        const digits = cnpj.substring(size);
        let sum = 0;
        let pos = size - 7;
        
        // Validate first digit
        for (let i = size; i >= 1; i--) {
            sum += numbers.charAt(size - i) * pos--;
            if (pos < 2) pos = 9;
        }
        
        let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
        if (result !== parseInt(digits.charAt(0))) return false;
        
        // Validate second digit
        size = size + 1;
        numbers = cnpj.substring(0, size);
        sum = 0;
        pos = size - 7;
        
        for (let i = size; i >= 1; i--) {
            sum += numbers.charAt(size - i) * pos--;
            if (pos < 2) pos = 9;
        }
        
        result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
        if (result !== parseInt(digits.charAt(1))) return false;
        
        return true;
    }

    /**
     * Validate email
     */
    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    /**
     * Validate phone number (Brazil)
     */
    static validatePhone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.length <= 11;
    }

    /**
     * Format phone number
     */
    static formatPhone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        
        if (cleaned.length === 10) {
            return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
        } else if (cleaned.length === 11) {
            return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
        }
        
        return phone;
    }

    /**
     * Sanitize HTML input
     */
    static sanitizeHTML(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Truncate text
     */
    static truncate(text, length = 100) {
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    }

    /**
     * Generate password hash
     */
    static async hashPassword(password) {
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(password, salt);
    }

    /**
     * Verify password
     */
    static async verifyPassword(password, hash) {
        const bcrypt = require('bcryptjs');
        return bcrypt.compare(password, hash);
    }

    /**
     * Generate QR code data URL
     */
    static async generateQRCodeDataURL(text) {
        try {
            const QRCode = require('qrcode');
            return await QRCode.toDataURL(text);
        } catch (error) {
            console.error('QR Code generation error:', error);
            return null;
        }
    }

    /**
     * Calculate tax (ICMS, ISS, etc.)
     */
    static calculateTax(amount, taxRate = 18) {
        return (amount * taxRate) / 100;
    }

    /**
     * Calculate discount
     */
    static calculateDiscount(amount, discountPercent) {
        return (amount * discountPercent) / 100;
    }

    /**
     * Generate barcode number
     */
    static generateBarcode() {
        const prefix = '789'; // Brazil prefix
        const company = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const product = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
        const check = Math.floor(Math.random() * 10);
        return prefix + company + product + check;
    }

    /**
     * Create directory if not exists
     */
    static ensureDirectory(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    /**
     * Generate file path for uploads
     */
    static generateFilePath(originalName, uploadDir) {
        this.ensureDirectory(uploadDir);
        
        const ext = path.extname(originalName);
        const baseName = path.basename(originalName, ext);
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        
        const safeName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${safeName}_${timestamp}_${random}${ext}`;
        
        return {
            fileName,
            filePath: path.join(uploadDir, fileName),
            relativePath: path.join('uploads', fileName)
        };
    }

    /**
     * Remove file
     */
    static removeFile(filePath) {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return true;
        }
        return false;
    }

    /**
     * Calculate file size in readable format
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Generate password
     */
    static generatePassword(length = 12) {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
        let password = '';
        
        // Ensure at least one of each type
        password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
        password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
        password += '0123456789'[Math.floor(Math.random() * 10)];
        password += '!@#$%^&*()_+-=[]{}|;:,.<>?'[Math.floor(Math.random() * 30)];
        
        // Fill the rest
        for (let i = 4; i < length; i++) {
            password += charset[Math.floor(Math.random() * charset.length)];
        }
        
        // Shuffle the password
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }

    /**
     * Check password strength
     */
    static checkPasswordStrength(password) {
        let score = 0;
        
        // Length
        if (password.length >= 8) score += 20;
        if (password.length >= 12) score += 20;
        
        // Lowercase
        if (/[a-z]/.test(password)) score += 20;
        
        // Uppercase
        if (/[A-Z]/.test(password)) score += 20;
        
        // Numbers
        if (/\d/.test(password)) score += 10;
        
        // Special characters
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 10;
        
        return {
            score: Math.min(score, 100),
            level: score >= 80 ? 'strong' : score >= 60 ? 'medium' : 'weak',
            suggestions: this.getPasswordSuggestions(password, score)
        };
    }
    
    static getPasswordSuggestions(password, score) {
        const suggestions = [];
        
        if (password.length < 8) {
            suggestions.push('Use at least 8 characters');
        }
        
        if (!/[a-z]/.test(password)) {
            suggestions.push('Add lowercase letters');
        }
        
        if (!/[A-Z]/.test(password)) {
            suggestions.push('Add uppercase letters');
        }
        
        if (!/\d/.test(password)) {
            suggestions.push('Add numbers');
        }
        
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            suggestions.push('Add special characters');
        }
        
        if (/(.)\1{2,}/.test(password)) {
            suggestions.push('Avoid repeating characters');
        }
        
        return suggestions;
    }

    /**
     * Generate JWT token
     */
    static generateJWT(payload, secret, expiresIn = '1h') {
        const jwt = require('jsonwebtoken');
        return jwt.sign(payload, secret, { expiresIn });
    }

    /**
     * Verify JWT token
     */
    static verifyJWT(token, secret) {
        const jwt = require('jsonwebtoken');
        try {
            return jwt.verify(token, secret);
        } catch (error) {
            return null;
        }
    }

    /**
     * Generate API key
     */
    static generateApiKey() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Encrypt data
     */
    static encrypt(text, key = process.env.ENCRYPTION_KEY) {
        const algorithm = 'aes-256-cbc';
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);
        
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        
        return {
            iv: iv.toString('hex'),
            encryptedData: encrypted.toString('hex')
        };
    }

    /**
     * Decrypt data
     */
    static decrypt(encryptedData, key = process.env.ENCRYPTION_KEY) {
        const algorithm = 'aes-256-cbc';
        const iv = Buffer.from(encryptedData.iv, 'hex');
        const encryptedText = Buffer.from(encryptedData.encryptedData, 'hex');
        
        const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'hex'), iv);
        
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        return decrypted.toString();
    }

    /**
     * Generate unique slug
     */
    static generateSlug(text) {
        return text
            .toString()
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
    }

    /**
     * Calculate pagination metadata
     */
    static getPaginationMetadata(total, page, limit) {
        const totalPages = Math.ceil(total / limit);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;
        
        return {
            total,
            page,
            limit,
            totalPages,
            hasNext,
            hasPrev,
            offset: (page - 1) * limit
        };
    }

    /**
     * Sleep/wait function
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Deep clone object
     */
    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Check if object is empty
     */
    static isEmpty(obj) {
        if (!obj) return true;
        if (Array.isArray(obj)) return obj.length === 0;
        return Object.keys(obj).length === 0;
    }

    /**
     * Merge objects deeply
     */
    static deepMerge(target, source) {
        const output = Object.assign({}, target);
        
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        
        return output;
    }

    /**
     * Check if value is object
     */
    static isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    /**
     * Get current timestamp
     */
    static getTimestamp() {
        return new Date().toISOString();
    }

    /**
     * Calculate business days between dates
     */
    static businessDaysBetween(startDate, endDate) {
        let count = 0;
        const curDate = new Date(startDate.getTime());
        
        while (curDate <= endDate) {
            const dayOfWeek = curDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
            curDate.setDate(curDate.getDate() + 1);
        }
        
        return count;
    }

    /**
     * Add business days to date
     */
    static addBusinessDays(date, days) {
        const result = new Date(date);
        let remaining = days;
        
        while (remaining > 0) {
            result.setDate(result.getDate() + 1);
            const dayOfWeek = result.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                remaining--;
            }
        }
        
        return result;
    }

    /**
     * Generate random color
     */
    static generateColor() {
        return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    }

    /**
     * Validate URL
     */
    static validateURL(url) {
        try {
            new URL(url);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Extract domain from URL
     */
    static extractDomain(url) {
        try {
            const parsed = new URL(url);
            return parsed.hostname;
        } catch (error) {
            return null;
        }
    }

    /**
     * Generate initials from name
     */
    static getInitials(name) {
        if (!name) return '??';
        
        const parts = name.split(' ');
        if (parts.length === 1) {
            return parts[0].substring(0, 2).toUpperCase();
        }
        
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }

    /**
     * Generate avatar URL from initials
     */
    static generateAvatar(name, size = 100, bgColor = null, textColor = 'ffffff') {
        const initials = this.getInitials(name);
        const backgroundColor = bgColor || this.generateColor().substring(1);
        
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${backgroundColor}&color=${textColor}&size=${size}`;
    }

    /**
     * Validate Brazilian postal code (CEP)
     */
    static validateCEP(cep) {
        cep = cep.replace(/\D/g, '');
        return cep.length === 8;
    }

    /**
     * Format Brazilian postal code (CEP)
     */
    static formatCEP(cep) {
        cep = cep.replace(/\D/g, '');
        if (cep.length === 8) {
            return cep.substring(0, 5) + '-' + cep.substring(5);
        }
        return cep;
    }

    /**
     * Calculate interest (simple)
     */
    static calculateSimpleInterest(principal, rate, time) {
        return principal * (rate / 100) * time;
    }

    /**
     * Calculate interest (compound)
     */
    static calculateCompoundInterest(principal, rate, time, n = 12) {
        return principal * Math.pow(1 + (rate / 100) / n, n * time);
    }

    /**
     * Calculate installment value
     */
    static calculateInstallment(amount, installments, interestRate = 0) {
        if (interestRate === 0) {
            return amount / installments;
        }
        
        const monthlyRate = interestRate / 100 / 12;
        const installment = amount * monthlyRate * Math.pow(1 + monthlyRate, installments) / 
                          (Math.pow(1 + monthlyRate, installments) - 1);
        
        return installment;
    }
}

module.exports = Helpers;
