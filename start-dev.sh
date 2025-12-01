#!/bin/bash

echo "🚀 Iniciando ambiente de desenvolvimento BizFlow..."

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado!"
    exit 1
fi

# Verificar se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose não está instalado!"
    exit 1
fi

# Criar arquivo .env se não existir
if [ ! -f .env ]; then
    echo "📝 Criando arquivo .env..."
    cp .env.example .env
    echo "✅ Arquivo .env criado. Configure as variáveis antes de continuar."
fi

# Iniciar containers
echo "🐳 Iniciando containers Docker..."
docker-compose up -d

# Aguardar serviços inicializarem
echo "⏳ Aguardando inicialização dos serviços..."
sleep 10

# Mostrar status
echo "📊 Status dos containers:"
docker-compose ps

# Mostrar URLs
echo ""
echo "🌐 URLs do ambiente:"
echo "   Backend API:      http://localhost:3000"
echo "   API Docs:         http://localhost:3000/api-docs"
echo "   Health Check:     http://localhost:3000/health"
echo "   pgAdmin:          http://localhost:5050"
echo "   Redis Commander:  http://localhost:8081"
echo "   Mongo Express:    http://localhost:8082"
echo "   Adminer:          http://localhost:8080"
echo "   MailHog UI:       http://localhost:8025"
echo "   Traefik Dashboard: http://localhost:8088"
echo "   Prometheus:       http://localhost:9090"
echo "   Grafana:          http://localhost:3001"
echo "   Jaeger UI:        http://localhost:16686"
echo "   VS Code Server:   http://localhost:8443"
echo ""
echo "🔑 Credenciais padrão:"
echo "   PostgreSQL: bizflow_dev / bizflow_dev123"
echo "   pgAdmin: admin@bizflow.com / admin123"
echo "   Redis: senha: redis_dev_pass"
echo "   MongoDB: admin / admin123"
echo "   MinIO: minioadmin / minioadmin123"
echo "   Grafana: admin / admin"
echo ""
echo "📋 Comandos úteis:"
echo "   docker-compose logs -f backend   # Ver logs do backend"
echo "   docker-compose exec backend bash # Acessar container"
echo "   docker-compose down              # Parar todos os serviços"
echo "   docker-compose restart backend   # Reiniciar apenas o backend"
