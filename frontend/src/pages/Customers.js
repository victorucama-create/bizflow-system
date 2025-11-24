import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { toast } from 'react-toastify';

const Customers = () => {
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await api.getCustomers();
      setCustomers(response.data);
    } catch (error) {
      toast.error('Erro ao carregar clientes');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Gestão de Clientes</h1>
        <div>
          <button className="btn btn-light">
            <i className="fas fa-download"></i> Exportar
          </button>
          <button className="btn btn-primary">
            <i className="fas fa-plus"></i> Adicionar Cliente
          </button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Email</th>
              <th>Telefone</th>
              <th>Documento</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(customer => (
              <tr key={customer.id}>
                <td>#{customer.id.toString().padStart(4, '0')}</td>
                <td>{customer.name}</td>
                <td>{customer.email}</td>
                <td>{customer.phone}</td>
                <td>{customer.document}</td>
                <td>
                  <button className="btn btn-light btn-sm">
                    <i className="fas fa-edit"></i>
                  </button>
                  <button className="btn btn-light btn-sm">
                    <i className="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                  Nenhum cliente cadastrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Customers;
