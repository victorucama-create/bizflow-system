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
    inventory: [],
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

// API Service - COMPLETAMENTE ATUALIZADO
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
            
            // Se não for JSON (como arquivos), retornar a resposta diretamente
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                return response;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro na requisição');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            
            // Se for erro de autenticação, fazer logout
            if (error.message.includes('Token') || error.message.includes('não autorizado')) {
                handleLogout();
            }
            
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

    async forgotPassword(email) {
        return this.request('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    },

    // Users
    async getProfile() {
        return this.request('/users/profile');
    },

    async updateProfile(profileData) {
        return this.request('/users/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    },

    async changePassword(passwordData) {
        return this.request('/users/change-password', {
            method: 'PATCH',
            body: JSON.stringify(passwordData)
        });
    },

    // Products
    async getProducts(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        return this.request(`/products?${queryParams}`);
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

    async searchProducts(query) {
        return this.request(`/products/search?q=${encodeURIComponent(query)}`);
    },

    // Customers
    async getCustomers(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        return this.request(`/customers?${queryParams}`);
    },

    async createCustomer(customerData) {
        return this.request('/customers', {
            method: 'POST',
            body: JSON.stringify(customerData)
        });
    },

    async updateCustomer(id, customerData) {
        return this.request(`/customers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(customerData)
        });
    },

    async deleteCustomer(id) {
        return this.request(`/customers/${id}`, {
            method: 'DELETE'
        });
    },

    // Sales
    async getSales(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        return this.request(`/sales?${queryParams}`);
    },

    async createSale(saleData) {
        return this.request('/sales', {
            method: 'POST',
            body: JSON.stringify(saleData)
        });
    },

    async updateSaleStatus(id, status) {
        return this.request(`/sales/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    },

    // Inventory
    async getInventoryMovements(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        return this.request(`/inventory?${queryParams}`);
    },

    async getInventoryReport() {
        return this.request('/inventory/report');
    },

    async recordInventoryEntry(entryData) {
        return this.request('/inventory/entry', {
            method: 'POST',
            body: JSON.stringify(entryData)
        });
    },

    async recordInventoryOut(outData) {
        return this.request('/inventory/out', {
            method: 'POST',
            body: JSON.stringify(outData)
        });
    },

    async adjustStock(adjustmentData) {
        return this.request('/inventory/adjust', {
            method: 'POST',
            body: JSON.stringify(adjustmentData)
        });
    },

    // Documents
    async getDocuments(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        return this.request(`/documents?${queryParams}`);
    },

    async createDocument(documentData) {
        return this.request('/documents', {
            method: 'POST',
            body: JSON.stringify(documentData)
        });
    },

    async signDocument(id, signatureData) {
        return this.request(`/documents/${id}/sign`, {
            method: 'POST',
            body: JSON.stringify(signatureData)
        });
    },

    async updateDocumentStatus(id, status) {
        return this.request(`/documents/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    },

    // SUBSCRIPTION - NOVAS APIs
    async getCurrentSubscription() {
        return this.request('/subscription');
    },

    async getAvailablePlans() {
        return this.request('/subscription/plans');
    },

    async upgradeSubscription(planData) {
        return this.request('/subscription/upgrade', {
            method: 'POST',
            body: JSON.stringify(planData)
        });
    },

    async cancelSubscription() {
        return this.request('/subscription/cancel', {
            method: 'POST'
        });
    },

    async reactivateSubscription() {
        return this.request('/subscription/reactivate', {
            method: 'POST'
        });
    },

    async getInvoices() {
        return this.request('/subscription/invoices');
    }
};

// Security Utilities
const SecurityUtils = {
    generateCSRFToken() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < SECURITY_CONFIG.CSRF_TOKEN_LENGTH; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    },

    sanitize(input) {
        if (typeof input !== 'string') return input;
        
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    },

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    checkPasswordStrength(password) {
        if (!password) return { strength: 'empty', score: 0 };
        
        let score = 0;
        let feedback = [];
        
        if (password.length >= SECURITY_CONFIG.PASSWORD_MIN_LENGTH) {
            score += 1;
        } else {
            feedback.push(`Mínimo ${SECURITY_CONFIG.PASSWORD_MIN_LENGTH} caracteres`);
        }
        
        if (/[a-z]/.test(password)) score += 1;
        else feedback.push('Letras minúsculas');
        
        if (/[A-Z]/.test(password)) score += 1;
        else feedback.push('Letras maiúsculas');
        
        if (/\d/.test(password)) score += 1;
        else feedback.push('Números');
        
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
        else feedback.push('Símbolos especiais');
        
        let strength = 'weak';
        if (score >= 4) strength = 'strong';
        else if (score >= 3) strength = 'medium';
        
        return { strength, score, feedback };
    },

    encryptData(data) {
        return btoa(JSON.stringify(data));
    },

    decryptData(encryptedData) {
        try {
            return JSON.parse(atob(encryptedData));
        } catch (e) {
            console.error('Failed to decrypt data:', e);
            return null;
        }
    }
};

// Application Initialization
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Verificar se usuário está logado
        const token = localStorage.getItem('bizflow-token');
        if (token) {
            const response = await ApiService.verifyToken();
            state.currentUser = response.data.user;
            
            // Carregar assinatura do usuário
            await loadUserSubscription();
            
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

// Carregar assinatura do usuário
async function loadUserSubscription() {
    try {
        const response = await ApiService.getCurrentSubscription();
        state.subscription = response.data.subscription;
        
        // Atualizar UI com informações da assinatura
        updateSubscriptionUI();
    } catch (error) {
        console.error('Erro ao carregar assinatura:', error);
        // Não bloquear a aplicação se falhar
    }
}

// Atualizar UI com informações da assinatura
function updateSubscriptionUI() {
    if (!state.subscription) return;
    
    // Atualizar página de assinatura
    if (document.getElementById('current-plan')) {
        document.getElementById('current-plan').textContent = 
            state.subscription.plan.charAt(0).toUpperCase() + state.subscription.plan.slice(1);
        
        document.getElementById('plan-expiry').textContent = 
            new Date(state.subscription.currentPeriodEnd).toLocaleDateString('pt-BR');
        
        // Atualizar status do plano
        const planStatus = document.getElementById('plan-status');
        if (planStatus) {
            const badge = state.subscription.isActive ? 
                '<span class="badge badge-success">Ativo</span>' :
                '<span class="badge badge-danger">Inativo</span>';
            planStatus.innerHTML = badge;
        }
    }
    
    // Atualizar limites na UI
    updatePlanLimitsUI();
}

// Atualizar limites do plano na UI
function updatePlanLimitsUI() {
    if (!state.subscription) return;
    
    const features = state.subscription.features;
    
    // Atualizar contadores e limites
    updateFeatureIndicator('product-limit', features.productLimit);
    updateFeatureIndicator('customer-limit', features.customerLimit);
    updateFeatureIndicator('pdv-limit', features.pdvCount);
    
    // Mostrar/ocultar features baseadas no plano
    toggleFeatureVisibility('digital-signature-feature', features.digitalSignature);
    toggleFeatureVisibility('advanced-reports-feature', features.advancedReports);
    toggleFeatureVisibility('api-access-feature', features.apiAccess);
}

function updateFeatureIndicator(elementId, limit) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = limit === 10000 ? 'Ilimitado' : limit;
    }
}

function toggleFeatureVisibility(elementId, isAvailable) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = isAvailable ? 'block' : 'none';
    }
}

// Navigation and UI Management
function showLogin() {
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('register-page').style.display = 'none';
    document.getElementById('forgot-page').style.display = 'none';
    document.getElementById('app').style.display = 'none';
    
    // Reset forms
    document.getElementById('login-form').reset();
    document.getElementById('two-factor-section').style.display = 'none';
}

function showRegister() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('register-page').style.display = 'flex';
    document.getElementById('forgot-page').style.display = 'none';
    document.getElementById('app').style.display = 'none';
}

function showForgot() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('register-page').style.display = 'none';
    document.getElementById('forgot-page').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
}

function showApp() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('register-page').style.display = 'none';
    document.getElementById('forgot-page').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    
    // Update user info
    if (state.currentUser) {
        document.getElementById('user-avatar').textContent = 
            state.currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
        document.getElementById('user-name').textContent = state.currentUser.name;
    }
    
    showPage('dashboard');
}

function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(`${pageName}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
        
        // Load page-specific data
        loadPageData(pageName);
    }
    
    // Update active navigation
    updateActiveNavigation(pageName);
}

function updateActiveNavigation(pageName) {
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageName) {
            link.classList.add('active');
        }
    });
    
    // Update sidebar links
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageName) {
            link.classList.add('active');
        }
    });
}

