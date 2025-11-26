/**
 * Sistema de Gestão Financeira - BizFlow
 * Gerencia receitas, despesas, relatórios e fluxo de caixa
 */

class FinancialManager {
    constructor() {
        this.transactions = [];
        this.filteredTransactions = [];
        this.currentPeriod = 'month';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadFinancialData();
        this.updateFinancialCards();
    }

    setupEventListeners() {
        // Botão nova transação
        document.getElementById('add-transaction')?.addEventListener('click', () => this.showAddTransactionModal());
        
        // Modal events
        document.getElementById('save-transaction')?.addEventListener('click', () => this.handleSaveTransaction());
        document.getElementById('cancel-transaction')?.addEventListener('click', () => this.hideTransactionModal());
        
        // Filtros de período
        const periodSelect = document.getElementById('financial-period');
        if (periodSelect) {
            periodSelect.addEventListener('change', (e) => this.handlePeriodChange(e.target.value));
        }
        
        // Exportação
        document.getElementById('export-finance')?.addEventListener('click', () => this.exportFinancialData());
        
        // Busca
        const searchInput = document.getElementById('financial-search');
        if (searchInput) {
            searchInput.addEventListener('input', BizFlow.debounce((e) => this.handleFinancialSearch(e.target.value), 300));
        }
    }

