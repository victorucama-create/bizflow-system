// API Base URL - Será ajustada automaticamente no Render
const API_BASE_URL = window.location.origin + '/api';

// Security Configuration
const SECURITY_CONFIG = {
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000,
    PASSWORD_MIN_LENGTH: 8,
    SESSION_TIMEOUT: 30 * 60 * 1000,
    CSRF_TOKEN_LENGTH: 32
};

// Application State
const state = {
    currentUser: null,
    company: null,
    subscription: null,
    cart: [],
    products: [],
    customers: [],
    sales: [],
    documents: [],
    transactions: [],
    cashDrawer: {
        isOpen: false,
        openingBalance: 0,
        currentBalance: 0
    },
    security: {
        loginAttempts: 0,
        lastAttempt: null,
        sessionStart: null,
        twoFactorEnabled: false,
        csrfTokens: new Map()
    }
};

// API Service
const ApiService = {
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Adicionar token de autenticação se disponível
        const token = localStorage.getItem('bizflow-token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro na requisição');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Auth
    async login(credentials) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    },

    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },

    async verifyToken() {
        return this.request('/auth/verify');
    },

    // Products
    async getProducts() {
        return this.request('/products');
    },

    async createProduct(productData) {
        return this.request('/products', {
            method: 'POST',
            body: JSON.stringify(productData)
        });
    },

    async updateProduct(id, productData) {
        return this.request(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(productData)
        });
    },

    async deleteProduct(id) {
        return this.request(`/products/${id}`, {
            method: 'DELETE'
        });
    },

    // Customers
    async getCustomers() {
        return this.request('/customers');
    },

    async createCustomer(customerData) {
        return this.request('/customers', {
            method: 'POST',
            body: JSON.stringify(customerData)
        });
    },

    // Sales
    async getSales() {
        return this.request('/sales');
    },

    async createSale(saleData) {
        return this.request('/sales', {
            method: 'POST',
            body: JSON.stringify(saleData)
        });
    },

    // Inventory
    async getInventory() {
        return this.request('/inventory');
    },

    async updateStock(productId, quantity) {
        return this.request(`/inventory/${productId}/stock`, {
            method: 'PATCH',
            body: JSON.stringify({ quantity })
        });
    },

    // Documents
    async getDocuments() {
        return this.request('/documents');
    },

    async createDocument(documentData) {
        return this.request('/documents', {
            method: 'POST',
            body: JSON.stringify(documentData)
        });
    }
};

// Security Utilities (mantenha as mesmas do seu código atual)
const SecurityUtils = {
    // ... suas funções de segurança existentes
};

// Application Initialization
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Verificar se usuário está logado
        const token = localStorage.getItem('bizflow-token');
        if (token) {
            const response = await ApiService.verifyToken();
            state.currentUser = response.data.user;
            showApp();
        } else {
            showLogin();
        }
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showLogin();
    }

    // Inicializar event listeners
    initializeEventListeners();
});

// ... continue com o restante do seu JavaScript atual,
// substituindo as chamadas para localStorage por chamadas à API
