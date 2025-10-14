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
export declare class DanfeXmlReader {
    /**
     * Lê e faz parse do XML da DANFE
     */
    readAndParse(filePath: string): Promise<DanfeData>;
    /**
     * Valida estrutura básica do XML
     */
    validate(filePath: string): Promise<boolean>;
}
