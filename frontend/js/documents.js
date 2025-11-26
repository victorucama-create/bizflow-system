/**
 * Sistema de Gestão de Documentos - BizFlow
 * Gerencia documentos, assinaturas digitais e fluxos de aprovação
 */

class DocumentManager {
    constructor() {
        this.documents = [];
        this.pendingApprovals = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDocuments();
        this.setupSignaturePad();
    }

    setupEventListeners() {
        // Botão novo documento
        document.getElementById('new-document-btn')?.addEventListener('click', () => this.showNewDocumentModal());
        
        // Modal events
        document.getElementById('save-document')?.addEventListener('click', () => this.handleSaveDocument());
        document.getElementById('cancel-document')?.addEventListener('click', () => this.hideDocumentModal());
        
        // Filtros
        const searchInput = document.getElementById('document-search');
        if (searchInput) {
            searchInput.addEventListener('input', BizFlow.debounce((e) => this.handleDocumentSearch(e.target.value), 300));
        }
        
        // Assinatura digital
        document.getElementById('confirm-signature')?.addEventListener('click', () => this.handleConfirmSignature());
        document.getElementById('clear-signature')?.addEventListener('click', () => this.clearSignature());
        document.getElementById('cancel-signature')?.addEventListener('click', () => this.hideSignatureModal());
        
        // Exportação
        document.getElementById('export-documents')?.addEventListener('click', () => this.exportDocuments());
    }

