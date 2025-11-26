/**
 * Sistema de Autenticação e Segurança - BizFlow
 * Gerencia login, registro, 2FA e segurança
 */

class AuthSystem {
    constructor() {
        this.loginAttempts = 0;
        this.maxAttempts = 5;
        this.lockoutTime = 15 * 60 * 1000; // 15 minutos
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingSession();
        this.setupPasswordStrength();
    }

    setupEventListeners() {
        // Login form
        document.getElementById('login-form')?.addEventListener('submit', (e) => this.handleLogin(e));
        
        // Register form  
        document.getElementById('register-form')?.addEventListener('submit', (e) => this.handleRegister(e));
        
        // Forgot password
        document.getElementById('forgot-form')?.addEventListener('submit', (e) => this.handleForgotPassword(e));
        
        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', () => this.handleLogout());
        
        // Navigation between auth pages
        document.getElementById('show-register')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegister();
        });
        
        document.getElementById('show-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLogin();
        });
        
        document.getElementById('show-forgot')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showForgotPassword();
        });

        document.getElementById('show-login-from-forgot')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLogin();
        });

        // 2FA handling
        this.setup2FAHandlers();
    }

    setup2FAHandlers() {
        const twoFactorInputs = document.querySelectorAll('.two-factor-input');
        
        twoFactorInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                if (value.length === 1 && index < twoFactorInputs.length - 1) {
                    twoFactorInputs[index + 1].focus();
                }
                
                // Auto-submit when all inputs are filled
                const allFilled = Array.from(twoFactorInputs).every(input => input.value.length === 1);
                if (allFilled) {
                    this.verify2FACode();
                }
            });
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    twoFactorInputs[index - 1].focus();
                }
            });
        });

        document.getElementById('resend-code')?.addEventListener('click', () => this.resend2FACode());
    }

    setupPasswordStrength() {
        const passwordInput = document.getElementById('reg-password');
        const newPasswordInput = document.getElementById('new-password');
        
        passwordInput?.addEventListener('input', (e) => this.updatePasswordStrength(e.target.value, 'register'));
        newPasswordInput?.addEventListener('input', (e) => this.updatePasswordStrength(e.target.value, 'change'));
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Validação básica
        if (!this.validateEmail(email)) {
            this.showError('Por favor, insira um e-mail válido.');
            return;
        }

        if (!password) {
            this.showError('Por favor, insira sua senha.');
            return;
        }

        // Verificar se a conta está bloqueada
        if (this.isAccountLocked()) {
            this.showSecurityAlert('Conta temporariamente bloqueada devido a múltiplas tentativas falhas.');
            return;
        }

        try {
            this.showLoading('Entrando...');
            
            const response = await BizFlow.ApiService.login({ email, password });
            
            // Verificar se precisa de 2FA
            if (response.data.requires2FA) {
                this.show2FASection();
                localStorage.setItem('pending-auth-token', response.data.tempToken);
            } else {
                this.completeLogin(response.data);
            }
            
        } catch (error) {
            this.handleLoginError(error);
        } finally {
            this.hideLoading();
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('reg-name').value,
            email: document.getElementById('reg-email').value,
            password: document.getElementById('reg-password').value,
            companyName: document.getElementById('reg-company').value,
            twoFactorEnabled: document.getElementById('reg-two-factor')?.checked || false
        };

        // Validações
        if (!this.validateEmail(formData.email)) {
            this.showError('Por favor, insira um e-mail válido.');
            return;
        }

        const passwordStrength = BizFlow.SecurityUtils.checkPasswordStrength(formData.password);
        if (passwordStrength.strength === 'weak') {
            this.showError('Senha muito fraca. Use letras maiúsculas, minúsculas, números e símbolos.');
            return;
        }

        if (formData.password !== document.getElementById('reg-confirm').value) {
            this.showError('As senhas não coincidem.');
            return;
        }

        if (!document.getElementById('reg-terms')?.checked) {
            this.showError('Você deve aceitar os termos de uso.');
            return;
        }

        try {
            this.showLoading('Criando conta...');
            
            const response = await BizFlow.ApiService.register(formData);
            this.completeLogin(response.data);
            
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    async handleForgotPassword(e) {
        e.preventDefault();
        
        const email = document.getElementById('forgot-email').value;
        
        if (!this.validateEmail(email)) {
            this.showError('Por favor, insira um e-mail válido.');
            return;
        }

        try {
            this.showLoading('Enviando e-mail de recuperação...');
            
            await BizFlow.ApiService.forgotPassword(email);
            this.showSuccess('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
            this.showLogin();
            
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.hideLoading();
        }
    }

    async verify2FACode() {
        const twoFactorInputs = document.querySelectorAll('.two-factor-input');
        const code = Array.from(twoFactorInputs).map(input => input.value).join('');
        
        if (code.length !== 6) {
            this.showError('Código de verificação incompleto.');
            return;
        }

        try {
            this.showLoading('Verificando código...');
            
            const tempToken = localStorage.getItem('pending-auth-token');
            const response = await BizFlow.ApiService.verify2FA({ code, tempToken });
            
            this.completeLogin(response.data);
            localStorage.removeItem('pending-auth-token');
            
        } catch (error) {
            this.showError('Código de verificação inválido.');
            twoFactorInputs.forEach(input => input.value = '');
            twoFactorInputs[0].focus();
        } finally {
            this.hideLoading();
        }
    }

    async resend2FACode() {
        try {
            const tempToken = localStorage.getItem('pending-auth-token');
            await BizFlow.ApiService.resend2FA({ tempToken });
            this.showSuccess('Novo código enviado para seu e-mail.');
        } catch (error) {
            this.showError('Erro ao reenviar código. Tente novamente.');
        }
    }

    completeLogin(userData) {
        // Armazenar token e dados do usuário
        localStorage.setItem('bizflow-token', userData.token);
        localStorage.setItem('bizflow-user', JSON.stringify(userData.user));
        
        // Atualizar estado global
        BizFlow.state.currentUser = userData.user;
        BizFlow.state.security.sessionStart = Date.now();
        
        this.showSuccess('Login realizado com sucesso!');
        BizFlow.showApp();
    }

    handleLoginError(error) {
        this.loginAttempts++;
        
        if (this.loginAttempts >= this.maxAttempts) {
            this.lockAccount();
            this.showSecurityAlert('Múltiplas tentativas falhas. Conta bloqueada por 15 minutos.');
        } else {
            const remaining = this.maxAttempts - this.loginAttempts;
            this.showError(`${error.message} (${remaining} tentativas restantes)`);
            
            // Atualizar UI de tentativas
            this.updateLoginAttemptsUI(remaining);
        }
    }

    updateLoginAttemptsUI(remaining) {
        const attemptsElement = document.getElementById('login-attempts');
        const countElement = document.getElementById('attempts-count');
        
        if (attemptsElement && countElement) {
            attemptsElement.style.display = 'block';
            countElement.textContent = remaining;
        }
    }

    lockAccount() {
        localStorage.setItem('account-locked-until', Date.now() + this.lockoutTime);
        this.loginAttempts = 0;
    }

    isAccountLocked() {
        const lockedUntil = localStorage.getItem('account-locked-until');
        return lockedUntil && Date.now() < parseInt(lockedUntil);
    }

    async handleLogout() {
        try {
            // Chamar API de logout se necessário
            await BizFlow.ApiService.logout();
        } catch (error) {
            console.error('Erro no logout:', error);
        } finally {
            // Limpar dados locais
            localStorage.removeItem('bizflow-token');
            localStorage.removeItem('bizflow-user');
            localStorage.removeItem('pending-auth-token');
            
            BizFlow.state.currentUser = null;
            BizFlow.state.security.sessionStart = null;
            
            this.showLogin();
            this.showSuccess('Logout realizado com sucesso!');
        }
    }

    checkExistingSession() {
        const token = localStorage.getItem('bizflow-token');
        const userData = localStorage.getItem('bizflow-user');
        
        if (token && userData) {
            try {
                const user = JSON.parse(userData);
                
                // Verificar se a sessão ainda é válida (exemplo: 24 horas)
                const sessionDuration = 24 * 60 * 60 * 1000;
                const sessionValid = Date.now() - user.lastLogin < sessionDuration;
                
                if (sessionValid) {
                    BizFlow.state.currentUser = user;
                    BizFlow.state.security.sessionStart = Date.now();
                    BizFlow.showApp();
                } else {
                    this.handleLogout();
                }
            } catch (error) {
                console.error('Erro ao verificar sessão:', error);
                this.handleLogout();
            }
        }
    }

    validateEmail(email) {
        return BizFlow.SecurityUtils.isValidEmail(email);
    }

    updatePasswordStrength(password, context = 'register') {
        const result = BizFlow.SecurityUtils.checkPasswordStrength(password);
        
        const strengthElement = document.getElementById(
            context === 'register' ? 'password-strength' : 'new-password-strength'
        );
        const feedbackElement = document.getElementById(
            context === 'register' ? 'password-feedback' : 'new-password-feedback'
        );
        
        if (strengthElement) {
            strengthElement.className = `password-strength ${result.strength}`;
        }
        
        if (feedbackElement && password.length > 0) {
            if (result.feedback.length > 0) {
                feedbackElement.textContent = `Melhorar: ${result.feedback.join(', ')}`;
                feedbackElement.style.color = 'var(--danger)';
            } else {
                feedbackElement.textContent = 'Senha forte!';
                feedbackElement.style.color = '#28a745';
            }
        }
    }

    // Métodos de UI
    showLogin() {
        this.hideAllAuthPages();
        document.getElementById('login-page').style.display = 'flex';
        document.getElementById('two-factor-section').style.display = 'none';
        document.getElementById('login-form').reset();
    }

    showRegister() {
        this.hideAllAuthPages();
        document.getElementById('register-page').style.display = 'flex';
    }

    showForgotPassword() {
        this.hideAllAuthPages();
        document.getElementById('forgot-page').style.display = 'flex';
    }

    show2FASection() {
        document.getElementById('two-factor-section').style.display = 'block';
        document.getElementById('login-submit').disabled = true;
        
        // Focar no primeiro input
        const twoFactorInputs = document.querySelectorAll('.two-factor-input');
        twoFactorInputs[0].focus();
    }

    hideAllAuthPages() {
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('register-page').style.display = 'none';
        document.getElementById('forgot-page').style.display = 'none';
        document.getElementById('app').style.display = 'none';
    }

    showLoading(message = 'Carregando...') {
        // Implementar spinner de loading
        console.log('Loading:', message);
    }

    hideLoading() {
        // Esconder spinner
    }

    showSuccess(message) {
        BizFlow.showSuccess(message);
    }

    showError(message) {
        BizFlow.showError(message);
    }

    showSecurityAlert(message) {
        const alertModal = document.getElementById('security-alert-modal');
        const alertMessage = document.getElementById('security-alert-message');
        
        if (alertModal && alertMessage) {
            alertMessage.textContent = message;
            alertModal.style.display = 'flex';
        }
    }
}

// Inicializar sistema de autenticação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.AuthSystem = new AuthSystem();
});
