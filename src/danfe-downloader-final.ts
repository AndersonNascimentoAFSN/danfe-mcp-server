import { chromium, Browser, Page, Download } from 'playwright';
import fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

export class DanfeDownloaderFinal {
    private browser: Browser | null = null;
    private page: Page | null = null;

    /**
     * Baixa o XML da DANFE usando Playwright em modo headed (navegador visível)
     * para evitar detecção do Cloudflare
     */
    async downloadDanfeXml(accessKey: string): Promise<string> {
        try {
            console.log('🚀 Iniciando download do XML da DANFE...');
            console.log(`📄 Chave de acesso: ${accessKey}`);

            // Inicializar navegador em modo HEADED (visível) para evitar Cloudflare
            await this.initBrowser();

            if (!this.page) {
                throw new Error('Falha ao inicializar navegador');
            }

            // Navegar para o site
            console.log('\n📍 Navegando para meudanfe.com.br...');
            await this.page.goto('https://meudanfe.com.br/', { 
                waitUntil: 'networkidle',
                timeout: 60000 
            });

            // Aguardar o Cloudflare processar
            console.log('⏳ Aguardando verificação do Cloudflare...');
            await this.page.waitForTimeout(5000);

            // Preencher o campo de busca
            console.log('\n✍️  Preenchendo chave de acesso...');
            const inputSelector = '#searchTxt';
            await this.page.waitForSelector(inputSelector, { timeout: 10000 });
            await this.page.fill(inputSelector, accessKey);

            // Clicar no botão BUSCAR
            console.log('🔍 Clicando no botão BUSCAR...');
            const searchButtonSelector = '#searchBtn';
            await this.page.click(searchButtonSelector);

            // Preparar para capturar o download
            const downloadPromise = this.page.waitForEvent('download', { timeout: 120000 });

            // Aguardar resultados aparecerem
            console.log('⏳ Aguardando resultados da busca...');
            await this.page.waitForSelector('#downloadXmlBtn', { 
                state: 'visible',
                timeout: 60000 
            });

            console.log('✅ Resultados encontrados!');

            // Aguardar um pouco para garantir que a página processou completamente
            await this.page.waitForTimeout(3000);

            // Clicar no botão de download XML
            console.log('\n💾 Iniciando download do XML...');
            await this.page.click('#downloadXmlBtn');

            // Aguardar o download começar
            console.log('⏳ Aguardando download...');
            const download: Download = await downloadPromise;

            // Obter informações do download
            const suggestedFilename = download.suggestedFilename();
            console.log(`📥 Download iniciado: ${suggestedFilename}`);

            // Definir caminho para salvar o arquivo na pasta downloads do projeto
            const projectDownloadsDir = path.join(process.cwd(), 'downloads');
            await fs.ensureDir(projectDownloadsDir);
            
            const finalPath = path.join(projectDownloadsDir, suggestedFilename);

            // Salvar o arquivo
            await download.saveAs(finalPath);
            console.log(`✅ Arquivo salvo em: ${finalPath}`);

            // Validar o XML
            const isValid = await this.validateDanfeXml(finalPath);
            if (!isValid) {
                throw new Error('XML baixado não é válido');
            }

            console.log('✅ XML validado com sucesso!');

            return finalPath;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error('❌ Erro ao baixar XML:', errorMessage);
            throw error;
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Inicializa o navegador Playwright em modo headed
     */
    private async initBrowser(): Promise<void> {
        console.log('🌐 Inicializando navegador Chromium (modo visível)...');
        
        this.browser = await chromium.launch({
            headless: false, // Modo visível para evitar detecção
            slowMo: 100, // Adicionar delay entre ações para parecer mais humano
            args: [
                '--disable-blink-features=AutomationControlled', // Esconder flags de automação
                '--ignore-certificate-errors', // Ignorar erros de certificado
            ]
        });

        const context = await this.browser.newContext({
            viewport: { width: 1366, height: 768 },
            userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
            ignoreHTTPSErrors: true, // Ignorar erros HTTPS
            acceptDownloads: true // Aceitar downloads
        });

        // Remover propriedades que indicam automação
        await context.addInitScript(() => {
            // @ts-ignore
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
        });

        this.page = await context.newPage();

        // Log de requisições de rede para debug
        this.page.on('request', request => {
            if (request.url().includes('/v2/fiscal-doc/')) {
                console.log('📡 Requisição API detectada:', request.url());
            }
        });

        this.page.on('response', response => {
            if (response.url().includes('/v2/fiscal-doc/')) {
                console.log('📨 Resposta API:', response.status(), response.url());
            }
        });

        console.log('✅ Navegador inicializado');
    }

    /**
     * Valida se o arquivo XML é válido
     */
    private async validateDanfeXml(filePath: string): Promise<boolean> {
        try {
            if (!await fs.pathExists(filePath)) {
                console.error('❌ Arquivo não encontrado:', filePath);
                return false;
            }

            const content = await fs.readFile(filePath, 'utf-8');
            
            // Validações básicas
            const isXml = content.trim().startsWith('<?xml');
            const hasNFe = content.includes('<NFe') || content.includes('<nfeProc');
            
            if (!isXml) {
                console.error('❌ Arquivo não é um XML válido');
                return false;
            }

            if (!hasNFe) {
                console.error('❌ XML não contém dados de NFe');
                return false;
            }

            const fileSize = (await fs.stat(filePath)).size;
            console.log(`📊 Tamanho do arquivo: ${fileSize} bytes`);

            if (fileSize < 100) {
                console.error('❌ Arquivo XML muito pequeno');
                return false;
            }

            return true;

        } catch (error) {
            console.error('❌ Erro ao validar XML:', error);
            return false;
        }
    }

    /**
     * Limpa recursos
     */
    private async cleanup(): Promise<void> {
        try {
            if (this.page) {
                await this.page.close();
                this.page = null;
            }
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
            }
            console.log('🧹 Recursos liberados');
        } catch (error) {
            console.error('⚠️  Erro ao limpar recursos:', error);
        }
    }
}
