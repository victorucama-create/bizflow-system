import React from 'react';
import { useAuth } from '../services/AuthContext';

const Header = ({ onLogout, onToggleSidebar }) => {
  const { user } = useAuth();

  return (
    <header className="app-header">
      <div className="container">
        <div className="header-content">
          <div className="header-left">
            <button className="sidebar-toggle" onClick={onToggleSidebar}>
              <i className="fas fa-bars"></i>
            </button>
            <div className="logo">
              <i className="fas fa-cash-register"></i>
              <span>BizFlow</span>
            </div>
          </div>
          
          <div className="header-right">
            <div className="user-menu">
              <div className="user-avatar">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <span className="user-name">{user?.name}</span>
              <button className="btn btn-light btn-sm" onClick={onLogout}>
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
