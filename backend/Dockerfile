FROM node:18-alpine AS builder

WORKDIR /app

# Instalar dependências de build
RUN apk add --no-cache python3 make g++

# Copiar package.json
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código fonte
COPY . .

FROM node:18-alpine

WORKDIR /app

# Instalar dependências de runtime
RUN apk add --no-cache tzdata

# Configurar timezone
ENV TZ=America/Sao_Paulo

# Copiar dependências do builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/server.js ./

# Criar diretórios necessários
RUN mkdir -p uploads logs

# Configurar permissões
RUN chown -R node:node /app
USER node

# Expor porta
EXPOSE 3000

# Comando de inicialização
CMD ["node", "server.js"]
