import type { RastreioDocumento, RastreioInsumo, RastreioOrigem } from './api';

export function nomeFornecedor(origem: RastreioOrigem): string {
  const f = origem.fornecedor;
  if (!f) return '—';
  return (f.nome_fantasia || f.razao_social || f.codigo || '—').trim() || '—';
}

export function nfLabel(origem: RastreioOrigem): string {
  const nfe = origem.nfe_entrada;
  if (nfe?.numero) {
    return nfe.serie ? `${nfe.numero}/${nfe.serie}` : nfe.numero;
  }
  return origem.nf_numero || '—';
}

export function origemTipoLabel(tipo: string): string {
  switch (tipo) {
    case 'ENTRADA_COMPRA':
      return 'Compra';
    case 'AJUSTE':
      return 'Ajuste';
    case 'VIRADA':
      return 'Virada';
    case 'BACKFILL':
      return 'Abertura';
    default:
      return tipo || '—';
  }
}

export function temSaida(doc: RastreioDocumento | null | undefined): boolean {
  if (!doc) return false;
  if ((doc.insumos ?? []).some((i) => !i.pendente)) return true;
  if ((doc.consumos ?? []).length > 0) return true;
  return false;
}

export function insumosComSaida(doc: RastreioDocumento | null | undefined): RastreioInsumo[] {
  return (doc?.insumos ?? []).filter((i) => !i.pendente);
}
