import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { toast } from 'react-toastify';

const POS = () => {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [cashAmount, setCashAmount] = useState('');

  useEffect(() => {
    loadProducts();
    loadCustomers();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await api.getProducts();
      setProducts(response.data);
    } catch (error) {
      toast.error('Erro ao carregar produtos');
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await api.getCustomers();
      setCustomers(response.data);
    } catch (error) {
      toast.error('Erro ao carregar clientes');
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    
    toast.success(`${product.name} adicionado ao carrinho`);
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
      return;
    }
    
    setCart(cart.map(item =>
      item.id === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    toast.info('Carrinho limpo');
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (!paymentMethod) {
      toast.error('Selecione um método de pagamento');
      return;
    }

    if (paymentMethod === 'cash' && parseFloat(cashAmount) < getCartTotal()) {
      toast.error('Valor em dinheiro insuficiente');
      return;
    }

    try {
      const saleData = {
        customer_id: selectedCustomer || null,
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        total: getCartTotal(),
        payment_method: paymentMethod,
        notes: ''
      };

      await api.createSale(saleData);
      
      toast.success('Venda realizada com sucesso!');
      setCart([]);
      setShowCheckout(false);
      setPaymentMethod('');
      setSelectedCustomer('');
      setCashAmount('');
    } catch (error) {
      toast.error('Erro ao finalizar venda');
    }
  };

  const getChange = () => {
    if (paymentMethod === 'cash' && cashAmount) {
      const change = parseFloat(cashAmount) - getCartTotal();
      return change > 0 ? change : 0;
    }
    return 0;
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Ponto de Venda</h1>
        <div>
          <button className="btn btn-light" onClick={clearCart}>
            <i className="fas fa-trash"></i> Limpar
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowCheckout(true)}
            disabled={cart.length === 0}
          >
            <i className="fas fa-cash-register"></i> Finalizar Venda
          </button>
        </div>
      </div>

      <div className="pos-container">
        <div className="pos-products">
          <h3>Produtos</h3>
          <div className="product-grid">
            {products.map(product => (
              <div 
                key={product.id}
                className="product-card"
                onClick={() => addToCart(product)}
              >
                <div className="product-image">
                  <i className="fas fa-box fa-2x"></i>
                </div>
                <div className="product-name">{product.name}</div>
                <div className="product-price">
                  R$ {product.price.toFixed(2)}
                </div>
                <div className="product-stock">
                  Estoque: {product.stock}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pos-cart">
          <h3>Carrinho de Vendas</h3>
          <div className="cart-items">
            {cart.map(item => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-details">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-price">
                    R$ {item.price.toFixed(2)}
                  </div>
                </div>
                <div className="cart-item-actions">
                  <button 
                    className="btn btn-light btn-sm"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    -
                  </button>
                  <input 
                    type="text" 
                    className="cart-item-quantity"
                    value={item.quantity}
                    readOnly
                  />
                  <button 
                    className="btn btn-light btn-sm"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    +
                  </button>
                  <button 
                    className="btn btn-light btn-sm"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
                Carrinho vazio
              </div>
            )}
          </div>
          
          <div className="cart-total">
            Total: R$ {getCartTotal().toFixed(2)}
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Finalizar Venda</h3>
              <button 
                className="modal-close"
                onClick={() => setShowCheckout(false)}
              >
                &times;
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Cliente</label>
                <select 
                  className="form-control"
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                >
                  <option value="">Cliente não identificado</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Método de Pagamento</label>
                <select 
                  className="form-control"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  required
                >
                  <option value="">Selecione...</option>
                  <option value="cash">Dinheiro</option>
                  <option value="card">Cartão</option>
                  <option value="pix">PIX</option>
                  <option value="transfer">Transferência</option>
                </select>
              </div>

              {paymentMethod === 'cash' && (
                <div className="form-group">
                  <label>Valor em Dinheiro</label>
                  <input
                    type="number"
                    className="form-control"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    step="0.01"
                    min={getCartTotal()}
                  />
                  {cashAmount && getChange() > 0 && (
                    <small>Troco: R$ {getChange().toFixed(2)}</small>
                  )}
                </div>
              )}

              <div className="summary">
                <h4>Resumo da Venda</h4>
                {cart.map(item => (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-details">
                      <div className="cart-item-name">{item.name}</div>
                      <div className="cart-item-price">
                        {item.quantity} x R$ {item.price.toFixed(2)}
                      </div>
                    </div>
                    <div className="cart-item-total">
                      R$ {(item.quantity * item.price).toFixed(2)}
                    </div>
                  </div>
                ))}
                <div className="cart-total">
                  Total: R$ {getCartTotal().toFixed(2)}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-light"
                onClick={() => setShowCheckout(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-success"
                onClick={handleCheckout}
              >
                Confirmar Venda
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .pos-container {
          display: flex;
          gap: 20px;
          height: 70vh;
        }

        .pos-products {
          flex: 2;
          background: white;
          border-radius: 8px;
          padding: 15px;
          overflow-y: auto;
        }

        .pos-cart {
          flex: 1;
          background: white;
          border-radius: 8px;
          padding: 15px;
          display: flex;
          flex-direction: column;
        }

        .product-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 15px;
          margin-top: 15px;
        }

        .product-card {
          border: 1px solid var(--light-gray);
          border-radius: 8px;
          padding: 15px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
        }

        .product-card:hover {
          border-color: var(--primary);
          transform: translateY(-3px);
        }

        .product-image {
          width: 80px;
          height: 80px;
          background: var(--light-gray);
          border-radius: 8px;
          margin: 0 auto 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--gray);
        }

        .product-name {
          font-weight: 500;
          margin-bottom: 5px;
        }

        .product-price {
          font-weight: 700;
          color: var(--primary);
          margin-bottom: 5px;
        }

        .product-stock {
          font-size: 0.8rem;
          color: var(--gray);
        }

        .cart-items {
          flex: 1;
          overflow-y: auto;
          margin-bottom: 15px;
        }

        .cart-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid var(--light-gray);
        }

        .cart-item-details {
          flex: 1;
        }

        .cart-item-name {
          font-weight: 500;
        }

        .cart-item-price {
          color: var(--gray);
          font-size: 0.9rem;
        }

        .cart-item-actions {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .cart-item-quantity {
          width: 40px;
          text-align: center;
          border: 1px solid var(--light-gray);
          border-radius: 4px;
          padding: 2px;
        }

        .cart-total {
          font-size: 1.2rem;
          font-weight: 700;
          text-align: right;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 2px solid var(--light-gray);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          padding: 15px 20px;
          border-bottom: 1px solid var(--light-gray);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--gray);
        }

        .modal-body {
          padding: 20px;
        }

        .modal-footer {
          padding: 15px 20px;
          border-top: 1px solid var(--light-gray);
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .summary {
          margin-top: 20px;
        }

        .summary h4 {
          margin-bottom: 15px;
        }

        @media (max-width: 768px) {
          .pos-container {
            flex-direction: column;
            height: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default POS;
