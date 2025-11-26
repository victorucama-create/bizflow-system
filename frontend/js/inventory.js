/**
 * Sistema de Gestão de Inventário - BizFlow
 * Gerencia estoque, movimentações e alertas
 */

class InventoryManager {
    constructor() {
        this.inventory = [];
        this.movements = [];
        this.lowStockItems = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInventory();
        this.loadInventoryStats();
    }

    setupEventListeners() {
        // Botões principais
        document.getElementById('add-stock-movement')?.addEventListener('click', () => this.showMovementModal());
        
        // Filtros
        const searchInput = document.getElementById('inventory-search');
        if (searchInput) {
            searchInput.addEventListener('input', BizFlow.debounce((e) => this.handleInventorySearch(e.target.value), 300));
        }
        
        // Exportação
        document.getElementById('export-inventory')?.addEventListener('click', () => this.exportInventory());
    }

    async loadInventory() {
        try {
            this.showLoading('Carregando inventário...');
            
            const response = await BizFlow.ApiService.getInventoryMovements();
            this.inventory = response.data.inventory;
            this.movements = response.data.movements;
            
            this.identifyLowStockItems();
            this.renderInventoryTable();
            this.updateInventoryStats();
            
        } catch (error) {
            BizFlow.showError('Erro ao carregar inventário: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async loadInventoryStats() {
        try {
            const response = await BizFlow.ApiService.getInventoryReport();
            this.updateInventoryCards(response.data);
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    }

    identifyLowStockItems() {
        this.lowStockItems = this.inventory.filter(item => 
            item.stock <= item.minStock
        );
    }

    renderInventoryTable() {
        const tbody = document.getElementById('inventory-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        this.inventory.forEach(item => {
            const row = this.createInventoryRow(item);
            tbody.appendChild(row);
        });
    }

    createInventoryRow(item) {
        const row = document.createElement('tr');
        const totalValue = item.stock * (item.cost || item.price);
        const status = this.getStockStatus(item);
        
        row.innerHTML = `
            <td>
                <div class="product-info">
                    <strong>${BizFlow.SecurityUtils.sanitize(item.name)}</strong>
                    <br>
                    <small class="text-muted">${item.sku}</small>
                </div>
            </td>
            <td>${this.getCategoryName(item.category)}</td>
            <td>
                <span class="stock-amount ${status}">${item.stock}</span>
            </td>
            <td>${item.minStock || 5}</td>
            <td>R$ ${(item.cost || item.price).toFixed(2)}</td>
            <td>R$ ${totalValue.toFixed(2)}</td>
            <td>
                <span class="badge badge-${this.getStatusBadgeColor(status)}">
                    ${this.getStatusText(status)}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-light" onclick="window.InventoryManager.adjustStock(${item.id})" title="Ajustar Estoque">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-light" onclick="window.InventoryManager.viewMovements(${item.id})" title="Ver Movimentações">
                        <i class="fas fa-history"></i>
                    </button>
                    <button class="btn btn-sm btn-light" onclick="window.InventoryManager.lowStockAlert(${item.id})" title="${status === 'low' ? 'Stock Baixo' : 'Status'}">
                        <i class="fas fa-${status === 'low' ? 'exclamation-triangle' : 'info-circle'}"></i>
                    </button>
                </div>
            </td>
        `;
        
        return row;
    }

    getStockStatus(item) {
        if (item.stock === 0) return 'out';
        if (item.stock <= (item.minStock || 5)) return 'low';
        if (item.stock <= (item.minStock || 5) * 2) return 'medium';
        return 'good';
    }

    getStatusBadgeColor(status) {
        const colors = {
            'out': 'danger',
            'low': 'warning',
            'medium': 'info',
            'good': 'success'
        };
        return colors[status] || 'light';
    }

    getStatusText(status) {
        const texts = {
            'out': 'Sem Stock',
            'low': 'Stock Baixo',
            'medium': 'Stock Médio',
            'good': 'Stock Bom'
        };
        return texts[status] || 'Desconhecido';
    }

    getCategoryName(category) {
        const categories = {
            'eletronicos': 'Eletrônicos',
            'informatica': 'Informática',
            'audio': 'Áudio',
            'acessorios': 'Acessórios',
            'outros': 'Outros'
        };
        return categories[category] || category;
    }

    updateInventoryCards(stats) {
        const elements = {
            'total-items': stats.totalItems || this.inventory.length,
            'total-value': stats.totalValue || this.calculateTotalValue(),
            'low-stock-items': stats.lowStockItems || this.lowStockItems.length,
            'out-of-stock': stats.outOfStock || this.inventory.filter(item => item.stock === 0).length
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (id === 'total-value') {
                    element.textContent = `R$ ${value.toFixed(2)}`;
                } else {
                    element.textContent = value;
                }
            }
        });
    }

    calculateTotalValue() {
        return this.inventory.reduce((total, item) => {
            return total + (item.stock * (item.cost || item.price));
        }, 0);
    }

    showMovementModal() {
        // Implementar modal de movimentação de estoque
        this.showCustomModal('Movimentação de Estoque', this.getMovementFormHTML());
    }

