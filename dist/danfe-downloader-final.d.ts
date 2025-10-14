export declare class DanfeDownloaderFinal {
    private browser;
    private page;
    /**
     * Baixa o XML da DANFE usando Playwright em modo headed (navegador visível)
     * para evitar detecção do Cloudflare
     */
    downloadDanfeXml(accessKey: string): Promise<string>;
    /**
     * Inicializa o navegador Playwright em modo headed
     */
    private initBrowser;
    /**
     * Valida se o arquivo XML é válido
     */
    private validateDanfeXml;
    /**
     * Limpa recursos
     */
    private cleanup;
}
