export function comStatusLabel(status: string | null | undefined): string {
  const map: Record<string, string> = {
    PREVISTA: 'Prevista',
    LIBERADA: 'Liberada',
    PAGA: 'Paga',
    ESTORNADA: 'Estornada',
  };
  return map[String(status || '')] ?? String(status || '—');
}

export function cfeStatusLabel(status: string | null | undefined): string {
  const map: Record<string, string> = {
    ABERTO: 'Aberto',
    TITULO_GERADO: 'Título gerado',
    PAGO: 'Pago',
    CANCELADO: 'Cancelado',
  };
  return map[String(status || '')] ?? String(status || '—');
}

export function comOrigemLabel(origem: string | null | undefined): string {
  if (origem === 'BAIXA') return 'Baixa do recebimento';
  if (origem === 'APROPRIACAO_SINAL') return 'Sinal apropriado';
  return String(origem || '—');
}
