#!/usr/bin/env node

/**
 * Exemplo prático: Como determinar se uma NFe é de ENTRADA ou SAÍDA
 */

import { DanfeXmlReader } from './dist/infrastructure/xml/danfe-xml-reader.js';
import { DanfeUtils } from './dist/infrastructure/xml/danfe-utils.js';
import fs from 'fs-extra';

async function exemploTipoOperacao() {
  console.log('🔍 Determinando Tipo de Operação da NFe');
  console.log('=====================================\n');

  // Criar XML temporário para teste
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?><nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe"><protNFe><infProt><nProt>135242516625465</nProt><digVal>75PrrzDHG1ewaTOJa3BBXJDn+Zs=</digVal><dhRecbto>2024-11-06T01:05:41-03:00</dhRecbto><Id>Id135242516625465</Id><chNFe>35241145070190000232550010006198721341979067</chNFe><xMotivo>Autorizado o uso da NF-e</xMotivo><cStat>100</cStat></infProt></protNFe><NFe><infNFe Id="NFe35241145070190000232550010006198721341979067" versao="4.00"><infAdic><infCpl>Mercadorias enviadas p/ Industrialização; por conta e ordem da adquirente para :; VIDRANNO IND VIDREIRA LTDA;</infCpl></infAdic><det><nItem>1</nItem><prod><cEAN>SEM GTIN</cEAN><cProd>2050571</cProd><qCom>443.5200</qCom><cEANTrib>SEM GTIN</cEANTrib><vUnTrib>74.7531340188</vUnTrib><qTrib>443.5200</qTrib><vProd>33154.51</vProd><xProd>Vidro Cebrace Float 8.0mm |3600x2200mm |Incolor</xProd><vUnCom>74.7531340188</vUnCom><indTot>1</indTot><uTrib>M2</uTrib><NCM>70052900</NCM><uCom>M2</uCom><CFOP>6122</CFOP><CEST>1003500</CEST></prod><imposto><vTotTrib>7327.98</vTotTrib><ICMS><ICMS00><modBC>3</modBC><orig>0</orig><CST>00</CST><vBC>33154.51</vBC><vICMS>2320.82</vICMS><pICMS>7.0000</pICMS></ICMS00></ICMS><IPI><cEnq>999</cEnq><IPITrib><CST>50</CST><vBC>33154.51</vBC><pIPI>6.5000</pIPI><vIPI>2155.04</vIPI></IPITrib></IPI><COFINS><COFINSAliq><vCOFINS>2343.36</vCOFINS><CST>01</CST><vBC>30833.69</vBC><pCOFINS>7.6000</pCOFINS></COFINSAliq></COFINS><PIS><PISAliq><vPIS>508.76</vPIS><CST>01</CST><vBC>30833.69</vBC><pPIS>1.6500</pPIS></PISAliq></PIS></imposto><infAdProd>0111644302 14 PL JC1;</infAdProd></det><total><ICMSTot><vCOFINS>3515.04</vCOFINS><vBCST>0.00</vBCST><vICMSDeson>0.00</vICMSDeson><vProd>49731.78</vProd><vSeg>0</vSeg><vFCP>0.00</vFCP><vFCPST>0.00</vFCPST><vNF>52964.34</vNF><vTotTrib>10991.97</vTotTrib><vPIS>763.14</vPIS><vIPIDevol>0.00</vIPIDevol><vBC>49731.78</vBC><vST>0.00</vST><vICMS>3481.23</vICMS><vII>0.00</vII><vFCPSTRet>0.00</vFCPSTRet><vDesc>0.00</vDesc><vOutro>0.00</vOutro><vIPI>3232.56</vIPI><vFrete>0</vFrete></ICMSTot></total><cobr><fat><vOrig>52964.34</vOrig><nFat>619872-001</nFat><vDesc>0.00</vDesc><vLiq>52964.34</vLiq></fat><dup><dVenc>2024-11-07</dVenc><nDup>001</nDup><vDup>52964.34</vDup></dup></cobr><pag><detPag><vPag>52964.34</vPag><tPag>15</tPag><indPag>1</indPag></detPag></pag><entrega><cPais>1058</cPais><xLgr>QI 12 S/N LOTE 09 A 11</xLgr><nro>S/N</nro><cMun>5300108</cMun><xBairro>SETOR INDUSTRIAL (TAGUATINGA)</xBairro><CEP>72135120</CEP><fone>61983248000</fone><xNome>VIDRANNO IND VIDREIRA LTDA45524426000182</xNome><UF>DF</UF><xPais>BRASIL</xPais><xMun>BRASILIA</xMun><CNPJ>45524426000182</CNPJ><IE>0811999300110</IE><email>administrativo@vidranno.com.br</email></entrega><Id>NFe35241145070190000232550010006198721341979067</Id><ide><tpNF>1</tpNF><mod>55</mod><indPres>9</indPres><tpImp>1</tpImp><nNF>619872</nNF><cMunFG>3524402</cMunFG><procEmi>0</procEmi><finNFe>1</finNFe><dhEmi>2024-11-06T01:05:25-03:00</dhEmi><tpAmb>1</tpAmb><indFinal>0</indFinal><idDest>2</idDest><tpEmis>1</tpEmis><cDV>7</cDV><cUF>35</cUF><serie>1</serie><natOp>VND.PROD.EST.REM.IND.CNT.ORD.ADQ.S/ TRAN.EST.ADQ.</natOp><cNF>34197906</cNF><verProc>2024.10.14.1_APSPRD</verProc><indIntermed>0</indIntermed></ide><emit><xNome>CEBRACE CRISTAL PLANO LTDA</xNome><CRT>3</CRT><xFant>CEBRACE CRISTAL PLANO LTDA</xFant><CNPJ>45070190000232</CNPJ><enderEmit><fone>1236945000</fone><UF>SP</UF><xPais>BRASIL</xPais><cPais>1058</cPais><xLgr>AV DO CRISTAL</xLgr><xMun>JACAREÍ</xMun><nro>540</nro><cMun>3524402</cMun><xBairro>JARDIM DAS INDÚSTRIAS</xBairro><CEP>12311210</CEP></enderEmit><IE>392031160119</IE></emit><dest><xNome>VIDRANNO IND E ATACADO LTDA48985779000178</xNome><CNPJ>48985779000178</CNPJ><enderDest><fone>6233542020</fone><UF>DF</UF><xPais>BRASIL</xPais><cPais>1058</cPais><xLgr>QI 1 LOTES 16 A 20</xLgr><xMun>BRASILIA</xMun><nro>S/N</nro><cMun>5300108</cMun><xBairro>SETOR INDUSTRIAL (TAGUATINGA)</xBairro><CEP>72135010</CEP></enderDest><IE>0818607500151</IE><indIEDest>1</indIEDest></dest><transp><modFrete>0</modFrete><vol><pesoL>13159.272</pesoL><esp>Chapa de Vidro</esp><qVol>84</qVol><pesoB>13159.272</pesoB></vol><transporta><xNome>JULIO SIMOES 670352548435006703</xNome><UF>SP</UF><xEnder>RUA ESTACIO JOSE DO NASCIMENTO, 26</xEnder><xMun>SÃO JOSÉ DOS CAMPOS</xMun><CNPJ>52548435006703</CNPJ><IE>645468920110</IE></transporta></transp></infNFe></NFe><versao>4.00</versao></nfeProc>`;
  
  const xmlPath = './temp-nfe-test.xml';
  await fs.writeFile(xmlPath, xmlContent, 'utf-8');

  try {
    const reader = new DanfeXmlReader();
    const danfeData = await reader.readAndParse(xmlPath);

    console.log('📋 INFORMAÇÕES DA NFE:');
    console.log(`   Chave: ${danfeData.nfe.chaveAcesso}`);
    console.log(`   Número: ${danfeData.nfe.numero} / Série: ${danfeData.nfe.serie}`);
    
    // 🎯 AQUI ESTÁ A RESPOSTA PRINCIPAL
    const tipoOperacao = DanfeUtils.getTipoOperacao(danfeData.nfe.tipoNF);
    
    console.log('\n🎯 TIPO DE OPERAÇÃO:');
    console.log(`   Código: ${tipoOperacao.codigo}`);
    console.log(`   Descrição: ${tipoOperacao.descricao}`);
    console.log(`   Movimento: ${tipoOperacao.tipoMovimento}`);
    
    // Métodos utilitários para verificação rápida
    console.log('\n✅ VERIFICAÇÕES RÁPIDAS:');
    console.log(`   É entrada? ${DanfeUtils.isEntrada(danfeData.nfe.tipoNF) ? 'SIM' : 'NÃO'}`);
    console.log(`   É saída? ${DanfeUtils.isSaida(danfeData.nfe.tipoNF) ? 'SIM' : 'NÃO'}`);
    
    // Contexto adicional
    const finalidade = DanfeUtils.getFinalidade(danfeData.nfe.finalidade);
    console.log('\n📝 CONTEXTO OPERACIONAL:');
    console.log(`   Natureza: ${danfeData.nfe.naturezaOperacao}`);
    console.log(`   Finalidade: ${finalidade.descricao}`);
    console.log(`   Emitente: ${danfeData.emitente.razaoSocial}`);
    console.log(`   Destinatário: ${danfeData.destinatario.nome}`);
    
    // Exemplo prático de uso
    console.log('\n🔧 EXEMPLO DE USO NO CÓDIGO:');
    console.log('```typescript');
    console.log('if (DanfeUtils.isEntrada(danfeData.nfe.tipoNF)) {');
    console.log('  // Lógica para NFe de ENTRADA (compra, recebimento)');
    console.log('  console.log("Registrar entrada no estoque");');
    console.log('} else if (DanfeUtils.isSaida(danfeData.nfe.tipoNF)) {');
    console.log('  // Lógica para NFe de SAÍDA (venda, remessa)');
    console.log('  console.log("Registrar saída do estoque");');
    console.log('}');
    console.log('```');
    
    // Outros códigos relacionados
    console.log('\n📊 CÓDIGOS DE REFERÊNCIA:');
    console.log('   Tipo NFe:');
    console.log('     0 = ENTRADA (compras, devoluções recebidas)');
    console.log('     1 = SAÍDA (vendas, remessas, devoluções enviadas)');
    console.log('   ');
    console.log('   Finalidade:');
    console.log('     1 = Normal');
    console.log('     2 = Complementar'); 
    console.log('     3 = Ajuste');
    console.log('     4 = Devolução');

  } catch (error) {
    console.error('❌ Erro ao processar XML:', error.message);
  } finally {
    // Limpar arquivo temporário
    if (await fs.pathExists(xmlPath)) {
      await fs.remove(xmlPath);
    }
  }
}

// Executar exemplo
exemploTipoOperacao().catch(console.error);