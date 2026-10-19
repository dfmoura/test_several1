/** Rótulos fiscais de saída (NF-e / NFS-e) — espelham o servidor. */

import type { DocumentoFiscalSaida, Faturamento } from './api';
import { formatDecimalBr } from './format';

export function nfStatusLabel(status: string | null | undefined, simulada?: boolean): string {
  if (simulada && status === 'AUTORIZADA') return 'Autorizada (teste)';
  switch (status) {
    case 'PENDENTE':
      return 'NF pendente';
    case 'PROCESSANDO':
      return 'Processando na SEFAZ';
    case 'AUTORIZADA':
      return 'Autorizada';
    case 'REJEITADA':
      return 'Rejeitada';
    case 'CANCELADA':
      return 'Cancelada';
    default:
      return (status ?? '—').replace(/_/g, ' ');
  }
}

export function docFiscalTipoLabel(tipo: string): string {
  if (tipo === 'NFE') return 'NF-e (produto)';
  if (tipo === 'NFSE') return 'NFS-e (serviço)';
  return tipo;
}

export function docFiscalStatusLabel(status: string, simulada?: boolean): string {
  if (simulada && status === 'AUTORIZADO') return 'Autorizada (teste)';
  switch (status) {
    case 'PLANEJADO':
      return 'Planejada';
    case 'PROCESSANDO':
      return 'Processando';
    case 'AUTORIZADO':
      return 'Autorizada';
    case 'REJEITADO':
      return 'Rejeitada';
    case 'ERRO':
      return 'Erro de envio';
    case 'CANCELADO':
      return 'Cancelada';
    default:
      return status.replace(/_/g, ' ');
  }
}

/**
 * NF-e oficial apta a eventos SEFAZ (cancelamento 110111 / CC-e 110110).
 * Stub local não entra — só nota com chave autorizada (SEFAZ ou legado Focus).
 */
export function nfePodeEventoSefaz(doc: DocumentoFiscalSaida | null | undefined): boolean {
  if (!doc || doc.tipo !== 'NFE') return false;
  if (doc.status !== 'AUTORIZADO') return false;
  if (!doc.chave || doc.chave.replace(/\D/g, '').length !== 44) return false;
  if (doc.autorizacao_origem === 'STUB') return false;
  return true;
}

export function fatTemNfeParaEventoSefaz(fat: Faturamento | null | undefined): boolean {
  return (fat?.documentos_fiscais ?? []).some(nfePodeEventoSefaz);
}

export function nfeCanceladaSefaz(doc: DocumentoFiscalSaida | null | undefined): boolean {
  return Boolean(doc && doc.tipo === 'NFE' && doc.status === 'CANCELADO' && doc.chave);
}

/** NFS-e autorizada na SEFIN, com chave de 50 dígitos. Ensaio e stub ficam de fora. */
export function nfsePodeCancelarSefin(doc: DocumentoFiscalSaida | null | undefined): boolean {
  if (!doc || doc.tipo !== 'NFSE') return false;
  if (doc.status !== 'AUTORIZADO') return false;
  if (doc.autorizacao_origem !== 'SEFIN') return false;
  if (!doc.chave || doc.chave.replace(/\D/g, '').length !== 50) return false;
  const prot = doc.protocolo ?? '';
  if (prot.startsWith('FAKE') || prot.startsWith('SIM')) return false;
  return true;
}

export function nfseCanceladaSefin(doc: DocumentoFiscalSaida | null | undefined): boolean {
  return Boolean(doc && doc.tipo === 'NFSE' && doc.status === 'CANCELADO' && doc.chave);
}

/** Linha de peso do volume da NF-e, em kg. Null quando a nota não leva peso. */
export function textoPesoNfe(
  vol?: {
    quantidade?: string | number | null;
    especie?: string | null;
    peso_liquido?: string | null;
    peso_bruto?: string | null;
  } | null,
): string | null {
  const liquido = (vol?.peso_liquido ?? '').trim();
  if (liquido === '') return null;
  const partes = [`líquido ${formatDecimalBr(liquido, 3)} kg`];
  const bruto = (vol?.peso_bruto ?? '').trim();
  if (bruto !== '') partes.push(`bruto ${formatDecimalBr(bruto, 3)} kg`);
  const qtde = vol?.quantidade;
  if (qtde != null && String(qtde).trim() !== '') {
    partes.push(`${qtde} ${vol?.especie ?? 'volume(s)'}`);
  }
  return partes.join(' · ');
}
