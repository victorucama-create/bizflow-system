import React from 'react';

const Documents = () => {
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Gestão de Documentos</h1>
        <div>
          <button className="btn btn-light">
            <i className="fas fa-download"></i> Exportar
          </button>
          <button className="btn btn-primary">
            <i className="fas fa-plus"></i> Novo Documento
          </button>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Tipo</th>
              <th>Cliente/Fornecedor</th>
              <th>Data</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                Módulo de Documentos em Desenvolvimento
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Documents;
