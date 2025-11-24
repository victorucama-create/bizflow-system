# BizFlow - Sistema de Gestão Empresarial

Sistema completo de gestão empresarial com PDV, controle de estoque, finanças e documentos.

## 🚀 Funcionalidades

- **Dashboard** com métricas em tempo real
- **Ponto de Venda (PDV)** integrado
- **Gestão de Produtos** e estoque
- **Controle de Clientes**
- **Gestão Financeira**
- **Documentos** e assinaturas digitais

## 🛠️ Tecnologias

### Backend
- Node.js + Express
- PostgreSQL
- JWT Authentication
- bcryptjs

### Frontend
- React 18
- React Router
- Context API
- Axios
- Styled Components

## 📦 Instalação

### Pré-requisitos
- Node.js 16+
- PostgreSQL

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Configure suas variáveis de ambiente no .env
npm run migrate
npm start
