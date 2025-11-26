// Subscription management functionality
class SubscriptionManager {
    constructor() {
        this.plans = [];
        this.invoices = [];
    }

    async loadSubscriptionData() {
        try {
            showLoading('Carregando informações de assinatura...');

            // Load current subscription and available plans in parallel
            const [subscriptionResponse, plansResponse] = await Promise.all([
                ApiService.getCurrentSubscription(),
                ApiService.getAvailablePlans()
            ]);

            this.plans = plansResponse.data.plans;
            this.renderPlans();

            // Load invoices if not on free plan
            if (subscriptionResponse.data.subscription.plan !== 'free') {
                await this.loadInvoices();
            }

            this.updateSubscriptionUI(subscriptionResponse.data.subscription);
            this.checkPlanLimits();

            hideLoading();

        } catch (error) {
            hideLoading();
            console.error('Erro ao carregar dados de assinatura:', error);
            showError('Erro ao carregar informações de assinatura');
        }
    }

    renderPlans() {
        const container = document.querySelector('.plans-container');
        if (!container) return;

        container.innerHTML = this.plans.map(plan => `
            <div class="plan-card ${plan.recommended ? 'featured' : ''}" data-plan="${plan.id}">
                <div class="plan-name">${plan.name}</div>
                <div class="plan-price">R$ ${plan.price.toFixed(2)}</div>
                <ul class="plan-features">
                    <li><i class="fas fa-${plan.features.pdvCount > 1 ? 'check' : 'times'}"></i> 
                        ${plan.features.pdvCount} PDV${plan.features.pdvCount > 1 ? 's' : ''}
                    </li>
                    <li><i class="fas fa-${plan.features.productLimit >= 1000 ? 'check' : 'times'}"></i> 
                        ${plan.features.productLimit === 10000 ? 'Produtos ilimitados' : plan.features.productLimit + ' produtos'}
                    </li>
                    <li><i class="fas fa-${plan.features.advancedReports ? 'check' : 'times'}"></i> 
                        Relatórios ${plan.features.advancedReports ? 'completos' : 'básicos'}
                    </li>
                    <li><i class="fas fa-${plan.features.digitalSignature ? 'check' : 'times'}"></i> 
                        ${plan.features.digitalSignature ? 'Assinatura digital' : 'Sem assinatura digital'}
                    </li>
                    <li><i class="fas fa-${plan.features.apiAccess ? 'check' : 'times'}"></i> 
                        ${plan.features.apiAccess ? 'Todas as integrações' : 'Integrações limitadas'}
                    </li>
                </ul>
                ${this.getPlanButton(plan)}
            </div>
        `).join('');

        // Add event listeners to buttons
        this.attachPlanButtonListeners();
    }

    getPlanButton(plan) {
        const currentPlan = state.subscription?.plan;

        if (currentPlan === plan.id) {
            return `<button class="btn btn-light" disabled>Plano Atual</button>`;
        } else if (this.canUpgradeToPlan(plan.id)) {
            return `<button class="btn btn-primary" data-plan="${plan.id}">
                ${currentPlan ? 'Fazer Upgrade' : 'Selecionar Plano'}
            </button>`;
        } else {
            return `<button class="btn btn-light" disabled>
                ${this.getUpgradeMessage(plan.id)}
            </button>`;
        }
    }

    canUpgradeToPlan(planId) {
        const currentPlan = state.subscription?.plan;
        const planOrder = { 'free': 0, 'basic': 1, 'pro': 2 };
        
        return planOrder[planId] >= planOrder[currentPlan];
    }

    getUpgradeMessage(planId) {
        if (state.subscription?.plan === 'pro' && planId !== 'pro') {
            return 'Downgrade não disponível';
        }
        return 'Plano indisponível';
    }

    attachPlanButtonListeners() {
        document.querySelectorAll('.plan-card button.btn-primary').forEach(button => {
            button.addEventListener('click', (e) => {
                const planId = e.target.getAttribute('data-plan');
                this.handlePlanUpgrade(planId);
            });
        });
    }

    async handlePlanUpgrade(planId) {
        try {
            if (!confirm(`Tem certeza que deseja fazer upgrade para o plano ${planId.toUpperCase()}?`)) {
                return;
            }

            showLoading('Processando upgrade...');

            const result = await ApiService.upgradeSubscription({
                plan: planId,
                billingCycle: 'monthly'
            });

            hideLoading();
            showSuccess(result.message);

            // Reload subscription data
            await loadUserSubscription();
            await this.loadSubscriptionData();

        } catch (error) {
            hideLoading();
            
            if (error.message.includes('pagamento') || error.message.includes('Pagamento')) {
                showError('Erro no processamento do pagamento. Verifique seus dados e tente novamente.');
            } else {
                showError(error.message);
            }
        }
    }

    async cancelSubscription() {
        try {
            if (!confirm('Tem certeza que deseja cancelar sua assinatura? Ela permanecerá ativa até o final do período atual.')) {
                return;
            }

            showLoading('Cancelando assinatura...');

            await ApiService.cancelSubscription();
            
            hideLoading();
            showSuccess('Assinatura cancelada com sucesso! Ela permanecerá ativa até o final do período atual.');

            // Reload subscription data
            await loadUserSubscription();
            await this.loadSubscriptionData();

        } catch (error) {
            hideLoading();
            showError('Erro ao cancelar assinatura: ' + error.message);
        }
    }

