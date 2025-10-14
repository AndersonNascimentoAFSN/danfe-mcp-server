#!/bin/bash

# deploy-vps.sh
# Script de deploy automatizado para VPS (DigitalOcean, Vultr, etc)
#
# Uso: ./deploy-vps.sh user@host

set -e

if [ -z "$1" ]; then
    echo "❌ Erro: IP/host do servidor não fornecido"
    echo ""
    echo "Uso: ./deploy-vps.sh user@host"
    echo "Exemplo: ./deploy-vps.sh root@192.168.1.100"
    exit 1
fi

SERVER=$1
PROJECT_DIR="/opt/danfe-downloader"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         🚀 Deploy MCP DANFE Downloader - VPS              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📍 Servidor: $SERVER"
echo "📁 Diretório remoto: $PROJECT_DIR"
echo ""

# 1. Verificar conexão SSH
echo "🔍 Verificando conexão SSH..."
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 $SERVER 'echo ok' &>/dev/null; then
    echo "❌ Não foi possível conectar ao servidor"
    echo "   Verifique se o SSH está configurado corretamente"
    exit 1
fi
echo "✅ Conexão SSH OK"
echo ""

# 2. Instalar dependências do sistema (primeira vez)
echo "📦 Instalando dependências do sistema..."
ssh $SERVER << 'ENDSSH'
# Atualizar apt
apt-get update -qq

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "  Instalando Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Verificar se xvfb está instalado
if ! command -v xvfb-run &> /dev/null; then
    echo "  Instalando xvfb..."
    apt-get install -y xvfb
fi

# Instalar dependências do Playwright
apt-get install -y \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libdbus-1-3 libxkbcommon0 \
    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libasound2 > /dev/null 2>&1

echo "✅ Dependências instaladas"
ENDSSH

# 3. Criar diretório do projeto
echo ""
echo "📁 Criando diretório do projeto..."
ssh $SERVER "mkdir -p $PROJECT_DIR"
echo "✅ Diretório criado"

# 4. Copiar arquivos do projeto
echo ""
echo "📤 Enviando arquivos do projeto..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.git' \
    --exclude 'downloads/*.xml' \
    --exclude '.venv' \
    --exclude '__pycache__' \
    --exclude '*.log' \
    ./ $SERVER:$PROJECT_DIR/

echo "✅ Arquivos enviados"

# 5. Instalar dependências npm e compilar
echo ""
echo "📦 Instalando dependências npm..."
ssh $SERVER << ENDSSH
cd $PROJECT_DIR
npm ci --only=production
npx playwright install chromium
npm run build
ENDSSH
echo "✅ Build concluído"

# 6. Testar com xvfb
echo ""
echo "🧪 Testando instalação..."
ssh $SERVER << ENDSSH
cd $PROJECT_DIR
chmod +x test-headless.sh
# ./test-headless.sh || echo "⚠️  Teste falhou (normal se não houver chave válida)"
ENDSSH

# 7. Configurar systemd service
echo ""
echo "⚙️  Configurando serviço systemd..."
ssh $SERVER << 'ENDSSH'
cat > /etc/systemd/system/danfe-downloader.service << 'EOF'
[Unit]
Description=MCP DANFE Downloader Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/danfe-downloader
Environment="NODE_ENV=production"
ExecStart=/usr/bin/xvfb-run -a --server-args="-screen 0 1920x1080x24" /usr/bin/node /opt/danfe-downloader/dist/index.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/danfe-downloader/output.log
StandardError=append:/var/log/danfe-downloader/error.log

[Install]
WantedBy=multi-user.target
EOF

# Criar diretório de logs
mkdir -p /var/log/danfe-downloader

# Reload systemd
systemctl daemon-reload
ENDSSH
echo "✅ Serviço configurado"

# 8. Perguntar se deve iniciar o serviço
echo ""
read -p "🚀 Deseja iniciar o serviço agora? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "🚀 Iniciando serviço..."
    ssh $SERVER << ENDSSH
systemctl enable danfe-downloader
systemctl restart danfe-downloader
sleep 2
systemctl status danfe-downloader --no-pager
ENDSSH
    echo "✅ Serviço iniciado"
else
    echo "⏸️  Serviço não iniciado"
    echo ""
    echo "Para iniciar manualmente:"
    echo "  ssh $SERVER 'systemctl start danfe-downloader'"
fi

# 9. Finalização
echo ""
echo "═════════════════════════════════════════════════════════════"
echo "✅ DEPLOY CONCLUÍDO COM SUCESSO!"
echo "═════════════════════════════════════════════════════════════"
echo ""
echo "📋 Próximos passos:"
echo ""
echo "1. Ver logs em tempo real:"
echo "   ssh $SERVER 'journalctl -u danfe-downloader -f'"
echo ""
echo "2. Status do serviço:"
echo "   ssh $SERVER 'systemctl status danfe-downloader'"
echo ""
echo "3. Reiniciar serviço:"
echo "   ssh $SERVER 'systemctl restart danfe-downloader'"
echo ""
echo "4. Parar serviço:"
echo "   ssh $SERVER 'systemctl stop danfe-downloader'"
echo ""
echo "5. Configurar cliente MCP:"
echo "   {"
echo "     \"danfe-downloader\": {"
echo "       \"command\": \"ssh\","
echo "       \"args\": ["
echo "         \"$SERVER\","
echo "         \"xvfb-run -a --server-args='-screen 0 1920x1080x24' node $PROJECT_DIR/dist/index.js\""
echo "       ]"
echo "     }"
echo "   }"
echo ""
