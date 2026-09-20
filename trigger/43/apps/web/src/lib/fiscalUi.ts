/** Rótulos fiscais de saída (NF-e / NFS-e) — espelham o servidor. */

import type { DocumentoFiscalSaida, Faturamento } from './api';

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
