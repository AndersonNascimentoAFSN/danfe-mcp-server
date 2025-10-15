#!/usr/bin/env node

/**
 * Teste da extração completa de campos da DANFE
 */

import { DanfeXmlReader } from './dist/infrastructure/xml/danfe-xml-reader.js';
import { DanfeUtils } from './dist/infrastructure/xml/danfe-utils.js';
import fs from 'fs-extra';
import path from 'path';

async function testeExtracao() {
  console.log('🔍 Teste de Extração Completa de Campos DANFE');
  console.log('============================================\n');

  // Criar XML de teste baseado no fornecido pelo usuário
  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?><nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe"><protNFe><infProt><nProt>135242516625465</nProt><digVal>75PrrzDHG1ewaTOJa3BBXJDn+Zs=</digVal><dhRecbto>2024-11-06T01:05:41-03:00</dhRecbto><Id>Id135242516625465</Id><chNFe>35241145070190000232550010006198721341979067</chNFe><xMotivo>Autorizado o uso da NF-e</xMotivo><cStat>100</cStat></infProt></protNFe><NFe><infNFe Id="NFe35241145070190000232550010006198721341979067" versao="4.00"><infAdic><infCpl>Mercadorias enviadas p/ Industrialização; por conta e ordem da adquirente para :; VIDRANNO IND VIDREIRA LTDA; 45524426000182; QI 12 S/N LOTE 09 A 11 S/N; BRASILIA; SETOR INDUSTRIAL (TAGUATINGA); DF; CNPJ: 45.524.426/0001-82 Inscr.Estad.: 0811999300110; Emissão amaparada nos termos do Art.406,Inciso I, Alínea &quot;A&quot; do RICMS/SP; Ordem:; Remessa:; Faturamento:6101062629; JC1-JAC Float 1;FFL-Float;IN-Incolor;; Não sujeito a ST, mercadoria destinada a estabelecimento industrial,; cfe. artigo 264 do RICMS-SP;</infCpl></infAdic><det><nItem>1</nItem><prod><cEAN>SEM GTIN</cEAN><cProd>2050571</cProd><qCom>443.5200</qCom><cEANTrib>SEM GTIN</cEANTrib><vUnTrib>74.7531340188</vUnTrib><qTrib>443.5200</qTrib><vProd>33154.51</vProd><xProd>Vidro Cebrace Float 8.0mm |3600x2200mm |Incolor</xProd><vUnCom>74.7531340188</vUnCom><indTot>1</indTot><uTrib>M2</uTrib><NCM>70052900</NCM><uCom>M2</uCom><CFOP>6122</CFOP><CEST>1003500</CEST></prod><imposto><vTotTrib>7327.98</vTotTrib><ICMS><ICMS00><modBC>3</modBC><orig>0</orig><CST>00</CST><vBC>33154.51</vBC><vICMS>2320.82</vICMS><pICMS>7.0000</pICMS></ICMS00></ICMS><IPI><cEnq>999</cEnq><IPITrib><CST>50</CST><vBC>33154.51</vBC><pIPI>6.5000</pIPI><vIPI>2155.04</vIPI></IPITrib></IPI><COFINS><COFINSAliq><vCOFINS>2343.36</vCOFINS><CST>01</CST><vBC>30833.69</vBC><pCOFINS>7.6000</pCOFINS></COFINSAliq></COFINS><PIS><PISAliq><vPIS>508.76</vPIS><CST>01</CST><vBC>30833.69</vBC><pPIS>1.6500</pPIS></PISAliq></PIS></imposto><infAdProd>0111644302 14 PL JC1; 0111644318 14 PL JC1; 0111644315 14 PL JC1; 0111644319 14 PL JC1; ;</infAdProd></det><det><nItem>2</nItem><prod><cEAN>SEM GTIN</cEAN><cProd>2050572</cProd><qCom>221.7600</qCom><cEANTrib>SEM GTIN</cEANTrib><vUnTrib>74.7532016595</vUnTrib><qTrib>221.7600</qTrib><vProd>16577.27</vProd><xProd>Vidro Cebrace Float 8.0mm |3600x2200mm |Incolor</xProd><vUnCom>74.7532016595</vUnCom><indTot>1</indTot><uTrib>M2</uTrib><NCM>70052900</NCM><uCom>M2</uCom><CFOP>6122</CFOP><CEST>1003500</CEST></prod><imposto><vTotTrib>3663.99</vTotTrib><ICMS><ICMS00><modBC>3</modBC><orig>0</orig><CST>00</CST><vBC>16577.27</vBC><vICMS>1160.41</vICMS><pICMS>7.0000</pICMS></ICMS00></ICMS><IPI><cEnq>999</cEnq><IPITrib><CST>50</CST><vBC>16577.27</vBC><pIPI>6.5000</pIPI><vIPI>1077.52</vIPI></IPITrib></IPI><COFINS><COFINSAliq><vCOFINS>1171.68</vCOFINS><CST>01</CST><vBC>15416.86</vBC><pCOFINS>7.6000</pCOFINS></COFINSAliq></COFINS><PIS><PISAliq><vPIS>254.38</vPIS><CST>01</CST><vBC>15416.86</vBC><pPIS>1.6500</pPIS></PISAliq></PIS></imposto><infAdProd>0111637254 14 PL JC1; 0111637255 14 PL JC1; ;</infAdProd></det><total><ICMSTot><vCOFINS>3515.04</vCOFINS><vBCST>0.00</vBCST><vICMSDeson>0.00</vICMSDeson><vProd>49731.78</vProd><vSeg>0</vSeg><vFCP>0.00</vFCP><vFCPST>0.00</vFCPST><vNF>52964.34</vNF><vTotTrib>10991.97</vTotTrib><vPIS>763.14</vPIS><vIPIDevol>0.00</vIPIDevol><vBC>49731.78</vBC><vST>0.00</vST><vICMS>3481.23</vICMS><vII>0.00</vII><vFCPSTRet>0.00</vFCPSTRet><vDesc>0.00</vDesc><vOutro>0.00</vOutro><vIPI>3232.56</vIPI><vFrete>0</vFrete></ICMSTot></total><cobr><fat><vOrig>52964.34</vOrig><nFat>619872-001</nFat><vDesc>0.00</vDesc><vLiq>52964.34</vLiq></fat><dup><dVenc>2024-11-07</dVenc><nDup>001</nDup><vDup>52964.34</vDup></dup></cobr><pag><detPag><vPag>52964.34</vPag><tPag>15</tPag><indPag>1</indPag></detPag></pag><entrega><cPais>1058</cPais><xLgr>QI 12 S/N LOTE 09 A 11</xLgr><nro>S/N</nro><cMun>5300108</cMun><xBairro>SETOR INDUSTRIAL (TAGUATINGA)</xBairro><CEP>72135120</CEP><fone>61983248000</fone><xNome>VIDRANNO IND VIDREIRA LTDA45524426000182</xNome><UF>DF</UF><xPais>BRASIL</xPais><xMun>BRASILIA</xMun><CNPJ>45524426000182</CNPJ><IE>0811999300110</IE><email>administrativo@vidranno.com.br</email></entrega><Id>NFe35241145070190000232550010006198721341979067</Id><ide><tpNF>1</tpNF><mod>55</mod><indPres>9</indPres><tpImp>1</tpImp><nNF>619872</nNF><cMunFG>3524402</cMunFG><procEmi>0</procEmi><finNFe>1</finNFe><dhEmi>2024-11-06T01:05:25-03:00</dhEmi><tpAmb>1</tpAmb><indFinal>0</indFinal><idDest>2</idDest><tpEmis>1</tpEmis><cDV>7</cDV><cUF>35</cUF><serie>1</serie><natOp>VND.PROD.EST.REM.IND.CNT.ORD.ADQ.S/ TRAN.EST.ADQ.</natOp><cNF>34197906</cNF><verProc>2024.10.14.1_APSPRD</verProc><indIntermed>0</indIntermed></ide><emit><xNome>CEBRACE CRISTAL PLANO LTDA</xNome><CRT>3</CRT><xFant>CEBRACE CRISTAL PLANO LTDA</xFant><CNPJ>45070190000232</CNPJ><enderEmit><fone>1236945000</fone><UF>SP</UF><xPais>BRASIL</xPais><cPais>1058</cPais><xLgr>AV DO CRISTAL</xLgr><xMun>JACAREÍ</xMun><nro>540</nro><cMun>3524402</cMun><xBairro>JARDIM DAS INDÚSTRIAS</xBairro><CEP>12311210</CEP></enderEmit><IE>392031160119</IE></emit><dest><xNome>VIDRANNO IND E ATACADO LTDA48985779000178</xNome><CNPJ>48985779000178</CNPJ><enderDest><fone>6233542020</fone><UF>DF</UF><xPais>BRASIL</xPais><cPais>1058</cPais><xLgr>QI 1 LOTES 16 A 20</xLgr><xMun>BRASILIA</xMun><nro>S/N</nro><cMun>5300108</cMun><xBairro>SETOR INDUSTRIAL (TAGUATINGA)</xBairro><CEP>72135010</CEP></enderDest><IE>0818607500151</IE><indIEDest>1</indIEDest></dest><transp><modFrete>0</modFrete><vol><pesoL>13159.272</pesoL><esp>Chapa de Vidro</esp><qVol>84</qVol><pesoB>13159.272</pesoB></vol><transporta><xNome>JULIO SIMOES 670352548435006703</xNome><UF>SP</UF><xEnder>RUA ESTACIO JOSE DO NASCIMENTO, 26</xEnder><xMun>SÃO JOSÉ DOS CAMPOS</xMun><CNPJ>52548435006703</CNPJ><IE>645468920110</IE></transporta></transp></infNFe></NFe><versao>4.00</versao></nfeProc>`;

  // Salvar XML temporário
  const tempXmlPath = path.join(process.cwd(), 'test-danfe.xml');
  await fs.writeFile(tempXmlPath, xmlContent, 'utf-8');

  try {
    const reader = new DanfeXmlReader();
    const result = await reader.readAndParse(tempXmlPath);

    // Exibir resultados organizados
    // Interpretar dados com utilitários
    const tipoOperacao = DanfeUtils.getTipoOperacao(result.nfe.tipoNF);
    const ambiente = DanfeUtils.getAmbiente(result.nfe.ambiente);
    const finalidade = DanfeUtils.getFinalidade(result.nfe.finalidade);

    console.log('📋 DADOS DA NFE:');
    console.log(`   Chave: ${result.nfe.chaveAcesso}`);
    console.log(`   Número: ${result.nfe.numero}`);
    console.log(`   Série: ${result.nfe.serie}`);
    console.log(`   Data: ${result.nfe.dataEmissao}`);
    console.log(`   Natureza: ${result.nfe.naturezaOperacao}`);
    console.log(`   Tipo: ${tipoOperacao.codigo} - ${tipoOperacao.descricao} (${tipoOperacao.tipoMovimento})`);
    console.log(`   Ambiente: ${ambiente.codigo} - ${ambiente.descricao}`);
    console.log(`   Finalidade: ${finalidade.codigo} - ${finalidade.descricao}`);

    console.log('\n🏢 EMITENTE:');
    console.log(`   Razão: ${result.emitente.razaoSocial}`);
    console.log(`   CNPJ: ${result.emitente.cnpj}`);
    console.log(`   IE: ${result.emitente.inscricaoEstadual}`);
    console.log(`   Telefone: ${result.emitente.endereco.telefone}`);

    console.log('\n🏪 DESTINATÁRIO:');
    console.log(`   Nome: ${result.destinatario.nome}`);
    console.log(`   CNPJ: ${result.destinatario.cpfCnpj}`);
    console.log(`   IE: ${result.destinatario.inscricaoEstadual}`);
    console.log(`   Telefone: ${result.destinatario.endereco.telefone}`);

    if (result.entrega) {
      console.log('\n📦 ENTREGA:');
      console.log(`   Nome: ${result.entrega.nome}`);
      console.log(`   CNPJ: ${result.entrega.cpfCnpj}`);
      console.log(`   Endereço: ${result.entrega.endereco.logradouro}, ${result.entrega.endereco.numero}`);
      console.log(`   Email: ${result.entrega.email}`);
    }

    console.log(`\n🛍️ PRODUTOS (${result.produtos.length} itens):`);
    result.produtos.forEach((produto, index) => {
      console.log(`   ${index + 1}. ${produto.descricao}`);
      console.log(`      Código: ${produto.codigo}`);
      console.log(`      NCM: ${produto.ncm} | CFOP: ${produto.cfop}`);
      console.log(`      Qtd: ${produto.quantidade} ${produto.unidade}`);
      console.log(`      Valor: R$ ${produto.valorTotal}`);
      console.log(`      ICMS: ${produto.impostos.icms.valor} (${produto.impostos.icms.aliquota}%)`);
      if (produto.impostos.ipi) {
        console.log(`      IPI: ${produto.impostos.ipi.valor} (${produto.impostos.ipi.aliquota}%)`);
      }
      console.log(`      Tributos Total: R$ ${produto.impostos.valorTributos}`);
    });

    console.log('\n💰 TOTAIS:');
    console.log(`   Produtos: R$ ${result.totais.valorProdutos}`);
    console.log(`   ICMS: R$ ${result.totais.valorICMS}`);
    console.log(`   IPI: R$ ${result.totais.valorIPI}`);
    console.log(`   PIS: R$ ${result.totais.valorPIS}`);
    console.log(`   COFINS: R$ ${result.totais.valorCOFINS}`);
    console.log(`   Frete: R$ ${result.totais.valorFrete}`);
    console.log(`   Nota Total: R$ ${result.totais.valorNota}`);

    console.log('\n🚚 TRANSPORTE:');
    const modalidadeFrete = DanfeUtils.getModalidadeFrete(result.transporte.modalidadeFrete);
    console.log(`   Modalidade: ${modalidadeFrete.codigo} - ${modalidadeFrete.descricao}`);
    console.log(`   Responsável: ${modalidadeFrete.responsavel}`);
    if (result.transporte.transportadora) {
      console.log(`   Transportadora: ${result.transporte.transportadora.nome}`);
      console.log(`   CNPJ: ${result.transporte.transportadora.cnpj}`);
    }
    if (result.transporte.volumes && result.transporte.volumes.length > 0) {
      const vol = result.transporte.volumes[0];
      console.log(`   Volumes: ${vol.quantidade} ${vol.especie}`);
      console.log(`   Peso: ${vol.pesoLiquido}kg (bruto: ${vol.pesoBruto}kg)`);
    }

    if (result.cobranca) {
      console.log('\n💳 COBRANÇA:');
      if (result.cobranca.fatura) {
        console.log(`   Fatura: ${result.cobranca.fatura.numero}`);
        console.log(`   Valor: R$ ${result.cobranca.fatura.valorLiquido}`);
      }
      if (result.cobranca.duplicatas) {
        result.cobranca.duplicatas.forEach(dup => {
          console.log(`   Duplicata ${dup.numero}: R$ ${dup.valor} (venc: ${dup.dataVencimento})`);
        });
      }
    }

    if (result.pagamento) {
      console.log('\n💸 PAGAMENTO:');
      result.pagamento.forEach(pag => {
        const formaPagamento = DanfeUtils.getFormaPagamento(pag.forma);
        console.log(`   Forma: ${formaPagamento.codigo} - ${formaPagamento.descricao} | Valor: R$ ${pag.valor}`);
      });
    }

    if (result.protocolo) {
      console.log('\n✅ PROTOCOLO SEFAZ:');
      console.log(`   Número: ${result.protocolo.numero}`);
      console.log(`   Status: ${result.protocolo.codigoStatus} - ${result.protocolo.motivo}`);
      console.log(`   Recebimento: ${result.protocolo.dataRecebimento}`);
    }

    if (result.informacoesAdicionais?.informacoesComplementares) {
      console.log('\n📝 INFORMAÇÕES ADICIONAIS:');
      console.log(`   ${result.informacoesAdicionais.informacoesComplementares.substring(0, 200)}...`);
    }

    console.log('\n✅ EXTRAÇÃO COMPLETA REALIZADA COM SUCESSO!');
    console.log(`Total de campos extraídos: ~65+ campos estruturados`);
    
  } catch (error) {
    console.error('❌ Erro na extração:', error);
  } finally {
    // Limpar arquivo temporário
    await fs.remove(tempXmlPath);
  }
}

// Executar teste
testeExtracao().catch(console.error);