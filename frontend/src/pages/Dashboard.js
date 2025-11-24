import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { toast } from 'react-toastify';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await api.getDashboardData();
      setDashboardData(response.data);
    } catch (error) {
      toast.error('Erro ao carregar dados do dashboard');
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
        </div>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p>Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <div>
          <button className="btn btn-light" onClick={loadDashboardData}>
            <i className="fas fa-sync"></i> Atualizar
          </button>
        </div>
      </div>

      <div className="dashboard-cards">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Vendas Hoje</div>
            <div className="card-icon sales">
              <i className="fas fa-shopping-cart"></i>
            </div>
          </div>
          <div className="card-value">
            {formatCurrency(dashboardData?.todaySales || 0)}
          </div>
          <div className="card-change positive">
            <i className="fas fa-arrow-up"></i> Hoje
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Clientes</div>
            <div className="card-icon customers">
              <i className="fas fa-users"></i>
            </div>
          </div>
          <div className="card-value">{dashboardData?.totalCustomers || 0}</div>
          <div className="card-change positive">
            <i className="fas fa-arrow-up"></i> Total
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Produtos</div>
            <div className="card-icon products">
              <i className="fas fa-box-open"></i>
            </div>
          </div>
          <div className="card-value">{dashboardData?.totalProducts || 0}</div>
          <div className="card-change positive">
            <i className="fas fa-arrow-up"></i> Cadastrados
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Receita Mensal</div>
            <div className="card-icon revenue">
              <i className="fas fa-dollar-sign"></i>
            </div>
          </div>
          <div className="card-value">
            {formatCurrency(dashboardData?.monthlyRevenue || 0)}
          </div>
          <div className="card-change positive">
            <i className="fas fa-arrow-up"></i> Este mês
          </div>
        </div>
      </div>

      <div className="table-container">
        <h3 style={{ padding: '15px', margin: 0 }}>Vendas Recentes</h3>
        <table>
          <thead>
            <tr>
              <th>ID Venda</th>
              <th>Cliente</th>
              <th>Data</th>
              <th>Valor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {dashboardData?.recentSales?.map(sale => (
              <tr key={sale.id}>
                <td>#{sale.id.toString().padStart(6, '0')}</td>
                <td>{sale.customer_name || 'Cliente não identificado'}</td>
                <td>{new Date(sale.created_at).toLocaleDateString('pt-BR')}</td>
                <td>{formatCurrency(sale.total)}</td>
                <td>
                  <span className="badge badge-success">Concluída</span>
                </td>
              </tr>
            ))}
            {(!dashboardData?.recentSales || dashboardData.recentSales.length === 0) && (
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

export default Dashboard;
