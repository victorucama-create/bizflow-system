// Point of Sale functionality
class POSManager {
    constructor() {
        this.products = [];
        this.cart = [];
        this.selectedCustomer = null;
    }

    async loadPOSProducts() {
        try {
            showLoading('Carregando produtos...');

            const response = await ApiService.getProducts({
                status: 'active'
            });

            this.products = response.data.products.filter(product => product.stock > 0);
            this.renderProductGrid();

            hideLoading();

        } catch (error) {
            hideLoading();
            console.error('Erro ao carregar produtos POS:', error);
            showError('Erro ao carregar produtos para venda');
        }
    }

    renderProductGrid() {
        const grid = document.getElementById('pos-product-grid');
        if (!grid) return;

        grid.innerHTML = this.products.map(product => `
            <div class="product-card" data-product-id="${product._id}">
                <div class="product-image">
                    <i class="fas fa-box fa-2x"></i>
                </div>
                <div class="product-name">${SecurityUtils.sanitize(product.name)}</div>
                <div class="product-price">R$ ${product.price.toFixed(2)}</div>
                <small>Estoque: ${product.stock}</small>
            </div>
        `).join('');

        // Add event listeners
        this.attachProductEventListeners();
    }

    attachProductEventListeners() {
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const productId = e.currentTarget.getAttribute('data-product-id');
                this.addToCart(productId);
            });
        });
    }

    addToCart(productId) {
        const product = this.products.find(p => p._id === productId);
        if (!product) return;

        // Check stock
        if (product.stock <= 0) {
            showError('Produto sem estoque disponível');
            return;
        }

        // Check if product is already in cart
        const existingItem = this.cart.find(item => item.product._id === productId);
        
        if (existingItem) {
            // Check stock limit
            if (existingItem.quantity >= product.stock) {
                showError('Estoque insuficiente para este produto');
                return;
            }
            existingItem.quantity += 1;
        } else {
            this.cart.push({
                product: product,
                quantity: 1,
                unitPrice: product.price
            });
        }

        this.updateCartDisplay();
        showSuccess(`${product.name} adicionado ao carrinho!`);
    }

    updateCartDisplay() {
        this.updateCartItems();
        this.updateCartTotal();
    }

    updateCartItems() {
        const cartItems = document.getElementById('cart-items');
        if (!cartItems) return;

        cartItems.innerHTML = this.cart.map((item, index) => `
            <div class="cart-item">
                <div class="cart-item-details">
                    <div class="cart-item-name">${SecurityUtils.sanitize(item.product.name)}</div>
                    <div class="cart-item-price">R$ ${item.unitPrice.toFixed(2)}</div>
                </div>
                <div class="cart-item-actions">
                    <button class="btn btn-light btn-sm" onclick="POS.decreaseQuantity(${index})">-</button>
                    <input type="text" class="cart-item-quantity" value="${item.quantity}" readonly>
                    <button class="btn btn-light btn-sm" onclick="POS.increaseQuantity(${index})">+</button>
                    <button class="btn btn-light btn-sm" onclick="POS.removeFromCart(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    updateCartTotal() {
        const totalElement = document.getElementById('cart-total');
        if (totalElement) {
            const total = this.calculateCartTotal();
            totalElement.textContent = total.toFixed(2);
        }
    }

    calculateCartTotal() {
        return this.cart.reduce((total, item) => {
            return total + (item.unitPrice * item.quantity);
        }, 0);
    }

    increaseQuantity(index) {
        const item = this.cart[index];
        if (item.quantity < item.product.stock) {
            item.quantity += 1;
            this.updateCartDisplay();
        } else {
            showError('Estoque insuficiente para este produto');
        }
    }

    decreaseQuantity(index) {
        const item = this.cart[index];
        if (item.quantity > 1) {
            item.quantity -= 1;
            this.updateCartDisplay();
        } else {
            this.removeFromCart(index);
        }
    }

    removeFromCart(index) {
        this.cart.splice(index, 1);
        this.updateCartDisplay();
    }

    clearCart() {
        this.cart = [];
        this.updateCartDisplay();
        showSuccess('Carrinho limpo!');
    }

    async processSale() {
        if (this.cart.length === 0) {
            showError('Carrinho vazio! Adicione produtos antes de finalizar a venda.');
            return;
        }

        try {
            showLoading('Processando venda...');

            const saleData = {
                customer: this.selectedCustomer,
                items: this.cart.map(item => ({
                    productId: item.product._id,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice
                })),
                paymentMethod: document.getElementById('payment-method').value,
                paymentDetails: this.getPaymentDetails(),
                notes: document.getElementById('sale-notes')?.value || ''
            };

            // Validate payment method
            if (!saleData.paymentMethod) {
                throw new Error('Selecione um método de pagamento');
            }

            // Validate cash payment
            if (saleData.paymentMethod === 'cash') {
                const cashAmount = parseFloat(document.getElementById('cash-amount').value) || 0;
                const total = this.calculateCartTotal();
                
                if (cashAmount < total) {
                    throw new Error(`Valor em dinheiro insuficiente. Total: R$ ${total.toFixed(2)}`);
                }
            }

            const result = await ApiService.createSale(saleData);
            
            hideLoading();
            showSuccess(`Venda #${result.data.sale.saleNumber} realizada com sucesso!`);

            // Reset POS
            this.clearCart();
            this.closeCheckoutModal();
            
            // Reload products to update stock
            await this.loadPOSProducts();

        } catch (error) {
            hideLoading();
            showError('Erro ao processar venda: ' + error.message);
        }
    }

    getPaymentDetails() {
        const paymentMethod = document.getElementById('payment-method').value;
        const details = {};

        if (paymentMethod === 'cash') {
            details.cashAmount = parseFloat(document.getElementById('cash-amount').value) || 0;
            const total = this.calculateCartTotal();
            details.change = details.cashAmount - total;
        } else if (paymentMethod === 'card') {
            details.cardInstallments = parseInt(document.getElementById('card-installments').value) || 1;
        }

        return details;
    }

    openCheckoutModal() {
        if (this.cart.length === 0) {
            showError('Carrinho vazio! Adicione produtos antes de finalizar.');
            return;
        }

        this.updateCheckoutSummary();
        this.showModal('checkout-modal');
    }

    closeCheckoutModal() {
        this.hideModal('checkout-modal');
    }

    updateCheckoutSummary() {
        const summary = document.getElementById('checkout-summary');
        const total = document.getElementById('checkout-total');

        if (summary) {
            summary.innerHTML = this.cart.map(item => `
                <div class="cart-item">
                    <div class="cart-item-details">
                        <div class="cart-item-name">${SecurityUtils.sanitize(item.product.name)}</div>
                        <div class="cart-item-price">${item.quantity} x R$ ${item.unitPrice.toFixed(2)}</div>
                    </div>
                    <div class="cart-item-total">
                        R$ ${(item.quantity * item.unitPrice).toFixed(2)}
                    </div>
                </div>
            `).join('');
        }

        if (total) {
            total.textContent = this.calculateCartTotal().toFixed(2);
        }
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Payment method change handler
    handlePaymentMethodChange() {
        const method = document.getElementById('payment-method').value;
        
        // Hide all payment-specific sections
        document.getElementById('cash-payment').style.display = 'none';
        document.getElementById('card-payment').style.display = 'none';
        
        // Show relevant section
        if (method === 'cash') {
            document.getElementById('cash-payment').style.display = 'block';
        } else if (method === 'card') {
            document.getElementById('card-payment').style.display = 'block';
        }
    }

    // Cash amount change handler
    handleCashAmountChange() {
        const cashAmount = parseFloat(document.getElementById('cash-amount').value) || 0;
        const total = this.calculateCartTotal();
        
        const cashChange = document.getElementById('cash-change');
        const changeAmount = document.getElementById('change-amount');
        
        if (cashAmount >= total) {
            const change = cashAmount - total;
            changeAmount.textContent = change.toFixed(2);
            cashChange.style.display = 'block';
        } else {
            cashChange.style.display = 'none';
        }
    }
}

// Initialize POS manager
const POS = new POSManager();

// Add event listeners for POS page
document.addEventListener('DOMContentLoaded', function() {
    // Checkout button
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', function() {
            POS.openCheckoutModal();
        });
    }

    // Clear cart button
    const clearCartBtn = document.getElementById('clear-cart');
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', function() {
            POS.clearCart();
        });
    }

    // Confirm checkout button
    const confirmCheckoutBtn = document.getElementById('confirm-checkout');
    if (confirmCheckoutBtn) {
        confirmCheckoutBtn.addEventListener('click', function() {
            POS.processSale();
        });
    }