    async loadFinancialData(period = 'month') {
        try {
            this.showLoading('Carregando dados financeiros...');
            
            const filters = this.getPeriodFilter(period);
            const response = await BizFlow.ApiService.getTransactions(filters);
            
            this.transactions = response.data.transactions;
            this.filteredTransactions = [...this.transactions];
            
            this.renderFinancialTable();
            this.updateFinancialCards();
            
        } catch (error) {
            BizFlow.showError('Erro ao carregar dados financeiros: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    getPeriodFilter(period) {
        const now = new Date();
        let startDate, endDate;

        switch (period) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                break;
            case 'week':
                const day = now.getDay();
                const diff = now.getDate() - day + (day === 0 ? -6 : 1);
                startDate = new Date(now.getFullYear(), now.getMonth(), diff);
                endDate = new Date(now.getFullYear(), now.getMonth(), diff + 6);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), quarter * 3, 1);
                endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }

        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
        };
    }

    renderFinancialTable() {
        const tbody = document.getElementById('finance-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.filteredTransactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center" style="padding: 40px;">
                        <i class="fas fa-chart-pie fa-2x" style="color: var(--light-gray); margin-bottom: 10px;"></i>
                        <p>Nenhuma transação encontrada</p>
                        <button class="btn btn-primary" onclick="window.FinancialManager.showAddTransactionModal()">
                            <i class="fas fa-plus"></i> Registrar Primeira Transação
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        this.filteredTransactions.forEach(transaction => {
            const row = this.createFinancialRow(transaction);
            tbody.appendChild(row);
        });
    }

    createFinancialRow(transaction) {
        const row = document.createElement('tr');
        const isIncome = transaction.type === 'income';
        
        row.innerHTML = `
            <td>${new Date(transaction.date).toLocaleDateString('pt-BR')}</td>
            <td>
                <div class="transaction-description">
                    <strong>${BizFlow.SecurityUtils.sanitize(transaction.description)}</strong>
                    ${transaction.notes ? `<br><small class="text-muted">${BizFlow.SecurityUtils.sanitize(transaction.notes)}</small>` : ''}
                </div>
            </td>
            <td>${this.getCategoryName(transaction.category)}</td>
            <td class="${isIncome ? 'text-success' : 'text-danger'}">
                <strong>${isIncome ? '+' : '-'} R$ ${transaction.amount.toFixed(2)}</strong>
            </td>
            <td>
                <span class="badge badge-${isIncome ? 'success' : 'danger'}">
                    ${isIncome ? 'Receita' : 'Despesa'}
                </span>
            </td>
            <td>
                <span class="badge badge-${this.getStatusBadgeColor(transaction.status)}">
                    ${this.getStatusText(transaction.status)}
                </span>
            </td>
        `;
        
        return row;
    }

    getCategoryName(category) {
        const categories = {
            'sales': 'Vendas',
            'services': 'Serviços',
            'suppliers': 'Fornecedores',
            'salaries': 'Salários',
            'utilities': 'Utilidades',
            'taxes': 'Impostos',
            'marketing': 'Marketing',
            'other': 'Outros'
        };
        return categories[category] || category;
    }

    getStatusBadgeColor(status) {
        const colors = {
            'completed': 'success',
            'pending': 'warning',
            'cancelled': 'danger'
        };
        return colors[status] || 'light';
    }

    getStatusText(status) {
        const texts = {
            'completed': 'Concluído',
            'pending': 'Pendente',
            'cancelled': 'Cancelado'
        };
        return texts[status] || status;
    }

    updateFinancialCards() {
        const stats = this.calculateFinancialStats();
        
        // Atualizar cards principais
        this.updateCard('monthly-income', stats.totalIncome);
        this.updateCard('monthly-expenses', stats.totalExpenses);
        this.updateCard('current-balance', stats.balance);
        
        // Atualizar variações
        this.updateChangeIndicator('income-change', stats.incomeChange);
        this.updateChangeIndicator('expenses-change', stats.expensesChange);
        this.updateChangeIndicator('balance-change', stats.balanceChange);
    }

    calculateFinancialStats() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Transações do mês atual
        const currentMonthTransactions = this.transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return transactionDate.getMonth() === currentMonth && 
                   transactionDate.getFullYear() === currentYear;
        });
        
        // Transações do mês anterior
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        
        const lastMonthTransactions = this.transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return transactionDate.getMonth() === lastMonth && 
                   transactionDate.getFullYear() === lastMonthYear;
        });
        
        // Calcular totais do mês atual
        const totalIncome = currentMonthTransactions
            .filter(t => t.type === 'income' && t.status === 'completed')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const totalExpenses = currentMonthTransactions
            .filter(t => t.type === 'expense' && t.status === 'completed')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const balance = totalIncome - totalExpenses;
        
        // Calcular totais do mês anterior
        const lastMonthIncome = lastMonthTransactions
            .filter(t => t.type === 'income' && t.status === 'completed')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const lastMonthExpenses = lastMonthTransactions
            .filter(t => t.type === 'expense' && t.status === 'completed')
            .reduce((sum, t) => sum + t.amount, 0);
            
        const lastMonthBalance = lastMonthIncome - lastMonthExpenses;
        
        // Calcular variações
        const incomeChange = lastMonthIncome > 0 ? ((totalIncome - lastMonthIncome) / lastMonthIncome) * 100 : 0;
        const expensesChange = lastMonthExpenses > 0 ? ((totalExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 : 0;
        const balanceChange = lastMonthBalance !== 0 ? ((balance - lastMonthBalance) / Math.abs(lastMonthBalance)) * 100 : 0;
        
        return {
            totalIncome,
            totalExpenses,
            balance,
            incomeChange,
            expensesChange,
            balanceChange
        };
    }

    updateCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = `R$ ${value.toFixed(2)}`;
        }
    }

    updateChangeIndicator(elementId, change) {
        const element = document.getElementById(elementId);
        if (element) {
            const isPositive = change >= 0;
            const parent = element.closest('.card-change');
            
            if (parent) {
                parent.className = `card-change ${isPositive ? 'positive' : 'negative'}`;
                parent.querySelector('i').className = isPositive ? 'fas fa-arrow-up' : 'fas fa-arrow-down';
            }
            
            element.textContent = `${Math.abs(change).toFixed(1)}%`;
        }
    }

    showAddTransactionModal() {
        const modal = document.getElementById('add-transaction-modal');
        if (!modal) return;
        
        // Reset form
        document.getElementById('add-transaction-form').reset();
        
        // Preencher data atual
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('transaction-date').value = today;
        
        // Gerar CSRF token
        this.updateCSRFToken('transaction-csrf');
        
        modal.style.display = 'flex';
    }

    hideTransactionModal() {
        const modal = document.getElementById('add-transaction-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async handleSaveTransaction() {
        const formData = {
            date: document.getElementById('transaction-date').value,
            type: document.getElementById('transaction-type').value,
            description: document.getElementById('transaction-description').value,
            category: document.getElementById('transaction-category').value,
            amount: parseFloat(document.getElementById('transaction-amount').value),
            notes: document.getElementById('transaction-notes').value
        };

        // Validações
        if (!formData.date) {
            BizFlow.showError('Por favor, selecione uma data.');
            return;
        }

        if (!formData.description.trim()) {
            BizFlow.showError('Por favor, insira uma descrição.');
            return;
        }

        if (!formData.category) {
            BizFlow.showError('Por favor, selecione uma categoria.');
            return;
        }

        if (!formData.amount || formData.amount <= 0) {
            BizFlow.showError('Por favor, insira um valor válido.');
            return;
        }

        try {
            this.showLoading('Salvando transação...');
            
            // Em uma implementação real, isso chamaria a API
            // Por enquanto, simularemos a criação
            const newTransaction = {
                id: 'T' + Date.now(),
                ...formData,
                status: 'completed'
            };
            
            this.transactions.push(newTransaction);
            this.filteredTransactions.push(newTransaction);
            
            this.hideTransactionModal();
            this.renderFinancialTable();
            this.updateFinancialCards();
            
            BizFlow.showSuccess('Transação registrada com sucesso!');
            
        } catch (error) {
            BizFlow.showError('Erro ao salvar transação: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    handlePeriodChange(period) {
        this.currentPeriod = period;
        this.loadFinancialData(period);
    }

    handleFinancialSearch(query) {
        if (!query.trim()) {
            this.filteredTransactions = [...this.transactions];
        } else {
            const searchTerm = query.toLowerCase();
            this.filteredTransactions = this.transactions.filter(transaction =>
                transaction.description.toLowerCase().includes(searchTerm) ||
                this.getCategoryName(transaction.category).toLowerCase().includes(searchTerm) ||
                transaction.notes?.toLowerCase().includes(searchTerm)
            );
        }
        
        this.renderFinancialTable();
    }

    exportFinancialData() {
        try {
            const csvContent = this.generateFinancialCSV();
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `financeiro_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            BizFlow.showSuccess('Dados financeiros exportados com sucesso!');
            
        } catch (error) {
            BizFlow.showError('Erro ao exportar dados financeiros: ' + error.message);
        }
    }

    generateFinancialCSV() {
        const headers = ['Data', 'Descrição', 'Categoria', 'Valor', 'Tipo', 'Status', 'Observações'];
        const rows = this.transactions.map(transaction => [
            new Date(transaction.date).toLocaleDateString('pt-BR'),
            transaction.description,
            this.getCategoryName(transaction.category),
            transaction.amount,
            transaction.type === 'income' ? 'Receita' : 'Despesa',
            this.getStatusText(transaction.status),
            transaction.notes || ''
        ]);

        return [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
    }

    generateFinancialReport() {
        // Gerar relatório financeiro detalhado
        const report = {
            period: this.currentPeriod,
            generatedAt: new Date().toISOString(),
            summary: this.calculateFinancialStats(),
            transactions: this.transactions,
            charts: this.generateChartData()
        };
        
        return report;
    }

    generateChartData() {
        // Gerar dados para gráficos
        const incomeByCategory = {};
        const expensesByCategory = {};
        
        this.transactions.forEach(transaction => {
            if (transaction.status !== 'completed') return;
            
            const category = this.getCategoryName(transaction.category);
            
            if (transaction.type === 'income') {
                incomeByCategory[category] = (incomeByCategory[category] || 0) + transaction.amount;
            } else {
                expensesByCategory[category] = (expensesByCategory[category] || 0) + transaction.amount;
            }
        });
        
        return {
            incomeByCategory,
            expensesByCategory
        };
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
        console.log('Loading:', message);
    }

    hideLoading() {
        // Implementar
    }
}

// Inicializar quando a página financeira for carregada
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('finance-page')) {
        window.FinancialManager = new FinancialManager();
    }
});

// Adicionar ao objeto global BizFlow
if (window.BizFlow) {
    window.BizFlow.FinancialManager = FinancialManager;
}