    async reactivateSubscription() {
        try {
            showLoading('Reativando assinatura...');

            await ApiService.reactivateSubscription();
            
            hideLoading();
            showSuccess('Assinatura reativada com sucesso!');

            // Reload subscription data
            await loadUserSubscription();
            await this.loadSubscriptionData();

        } catch (error) {
            hideLoading();
            showError('Erro ao reativar assinatura: ' + error.message);
        }
    }

    async loadInvoices() {
        try {
            const response = await ApiService.getInvoices();
            this.invoices = response.data.invoices;
            this.renderInvoices();
        } catch (error) {
            console.error('Erro ao carregar faturas:', error);
        }
    }

    renderInvoices() {
        // Implement invoice table rendering
        console.log('Invoices:', this.invoices);
    }

    updateSubscriptionUI(subscription) {
        // Update current plan info
        this.updateElement('current-plan', subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1));
        this.updateElement('plan-expiry', new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR'));
        
        // Update plan status
        const planStatus = document.getElementById('plan-status');
        if (planStatus) {
            const statusText = subscription.cancelAtPeriodEnd ? 
                'Cancelará em ' + new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR') :
                'Ativo até ' + new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR');
            
            const badgeClass = subscription.cancelAtPeriodEnd ? 'badge-warning' : 'badge-success';
            const badgeText = subscription.cancelAtPeriodEnd ? 'Cancelando' : 'Ativo';
            
            planStatus.innerHTML = `
                <span class="badge ${badgeClass}">${badgeText}</span> ${statusText}
            `;
        }

        // Show/hide action buttons
        this.updateActionButtons(subscription);
    }

    updateElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    updateActionButtons(subscription) {
        const cancelBtn = document.getElementById('cancel-subscription-btn');
        const reactivateBtn = document.getElementById('reactivate-subscription-btn');
        const billingHistoryBtn = document.getElementById('billing-history');

        if (cancelBtn) {
            cancelBtn.style.display = subscription.plan !== 'free' && !subscription.cancelAtPeriodEnd ? 'block' : 'none';
            cancelBtn.onclick = () => this.cancelSubscription();
        }

        if (reactivateBtn) {
            reactivateBtn.style.display = subscription.cancelAtPeriodEnd ? 'block' : 'none';
            reactivateBtn.onclick = () => this.reactivateSubscription();
        }

        if (billingHistoryBtn) {
            billingHistoryBtn.style.display = subscription.plan !== 'free' ? 'block' : 'none';
        }
    }

    checkPlanLimits() {
        if (!state.subscription) return;

        const features = state.subscription.features;
        
        // Update limit indicators throughout the app
        this.updateLimitIndicators('product-limit', features.productLimit);
        this.updateLimitIndicators('customer-limit', features.customerLimit);
        this.updateLimitIndicators('pdv-limit', features.pdvCount);
        
        // Show/hide premium features
        this.togglePremiumFeatures('digital-signature-feature', features.digitalSignature);
        this.togglePremiumFeatures('advanced-reports-feature', features.advancedReports);
        this.togglePremiumFeatures('api-access-feature', features.apiAccess);
    }

    updateLimitIndicators(elementId, limit) {
        const elements = document.querySelectorAll(`[data-limit="${elementId}"]`);
        elements.forEach(element => {
            element.textContent = limit === 10000 ? 'Ilimitado' : limit;
        });
    }

    togglePremiumFeatures(featureClass, isAvailable) {
        const elements = document.querySelectorAll(`.${featureClass}`);
        elements.forEach(element => {
            element.style.display = isAvailable ? 'block' : 'none';
        });
    }

    // Utility method to check if a feature is available
    static isFeatureAvailable(feature) {
        if (!state.subscription) return false;
        
        const features = state.subscription.features;
        return features[feature] === true;
    }

    // Utility method to check resource limits
    static checkResourceLimit(resource, currentCount) {
        if (!state.subscription) return { withinLimit: true, remaining: Infinity };
        
        const limits = {
            'products': state.subscription.features.productLimit,
            'customers': state.subscription.features.customerLimit,
            'pdv': state.subscription.features.pdvCount
        };

        const limit = limits[resource] || Infinity;
        const remaining = limit - currentCount;
        
        return {
            withinLimit: currentCount < limit,
            remaining: remaining,
            limit: limit
        };
    }
}

// Initialize subscription manager
const Subscription = new SubscriptionManager();

// Add event listeners for subscription page
document.addEventListener('DOMContentLoaded', function() {
    // Billing history button
    const billingHistoryBtn = document.getElementById('billing-history');
    if (billingHistoryBtn) {
        billingHistoryBtn.addEventListener('click', function() {
            Subscription.loadInvoices();
            showSuccess('Histórico de faturas carregado!');
        });
    }
});

// Add to global scope
window.Subscription = Subscription;
window.SubscriptionManager = SubscriptionManager;
