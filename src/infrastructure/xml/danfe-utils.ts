/**
 * Utilitários para interpretação de dados da DANFE
 */

export class DanfeUtils {
  /**
   * Converte o código do tipo de NFe para descrição legível
   * @param tipoNF - Código do tipo (0 ou 1)
   * @returns Descrição do tipo da operação
   */
  static getTipoOperacao(tipoNF: string): {
    codigo: string;
    descricao: string;
    tipoMovimento: 'ENTRADA' | 'SAÍDA';
  } {
    const codigo = tipoNF.toString();
    
    switch (codigo) {
      case '0':
        return {
          codigo: '0',
          descricao: 'NFe de entrada',
          tipoMovimento: 'ENTRADA'
        };
      case '1':
        return {
          codigo: '1', 
          descricao: 'NFe de saída',
          tipoMovimento: 'SAÍDA'
        };
      default:
        return {
          codigo: codigo,
          descricao: 'Tipo não identificado',
          tipoMovimento: 'SAÍDA' // Default para saída
        };
    }
  }

  /**
   * Converte código do ambiente para descrição
   * @param ambiente - Código do ambiente (1 ou 2)
   */
  static getAmbiente(ambiente: string): {
    codigo: string;
    descricao: string;
  } {
    const codigo = ambiente.toString();
    
    switch (codigo) {
      case '1':
        return {
          codigo: '1',
          descricao: 'Produção'
        };
      case '2':
        return {
          codigo: '2',
          descricao: 'Homologação'
        };
      default:
        return {
          codigo: codigo,
          descricao: 'Ambiente desconhecido'
        };
    }
  }

  /**
   * Converte código de finalidade para descrição
   * @param finalidade - Código da finalidade
   */
  static getFinalidade(finalidade: string): {
    codigo: string;
    descricao: string;
  } {
    const codigo = finalidade.toString();
    
    switch (codigo) {
      case '1':
        return {
          codigo: '1',
          descricao: 'Normal'
        };
      case '2':
        return {
          codigo: '2',
          descricao: 'Complementar'
        };
      case '3':
        return {
          codigo: '3',
          descricao: 'Ajuste'
        };
      case '4':
        return {
          codigo: '4',
          descricao: 'Devolução de mercadoria'
        };
      default:
        return {
          codigo: codigo,
          descricao: 'Finalidade desconhecida'
        };
    }
  }

  /**
   * Converte modalidade de frete para descrição
   * @param modalidade - Código da modalidade (0 ou 1)
   */
  static getModalidadeFrete(modalidade: string): {
    codigo: string;
    descricao: string;
    responsavel: string;
  } {
    const codigo = modalidade.toString();
    
    switch (codigo) {
      case '0':
        return {
          codigo: '0',
          descricao: 'Emitente (CIF)',
          responsavel: 'Emitente'
        };
      case '1':
        return {
          codigo: '1',
          descricao: 'Destinatário (FOB)',
          responsavel: 'Destinatário'
        };
      case '2':
        return {
          codigo: '2',
          descricao: 'Terceiros',
          responsavel: 'Terceiros'
        };
      case '3':
        return {
          codigo: '3',
          descricao: 'Transporte próprio pelo remetente',
          responsavel: 'Remetente'
        };
      case '4':
        return {
          codigo: '4',
          descricao: 'Transporte próprio pelo destinatário',
          responsavel: 'Destinatário'
        };
      case '9':
        return {
          codigo: '9',
          descricao: 'Sem ocorrência de transporte',
          responsavel: 'Sem transporte'
        };
      default:
        return {
          codigo: codigo,
          descricao: 'Modalidade desconhecida',
          responsavel: 'Desconhecido'
        };
    }
  }

  /**
   * Converte código de forma de pagamento para descrição
   * @param formaPagamento - Código da forma de pagamento
   */
  static getFormaPagamento(formaPagamento: string): {
    codigo: string;
    descricao: string;
  } {
    const codigo = formaPagamento.toString();
    
    switch (codigo) {
      case '01':
        return { codigo: '01', descricao: 'Dinheiro' };
      case '02':
        return { codigo: '02', descricao: 'Cheque' };
      case '03':
        return { codigo: '03', descricao: 'Cartão de Crédito' };
      case '04':
        return { codigo: '04', descricao: 'Cartão de Débito' };
      case '05':
        return { codigo: '05', descricao: 'Crédito Loja' };
      case '10':
        return { codigo: '10', descricao: 'Vale Alimentação' };
      case '11':
        return { codigo: '11', descricao: 'Vale Refeição' };
      case '12':
        return { codigo: '12', descricao: 'Vale Presente' };
      case '13':
        return { codigo: '13', descricao: 'Vale Combustível' };
      case '14':
        return { codigo: '14', descricao: 'Duplicata Mercantil' };
      case '15':
        return { codigo: '15', descricao: 'Boleto Bancário' };
      case '90':
        return { codigo: '90', descricao: 'Sem pagamento' };
      case '99':
        return { codigo: '99', descricao: 'Outros' };
      default:
        return { 
          codigo: codigo, 
          descricao: `Forma de pagamento ${codigo}` 
        };
    }
  }

  /**
   * Determina se é operação de entrada ou saída baseado no tipoNF
   * @param danfeData - Dados da DANFE
   */
  static isEntrada(tipoNF: string): boolean {
    return tipoNF === '0';
  }

  /**
   * Determina se é operação de saída baseado no tipoNF
   * @param danfeData - Dados da DANFE
   */
  static isSaida(tipoNF: string): boolean {
    return tipoNF === '1';
  }
}