#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧪 TESTE HEADLESS - SEM ABRIR NAVEGADOR              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

CHAVE="35241145070190000232550010006198721341979067"
EXPECTED_FILE="downloads/NFE-$CHAVE.xml"

echo "📋 Configuração:"
echo "   Chave: $CHAVE"
echo "   Modo: HEADLESS (xvfb - display virtual)"
echo "   Navegador: NÃO será aberto"
echo ""

# Verificar xvfb
if ! command -v xvfb-run &> /dev/null; then
    echo "❌ xvfb não está instalado!"
    echo "   Execute: sudo apt-get install xvfb"
    exit 1
fi

# Verificar build
if [ ! -f "dist/danfe-downloader-final.js" ]; then
    echo "❌ Build não encontrado!"
    echo "   Execute: npm run build"
    exit 1
fi

echo "═══════════════════════════════════════════════════════════"
echo "🚀 INICIANDO TESTE HEADLESS"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Remover XML anterior se existir
rm -f "$EXPECTED_FILE"

# Criar teste Node.js inline no diretório do projeto
cat > test-headless-inline.mjs << 'EOFJS'
import { DanfeDownloaderFinal } from './dist/danfe-downloader-final.js';

const chaveAcesso = process.argv[2];

console.log('🌐 Inicializando downloader (headless)...');

const downloader = new DanfeDownloaderFinal();
const result = await downloader.downloadDanfeXml(chaveAcesso);

if (result.success) {
    console.log(`✅ Download concluído: ${result.fileName}`);
    console.log(`📊 Tamanho: ${result.size} bytes`);
    process.exit(0);
} else {
    console.error(`❌ Erro: ${result.error}`);
    process.exit(1);
}
EOFJS

# Executar com xvfb (SEM abrir navegador visível)
echo "💻 Executando com xvfb (display virtual)..."
echo "   (O navegador NÃO será visível)"
echo ""

xvfb-run -a --server-args="-screen 0 1920x1080x24" node test-headless-inline.mjs "$CHAVE"

EXIT_CODE=$?

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📊 RESULTADO"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ $EXIT_CODE -eq 0 ] && [ -f "$EXPECTED_FILE" ]; then
    SIZE=$(du -h "$EXPECTED_FILE" | cut -f1)
    
    echo "✅ SUCESSO! XML baixado SEM abrir navegador"
    echo ""
    echo "   📄 Arquivo: $(basename $EXPECTED_FILE)"
    echo "   📊 Tamanho: $SIZE"
    echo "   📁 Local: downloads/"
    echo ""
    
    # Validar XML
    if grep -q "<?xml" "$EXPECTED_FILE" && grep -q "NFe" "$EXPECTED_FILE"; then
        echo "   ✓ XML válido"
    fi
    
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "✅ TESTE HEADLESS CONCLUÍDO COM SUCESSO!"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "💡 Perfeito para agentes de IA!"
    echo "   • Navegador não foi aberto"
    echo "   • Display virtual usado (xvfb)"
    echo "   • Cloudflare contornado"
    echo ""
    
    # Limpar arquivo temporário
    rm -f test-headless-inline.mjs
    
    exit 0
else
    echo "❌ Falha no download"
    echo ""
    
    if [ ! -f "$EXPECTED_FILE" ]; then
        echo "   Arquivo não encontrado: $EXPECTED_FILE"
    fi
    
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "❌ TESTE FALHOU"
    echo "═══════════════════════════════════════════════════════════"
    
    # Limpar arquivo temporário
    rm -f test-headless-inline.mjs
    
    exit 1
fi
