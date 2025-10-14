FROM node:20-bullseye

# Metadados
LABEL maintainer="Anderson Nascimento"
LABEL description="MCP DANFE Downloader Server com xvfb"
LABEL version="1.0.0"

# Instalar xvfb e dependências do Playwright
RUN apt-get update && apt-get install -y \
    # xvfb para display virtual
    xvfb \
    # Dependências do Chromium
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgtk-3-0 \
    # Ferramentas úteis
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libnss3-dev \
    libxss1 \
    && rm -rf /var/lib/apt/lists/*

# Criar usuário não-root para segurança
RUN groupadd -r danfe && useradd -r -g danfe -G audio,video danfe \
    && mkdir -p /home/danfe/Downloads \
    && chown -R danfe:danfe /home/danfe

# Criar diretório da aplicação
WORKDIR /app

# Copiar apenas package files primeiro (cache Docker)
COPY --chown=danfe:danfe package*.json ./

# Instalar dependências de produção
RUN npm ci --only=production

# Instalar Playwright Chromium
RUN npx playwright install chromium --with-deps

# Copiar código fonte
COPY --chown=danfe:danfe . .

# Compilar TypeScript
RUN npm run build

# Criar diretório de downloads com permissões corretas
RUN mkdir -p downloads && chown -R danfe:danfe downloads

# Criar diretório de logs
RUN mkdir -p /var/log/danfe-downloader && chown -R danfe:danfe /var/log/danfe-downloader

# Mudar para usuário não-root
USER danfe

# Variáveis de ambiente
ENV NODE_ENV=production
ENV DISPLAY=:99

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('OK')" || exit 1

# Volume para downloads
VOLUME ["/app/downloads"]

# Comando de inicialização com xvfb
CMD ["xvfb-run", "-a", "--server-args=-screen 0 1920x1080x24", "node", "dist/index.js"]
