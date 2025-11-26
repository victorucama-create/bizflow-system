/**
 * Sistema de Gestão de Clientes - BizFlow
 * Gerencia CRUD de clientes, segmentação e histórico
 */

class CustomerManager {
    constructor() {
        this.customers = [];
        this.filteredCustomers = [];
        this.currentFilters = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadCustomers();
    }

    setupEventListeners() {
        // Botão adicionar cliente
        document.getElementById('add-customer-btn')?.addEventListener('click', () => this.showAddCustomerModal());
        
        // Modal events
        document.getElementById('save-customer')?.addEventListener('click', () => this.handleSaveCustomer());
        document.getElementById('cancel-customer')?.addEventListener('click', () => this.hideCustomerModal());
        
        // Tipo de cliente change
        document.getElementById('customer-type')?.addEventListener('change', (e) => this.handleCustomerTypeChange(e));
        
        // Busca de clientes
        const searchInput = document.getElementById('customer-search');
        if (searchInput) {
            searchInput.addEventListener('input', BizFlow.debounce((e) => this.handleCustomerSearch(e.target.value), 300));
        }
        
        // Exportação
        document.getElementById('export-customers')?.addEventListener('click', () => this.exportCustomers());
    }

    async loadCustomers(filters = {}) {
        try {
            this.showLoading('Carregando clientes...');
            
            const response = await BizFlow.ApiService.getCustomers(filters);
            this.customers = response.data.customers;
            this.filteredCustomers = [...this.customers];
            
            this.renderCustomersTable();
            this.updateCustomerStats();
            
        } catch (error) {
            BizFlow.showError('Erro ao carregar clientes: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    renderCustomersTable() {
        const tbody = document.getElementById('customers-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.filteredCustomers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center" style="padding: 40px;">
                        <i class="fas fa-users fa-2x" style="color: var(--light-gray); margin-bottom: 10px;"></i>
                        <p>Nenhum cliente encontrado</p>
                        <button class="btn btn-primary" onclick="window.CustomerManager.showAddCustomerModal()">
                            <i class="fas fa-plus"></i> Adicionar Primeiro Cliente
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        this.filteredCustomers.forEach(customer => {
            const row = this.createCustomerRow(customer);
            tbody.appendChild(row);
        });
    }

    createCustomerRow(customer) {
        const row = document.createElement('tr');
        
        const totalPurchases = customer.totalPurchases || 0;
        const lastPurchase = customer.lastPurchase ? new Date(customer.lastPurchase).toLocaleDateString('pt-BR') : 'Nunca';
        const status = this.getCustomerStatus(customer);
        
        row.innerHTML = `
            <td>#${customer.id.toString().padStart(4, '0')}</td>
            <td>
                <div class="customer-info">
                    <strong>${BizFlow.SecurityUtils.sanitize(customer.name)}</strong>
                    ${customer.type === 'company' ? '<br><small class="text-muted">Empresa</small>' : ''}
                </div>
            </td>
            <td>${BizFlow.SecurityUtils.sanitize(customer.email)}</td>
            <td>${customer.phone ? BizFlow.SecurityUtils.sanitize(customer.phone) : '--'}</td>
            <td>R$ ${totalPurchases.toFixed(2)}</td>
            <td>${lastPurchase}</td>
            <td>
                <span class="badge badge-${status === 'active' ? 'success' : 'warning'}">
                    ${status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-light" onclick="window.CustomerManager.viewCustomer(${customer.id})" title="Ver detalhes">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-light" onclick="window.CustomerManager.editCustomer(${customer.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-light" onclick="window.CustomerManager.deleteCustomer(${customer.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        return row;
    }

    getCustomerStatus(customer) {
        // Lógica simples baseada na última compra (30 dias)
        if (!customer.lastPurchase) return 'inactive';
        
        const lastPurchaseDate = new Date(customer.lastPurchase);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        return lastPurchaseDate >= thirtyDaysAgo ? 'active' : 'inactive';
    }

    showAddCustomerModal() {
        const modal = document.getElementById('add-customer-modal');
        if (!modal) return;
        
        // Reset form
        document.getElementById('add-customer-form').reset();
        document.getElementById('customer-tax-id-group').style.display = 'none';
        
        // Gerar CSRF token
        this.updateCSRFToken('customer-csrf');
        
        modal.style.display = 'flex';
    }

    hideCustomerModal() {
        const modal = document.getElementById('add-customer-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    handleCustomerTypeChange(e) {
        const taxIdGroup = document.getElementById('customer-tax-id-group');
        if (taxIdGroup) {
            taxIdGroup.style.display = e.target.value === 'company' ? 'block' : 'none';
        }
    }

    async handleSaveCustomer() {
        const form = document.getElementById('add-customer-form');
        if (!form) return;

        const formData = {
            name: document.getElementById('customer-name').value,
            email: document.getElementById('customer-email').value,
            phone: document.getElementById('customer-phone').value,
            type: document.getElementById('customer-type').value,
            address: document.getElementById('customer-address').value
        };

        // Validações
        if (!formData.name || !formData.email) {
            BizFlow.showError('Nome e e-mail são obrigatórios.');
            return;
        }

        if (!BizFlow.SecurityUtils.isValidEmail(formData.email)) {
            BizFlow.showError('Por favor, insira um e-mail válido.');
            return;
        }

        if (formData.type === 'company') {
            formData.taxId = document.getElementById('customer-tax-id').value;
        }

        try {
            this.showLoading('Salvando cliente...');
            
            await BizFlow.ApiService.createCustomer(formData);
            
            this.hideCustomerModal();
            await this.loadCustomers();
            
            BizFlow.showSuccess('Cliente salvo com sucesso!');
            
        } catch (error) {
            BizFlow.showError('Erro ao salvar cliente: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async viewCustomer(customerId) {
        try {
            // Em uma implementação real, buscaria detalhes completos do cliente
            const customer = this.customers.find(c => c.id === customerId);
            if (!customer) return;

            // Mostrar modal de detalhes do cliente
            this.showCustomerDetailsModal(customer);
            
        } catch (error) {
            BizFlow.showError('Erro ao carregar detalhes do cliente: ' + error.message);
        }
    }

    showCustomerDetailsModal(customer) {
        // Criar modal dinâmico para detalhes do cliente
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">Detalhes do Cliente</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="customer-details">
                        <div class="detail-row">
                            <label>Nome:</label>
                            <span>${BizFlow.SecurityUtils.sanitize(customer.name)}</span>
                        </div>
                        <div class="detail-row">
                            <label>E-mail:</label>
                            <span>${BizFlow.SecurityUtils.sanitize(customer.email)}</span>
                        </div>
                        <div class="detail-row">
                            <label>Telefone:</label>
                            <span>${customer.phone || '--'}</span>
                        </div>
                        <div class="detail-row">
                            <label>Tipo:</label>
                            <span>${customer.type === 'company' ? 'Pessoa Jurídica' : 'Pessoa Física'}</span>
                        </div>
                        ${customer.taxId ? `
                        <div class="detail-row">
                            <label>CNPJ:</label>
                            <span>${customer.taxId}</span>
                        </div>
                        ` : ''}
                        <div class="detail-row">
                            <label>Endereço:</label>
                            <span>${customer.address || '--'}</span>
                        </div>
                        <div class="detail-row">
                            <label>Total em Compras:</label>
                            <span>R$ ${(customer.totalPurchases || 0).toFixed(2)}</span>
                        </div>
                        <div class="detail-row">
                            <label>Última Compra:</label>
                            <span>${customer.lastPurchase ? new Date(customer.lastPurchase).toLocaleDateString('pt-BR') : 'Nunca'}</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-light" onclick="this.closest('.modal').remove()">Fechar</button>
                    <button class="btn btn-primary" onclick="window.CustomerManager.editCustomer(${customer.id}); this.closest('.modal').remove()">Editar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Fechar modal
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    async editCustomer(customerId) {
        try {
            // Buscar dados atualizados do cliente
            const customer = this.customers.find(c => c.id === customerId);
            if (!customer) return;

            // Preencher formulário de edição
            this.showEditCustomerModal(customer);
            
        } catch (error) {
            BizFlow.showError('Erro ao carregar dados do cliente: ' + error.message);
        }
    }

    showEditCustomerModal(customer) {
        const modal = document.getElementById('add-customer-modal');
        if (!modal) return;

        // Preencher formulário
        document.getElementById('customer-name').value = customer.name;
        document.getElementById('customer-email').value = customer.email;
        document.getElementById('customer-phone').value = customer.phone || '';
        document.getElementById('customer-type').value = customer.type;
        document.getElementById('customer-address').value = customer.address || '';
        
        if (customer.type === 'company') {
            document.getElementById('customer-tax-id-group').style.display = 'block';
            document.getElementById('customer-tax-id').value = customer.taxId || '';
        }

        // Alterar título e comportamento do modal
        const modalTitle = modal.querySelector('.modal-title');
        modalTitle.textContent = 'Editar Cliente';

        // Atualizar botão salvar para edição
        const saveButton = document.getElementById('save-customer');
        saveButton.textContent = 'Atualizar Cliente';
        saveButton.onclick = () => this.handleUpdateCustomer(customer.id);

        modal.style.display = 'flex';
    }

    async handleUpdateCustomer(customerId) {
        const formData = {
            name: document.getElementById('customer-name').value,
            email: document.getElementById('customer-email').value,
            phone: document.getElementById('customer-phone').value,
            type: document.getElementById('customer-type').value,
            address: document.getElementById('customer-address').value
        };

        if (formData.type === 'company') {
            formData.taxId = document.getElementById('customer-tax-id').value;
        }

        try {
            this.showLoading('Atualizando cliente...');
            
            await BizFlow.ApiService.updateCustomer(customerId, formData);
            
            this.hideCustomerModal();
            await this.loadCustomers();
            
            BizFlow.showSuccess('Cliente atualizado com sucesso!');
            
        } catch (error) {
            BizFlow.showError('Erro ao atualizar cliente: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async deleteCustomer(customerId) {
        const customer = this.customers.find(c => c.id === customerId);
        if (!customer) return;

        const confirmDelete = confirm(`Tem certeza que deseja excluir o cliente "${customer.name}"?`);
        if (!confirmDelete) return;

        try {
            this.showLoading('Excluindo cliente...');
            
            await BizFlow.ApiService.deleteCustomer(customerId);
            await this.loadCustomers();
            
            BizFlow.showSuccess('Cliente excluído com sucesso!');
            
        } catch (error) {
            BizFlow.showError('Erro ao excluir cliente: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    handleCustomerSearch(query) {
        if (!query.trim()) {
            this.filteredCustomers = [...this.customers];
        } else {
            const searchTerm = query.toLowerCase();
            this.filteredCustomers = this.customers.filter(customer =>
                customer.name.toLowerCase().includes(searchTerm) ||
                customer.email.toLowerCase().includes(searchTerm) ||
                (customer.phone && customer.phone.includes(searchTerm))
            );
        }
        
        this.renderCustomersTable();
    }

    updateCustomerStats() {
        const totalCustomers = this.customers.length;
        const activeCustomers = this.customers.filter(c => this.getCustomerStatus(c) === 'active').length;
        const totalRevenue = this.customers.reduce((sum, c) => sum + (c.totalPurchases || 0), 0);

        // Atualizar cards do dashboard se estiverem visíveis
        const totalCustomersElement = document.getElementById('total-customers');
        if (totalCustomersElement) {
            totalCustomersElement.textContent = totalCustomers;
        }

        // Atualizar estatísticas na página de clientes
        this.updateCustomerPageStats(totalCustomers, activeCustomers, totalRevenue);
    }

    updateCustomerPageStats(total, active, revenue) {
        // Implementar atualização de estatísticas na página de clientes
        // Pode ser adicionado como cards no topo da página
    }

    exportCustomers() {
        try {
            const csvContent = this.generateCSV();
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            BizFlow.showSuccess('Clientes exportados com sucesso!');
            
        } catch (error) {
            BizFlow.showError('Erro ao exportar clientes: ' + error.message);
        }
    }

    generateCSV() {
        const headers = ['ID', 'Nome', 'E-mail', 'Telefone', 'Tipo', 'CNPJ', 'Endereço', 'Total Compras', 'Última Compra'];
        const rows = this.customers.map(customer => [
            customer.id,
            customer.name,
            customer.email,
            customer.phone || '',
            customer.type === 'company' ? 'Pessoa Jurídica' : 'Pessoa Física',
            customer.taxId || '',
            customer.address || '',
            customer.totalPurchases || 0,
            customer.lastPurchase || ''
        ]);

        return [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
    }

    updateCSRFToken(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            const token = BizFlow.SecurityUtils.generateCSRFToken();
            element.value = token;
            BizFlow.state.security.csrfTokens.set(token, Date.now());
        }
    }

    showLoading(message) {
        // Implementar loading
        console.log('Loading:', message);
    }

    hideLoading() {
        // Implementar hide loading
    }
}

// Inicializar quando a página de clientes for carregada
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('customers-page')) {
        window.CustomerManager = new CustomerManager();
    }
});

// Adicionar ao objeto global BizFlow
if (window.BizFlow) {
    window.BizFlow.CustomerManager = CustomerManager;
}
