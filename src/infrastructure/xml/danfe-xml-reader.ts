import fs from "fs-extra";
import { parseStringPromise } from "xml2js";

export interface DanfeData {
  // Dados básicos da NFe (expandidos)
  nfe: {
    chaveAcesso: string;
    numero: string;
    serie: string;
    dataEmissao: string;
    valorTotal: string;
    // NOVOS CAMPOS
    naturezaOperacao: string;     // <natOp>
    tipoNF: string;              // <tpNF> (0=entrada, 1=saída)
    ambiente: string;            // <tpAmb> (1=produção, 2=homologação)
    finalidade: string;          // <finNFe>
    codigoNumerico: string;      // <cNF>
    digitoVerificador: string;   // <cDV>
    modelo: string;              // <mod>
    indicadorPresenca: string;   // <indPres>
    indicadorFinal: string;      // <indFinal>
    indicadorDestino: string;    // <idDest>
    tipoEmissao: string;         // <tpEmis>
  };

  // Dados do emitente (expandidos)
  emitente: {
    cnpj: string;
    razaoSocial: string;
    nomeFantasia?: string;
    endereco: {
      logradouro: string;
      numero: string;
      bairro: string;
      municipio: string;
      uf: string;
      cep: string;
      // NOVOS CAMPOS
      telefone?: string;          // <fone>
      codigoMunicipio?: string;   // <cMun>
      codigoPais?: string;        // <cPais>
      nomePais?: string;          // <xPais>
    };
    // NOVOS CAMPOS
    inscricaoEstadual: string;    // <IE>
    codigoRegimeTributario: string; // <CRT>
  };

  // Dados do destinatário (expandidos)
  destinatario: {
    cpfCnpj: string;
    nome: string;
    endereco: {
      logradouro: string;
      numero: string;
      bairro: string;
      municipio: string;
      uf: string;
      cep: string;
      // NOVOS CAMPOS
      telefone?: string;
      codigoMunicipio?: string;
      codigoPais?: string;
      nomePais?: string;
    };
    // NOVOS CAMPOS
    inscricaoEstadual?: string;   // <IE>
    indicadorIE: string;         // <indIEDest>
  };

  // NOVO: Endereço de entrega (quando diferente do destinatário)
  entrega?: {
    nome: string;                // <xNome>
    cpfCnpj: string;            // <CPF> ou <CNPJ>
    endereco: {
      logradouro: string;        // <xLgr>
      numero: string;            // <nro>
      bairro: string;            // <xBairro>
      municipio: string;         // <xMun>
      uf: string;                // <UF>
      cep: string;               // <CEP>
      telefone?: string;         // <fone>
      codigoMunicipio?: string;  // <cMun>
      codigoPais?: string;       // <cPais>
      nomePais?: string;         // <xPais>
    };
    inscricaoEstadual?: string;  // <IE>
    email?: string;              // <email>
  };

  // Produtos com impostos detalhados (expandidos)
  produtos: Array<{
    codigo: string;
    descricao: string;
    quantidade: string;
    unidade: string;
    valorUnitario: string;
    valorTotal: string;
    // NOVOS CAMPOS
    ncm: string;                 // <NCM>
    cfop: string;                // <CFOP>
    cest?: string;               // <CEST>
    codigoEAN?: string;          // <cEAN>
    codigoEANTributavel?: string; // <cEANTrib>
    unidadeTributavel?: string;  // <uTrib>
    quantidadeTributavel?: string; // <qTrib>
    valorUnitarioTributavel?: string; // <vUnTrib>
    indicadorTotal: string;      // <indTot>
    informacoesAdicionais?: string; // <infAdProd>
    
    // NOVO: Impostos detalhados por produto
    impostos: {
      icms: {
        origem: string;          // <orig>
        cst: string;             // <CST>
        modalidadeBC?: string;   // <modBC>
        baseCalculo?: string;    // <vBC>
        aliquota?: string;       // <pICMS>
        valor?: string;          // <vICMS>
      };
      ipi?: {
        cst: string;             // <CST>
        codigoEnquadramento?: string; // <cEnq>
        baseCalculo?: string;    // <vBC>
        aliquota?: string;       // <pIPI>
        valor?: string;          // <vIPI>
      };
      pis?: {
        cst: string;             // <CST>
        baseCalculo?: string;    // <vBC>
        aliquota?: string;       // <pPIS>
        valor?: string;          // <vPIS>
      };
      cofins?: {
        cst: string;             // <CST>
        baseCalculo?: string;    // <vBC>
        aliquota?: string;       // <pCOFINS>
        valor?: string;          // <vCOFINS>
      };
      valorTributos?: string;    // <vTotTrib>
    };
  }>;

