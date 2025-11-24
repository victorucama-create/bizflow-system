import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar = ({ currentPath, isOpen, onClose }) => {
  const menuItems = [
    { path: '/dashboard', icon: 'fas fa-chart-line', label: 'Dashboard' },
    { path: '/pos', icon: 'fas fa-cash-register', label: 'Ponto de Venda' },
    { path: '/products', icon: 'fas fa-boxes', label: 'Produtos' },
    { path: '/customers', icon: 'fas fa-users', label: 'Clientes' },
    { path: '/finance', icon: 'fas fa-chart-pie', label: 'Financeiro' },
    { path: '/documents', icon: 'fas fa-file-contract', label: 'Documentos' },
  ];

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose}></div>}
      <div className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <h3>Menu</h3>
          <button className="sidebar-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-link ${currentPath === item.path ? 'active' : ''}`}
              onClick={onClose}
            >
              <i className={item.icon}></i>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