// Page Data Loading
async function loadPageData(pageName) {
    try {
        switch (pageName) {
            case 'dashboard':
                await loadDashboardData();
                break;
            case 'products':
                await loadProducts();
                break;
            case 'customers':
                await loadCustomers();
                break;
            case 'inventory':
                await loadInventory();
                break;
            case 'pos':
                await loadPOSProducts();
                break;
            case 'finance':
                await loadFinanceData();
                break;
            case 'documents':
                await loadDocuments();
                break;
            case 'subscription':
                await loadSubscriptionData();
                break;
            case 'settings':
                await loadSettingsData();
                break;
        }
    } catch (error) {
        console.error(`Erro ao carregar dados da página ${pageName}:`, error);
        showError(`Erro ao carregar dados: ${error.message}`);
    }
}

// Subscription Page Data
async function loadSubscriptionData() {
    try {
        // Se não tem subscription carregada, carregar
        if (!state.subscription) {
            await loadUserSubscription();
        }
        
        // Carregar planos disponíveis
        const response = await ApiService.getAvailablePlans();
        const plans = response.data.plans;
        
        // Atualizar UI dos planos
        updatePlansUI(plans);
        
        // Carregar faturas se for plano pago
        if (state.subscription && state.subscription.plan !== 'free') {
            await loadInvoices();
        }
        
    } catch (error) {
        console.error('Erro ao carregar dados de assinatura:', error);
        showError('Erro ao carregar informações de assinatura');
    }
}

