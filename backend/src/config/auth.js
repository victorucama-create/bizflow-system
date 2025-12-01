module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'bizflow-super-secret-key-change-in-production',
  jwtExpiration: process.env.JWT_EXPIRATION || '24h',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'bizflow-refresh-super-secret-key-change-in-production',
  jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  
  // Configurações de senha
  bcryptRounds: 10,
  
  // Roles/permissões
  roles: {
    ADMIN: 'admin',
    MANAGER: 'manager',
    USER: 'user',
    CASHIER: 'cashier'
  },
  
  // Permissões por role
  permissions: {
    admin: ['read', 'write', 'delete', 'manage_users', 'manage_settings'],
    manager: ['read', 'write', 'manage_inventory', 'view_reports'],
    user: ['read', 'write'],
    cashier: ['read', 'process_sales']
  }
};
