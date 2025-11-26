// Dashboard specific functionality
class DashboardManager {
    constructor() {
        this.stats = {
            todaySales: 0,
            totalCustomers: 0,
            totalProducts: 0,
            monthlyRevenue: 0,
            lowStockCount: 0
        };
    }

    async loadDashboardData() {
        try {
            showLoading('Carregando dashboard...');

            // Load multiple data in parallel
            const [salesData, productsData, customersData, inventoryData] = await Promise.all([
                ApiService.getSales({ limit: 10, status: 'completed' }),
                ApiService.getProducts(),
                ApiService.getCustomers(),
                ApiService.getInventoryReport()
            ]);

            this.updateStats(salesData, productsData, customersData, inventoryData);
            this.renderRecentSales(salesData.data.sales);
            this.updateCharts();

            hideLoading();

        } catch (error) {
            hideLoading();
            console.error('Erro ao carregar dashboard:', error);
            showError('Erro ao carregar dados do dashboard');
        }
    }

    updateStats(salesData, productsData, customersData, inventoryData) {
        // Today's sales
        const today = new Date().toDateString();
        const todaySales = salesData.data.sales.filter(sale => {
            const saleDate = new Date(sale.createdAt).toDateString();
            return saleDate === today;
        }).reduce((total, sale) => total + sale.total, 0);

        this.stats.todaySales = todaySales;
        this.stats.totalCustomers = customersData.data.pagination.total;
        this.stats.totalProducts = productsData.data.pagination.total;
        this.stats.monthlyRevenue = this.calculateMonthlyRevenue(salesData.data.sales);
        this.stats.lowStockCount = inventoryData.data.summary.lowStockItems;

        this.updateStatsUI();
    }

    calculateMonthlyRevenue(sales) {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        return sales
            .filter(sale => {
                const saleDate = new Date(sale.createdAt);
                return saleDate.getMonth() === currentMonth && 
                       saleDate.getFullYear() === currentYear;
            })
            .reduce((total, sale) => total + sale.total, 0);
    }

    updateStatsUI() {
        const stats = this.stats;

        // Update cards
        this.updateCard('today-sales', `R$ ${stats.todaySales.toFixed(2)}`);
        this.updateCard('total-customers', stats.totalCustomers.toString());
        this.updateCard('total-products', stats.totalProducts.toString());
        this.updateCard('monthly-revenue', `R$ ${stats.monthlyRevenue.toFixed(2)}`);
        this.updateCard('low-stock-count', stats.lowStockCount.toString());

        // Update changes (mock data for demo)
        this.updateChangeIndicator('sales-change', 12.5, 'positive');
        this.updateChangeIndicator('customers-change', 8.2, 'positive');
        this.updateChangeIndicator('revenue-change', 15.3, 'positive');
    }

    updateCard(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    updateChangeIndicator(elementId, change, type) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = `${change}%`;
            element.className = type === 'positive' ? 'positive' : 'negative';
        }
    }

    renderRecentSales(sales) {
        const tbody = document.getElementById('recent-sales');
        if (!tbody) return;

        tbody.innerHTML = sales.map(sale => `
            <tr>
                <td>#${sale.saleNumber}</td>
                <td>${sale.customer?.name || 'Cliente não identificado'}</td>
                <td>${new Date(sale.createdAt).toLocaleDateString('pt-BR')}</td>
                <td>R$ ${sale.total.toFixed(2)}</td>
                <td>
                    <span class="badge ${this.getStatusBadgeClass(sale.status)}">
                        ${this.getStatusText(sale.status)}
                    </span>
                </td>
                <td>
                    <button class="btn btn-light btn-sm" onclick="Dashboard.viewSale('${sale._id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-light btn-sm" onclick="Dashboard.printSale('${sale._id}')">
                        <i class="fas fa-print"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    getStatusBadgeClass(status) {
        const classes = {
            'completed': 'badge-success',
            'pending': 'badge-warning',
            'cancelled': 'badge-danger',
            'refunded': 'badge-secondary'
        };
        return classes[status] || 'badge-secondary';
    }

    getStatusText(status) {
        const texts = {
            'completed': 'Concluída',
            'pending': 'Pendente',
            'cancelled': 'Cancelada',
            'refunded': 'Estornada'
        };
        return texts[status] || status;
    }

    updateCharts() {
        // Simple chart implementation - in production use Chart.js or similar
        this.updateSalesChart();
        this.updateRevenueChart();
    }

    updateSalesChart() {
        // Mock chart data - implement with real chart library
        console.log('Atualizando gráfico de vendas...');
    }

    updateRevenueChart() {
        // Mock chart data - implement with real chart library
        console.log('Atualizando gráfico de receita...');
    }

    // Action methods
    static async viewSale(saleId) {
        try {
            // Implement view sale details
            showSuccess(`Visualizando venda ${saleId}`);
        } catch (error) {
            showError('Erro ao visualizar venda');
        }
    }

    static async printSale(saleId) {
        try {
            // Implement print functionality
            showSuccess(`Imprimindo venda ${saleId}`);
        } catch (error) {
            showError('Erro ao imprimir venda');
        }
    }

    static async refreshDashboard() {
        await Dashboard.loadDashboardData();
        showSuccess('Dashboard atualizado!');
    }

    static async exportDashboard() {
        try {
            // Implement export functionality
            showSuccess('Exportando dados do dashboard...');
        } catch (error) {
            showError('Erro ao exportar dados');
        }
    }
}

// Initialize dashboard
const Dashboard = new DashboardManager();

// Add to global scope for HTML onclick events
window.Dashboard = Dashboard;