function updatePlansUI(plans) {
    plans.forEach(plan => {
        const planCard = document.querySelector(`[data-plan="${plan.id}"]`);
        if (planCard) {
            // Atualizar preço
            const priceElement = planCard.querySelector('.plan-price');
            if (priceElement) {
                priceElement.textContent = `R$ ${plan.price.toFixed(2)}`;
            }
            
            // Atualizar features
            const featuresList = planCard.querySelector('.plan-features');
            if (featuresList) {
                featuresList.innerHTML = `
                    <li><i class="fas fa-${plan.features.pdvCount > 1 ? 'check' : 'times'}"></i> ${plan.features.pdvCount} PDV${plan.features.pdvCount > 1 ? 's' : ''}</li>
                    <li><i class="fas fa-${plan.features.productLimit >= 1000 ? 'check' : 'times'}"></i> ${plan.features.productLimit === 10000 ? 'Produtos ilimitados' : plan.features.productLimit + ' produtos'}</li>
                    <li><i class="fas fa-${plan.features.advancedReports ? 'check' : 'times'}"></i> Relatórios ${plan.features.advancedReports ? 'completos' : 'básicos'}</li>
                    <li><i class="fas fa-${plan.features.digitalSignature ? 'check' : 'times'}"></i> ${plan.features.digitalSignature ? 'Assinatura digital' : 'Sem assinatura digital'}</li>
                    <li><i class="fas fa-${plan.features.apiAccess ? 'check' : 'times'}"></i> ${plan.features.apiAccess ? 'Todas as integrações' : 'Integrações limitadas'}</li>
                `;
            }
            
            // Atualizar botão
            const button = planCard.querySelector('button');
            if (button) {
                if (state.subscription && state.subscription.plan === plan.id) {
                    button.textContent = 'Plano Atual';
                    button.disabled = true;
                    button.className = 'btn btn-light';
                } else if (state.subscription && state.subscription.plan === 'pro' && plan.id !== 'pro') {
                    button.textContent = 'Downgrade';
                    button.onclick = () => handlePlanChange(plan.id);
                } else {
                    button.textContent = state.subscription ? 'Fazer Upgrade' : 'Selecionar Plano';
                    button.onclick = () => handlePlanChange(plan.id);
                }
            }
        }
    });
}

async function handlePlanChange(plan) {
    try {
        showLoading('Processando...');
        
        const result = await ApiService.upgradeSubscription({
            plan: plan,
            billingCycle: 'monthly'
        });
        
        hideLoading();
        showSuccess(result.message);
        
        // Recarregar dados da assinatura
        await loadUserSubscription();
        
        // Recarregar página de assinatura
        if (document.getElementById('subscription-page').classList.contains('active')) {
            await loadSubscriptionData();
        }
        
    } catch (error) {
        hideLoading();
        showError(error.message);
    }
}

async function loadInvoices() {
    try {
        const response = await ApiService.getInvoices();
        // Atualizar UI com faturas - implementar conforme necessário
        console.log('Faturas:', response.data.invoices);
    } catch (error) {
        console.error('Erro ao carregar faturas:', error);
    }
}

// Event Listeners
function initializeEventListeners() {
    // Auth forms
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('forgot-form').addEventListener('submit', handleForgotPassword);
    
    // Navigation
    document.querySelectorAll('.nav-link, .sidebar-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.target.getAttribute('data-page');
            showPage(page);
        });
    });
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Subscription buttons
    document.getElementById('upgrade-basic')?.addEventListener('click', () => handlePlanChange('basic'));
    document.getElementById('upgrade-pro')?.addEventListener('click', () => handlePlanChange('pro'));
    
    // Initialize other event listeners...
    initializeOtherEventListeners();
}

