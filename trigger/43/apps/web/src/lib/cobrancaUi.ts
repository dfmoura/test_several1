import type { DocumentoFiscalSaida, Faturamento, Titulo } from './api';

const COB_MORTA = new Set(['CANCELADA', 'ESTORNADA', 'FALHA']);

export function hrefFichaCobranca(faturamentoId: number, tituloId: number): string {
  return `/financeiro/faturamentos/${faturamentoId}/cobranca/${tituloId}/ficha`;
}

export function cobrancaVigente(titulo: Titulo): NonNullable<Titulo['cobrancas']>[number] | null {
  const rows = (titulo.cobrancas ?? []).filter((c) => !COB_MORTA.has(c.status));
  const comInstrumento = rows.find((c) => Boolean(c.pix_copia_cola || c.linha_digitavel));
  return comInstrumento ?? rows[0] ?? null;
}

export function tituloPreferidoFicha(titulos: Titulo[] | undefined): Titulo | null {
  const list = titulos ?? [];
  if (list.length === 0) return null;
  return (
    list.find((t) => t.status === 'ABERTO' || t.status === 'PARCIAL') ??
    list[0] ??
    null
  );
}

export function saldoAberto(titulo: Titulo): boolean {
  const n = Number.parseFloat(titulo.saldo ?? '0');
  return Number.isFinite(n) && n > 0;
}

export function nfeReferencia(fat: Faturamento): { chave: string | null; numero: string | null } | null {
  const docs = fat.documentos_fiscais ?? [];
  const oficial = docs.find((d: DocumentoFiscalSaida) => d.previa?.oficial === true && d.tipo === 'NFE');
  const doc = oficial ?? docs.find((d) => d.tipo === 'NFE');
  if (!doc) return null;
  const chave = doc.chave ?? null;
  const numero = doc.numero != null ? String(doc.numero) : null;
  if (!chave && !numero) return null;
  return { chave, numero };
}
