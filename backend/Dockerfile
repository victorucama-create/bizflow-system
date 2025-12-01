# ====================
# STAGE 1: Dependencies
# ====================
FROM node:18-alpine AS deps

WORKDIR /app

# Instalar dependências de build
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssl-dev

# Copiar apenas os arquivos necessários para instalação
COPY package.json package-lock.json* ./

# Instalar dependências de produção
RUN npm ci --only=production --ignore-scripts

# ====================
# STAGE 2: Builder
# ====================
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar node_modules da stage deps
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fonte
COPY . .

# Verificar e limpar arquivos desnecessários
RUN rm -rf \
    node_modules/.cache \
    *.log \
    *.md \
    .gitignore \
    .eslintrc.js \
    .prettierrc \
    jest.config.js \
    && find . -name "*.test.js" -delete \
    && find . -name "*.spec.js" -delete \
    && find . -name "__tests__" -type d -exec rm -rf {} +

# ====================
# STAGE 3: Production
# ====================
FROM node:18-alpine

# Metadados
LABEL maintainer="BizFlow Team <suporte@bizflow.com>"
LABEL version="1.0.0"
LABEL description="BizFlow Backend API"

# Argumentos
ARG NODE_ENV=production
ARG PORT=3000

# Variáveis de ambiente
ENV NODE_ENV=${NODE_ENV} \
    PORT=${PORT} \
    TZ=America/Sao_Paulo \
    NODE_OPTIONS="--max-old-space-size=512 --enable-source-maps" \
    NPM_CONFIG_PRODUCTION=true \
    NPM_CONFIG_LOGLEVEL=error \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false

WORKDIR /app

# Instalar curl para health checks e tzdata para timezone
RUN apk add --no-cache \
    tzdata \
    curl \
    && cp /usr/share/zoneinfo/America/Sao_Paulo /etc/localtime \
    && echo "America/Sao_Paulo" > /etc/timezone \
    && apk del tzdata \
    && rm -rf /var/cache/apk/*

# Criar usuário não-root com permissões específicas
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001 \
    && mkdir -p /app/uploads /app/logs /app/temp \
    && chown -R nodejs:nodejs /app

# Copiar apenas os arquivos necessários
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/src ./src
COPY --from=builder --chown=nodejs:nodejs /app/server.js ./
COPY --from=builder --chown=nodejs:nodejs /app/.env.example ./
COPY --from=builder --chown=nodejs:nodejs /app/migrations ./migrations
COPY --from=builder --chown=nodejs:nodejs /app/seeds ./seeds

# Configurar permissões
RUN chmod -R 755 /app/src \
    && chmod 644 /app/.env.example \
    && chown -R nodejs:nodejs /app/uploads /app/logs /app/temp

# Mudar para usuário não-root
USER nodejs

# Verificar estrutura final
RUN echo "✅ Estrutura final do projeto:" && ls -la && \
    echo "✅ Tamanho do node_modules:" && du -sh node_modules/ && \
    echo "✅ Versão do Node.js:" && node --version && \
    echo "✅ Versão do NPM:" && npm --version

# Expor porta
EXPOSE ${PORT}

# Health check avançado
HEALTHCHECK --interval=30s \
            --timeout=10s \
            --start-period=40s \
            --retries=3 \
            CMD curl -f http://localhost:${PORT}/health || \
                curl -f http://localhost:${PORT}/live || \
                exit 1

# Labels para monitoramento
LABEL healthcheck.interval="30s"
LABEL healthcheck.timeout="10s"
LABEL healthcheck.retries="3"

# Comando de inicialização com tratamento de erros
CMD ["sh", "-c", "echo '🚀 Iniciando BizFlow Backend...' && \
     echo '📅 Timezone: $TZ' && \
     echo '🌍 Ambiente: $NODE_ENV' && \
     echo '🔧 Node Options: $NODE_OPTIONS' && \
     node server.js"]
