import { ValidationError } from '@nfse/shared';
import { IdentificadorDps } from './value-objects.js';
import type { EmitirNfseInput } from './entities.js';
import { buscarNbsPorCodigo, normalizeCodigoNbs } from './nbs.js';
import { isOptanteSimplesNacional } from './tributacao-simples-nacional.js';

export class GeradorIdDps {
  constructor(
    private readonly codigoMunicipio: string,
    private readonly cnpj: string,
    private readonly serie: string,
  ) {}

  gerar(numeroDps: string): IdentificadorDps {
    return IdentificadorDps.create({
      codigoMunicipio: this.codigoMunicipio,
      tipoInscricao: '2',
      inscricaoFederal: this.cnpj,
      serie: this.serie,
      numeroDps,
    });
  }
}

export class ValidadorRegrasNegocio {
  validarEmissao(input: EmitirNfseInput): void {
    if (input.valores.valorServico <= 0) {
      throw new ValidationError('Valor do serviço deve ser maior que zero');
    }
    if (!input.servico.codigoServico) {
      throw new ValidationError('Código do serviço é obrigatório');
    }
    if (input.servico.codigoNbs) {
      const codigoNbs = normalizeCodigoNbs(input.servico.codigoNbs);
      if (!codigoNbs) {
        throw new ValidationError('Código NBS (cNBS) deve conter 9 dígitos');
      }
      if (!buscarNbsPorCodigo(codigoNbs)) {
        throw new ValidationError('Código NBS não encontrado na base oficial (ANEXO_B)');
      }
      input.servico.codigoNbs = codigoNbs;
    }
    if (!input.tomador.cpfCnpj) {
      throw new ValidationError('CPF/CNPJ do tomador é obrigatório');
    }
    const doc = input.tomador.cpfCnpj.replace(/\D/g, '');
    if (input.tomador.tipo === 'PF' && doc.length !== 11) {
      throw new ValidationError('CPF do tomador inválido');
    }
    if (input.tomador.tipo === 'PJ' && doc.length !== 14) {
      throw new ValidationError('CNPJ do tomador inválido');
    }

    if (input.servico.tributacaoIssqn === '2' && !input.servico.tipoImunidade) {
      throw new ValidationError('Tipo de imunidade é obrigatório quando a tributação do ISSQN é Imunidade');
    }

    if (isOptanteSimplesNacional(input.opSimpNac) && !input.regApTribSN) {
      throw new ValidationError(
        'Regime de Apuração dos Tributos no Simples Nacional (regApTribSN) é obrigatório para optantes do SN',
      );
    }

    if (input.totTrib) {
      this.validarTotTrib(input.totTrib);
    }

    const v = input.valores;
    if (v.descontoIncondicionado !== undefined && v.descontoIncondicionado < 0) {
      throw new ValidationError('Desconto incondicionado não pode ser negativo');
    }
    if (v.descontoCondicionado !== undefined && v.descontoCondicionado < 0) {
      throw new ValidationError('Desconto condicionado não pode ser negativo');
    }
    if (v.valorRecebidoIntermediario !== undefined && v.valorRecebidoIntermediario < 0) {
      throw new ValidationError('Valor recebido pelo intermediário não pode ser negativo');
    }
  }

  private validarTotTrib(totTrib: NonNullable<EmitirNfseInput['totTrib']>): void {
    const required = (fields: Array<[string, number | undefined]>) => {
      for (const [label, value] of fields) {
        if (value === undefined || Number.isNaN(value)) {
          throw new ValidationError(`${label} é obrigatório para o modo de tributos aproximados selecionado`);
        }
        if (value < 0) {
          throw new ValidationError(`${label} não pode ser negativo`);
        }
      }
    };

    switch (totTrib.modo) {
      case 'valores':
        required([
          ['Valor aproximado federal', totTrib.valorFederal],
          ['Valor aproximado estadual', totTrib.valorEstadual],
          ['Valor aproximado municipal', totTrib.valorMunicipal],
        ]);
        break;
      case 'percentuais':
        required([
          ['Percentual federal', totTrib.percentualFederal],
          ['Percentual estadual', totTrib.percentualEstadual],
          ['Percentual municipal', totTrib.percentualMunicipal],
        ]);
        break;
      case 'aliquota_sn':
        if (totTrib.aliquotaSimplesNacional === undefined || Number.isNaN(totTrib.aliquotaSimplesNacional)) {
          throw new ValidationError('Alíquota no Simples Nacional é obrigatória para o modo selecionado');
        }
        if (totTrib.aliquotaSimplesNacional < 0) {
          throw new ValidationError('Alíquota no Simples Nacional não pode ser negativa');
        }
        break;
    }
  }
}

export class CalculadoraIss {
  calcular(valorServico: number, aliquota: number, deducoes = 0): number {
    const base = Math.max(0, valorServico - deducoes);
    return Math.round(base * (aliquota / 100) * 100) / 100;
  }
}
