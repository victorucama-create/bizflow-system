// Arquivo na raiz/mongo-init.js
db = db.getSiblingDB('bizflow_dev');

// Criar usuário para aplicação
db.createUser({
  user: 'bizflow_app',
  pwd: 'app_password_123',
  roles: [
    { role: 'readWrite', db: 'bizflow_dev' },
    { role: 'dbAdmin', db: 'bizflow_dev' }
  ]
});

// Criar collections iniciais
db.createCollection('logs');
db.createCollection('notifications');
db.createCollection('analytics');

// Índices
db.logs.createIndex({ timestamp: -1 });
db.logs.createIndex({ userId: 1, timestamp: -1 });
db.notifications.createIndex({ userId: 1, read: 1, createdAt: -1 });
db.analytics.createIndex({ event: 1, timestamp: -1 });