  // Totais expandidos
  totais: {
    valorProdutos: string;
    valorNota: string;
    valorICMS?: string;
    valorIPI?: string;
    // NOVOS CAMPOS DETALHADOS
    valorPIS?: string;           // <vPIS>
    valorCOFINS?: string;        // <vCOFINS>
    valorTributos?: string;      // <vTotTrib>
    baseCalculoICMS?: string;    // <vBC>
    baseCalculoST?: string;      // <vBCST>
    valorST?: string;            // <vST>
    valorFrete?: string;         // <vFrete>
    valorSeguro?: string;        // <vSeg>
    valorDesconto?: string;      // <vDesc>
    valorOutros?: string;        // <vOutro>
    valorII?: string;            // <vII>
    valorICMSDesonerado?: string; // <vICMSDeson>
    valorFCP?: string;           // <vFCP>
    valorFCPST?: string;         // <vFCPST>
    valorFCPSTRet?: string;      // <vFCPSTRet>
    valorIPIDevolvido?: string;  // <vIPIDevol>
  };

  // NOVO: Informações de transporte
  transporte: {
    modalidadeFrete: string;     // <modFrete> (0=emitente, 1=destinatário)
    transportadora?: {
      nome: string;              // <xNome>
      cnpj?: string;             // <CNPJ>
      inscricaoEstadual?: string; // <IE>
      endereco?: string;         // <xEnder>
      municipio?: string;        // <xMun>
      uf?: string;               // <UF>
    };
    volumes?: Array<{
      quantidade: string;        // <qVol>
      especie: string;           // <esp>
      pesoLiquido: string;       // <pesoL>
      pesoBruto: string;         // <pesoB>
      marca?: string;            // <marca>
      numeracao?: string;        // <nVol>
    }>;
  };

  // NOVO: Informações de cobrança
  cobranca?: {
    fatura?: {
      numero: string;            // <nFat>
      valorOriginal: string;     // <vOrig>
      valorDesconto?: string;    // <vDesc>
      valorLiquido: string;      // <vLiq>
    };
    duplicatas?: Array<{
      numero: string;            // <nDup>
      dataVencimento: string;    // <dVenc>
      valor: string;             // <vDup>
    }>;
  };

  // NOVO: Informações de pagamento
  pagamento?: Array<{
    forma: string;               // <tPag>
    valor: string;               // <vPag>
    indicadorPagamento?: string; // <indPag>
  }>;

  // NOVO: Informações adicionais
  informacoesAdicionais?: {
    informacoesComplementares?: string; // <infCpl>
    informacoesFisco?: string;          // <infAdFisco>
  };

  // NOVO: Protocolo de autorização
  protocolo?: {
    numero: string;              // <nProt>
    dataRecebimento: string;     // <dhRecbto>
    motivo: string;              // <xMotivo>
    codigoStatus: string;        // <cStat>
    digestValue: string;         // <digVal>
    chaveNFe: string;            // <chNFe>
  };
}