    async loadDocuments(filters = {}) {
        try {
            this.showLoading('Carregando documentos...');
            
            const response = await BizFlow.ApiService.getDocuments(filters);
            this.documents = response.data.documents;
            this.pendingApprovals = this.documents.filter(doc => 
                doc.status === 'pending' && doc.requiresApproval
            );
            
            this.renderDocumentsTable();
            this.updateApprovalBadge();
            
        } catch (error) {
            BizFlow.showError('Erro ao carregar documentos: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    renderDocumentsTable() {
        const tbody = document.getElementById('documents-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.documents.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center" style="padding: 40px;">
                        <i class="fas fa-file-contract fa-2x" style="color: var(--light-gray); margin-bottom: 10px;"></i>
                        <p>Nenhum documento encontrado</p>
                        <button class="btn btn-primary" onclick="window.DocumentManager.showNewDocumentModal()">
                            <i class="fas fa-plus"></i> Criar Primeiro Documento
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        this.documents.forEach(document => {
            const row = this.createDocumentRow(document);
            tbody.appendChild(row);
        });
    }

    createDocumentRow(document) {
        const row = document.createElement('tr');
        const customer = this.getCustomerName(document.customerId);
        const status = this.getDocumentStatus(document);
        
        row.innerHTML = `
            <td>${document.id}</td>
            <td>
                <div class="document-type">
                    <i class="fas ${this.getDocumentIcon(document.type)}"></i>
                    ${this.getDocumentTypeName(document.type)}
                </div>
            </td>
            <td>${customer}</td>
            <td>${new Date(document.date).toLocaleDateString('pt-BR')}</td>
            <td>R$ ${document.amount.toFixed(2)}</td>
            <td>
                <span class="badge badge-${this.getStatusBadgeColor(document.status)}">
                    ${this.getStatusText(document.status)}
                    ${document.requiresApproval ? ' <i class="fas fa-signature"></i>' : ''}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-light" onclick="window.DocumentManager.viewDocument('${document.id}')" title="Ver documento">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${document.requiresApproval && document.status === 'pending' ? `
                    <button class="btn btn-sm btn-primary" onclick="window.DocumentManager.signDocument('${document.id}')" title="Assinar documento">
                        <i class="fas fa-signature"></i>
                    </button>
                    ` : ''}
                    <button class="btn btn-sm btn-light" onclick="window.DocumentManager.downloadDocument('${document.id}')" title="Download">
                        <i class="fas fa-download"></i>
                    </button>
                    ${document.status === 'pending' ? `
                    <button class="btn btn-sm btn-light" onclick="window.DocumentManager.cancelDocument('${document.id}')" title="Cancelar">
                        <i class="fas fa-times"></i>
                    </button>
                    ` : ''}
                </div>
            </td>
        `;
        
        return row;
    }

    getDocumentIcon(type) {
        const icons = {
            'invoice': 'fa-file-invoice-dollar',
            'purchase-order': 'fa-file-purchase',
            'requisition': 'fa-file-alt',
            'contract': 'fa-file-contract'
        };
        return icons[type] || 'fa-file';
    }

    getDocumentTypeName(type) {
        const names = {
            'invoice': 'Fatura',
            'purchase-order': 'Ordem de Compra',
            'requisition': 'Requisição',
            'contract': 'Contrato'
        };
        return names[type] || type;
    }

    getCustomerName(customerId) {
        if (!customerId) return '--';
        
        // Buscar nome do cliente no estado global ou fazer requisição
        const customer = BizFlow.state.customers?.find(c => c.id === customerId);
        return customer ? customer.name : `Cliente #${customerId}`;
    }

    getDocumentStatus(document) {
        if (document.requiresApproval && document.status === 'pending') {
            return 'pending_approval';
        }
        return document.status;
    }

    getStatusBadgeColor(status) {
        const colors = {
            'pending': 'warning',
            'pending_approval': 'danger',
            'signed': 'success',
            'approved': 'success',
            'rejected': 'danger',
            'cancelled': 'secondary'
        };
        return colors[status] || 'light';
    }

    getStatusText(status) {
        const texts = {
            'pending': 'Pendente',
            'pending_approval': 'Aguardando Assinatura',
            'signed': 'Assinado',
            'approved': 'Aprovado',
            'rejected': 'Rejeitado',
            'cancelled': 'Cancelado'
        };
        return texts[status] || status;
    }

    showNewDocumentModal() {
        const modal = document.getElementById('add-document-modal');
        if (!modal) return;
        
        // Reset form
        document.getElementById('add-document-form').reset();
        document.getElementById('document-requires-approval').checked = true;
        
        // Carregar clientes no select
        this.loadCustomersSelect();
        
        // Preencher data atual
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('document-date').value = today;
        
        // Gerar CSRF token
        this.updateCSRFToken('document-csrf');
        
        modal.style.display = 'flex';
    }

    hideDocumentModal() {
        const modal = document.getElementById('add-document-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    loadCustomersSelect() {
        const select = document.getElementById('document-customer');
        if (!select) return;

        select.innerHTML = '<option value="">Selecione um cliente/fornecedor</option>';
        
        // Usar clientes do estado global ou carregar via API
        const customers = BizFlow.state.customers || [];
        
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customer.name;
            select.appendChild(option);
        });
    }

    async handleSaveDocument() {
        const formData = {
            type: document.getElementById('document-type').value,
            customerId: document.getElementById('document-customer').value || null,
            date: document.getElementById('document-date').value,
            dueDate: document.getElementById('document-due-date').value || null,
            amount: parseFloat(document.getElementById('document-amount').value),
            description: document.getElementById('document-description').value,
            requiresApproval: document.getElementById('document-requires-approval').checked
        };

        // Validações
        if (!formData.type) {
            BizFlow.showError('Por favor, selecione o tipo de documento.');
            return;
        }

        if (!formData.amount || formData.amount <= 0) {
            BizFlow.showError('Por favor, insira um valor válido.');
            return;
        }

        if (!formData.description.trim()) {
            BizFlow.showError('Por favor, insira uma descrição.');
            return;
        }

        try {
            this.showLoading('Salvando documento...');
            
            await BizFlow.ApiService.createDocument(formData);
            
            this.hideDocumentModal();
            await this.loadDocuments();
            
            BizFlow.showSuccess('Documento criado com sucesso!');
            
        } catch (error) {
            BizFlow.showError('Erro ao criar documento: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async viewDocument(documentId) {
        try {
            const document = this.documents.find(d => d.id === documentId);
            if (!document) return;

            this.showDocumentDetailsModal(document);
            
        } catch (error) {
            BizFlow.showError('Erro ao carregar documento: ' + error.message);
        }
    }

    showDocumentDetailsModal(document) {
        const modalHTML = `
            <div class="document-details">
                <div class="document-header">
                    <h4>${this.getDocumentTypeName(document.type)} - ${document.id}</h4>
                    <p class="text-muted">Criado em: ${new Date(document.date).toLocaleDateString('pt-BR')}</p>
                </div>
                
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Cliente/Fornecedor:</label>
                        <span>${this.getCustomerName(document.customerId)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Valor:</label>
                        <span>R$ ${document.amount.toFixed(2)}</span>
                    </div>
                    <div class="detail-item">
                        <label>Status:</label>
                        <span class="badge badge-${this.getStatusBadgeColor(document.status)}">
                            ${this.getStatusText(document.status)}
                        </span>
                    </div>
                    ${document.dueDate ? `
                    <div class="detail-item">
                        <label>Vencimento:</label>
                        <span>${new Date(document.dueDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                    ` : ''}
                    <div class="detail-item full-width">
                        <label>Descrição:</label>
                        <p>${BizFlow.SecurityUtils.sanitize(document.description)}</p>
                    </div>
                </div>

                ${document.requiresApproval ? `
                <div class="approval-section">
                    <h5><i class="fas fa-signature"></i> Fluxo de Aprovação</h5>
                    <div class="approval-status">
                        ${this.getApprovalStatusHTML(document)}
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        this.showCustomModal('Detalhes do Documento', modalHTML);
    }

    getApprovalStatusHTML(document) {
        if (document.status === 'signed' || document.status === 'approved') {
            return `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i>
                    Documento aprovado e assinado digitalmente
                    ${document.signedAt ? `em ${new Date(document.signedAt).toLocaleDateString('pt-BR')}` : ''}
                </div>
            `;
        } else if (document.status === 'pending_approval' || document.status === 'pending') {
            return `
                <div class="alert alert-warning">
                    <i class="fas fa-clock"></i>
                    Aguardando assinatura digital
                    <button class="btn btn-sm btn-primary" onclick="window.DocumentManager.signDocument('${document.id}')">
                        <i class="fas fa-signature"></i> Assinar Agora
                    </button>
                </div>
            `;
        } else if (document.status === 'rejected') {
            return `
                <div class="alert alert-danger">
                    <i class="fas fa-times-circle"></i>
                    Documento rejeitado
                    ${document.rejectionReason ? `<p><strong>Motivo:</strong> ${document.rejectionReason}</p>` : ''}
                </div>
            `;
        }

        return '';
    }

    async signDocument(documentId) {
        const document = this.documents.find(d => d.id === documentId);
        if (!document) return;

        // Verificar permissões
        if (!this.canSignDocument(document)) {
            BizFlow.showError('Você não tem permissão para assinar este documento.');
            return;
        }

        // Mostrar modal de assinatura
        this.showSignatureModal(document);
    }

    canSignDocument(document) {
        // Verificar se o usuário atual tem permissão para assinar
        // Isso pode ser baseado em roles, limites de valor, etc.
        const user = BizFlow.state.currentUser;
        
        if (!user) return false;
        
        // Admin pode assinar qualquer documento
        if (user.role === 'admin') return true;
        
        // Outras regras de negócio podem ser implementadas aqui
        // Ex: valor máximo por role, departamento, etc.
        
        return true; // Temporariamente permitir para desenvolvimento
    }

    showSignatureModal(document) {
        const modal = document.getElementById('signature-modal');
        if (!modal) return;

        // Preencher informações do documento
        document.getElementById('sign-document-title').textContent = `${this.getDocumentTypeName(document.type)} - ${document.id}`;
        document.getElementById('sign-document-amount').textContent = `R$ ${document.amount.toFixed(2)}`;
        document.getElementById('sign-document-customer').textContent = this.getCustomerName(document.customerId);

        // Resetar assinatura e campos
        this.clearSignature();
        document.getElementById('signature-password').value = '';
        document.getElementById('signature-consent').checked = false;

        // Armazenar documentId para uso posterior
        modal.dataset.documentId = document.id;

        modal.style.display = 'flex';
    }

    hideSignatureModal() {
        const modal = document.getElementById('signature-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    setupSignaturePad() {
        const canvas = document.getElementById('signature-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let isDrawing = false;
        let lastX = 0;
        let lastY = 0;

        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('touchstart', startDrawing);
        
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('touchmove', draw);
        
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('touchend', stopDrawing);
        
        canvas.addEventListener('mouseout', stopDrawing);

        function startDrawing(e) {
            isDrawing = true;
            [lastX, lastY] = getCoordinates(e);
        }

        function draw(e) {
            if (!isDrawing) return;
            e.preventDefault();

            const [x, y] = getCoordinates(e);

            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(x, y);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.stroke();

            [lastX, lastY] = [x, y];
        }

        function stopDrawing() {
            isDrawing = false;
        }

        function getCoordinates(e) {
            const rect = canvas.getBoundingClientRect();
            let clientX, clientY;

            if (e.type.includes('touch')) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            return [
                clientX - rect.left,
                clientY - rect.top
            ];
        }
    }

    clearSignature() {
        const canvas = document.getElementById('signature-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    async handleConfirmSignature() {
        const modal = document.getElementById('signature-modal');
        const documentId = modal?.dataset.documentId;
        
        const password = document.getElementById('signature-password').value;
        const consent = document.getElementById('signature-consent').checked;

        if (!documentId) {
            BizFlow.showError('Documento não identificado.');
            return;
        }

        if (!password) {
            BizFlow.showError('Por favor, digite sua senha para confirmar.');
            return;
        }

        if (!consent) {
            BizFlow.showError('Você deve confirmar que leu e concorda com os termos.');
            return;
        }

        // Verificar se há assinatura
        const canvas = document.getElementById('signature-canvas');
        const isEmpty = this.isCanvasEmpty(canvas);
        
        if (isEmpty) {
            BizFlow.showError('Por favor, forneça sua assinatura.');
            return;
        }

        try {
            this.showLoading('Processando assinatura...');

            // Obter assinatura como base64
            const signatureData = canvas.toDataURL();

            const signatureData = {
                signature: signatureData,
                password: password,
                timestamp: new Date().toISOString()
            };

            await BizFlow.ApiService.signDocument(documentId, signatureData);
            
            this.hideSignatureModal();
            await this.loadDocuments();
            
            BizFlow.showSuccess('Documento assinado com sucesso!');
            
        } catch (error) {
            BizFlow.showError('Erro ao assinar documento: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    isCanvasEmpty(canvas) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] !== 0) return false; // Pixel não transparente encontrado
        }
        
        return true;
    }

    async downloadDocument(documentId) {
        try {
            this.showLoading('Preparando download...');
            
            // Em uma implementação real, isso baixaria o arquivo PDF
            // Por enquanto, simularemos o download
            const document = this.documents.find(d => d.id === documentId);
            if (document) {
                // Simular download
                const blob = new Blob([`Conteúdo do documento ${documentId}`], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${document.id}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
                
                BizFlow.showSuccess('Download iniciado!');
            }
            
        } catch (error) {
            BizFlow.showError('Erro ao baixar documento: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async cancelDocument(documentId) {
        const document = this.documents.find(d => d.id === documentId);
        if (!document) return;

        const confirmCancel = confirm(`Tem certeza que deseja cancelar o documento "${document.id}"?`);
        if (!confirmCancel) return;

        try {
            this.showLoading('Cancelando documento...');
            
            await BizFlow.ApiService.updateDocumentStatus(documentId, 'cancelled');
            await this.loadDocuments();
            
            BizFlow.showSuccess('Documento cancelado com sucesso!');
            
        } catch (error) {
            BizFlow.showError('Erro ao cancelar documento: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    handleDocumentSearch(query) {
        if (!query.trim()) {
            this.renderDocumentsTable();
            return;
        }

        const searchTerm = query.toLowerCase();
        const filtered = this.documents.filter(document =>
            document.id.toLowerCase().includes(searchTerm) ||
            this.getDocumentTypeName(document.type).toLowerCase().includes(searchTerm) ||
            this.getCustomerName(document.customerId).toLowerCase().includes(searchTerm) ||
            document.description.toLowerCase().includes(searchTerm)
        );

        this.renderFilteredDocuments(filtered);
    }

    renderFilteredDocuments(filteredDocuments) {
        const tbody = document.getElementById('documents-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        filteredDocuments.forEach(document => {
            const row = this.createDocumentRow(document);
            tbody.appendChild(row);
        });
    }

    updateApprovalBadge() {
        const badge = document.querySelector('.nav-link[data-page="documents"] .approval-badge');
        if (badge) {
            badge.remove();
        }

        if (this.pendingApprovals.length > 0) {
            const navLink = document.querySelector('.nav-link[data-page="documents"]');
            if (navLink) {
                const newBadge = document.createElement('span');
                newBadge.className = 'approval-badge';
                newBadge.textContent = this.pendingApprovals.length;
                newBadge.style.cssText = `
                    background: var(--danger);
                    color: white;
                    border-radius: 50%;
                    padding: 2px 6px;
                    font-size: 0.7rem;
                    margin-left: 5px;
                `;
                navLink.appendChild(newBadge);
            }
        }
    }

    exportDocuments() {
        try {
            const csvContent = this.generateDocumentsCSV();
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `documentos_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            BizFlow.showSuccess('Documentos exportados com sucesso!');
            
        } catch (error) {
            BizFlow.showError('Erro ao exportar documentos: ' + error.message);
        }
    }

    generateDocumentsCSV() {
        const headers = ['ID', 'Tipo', 'Cliente', 'Data', 'Valor', 'Status', 'Requer Aprovação', 'Descrição'];
        const rows = this.documents.map(document => [
            document.id,
            this.getDocumentTypeName(document.type),
            this.getCustomerName(document.customerId),
            new Date(document.date).toLocaleDateString('pt-BR'),
            document.amount,
            this.getStatusText(document.status),
            document.requiresApproval ? 'Sim' : 'Não',
            document.description
        ]);

        return [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
    }

    showCustomModal(title, content) {
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
                    <button class="btn btn-primary" onclick="this.closest('.modal').remove()">Fechar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
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

// Inicializar quando a página de documentos for carregada
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('documents-page')) {
        window.DocumentManager = new DocumentManager();
    }
});

// Adicionar ao objeto global BizFlow
if (window.BizFlow) {
    window.BizFlow.DocumentManager = DocumentManager;
}