    async adjustStock(productId) {
        const product = this.inventory.find(p => p.id === productId);
        if (!product) return;

        const modalHTML = `
            <div class="form-group">
                <label>Produto</label>
                <input type="text" class="form-control" value="${BizFlow.SecurityUtils.sanitize(product.name)}" readonly>
            </div>
            <div class="form-group">
                <label>Stock Atual</label>
                <input type="number" class="form-control" value="${product.stock}" readonly>
            </div>
            <div class="form-group">
                <label>Tipo de Ajuste</label>
                <select class="form-control" id="adjustment-type">
                    <option value="entry">Entrada</option>
                    <option value="out">Saída</option>
                    <option value="adjust">Ajuste Manual</option>
                </select>
            </div>
            <div class="form-group">
                <label>Quantidade</label>
                <input type="number" class="form-control" id="adjustment-quantity" min="1" value="1">
            </div>
            <div class="form-group">
                <label>Motivo</label>
                <textarea class="form-control" id="adjustment-reason" placeholder="Ex: Inventário, Devolução, etc."></textarea>
            </div>
        `;

        this.showCustomModal('Ajustar Estoque', modalHTML, async () => {
            await this.handleStockAdjustment(productId);
        });
    }

    async handleStockAdjustment(productId) {
        const type = document.getElementById('adjustment-type').value;
        const quantity = parseInt(document.getElementById('adjustment-quantity').value);
        const reason = document.getElementById('adjustment-reason').value;

        if (!quantity || quantity < 1) {
            BizFlow.showError('Quantidade inválida.');
            return;
        }

        if (!reason.trim()) {
            BizFlow.showError('Por favor, informe o motivo do ajuste.');
            return;
        }

        try {
            this.showLoading('Processando ajuste...');

            const adjustmentData = {
                productId,
                type,
                quantity,
                reason: BizFlow.SecurityUtils.sanitize(reason),
                date: new Date().toISOString()
            };

            await BizFlow.ApiService.adjustStock(adjustmentData);
            
            await this.loadInventory();
            BizFlow.showSuccess('Estoque ajustado com sucesso!');
            
        } catch (error) {
            BizFlow.showError('Erro ao ajustar estoque: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async viewMovements(productId) {
        try {
            const product = this.inventory.find(p => p.id === productId);
            if (!product) return;

            const movements = this.movements.filter(m => m.productId === productId);
            this.showMovementsModal(product, movements);
            
        } catch (error) {
            BizFlow.showError('Erro ao carregar movimentações: ' + error.message);
        }
    }

    showMovementsModal(product, movements) {
        let movementsHTML = '';
        
        if (movements.length === 0) {
            movementsHTML = '<p class="text-center">Nenhuma movimentação encontrada.</p>';
        } else {
            movementsHTML = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Tipo</th>
                                <th>Quantidade</th>
                                <th>Motivo</th>
                                <th>Usuário</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${movements.map(movement => `
                                <tr>
                                    <td>${new Date(movement.date).toLocaleDateString('pt-BR')}</td>
                                    <td>
                                        <span class="badge badge-${movement.type === 'entry' ? 'success' : 'danger'}">
                                            ${movement.type === 'entry' ? 'Entrada' : 'Saída'}
                                        </span>
                                    </td>
                                    <td>${movement.quantity}</td>
                                    <td>${BizFlow.SecurityUtils.sanitize(movement.reason)}</td>
                                    <td>${movement.user || 'Sistema'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        const modalHTML = `
            <div class="product-header">
                <h4>${BizFlow.SecurityUtils.sanitize(product.name)}</h4>
                <p class="text-muted">SKU: ${product.sku} | Stock Atual: ${product.stock}</p>
            </div>
            ${movementsHTML}
        `;

        this.showCustomModal('Histórico de Movimentações', modalHTML);
    }

    lowStockAlert(productId) {
        const product = this.inventory.find(p => p.id === productId);
        if (!product) return;

        const message = `
            <div class="alert alert-warning">
                <h4><i class="fas fa-exclamation-triangle"></i> Alerta de Stock Baixo</h4>
                <p><strong>${BizFlow.SecurityUtils.sanitize(product.name)}</strong></p>
                <p>Stock Atual: <strong>${product.stock} unidades</strong></p>
                <p>Stock Mínimo: <strong>${product.minStock || 5} unidades</strong></p>
                ${product.stock === 0 ? '<p class="text-danger"><strong>PRODUTO SEM STOCK!</strong></p>' : ''}
            </div>
        `;

        this.showCustomModal('Alerta de Stock', message);
    }

    handleInventorySearch(query) {
        // Implementar busca no inventário
        console.log('Searching inventory:', query);
    }

    exportInventory() {
        try {
            const csvContent = this.generateInventoryCSV();
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `inventario_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            BizFlow.showSuccess('Inventário exportado com sucesso!');
            
        } catch (error) {
            BizFlow.showError('Erro ao exportar inventário: ' + error.message);
        }
    }

    generateInventoryCSV() {
        const headers = ['SKU', 'Nome', 'Categoria', 'Stock Atual', 'Stock Mínimo', 'Custo Unitário', 'Valor Total', 'Status'];
        const rows = this.inventory.map(item => [
            item.sku,
            item.name,
            this.getCategoryName(item.category),
            item.stock,
            item.minStock || 5,
            item.cost || item.price,
            item.stock * (item.cost || item.price),
            this.getStatusText(this.getStockStatus(item))
        ]);

        return [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
    }

    showCustomModal(title, content, onConfirm = null) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-light" id="modal-cancel">Cancelar</button>
                    ${onConfirm ? `<button class="btn btn-primary" id="modal-confirm">Confirmar</button>` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.querySelector('#modal-cancel').addEventListener('click', () => modal.remove());
        
        if (onConfirm) {
            modal.querySelector('#modal-confirm').addEventListener('click', () => {
                onConfirm();
                modal.remove();
            });
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    showLoading(message) {
        console.log('Loading:', message);
    }

    hideLoading() {
        // Implementar
    }
}

// Inicializar quando a página de inventário for carregada
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('inventory-page')) {
        window.InventoryManager = new InventoryManager();
    }
});

// Adicionar ao objeto global BizFlow
if (window.BizFlow) {
    window.BizFlow.InventoryManager = InventoryManager;
}