export class DanfeXmlReader {
  /**
   * Lê e faz parse do XML da DANFE
   */
  async readAndParse(filePath: string): Promise<DanfeData> {
    try {
      // Verificar se arquivo existe
      if (!(await fs.pathExists(filePath))) {
        throw new Error(`Arquivo não encontrado: ${filePath}`);
      }

      // Ler conteúdo do XML
      const xmlContent = await fs.readFile(filePath, "utf-8");

      // Parse do XML
      const xmlObj = await parseStringPromise(xmlContent, {
        explicitArray: false,
        ignoreAttrs: false,
        mergeAttrs: true,
      });

      // Extrair dados estruturados
      const nfeProc = xmlObj.nfeProc || xmlObj;
      const nfe = nfeProc.NFe || nfeProc;
      const infNFe = nfe.infNFe;

      // Dados da NFe
      const ide = infNFe.ide;
      const emit = infNFe.emit;
      const dest = infNFe.dest;
      const det = Array.isArray(infNFe.det) ? infNFe.det : [infNFe.det];
      const total = infNFe.total;

      // Extrair chave de acesso (pode estar em diferentes formatos)
      let chaveAcesso = "";
      if (typeof infNFe.Id === "string") {
        chaveAcesso = infNFe.Id.replace("NFe", "");
      } else if (infNFe.Id && typeof infNFe.Id === "object") {
        // Se Id for um objeto com atributo, pegar o primeiro valor
        const idValue = Object.values(infNFe.Id)[0];
        if (typeof idValue === "string") {
          chaveAcesso = idValue.replace("NFe", "");
        }
      }
      
      // Extrair protocolo de autorização
      const protNFe = nfeProc.protNFe;
      const protocolo = protNFe?.infProt ? {
        numero: protNFe.infProt.nProt || "",
        dataRecebimento: protNFe.infProt.dhRecbto || "",
        motivo: protNFe.infProt.xMotivo || "",
        codigoStatus: protNFe.infProt.cStat || "",
        digestValue: protNFe.infProt.digVal || "",
        chaveNFe: protNFe.infProt.chNFe || "",
      } : undefined;

      // Extrair informações de transporte
      const transp = infNFe.transp;
      const transporte = {
        modalidadeFrete: transp?.modFrete || "",
        transportadora: transp?.transporta ? {
          nome: transp.transporta.xNome || "",
          cnpj: transp.transporta.CNPJ || "",
          inscricaoEstadual: transp.transporta.IE || "",
          endereco: transp.transporta.xEnder || "",
          municipio: transp.transporta.xMun || "",
          uf: transp.transporta.UF || "",
        } : undefined,
        volumes: transp?.vol ? (Array.isArray(transp.vol) ? transp.vol : [transp.vol]).map((vol: any) => ({
          quantidade: vol.qVol || "",
          especie: vol.esp || "",
          pesoLiquido: vol.pesoL || "",
          pesoBruto: vol.pesoB || "",
          marca: vol.marca || "",
          numeracao: vol.nVol || "",
        })) : undefined,
      };

      // Extrair informações de cobrança
      const cobr = infNFe.cobr;
      const cobranca = cobr ? {
        fatura: cobr.fat ? {
          numero: cobr.fat.nFat || "",
          valorOriginal: cobr.fat.vOrig || "",
          valorDesconto: cobr.fat.vDesc || "",
          valorLiquido: cobr.fat.vLiq || "",
        } : undefined,
        duplicatas: cobr.dup ? (Array.isArray(cobr.dup) ? cobr.dup : [cobr.dup]).map((dup: any) => ({
          numero: dup.nDup || "",
          dataVencimento: dup.dVenc || "",
          valor: dup.vDup || "",
        })) : undefined,
      } : undefined;

      // Extrair informações de pagamento
      const pag = infNFe.pag;
      const pagamento = pag?.detPag ? (Array.isArray(pag.detPag) ? pag.detPag : [pag.detPag]).map((det: any) => ({
        forma: det.tPag || "",
        valor: det.vPag || "",
        indicadorPagamento: det.indPag || "",
      })) : undefined;

      // Extrair endereço de entrega
      const entrega = infNFe.entrega ? {
        nome: infNFe.entrega.xNome || "",
        cpfCnpj: infNFe.entrega.CNPJ || infNFe.entrega.CPF || "",
        endereco: {
          logradouro: infNFe.entrega.xLgr || "",
          numero: infNFe.entrega.nro || "",
          bairro: infNFe.entrega.xBairro || "",
          municipio: infNFe.entrega.xMun || "",
          uf: infNFe.entrega.UF || "",
          cep: infNFe.entrega.CEP || "",
          telefone: infNFe.entrega.fone || "",
          codigoMunicipio: infNFe.entrega.cMun || "",
          codigoPais: infNFe.entrega.cPais || "",
          nomePais: infNFe.entrega.xPais || "",
        },
        inscricaoEstadual: infNFe.entrega.IE || "",
        email: infNFe.entrega.email || "",
      } : undefined;

      // Extrair informações adicionais
      const informacoesAdicionais = infNFe.infAdic ? {
        informacoesComplementares: infNFe.infAdic.infCpl || "",
        informacoesFisco: infNFe.infAdic.infAdFisco || "",
      } : undefined;

      // Estruturar dados completos
      const danfeData: DanfeData = {
        nfe: {
          chaveAcesso: chaveAcesso || "",
          numero: ide.nNF || "",
          serie: ide.serie || "",
          dataEmissao: ide.dhEmi || ide.dEmi || "",
          valorTotal: total.ICMSTot?.vNF || "",
          // Novos campos
          naturezaOperacao: ide.natOp || "",
          tipoNF: ide.tpNF || "",
          ambiente: ide.tpAmb || "",
          finalidade: ide.finNFe || "",
          codigoNumerico: ide.cNF || "",
          digitoVerificador: ide.cDV || "",
          modelo: ide.mod || "",
          indicadorPresenca: ide.indPres || "",
          indicadorFinal: ide.indFinal || "",
          indicadorDestino: ide.idDest || "",
          tipoEmissao: ide.tpEmis || "",
        },
        emitente: {
          cnpj: emit.CNPJ || "",
          razaoSocial: emit.xNome || "",
          nomeFantasia: emit.xFant || undefined,
          endereco: {
            logradouro: emit.enderEmit?.xLgr || "",
            numero: emit.enderEmit?.nro || "",
            bairro: emit.enderEmit?.xBairro || "",
            municipio: emit.enderEmit?.xMun || "",
            uf: emit.enderEmit?.UF || "",
            cep: emit.enderEmit?.CEP || "",
            // Novos campos
            telefone: emit.enderEmit?.fone || "",
            codigoMunicipio: emit.enderEmit?.cMun || "",
            codigoPais: emit.enderEmit?.cPais || "",
            nomePais: emit.enderEmit?.xPais || "",
          },
          // Novos campos
          inscricaoEstadual: emit.IE || "",
          codigoRegimeTributario: emit.CRT || "",
        },
        destinatario: {
          cpfCnpj: dest.CPF || dest.CNPJ || "",
          nome: dest.xNome || "",
          endereco: {
            logradouro: dest.enderDest?.xLgr || "",
            numero: dest.enderDest?.nro || "",
            bairro: dest.enderDest?.xBairro || "",
            municipio: dest.enderDest?.xMun || "",
            uf: dest.enderDest?.UF || "",
            cep: dest.enderDest?.CEP || "",
            // Novos campos
            telefone: dest.enderDest?.fone || "",
            codigoMunicipio: dest.enderDest?.cMun || "",
            codigoPais: dest.enderDest?.cPais || "",
            nomePais: dest.enderDest?.xPais || "",
          },
          // Novos campos
          inscricaoEstadual: dest.IE || "",
          indicadorIE: dest.indIEDest || "",
        },
        entrega,
        produtos: det.map((item: any) => {
          const prod = item.prod;
          const imposto = item.imposto;
          
          return {
            codigo: prod.cProd || "",
            descricao: prod.xProd || "",
            quantidade: prod.qCom || "",
            unidade: prod.uCom || "",
            valorUnitario: prod.vUnCom || "",
            valorTotal: prod.vProd || "",
            // Novos campos
            ncm: prod.NCM || "",
            cfop: prod.CFOP || "",
            cest: prod.CEST || "",
            codigoEAN: prod.cEAN !== "SEM GTIN" ? prod.cEAN : "",
            codigoEANTributavel: prod.cEANTrib !== "SEM GTIN" ? prod.cEANTrib : "",
            unidadeTributavel: prod.uTrib || "",
            quantidadeTributavel: prod.qTrib || "",
            valorUnitarioTributavel: prod.vUnTrib || "",
            indicadorTotal: prod.indTot || "",
            informacoesAdicionais: item.infAdProd || "",
            
            // Impostos detalhados
            impostos: {
              icms: imposto?.ICMS?.ICMS00 ? {
                origem: imposto.ICMS.ICMS00.orig || "",
                cst: imposto.ICMS.ICMS00.CST || "",
                modalidadeBC: imposto.ICMS.ICMS00.modBC || "",
                baseCalculo: imposto.ICMS.ICMS00.vBC || "",
                aliquota: imposto.ICMS.ICMS00.pICMS || "",
                valor: imposto.ICMS.ICMS00.vICMS || "",
              } : { origem: "", cst: "" },
              
              ipi: imposto?.IPI?.IPITrib ? {
                cst: imposto.IPI.IPITrib.CST || "",
                codigoEnquadramento: imposto.IPI.cEnq || "",
                baseCalculo: imposto.IPI.IPITrib.vBC || "",
                aliquota: imposto.IPI.IPITrib.pIPI || "",
                valor: imposto.IPI.IPITrib.vIPI || "",
              } : undefined,
              
              pis: imposto?.PIS?.PISAliq ? {
                cst: imposto.PIS.PISAliq.CST || "",
                baseCalculo: imposto.PIS.PISAliq.vBC || "",
                aliquota: imposto.PIS.PISAliq.pPIS || "",
                valor: imposto.PIS.PISAliq.vPIS || "",
              } : undefined,
              
              cofins: imposto?.COFINS?.COFINSAliq ? {
                cst: imposto.COFINS.COFINSAliq.CST || "",
                baseCalculo: imposto.COFINS.COFINSAliq.vBC || "",
                aliquota: imposto.COFINS.COFINSAliq.pCOFINS || "",
                valor: imposto.COFINS.COFINSAliq.vCOFINS || "",
              } : undefined,
              
              valorTributos: imposto?.vTotTrib || "",
            },
          };
        }),
        totais: {
          valorProdutos: total.ICMSTot?.vProd || "",
          valorNota: total.ICMSTot?.vNF || "",
          valorICMS: total.ICMSTot?.vICMS || "",
          valorIPI: total.ICMSTot?.vIPI || "",
          // Novos campos detalhados
          valorPIS: total.ICMSTot?.vPIS || "",
          valorCOFINS: total.ICMSTot?.vCOFINS || "",
          valorTributos: total.ICMSTot?.vTotTrib || "",
          baseCalculoICMS: total.ICMSTot?.vBC || "",
          baseCalculoST: total.ICMSTot?.vBCST || "",
          valorST: total.ICMSTot?.vST || "",
          valorFrete: total.ICMSTot?.vFrete || "",
          valorSeguro: total.ICMSTot?.vSeg || "",
          valorDesconto: total.ICMSTot?.vDesc || "",
          valorOutros: total.ICMSTot?.vOutro || "",
          valorII: total.ICMSTot?.vII || "",
          valorICMSDesonerado: total.ICMSTot?.vICMSDeson || "",
          valorFCP: total.ICMSTot?.vFCP || "",
          valorFCPST: total.ICMSTot?.vFCPST || "",
          valorFCPSTRet: total.ICMSTot?.vFCPSTRet || "",
          valorIPIDevolvido: total.ICMSTot?.vIPIDevol || "",
        },
        transporte,
        cobranca,
        pagamento,
        informacoesAdicionais,
        protocolo,
      };

      return danfeData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      throw new Error(`Erro ao ler XML: ${errorMessage}`);
    }
  }

  /**
   * Valida estrutura básica do XML
   */
  async validate(filePath: string): Promise<boolean> {
    try {
      const xmlContent = await fs.readFile(filePath, "utf-8");
      
      // Validações básicas
      const isXml = xmlContent.trim().startsWith("<?xml");
      const hasNFe = xmlContent.includes("<NFe") || xmlContent.includes("<nfeProc");
      
      return isXml && hasNFe;
    } catch {
      return false;
    }
  }
}
