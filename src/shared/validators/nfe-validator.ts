export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export class NFeValidator {
  private static readonly UF_CODES = [
    11, 12, 13, 14, 15, 16, 17, // Norte
    21, 22, 23, 24, 25, 26, 27, 28, 29, // Nordeste
    31, 32, 33, 35, // Sudeste
    41, 42, 43, // Sul
    50, 51, 52, 53, // Centro-Oeste
  ];

  static validateChave(chave: string): ValidationResult {
    // 1. Formato básico
    if (!/^[0-9]{44}$/.test(chave)) {
      return {
        valid: false,
        error: 'Formato inválido (deve ter 44 dígitos numéricos)',
      };
    }

    // 2. UF válida
    const uf = parseInt(chave.substring(0, 2));
    if (!this.UF_CODES.includes(uf)) {
      return { valid: false, error: `UF inválida: ${uf}` };
    }

    // 3. Data válida (AAMM)
    const ano = parseInt(chave.substring(2, 4));
    const mes = parseInt(chave.substring(4, 6));
    if (mes < 1 || mes > 12) {
      return { valid: false, error: `Mês inválido: ${mes}` };
    }

    // 4. CNPJ válido (básico)
    const cnpj = chave.substring(6, 20);
    if (!this.validateCNPJ(cnpj)) {
      return { valid: false, error: 'CNPJ inválido' };
    }

    // 5. Modelo válido (55=NFe, 65=NFCe)
    const modelo = parseInt(chave.substring(20, 22));
    if (![55, 65].includes(modelo)) {
      return {
        valid: false,
        error: `Modelo inválido: ${modelo} (deve ser 55 ou 65)`,
      };
    }

    // 6. Dígito verificador (Módulo 11)
    if (!this.validateChecksum(chave)) {
      return { valid: false, error: 'Dígito verificador inválido' };
    }

    return { valid: true };
  }

  private static validateChecksum(chave: string): boolean {
    // Pesos para módulo 11
    const weights = [
      4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5,
      4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2,
    ];

    let sum = 0;
    for (let i = 0; i < 43; i++) {
      sum += parseInt(chave[i]) * weights[i];
    }

    const remainder = sum % 11;
    const dv = remainder < 2 ? 0 : 11 - remainder;

    return dv === parseInt(chave[43]);
  }

  private static validateCNPJ(cnpj: string): boolean {
    // Verificar se todos dígitos são iguais
    if (/^(\d)\1+$/.test(cnpj)) return false;

    // Calcular primeiro dígito verificador
    let sum = 0;
    let weight = 5;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnpj[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    const dv1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

    // Calcular segundo dígito verificador
    sum = 0;
    weight = 6;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cnpj[i]) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    const dv2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

    return dv1 === parseInt(cnpj[12]) && dv2 === parseInt(cnpj[13]);
  }

  // Parse chave into components
  static parseChave(chave: string) {
    if (!this.validateChave(chave).valid) {
      return null;
    }

    return {
      uf: parseInt(chave.substring(0, 2)),
      ano: parseInt(chave.substring(2, 4)),
      mes: parseInt(chave.substring(4, 6)),
      cnpj: chave.substring(6, 20),
      modelo: parseInt(chave.substring(20, 22)),
      serie: parseInt(chave.substring(22, 25)),
      numero: parseInt(chave.substring(25, 34)),
      formaEmissao: parseInt(chave.substring(34, 35)),
      codigoNumerico: chave.substring(35, 43),
      digitoVerificador: parseInt(chave.substring(43, 44)),
    };
  }
}
