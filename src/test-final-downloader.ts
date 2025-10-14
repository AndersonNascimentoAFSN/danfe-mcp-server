import { DanfeDownloaderFinal } from './danfe-downloader-final.js';

async function main() {
    console.log('='.repeat(60));
    console.log('🚀 TESTE DO DOWNLOADER FINAL - MODO HEADED');
    console.log('='.repeat(60));
    console.log();

    const downloader = new DanfeDownloaderFinal();
    const accessKey = '35241145070190000232550010006198721341979067';

    try {
        console.log('⚠️  ATENÇÃO: O navegador será aberto em modo visível');
        console.log('⚠️  Você verá o Chromium executando as ações');
        console.log('⚠️  NÃO feche o navegador manualmente!');
        console.log();

        const filePath = await downloader.downloadDanfeXml(accessKey);

        console.log();
        console.log('='.repeat(60));
        console.log('✅ DOWNLOAD CONCLUÍDO COM SUCESSO!');
        console.log('='.repeat(60));
        console.log(`📄 Arquivo: ${filePath}`);
        console.log();

    } catch (error) {
        console.error();
        console.error('='.repeat(60));
        console.error('❌ FALHA NO DOWNLOAD');
        console.error('='.repeat(60));
        console.error(error);
        console.error();
        process.exit(1);
    }
}

main();