function initializeOtherEventListeners() {
    // Product search
    const productSearch = document.getElementById('product-search');
    if (productSearch) {
        productSearch.addEventListener('input', debounce(handleProductSearch, 300));
    }
    
    // POS event listeners
    initializePOSEventListeners();
    
    // Modal event listeners
    initializeModalEventListeners();
    
    // Settings tabs
    initializeSettingsTabs();
}

// Auth Handlers
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await ApiService.login({ email, password });
        
        // Store token
        localStorage.setItem('bizflow-token', response.data.token);
        
        // Update state
        state.currentUser = response.data.user;
        
        // Load subscription
        await loadUserSubscription();
        
        showApp();
        showSuccess('Login realizado com sucesso!');
        
    } catch (error) {
        showError(error.message);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('reg-name').value,
        email: document.getElementById('reg-email').value,
        password: document.getElementById('reg-password').value,
        companyName: document.getElementById('reg-company').value,
        twoFactorEnabled: document.getElementById('reg-two-factor').checked
    };
    
    try {
        const response = await ApiService.register(formData);
        
        // Store token
        localStorage.setItem('bizflow-token', response.data.token);
        
        // Update state
        state.currentUser = response.data.user;
        
        // Load subscription
        await loadUserSubscription();
        
        showApp();
        showSuccess('Conta criada com sucesso!');
        
    } catch (error) {
        showError(error.message);
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    
    const email = document.getElementById('forgot-email').value;
    
    try {
        await ApiService.forgotPassword(email);
        showSuccess('Email de recuperação enviado! Verifique sua caixa de entrada.');
        showLogin();
    } catch (error) {
        showError(error.message);
    }
}

function handleLogout() {
    localStorage.removeItem('bizflow-token');
    state.currentUser = null;
    state.subscription = null;
    showLogin();
    showSuccess('Logout realizado com sucesso!');
}

// UI Helpers
function showLoading(message = 'Carregando...') {
    // Implementar loading spinner
    console.log('Loading:', message);
}

function hideLoading() {
    // Implementar hide loading
    console.log('Loading hidden');
}

function showSuccess(message) {
    // Usar o modal de sucesso existente
    const successModal = document.getElementById('success-modal');
    const successMessage = document.getElementById('success-message');
    
    if (successModal && successMessage) {
        successMessage.textContent = message;
        successModal.style.display = 'flex';
    } else {
        alert('Sucesso: ' + message); // Fallback
    }
}

function showError(message) {
    // Usar o modal de alerta de segurança para erros
    const alertModal = document.getElementById('security-alert-modal');
    const alertMessage = document.getElementById('security-alert-message');
    
    if (alertModal && alertMessage) {
        alertMessage.textContent = message;
        alertModal.style.display = 'flex';
    } else {
        alert('Erro: ' + message); // Fallback
    }
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Placeholder functions for other pages - implementar conforme necessário
async function loadDashboardData() {
    try {
        // Carregar dados do dashboard
        const [salesResponse, productsResponse, customersResponse] = await Promise.all([
            ApiService.getSales({ limit: 5 }),
            ApiService.getProducts({ limit: 1 }),
            ApiService.getCustomers({ limit: 1 })
        ]);
        
        // Atualizar UI do dashboard
        updateDashboardUI(salesResponse, productsResponse, customersResponse);
        
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

function updateDashboardUI(salesData, productsData, customersData) {
    // Implementar atualização da UI do dashboard
}

async function loadProducts() {
    try {
        const response = await ApiService.getProducts();
        state.products = response.data.products;
        renderProductsTable();
    } catch (error) {
        showError('Erro ao carregar produtos: ' + error.message);
    }
}

function renderProductsTable() {
    // Implementar renderização da tabela de produtos
}

// Implementar outras funções de carregamento de página...
async function loadCustomers() { /* ... */ }
async function loadInventory() { /* ... */ }
async function loadPOSProducts() { /* ... */ }
async function loadFinanceData() { /* ... */ }
async function loadDocuments() { /* ... */ }
async function loadSettingsData() { /* ... */ }

function initializePOSEventListeners() { /* ... */ }
function initializeModalEventListeners() { /* ... */ }
function initializeSettingsTabs() { /* ... */ }

// Export para uso global (se necessário)
window.BizFlow = {
    ApiService,
    SecurityUtils,
    state,
    showPage,
    showSuccess,
    showError
};
