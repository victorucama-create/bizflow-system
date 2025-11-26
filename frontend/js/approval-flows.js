/**
 * Sistema de Fluxos de Aprovação - BizFlow
 * Gerencia workflows de aprovação para documentos e transações
 */

class ApprovalFlowManager {
    constructor() {
        this.workflows = [];
        this.pendingApprovals = [];
        this.approvalHistory = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadWorkflows();
        this.loadPendingApprovals();
    }

    setupEventListeners() {
        // Listeners para ações de aprovação
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-approve]')) {
                const documentId = e.target.getAttribute('data-approve');
                this.handleApprove(documentId);
            }
            
            if (e.target.matches('[data-reject]')) {
                const documentId = e.target.getAttribute('data-reject');
                this.showRejectModal(documentId);
            }
            
            if (e.target.matches('[data-view-flow]')) {
                const documentId = e.target.getAttribute('data-view-flow');
                this.viewApprovalFlow(documentId);
            }
        });
        
        // Filtros de aprovação
        const filterSelect = document.getElementById('approval-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => this.filterApprovals(e.target.value));
        }
    }

    async loadWorkflows() {
        try {
            // Carregar workflows definidos
            // Em produção, isso viria da API
            this.workflows = [
                {
                    id: 1,
                    name: 'Fluxo Padrão de Compras',
                    description: 'Aprovação para ordens de compra acima de R$ 1.000',
                    steps: [
                        { role: 'manager', order: 1, required: true },
                        { role: 'director', order: 2, required: false },
                        { role: 'finance', order: 3, required: true }
                    ],
                    conditions: {
                        minAmount: 1000,
                        documentTypes: ['purchase-order']
                    }
                },
                {
                    id: 2,
                    name: 'Fluxo de Contratos',
                    description: 'Aprovação para todos os contratos',
                    steps: [
                        { role: 'legal', order: 1, required: true },
                        { role: 'director', order: 2, required: true }
                    ],
                    conditions: {
                        documentTypes: ['contract']
                    }
                }
            ];
            
        } catch (error) {
            console.error('Erro ao carregar workflows:', error);
        }
    }

    async loadPendingApprovals() {
        try {
            // Buscar documentos pendentes de aprovação
            const response = await BizFlow.ApiService.getDocuments({ status: 'pending' });
            this.pendingApprovals = response.data.documents.filter(doc => 
                doc.requiresApproval && this.canUserApprove(doc)
            );
            
            this.renderPendingApprovals();
            this.updateApprovalBadge();
            
        } catch (error) {
            BizFlow.showError('Erro ao carregar aprovações pendentes: ' + error.message);
        }
    }

    canUserApprove(document) {
        const user = BizFlow.state.currentUser;
        if (!user) return false;
        
        // Lógica de permissão baseada em role
        // Em produção, isso seria mais complexo
        const userRole = user.role;
        const documentType = document.type;
        const amount = document.amount;
        
        // Exemplo simples de lógica de aprovação
        if (userRole === 'admin') return true;
        if (userRole === 'manager' && amount <= 5000) return true;
        if (userRole === 'director') return true;
        
        return false;
    }

    renderPendingApprovals() {
        const container = document.getElementById('pending-approvals-container');
        if (!container) return;

        if (this.pendingApprovals.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle fa-3x"></i>
                    <h3>Nenhuma aprovação pendente</h3>
                    <p>Todos os documentos foram revisados e aprovados.</p>
                </div>
            `;
            return;
        }

        let html = '';
        
        this.pendingApprovals.forEach(document => {
            const workflow = this.getWorkflowForDocument(document);
            const currentStep = this.getCurrentApprovalStep(document, workflow);
            
            html += `
                <div class="approval-item card" data-document-id="${document.id}">
                    <div class="card-header">
                        <div class="document-info">
                            <h4>${document.id} - ${BizFlow.DocumentManager.getDocumentTypeName(document.type)}</h4>
                            <p class="text-muted">${BizFlow.SecurityUtils.sanitize(document.description)}</p>
                        </div>
                        <div class="document-amount">
                            <strong>R$ ${document.amount.toFixed(2)}</strong>
                        </div>
                    </div>
                    
                    <div class="card-body">
                        <div class="approval-flow">
                            <div class="flow-info">
                                <div class="flow-step">
                                    <span class="step-label">Próxima etapa:</span>
                                    <span class="step-role">${this.getRoleName(currentStep.role)}</span>
                                </div>
                                <div class="flow-progress">
                                    <div class="progress">
                                        <div class="progress-bar" style="width: ${this.getApprovalProgress(document, workflow)}%"></div>
                                    </div>
                                    <small>${this.getApprovalProgress(document, workflow)}% completo</small>
                                </div>
                            </div>
                            
                            <div class="approval-actions">
                                <button class="btn btn-success" data-approve="${document.id}">
                                    <i class="fas fa-check"></i> Aprovar
                                </button>
                                <button class="btn btn-danger" data-reject="${document.id}">
                                    <i class="fas fa-times"></i> Rejeitar
                                </button>
                                <button class="btn btn-light" data-view-flow="${document.id}">
                                    <i class="fas fa-info-circle"></i> Detalhes
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card-footer">
                        <small class="text-muted">
                            Criado em: ${new Date(document.date).toLocaleDateString('pt-BR')}
                            ${document.dueDate ? ` • Vence em: ${new Date(document.dueDate).toLocaleDateString('pt-BR')}` : ''}
                        </small>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    getWorkflowForDocument(document) {
        return this.workflows.find(workflow => 
            workflow.conditions.documentTypes.includes(document.type) &&
            (!workflow.conditions.minAmount || document.amount >= workflow.conditions.minAmount)
        ) || this.getDefaultWorkflow();
    }

    getDefaultWorkflow() {
        return {
            id: 0,
            name: 'Fluxo Padrão',
            steps: [
                { role: 'manager', order: 1, required: true }
            ]
        };
    }

    getCurrentApprovalStep(document, workflow) {
        // Determinar qual é o próximo passo no workflow
        // Em produção, isso consideraria o histórico de aprovações
        const approvedSteps = document.approvalHistory || [];
        const nextStep = workflow.steps.find(step => 
            !approvedSteps.some(approval => approval.step === step.order)
        );
        
        return nextStep || workflow.steps[workflow.steps.length - 1];
    }

    getApprovalProgress(document, workflow) {
        const approvedSteps = document.approvalHistory?.length || 0;
        const totalSteps = workflow.steps.length;
        return (approvedSteps / totalSteps) * 100;
    }

    getRoleName(role) {
        const roles = {
            'manager': 'Gerente',
            'director': 'Diretor',
            'finance': 'Financeiro',
            'legal': 'Jurídico',
            'admin': 'Administrador'
        };
        return roles[role] || role;
    }

    async handleApprove(documentId) {
        const document = this.pendingApprovals.find(d => d.id === documentId);
        if (!document) return;

        try {
            this.showLoading('Processando aprovação...');
            
            const approvalData = {
                documentId: documentId,
                action: 'approve',
                comments: '',
                timestamp: new Date().toISOString(),
                approvedBy: BizFlow.state.currentUser.name
            };

            await BizFlow.ApiService.updateDocumentStatus(documentId, 'approved', approvalData);
            
            // Recarregar lista
            await this.loadPendingApprovals();
            
            BizFlow.showSuccess('Documento aprovado com sucesso!');
            
        } catch (error) {
            BizFlow.showError('Erro ao aprovar documento: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    showRejectModal(documentId) {
        const document = this.pendingApprovals.find(d => d.id === documentId);
        if (!document) return;

        const modalHTML = `
            <div class="form-group">
                <label for="rejection-reason">Motivo da Rejeição</label>
                <textarea 
                    id="rejection-reason" 
                    class="form-control" 
                    rows="4" 
                    placeholder="Descreva o motivo da rejeição..."
                    required
                ></textarea>
            </div>
        `;

        this.showCustomModal('Rejeitar Documento', modalHTML, async () => {
            await this.handleReject(documentId);
        });
    }

    async handleReject(documentId) {
        const reason = document.getElementById('rejection-reason').value;
        
        if (!reason.trim()) {
            BizFlow.showError('Por favor, informe o motivo da rejeição.');
            return;
        }

        try {
            this.showLoading('Processando rejeição...');
            
            const rejectionData = {
                documentId: documentId,
                action: 'reject',
                comments: BizFlow.SecurityUtils.sanitize(reason),
                timestamp: new Date().toISOString(),
                rejectedBy: BizFlow.state.currentUser.name
            };

            await BizFlow.ApiService.updateDocumentStatus(documentId, 'rejected', rejectionData);
            
            // Recarregar lista
            await this.loadPendingApprovals();
            
            BizFlow.showSuccess('Documento rejeitado com sucesso!');
            
        } catch (error) {
            BizFlow.showError('Erro ao rejeitar documento: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async viewApprovalFlow(documentId) {
        try {
            const document = this.pendingApprovals.find(d => d.id === documentId);
            if (!document) return;

            const workflow = this.getWorkflowForDocument(document);
            const approvalHistory = document.approvalHistory || [];
            
            this.showApprovalFlowModal(document, workflow, approvalHistory);
            
        } catch (error) {
            BizFlow.showError('Erro ao carregar fluxo de aprovação: ' + error.message);
        }
    }

    showApprovalFlowModal(document, workflow, approvalHistory) {
        let stepsHTML = '';
        
        workflow.steps.forEach((step, index) => {
            const approval = approvalHistory.find(a => a.step === step.order);
            const isCompleted = !!approval;
            const isCurrent = index === approvalHistory.length;
            
            stepsHTML += `
                <div class="approval-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}">
                    <div class="step-number">${index + 1}</div>
                    <div class="step-info">
                        <div class="step-role">${this.getRoleName(step.role)}</div>
                        <div class="step-status">
                            ${isCompleted ? 
                                `<span class="text-success"><i class="fas fa-check"></i> Aprovado por ${approval.approvedBy}</span>` :
                                isCurrent ?
                                '<span class="text-primary"><i class="fas fa-clock"></i> Aguardando aprovação</span>' :
                                '<span class="text-muted"><i class="fas fa-clock"></i> Pendente</span>'
                            }
                        </div>
                        ${approval?.comments ? `
                        <div class="step-comments">
                            <small>Comentário: ${BizFlow.SecurityUtils.sanitize(approval.comments)}</small>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        const modalHTML = `
            <div class="approval-flow-details">
                <div class="document-summary">
                    <h4>${document.id} - ${BizFlow.DocumentManager.getDocumentTypeName(document.type)}</h4>
                    <p><strong>Valor:</strong> R$ ${document.amount.toFixed(2)}</p>
                    <p><strong>Descrição:</strong> ${BizFlow.SecurityUtils.sanitize(document.description)}</p>
                </div>
                
                <div class="workflow-info">
                    <h5>Fluxo de Aprovação: ${workflow.name}</h5>
                    <p class="text-muted">${workflow.description}</p>
                </div>
                
                <div class="approval-steps">
                    ${stepsHTML}
                </div>
            </div>
        `;

        this.showCustomModal('Fluxo de Aprovação', modalHTML);
    }

    updateApprovalBadge() {
        // Atualizar badge de notificação
        const badge = document.querySelector('[data-page="documents"] .approval-badge');
        if (badge) {
            badge.textContent = this.pendingApprovals.length;
            badge.style.display = this.pendingApprovals.length > 0 ? 'flex' : 'none';
        }
    }

    filterApprovals(filter) {
        let filtered = this.pendingApprovals;
        
        switch (filter) {
            case 'high-value':
                filtered = filtered.filter(doc => doc.amount >= 5000);
                break;
            case 'urgent':
                const today = new Date();
                const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
                filtered = filtered.filter(doc => 
                    doc.dueDate && new Date(doc.dueDate) <= threeDaysFromNow
                );
                break;
            case 'my-approval':
                // Filtrar apenas documentos que o usuário atual pode aprovar
                filtered = filtered.filter(doc => this.canUserApprove(doc));
                break;
        }
        
        this.renderFilteredApprovals(filtered);
    }

    renderFilteredApprovals(filteredApprovals) {
        const container = document.getElementById('pending-approvals-container');
        if (!container) return;

        // Reutilizar a lógica de renderização com a lista filtrada
        const tempApprovals = this.pendingApprovals;
        this.pendingApprovals = filteredApprovals;
        this.renderPendingApprovals();
        this.pendingApprovals = tempApprovals;
    }

    async createWorkflow(workflowData) {
        try {
            // Em produção, isso chamaria a API
            const newWorkflow = {
                id: Date.now(),
                ...workflowData,
                createdAt: new Date().toISOString(),
                createdBy: BizFlow.state.currentUser.name
            };
            
            this.workflows.push(newWorkflow);
            BizFlow.showSuccess('Workflow criado com sucesso!');
            
            return newWorkflow;
            
        } catch (error) {
            BizFlow.showError('Erro ao criar workflow: ' + error.message);
            throw error;
        }
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

// Inicializar quando a aplicação carregar
document.addEventListener('DOMContentLoaded', () => {
    window.ApprovalFlowManager = new ApprovalFlowManager();
});

// Adicionar ao objeto global BizFlow
if (window.BizFlow) {
    window.BizFlow.ApprovalFlowManager = ApprovalFlowManager;
}
