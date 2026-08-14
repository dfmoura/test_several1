/** Rótulos fiscais de saída (NF-e / NFS-e) — espelham o servidor. */

export function nfStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'PENDENTE':
      return 'NF pendente';
    case 'PROCESSANDO':
      return 'Processando no hub';
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

export function docFiscalStatusLabel(status: string): string {
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
