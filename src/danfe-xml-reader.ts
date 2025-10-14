import fs from "fs-extra";
import { parseStringPromise } from "xml2js";

export interface DanfeData {
  nfe: {
    chaveAcesso: string;
    numero: string;
    serie: string;
    dataEmissao: string;
    valorTotal: string;
  };
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
    };
  };
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
    };
  };
  produtos: Array<{
    codigo: string;
    descricao: string;
    quantidade: string;
    unidade: string;
    valorUnitario: string;
    valorTotal: string;
  }>;
  totais: {
    valorProdutos: string;
    valorNota: string;
    valorICMS?: string;
    valorIPI?: string;
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
      
      // Estruturar dados
      const danfeData: DanfeData = {
        nfe: {
          chaveAcesso: chaveAcesso || "",
          numero: ide.nNF || "",
          serie: ide.serie || "",
          dataEmissao: ide.dhEmi || ide.dEmi || "",
          valorTotal: total.ICMSTot?.vNF || "",
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
          },
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
          },
        },
        produtos: det.map((item: any) => {
          const prod = item.prod;
          return {
            codigo: prod.cProd || "",
            descricao: prod.xProd || "",
            quantidade: prod.qCom || "",
            unidade: prod.uCom || "",
            valorUnitario: prod.vUnCom || "",
            valorTotal: prod.vProd || "",
          };
        }),
        totais: {
          valorProdutos: total.ICMSTot?.vProd || "",
          valorNota: total.ICMSTot?.vNF || "",
          valorICMS: total.ICMSTot?.vICMS || undefined,
          valorIPI: total.ICMSTot?.vIPI || undefined,
        },
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
