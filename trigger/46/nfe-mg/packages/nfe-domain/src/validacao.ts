import { ValidationError, onlyDigits } from '@nfe/shared';
import type { Crt, EmitirNfeInput, CancelarNfeInput, CceInput } from './entities.js';
import { cfopPorCodigo } from './catalogos.js';

const CNPJ_RE = /^\d{14}$/;
const CPF_RE = /^\d{11}$/;
const NCM_RE = /^\d{8}$/;
const CFOP_RE = /^\d{4}$/;

export class ValidadorRegrasNegocio {
  validarEmissao(input: EmitirNfeInput, crt: Crt): void {
    if (!input.naturezaOperacao?.trim()) {
      throw new ValidationError('Natureza da operação é obrigatória');
    }
    if (!input.itens?.length) {
      throw new ValidationError('Informe ao menos um item');
    }
    if (input.itens.length > 990) {
      throw new ValidationError('Máximo de 990 itens por NF-e');
    }

    const dest = input.destinatario;
    const doc = onlyDigits(dest.cpfCnpj);
    if (dest.tipo === 'PJ' && !CNPJ_RE.test(doc)) {
      throw new ValidationError('CNPJ do destinatário inválido');
    }
    if (dest.tipo === 'PF' && !CPF_RE.test(doc)) {
      throw new ValidationError('CPF do destinatário inválido');
    }
    if (!dest.razaoSocial?.trim()) {
      throw new ValidationError('Nome/razão social do destinatário é obrigatório');
    }
    if (!dest.endereco?.codigoMunicipio || dest.endereco.codigoMunicipio.length !== 7) {
      throw new ValidationError('Código IBGE do município do destinatário inválido');
    }
    if (!dest.endereco.uf || dest.endereco.uf.length !== 2) {
      throw new ValidationError('UF do destinatário inválida');
    }
    if (dest.indIEDest === '1' && !dest.inscricaoEstadual?.trim()) {
      throw new ValidationError('IE do destinatário obrigatória quando contribuinte ICMS');
    }

    for (const [i, item] of input.itens.entries()) {
      const n = i + 1;
      if (!item.codigo?.trim()) throw new ValidationError(`Item ${n}: código obrigatório`);
      if (!item.descricao?.trim()) throw new ValidationError(`Item ${n}: descrição obrigatória`);
      if (!NCM_RE.test(item.ncm.replace(/\D/g, ''))) {
        throw new ValidationError(`Item ${n}: NCM deve ter 8 dígitos`);
      }
      if (!CFOP_RE.test(item.cfop)) {
        throw new ValidationError(`Item ${n}: CFOP inválido`);
      }
      if (!cfopPorCodigo(item.cfop) && !item.cfop.startsWith('5') && !item.cfop.startsWith('6')) {
        throw new ValidationError(`Item ${n}: CFOP ${item.cfop} não reconhecido`);
      }
      if (item.quantidade <= 0) throw new ValidationError(`Item ${n}: quantidade deve ser positiva`);
      if (item.valorUnitario < 0) throw new ValidationError(`Item ${n}: valor unitário inválido`);

      if (crt === '1' || crt === '2') {
        if (!item.csosn) {
          item.csosn = '102';
        }
      } else if (!item.cst) {
        item.cst = '00';
      }
    }
  }

  validarCancelamento(input: CancelarNfeInput): void {
    if (!input.motivo || input.motivo.trim().length < 15) {
      throw new ValidationError('Motivo do cancelamento deve ter no mínimo 15 caracteres');
    }
    if (input.motivo.length > 255) {
      throw new ValidationError('Motivo do cancelamento deve ter no máximo 255 caracteres');
    }
  }

  validarCce(input: CceInput): void {
    if (!input.correcao || input.correcao.trim().length < 15) {
      throw new ValidationError('Texto da carta de correção deve ter no mínimo 15 caracteres');
    }
    if (input.correcao.length > 1000) {
      throw new ValidationError('Texto da carta de correção deve ter no máximo 1000 caracteres');
    }
  }
}

export function money(value: number): string {
  return value.toFixed(2);
}

export function qty(value: number): string {
  return value.toFixed(4);
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
