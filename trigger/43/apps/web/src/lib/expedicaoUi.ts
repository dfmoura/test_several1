/** Labels de expedição — estudo 32 ENTREGA_CONFIRMACAO_CLIENTE. */

const ENT_STATUS: Record<string, string> = {
  AGUARDA_RETIRADA: 'Aguardando retirada',
  EM_TRANSITO: 'Em transporte',
  ENTREGUE: 'Entregue',
  RECUSADA: 'Recusada',
  CANCELADA: 'Cancelada',
};

const MODO: Record<string, string> = {
  RETIRAR: 'Retirar no balcão',
  ENTREGAR: 'Entregar',
};

const TIPO: Record<string, string> = {
  BALCAO: 'Balcão',
  FROTA: 'Frota própria',
  TRANSPORTADORA: 'Transportadora',
  OUTRO: 'Outro',
};

const PROVA: Record<string, string> = {
  ASSINATURA_BALCAO: 'Retirada no balcão',
  CANHOTO: 'Canhoto',
  RASTREIO: 'Rastreio / protocolo',
  OUTRO: 'Outra prova',
};

export function entStatusLabel(status: string): string {
  return ENT_STATUS[status] ?? status.replace(/_/g, ' ');
}

export function modoEntregaLabel(modo: string): string {
  return MODO[modo] ?? modo;
}

export function tipoSaidaLabel(tipo: string): string {
  return TIPO[tipo] ?? tipo.replace(/_/g, ' ');
}

export function provaTipoLabel(tipo: string): string {
  return PROVA[tipo] ?? tipo.replace(/_/g, ' ');
}

export function formatDestinoLinha(d?: {
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
  cep?: string | null;
  label?: string | null;
} | null): string {
  if (!d) return '—';
  const rua = [d.logradouro, d.numero].filter(Boolean).join(', ');
  const cid = [d.bairro, d.municipio, d.uf].filter(Boolean).join(' · ');
  const parts = [rua, cid, d.cep].filter(Boolean);
  return parts.length ? parts.join(' — ') : d.label || '—';
}
