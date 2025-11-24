import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { toast } from 'react-toastify';

const Finance = () => {
  const [sales, setSales] = useState([]);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      const response = await api.getSales();
      setSales(response.data);
    } catch (error) {
      toast.error('Erro ao carregar vendas');
    }
  };

  const getTotalRevenue = () => {
    return sales.reduce((total, sale) => total + parseFloat(sale.total), 0);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Gestão Financeira</h1>
        <div>
          <button className="btn btn-light">
            <i className="fas fa-download"></i> Exportar
          </button>
          <button className="btn btn-primary">
            <i className="fas fa-plus"></i> Novo Lançamento
          </button>
        </div>
      </div>

      <div className="dashboard-cards">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Receitas do Mês</div>
            <div className="card-icon sales">
              <i className="fas fa-arrow-up"></i>
            </div>
          </div>
          <div className="card-value">R$ {getTotalRevenue().toFixed(2)}</div>
          <div className="card-change positive">
            <i className="fas fa-arrow-up"></i> Total Geral
          </div>
        </div>
        
        <div className="card">
          <div className="card-header">
            <div className="card-title">Vendas Realizadas</div>
            <div className="card-icon customers">
              <i className="fas fa-shopping-cart"></i>
            </div>
          </div>
          <div className="card-value">{sales.length}</div>
          <div className="card-change positive">
            <i className="fas fa-arrow-up"></i> Total
          </div>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID Venda</th>
              <th>Data</th>
              <th>Valor</th>
              <th>Método Pagamento</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sales.map(sale => (
              <tr key={sale.id}>
                <td>#{sale.id.toString().padStart(6, '0')}</td>
                <td>{new Date(sale.created_at).toLocaleDateString('pt-BR')}</td>
                <td>R$ {sale.total}</td>
                <td>
                  <span className="badge badge-info">
                    {sale.payment_method}
                  </span>
                </td>
                <td>
                  <span className="badge badge-success">Concluída</span>
                </td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                  Nenhuma venda encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Finance;
