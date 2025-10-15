/**
 * Interface expandida para extração completa de dados da DANFE
 * Baseada na análise do XML real fornecido
 */

export interface ExpandedDanfeData {
  // Dados básicos da NFe (já extraídos)
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
  };

  // Dados do emitente e destinatário (já extraídos)
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
    };
    // NOVOS CAMPOS
    inscricaoEstadual: string;    // <IE>
    codigoRegimeTributario: string; // <CRT>
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
      // NOVOS CAMPOS
      telefone?: string;
      codigoMunicipio?: string;
      codigoPais?: string;
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
    };
    inscricaoEstadual?: string;  // <IE>
    email?: string;              // <email>
  };

  // Produtos com impostos detalhados
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
    valorFrete?: string;         // <vFrete>
    valorSeguro?: string;        // <vSeg>
    valorDesconto?: string;      // <vDesc>
    valorOutros?: string;        // <vOutro>
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
  };
}