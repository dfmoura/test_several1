/** Tipos e helpers da fila QR volume + local (WMS leve — Guardar / INV / AJU). */

export type EstoqueQrVolumeInfo = {
  lote_id: number;
  codigo: string;
  qr_payload: string;
  produto: { id: number; codigo: string; descricao_fiscal: string } | null;
  qtde: string;
  unidade: string;
  endereco: { id: number; codigo: string } | null;
  nf_numero: string | null;
  data_entrada: string | null;
};

export type EstoqueQrEnderecoInfo = {
  id: number;
  codigo: string;
  prateleira: number;
  coluna: number;
  vao: number;
  qr_payload: string;
};

/** Ordem de leitura no chão — mesma dinâmica do Guardar (ADR F4). */
export type EstoqueQrOrdemLeitura = 'volume_primeiro' | 'vao_primeiro';

export type EstoqueQrVolumeStatus = 'ENCONTRADO' | 'LOCAL_ERRADO' | 'SEM_LOCAL';

export function estoqueQrStatusVolume(
  vol: EstoqueQrVolumeInfo,
  endereco: EstoqueQrEnderecoInfo | null,
): EstoqueQrVolumeStatus {
  if (!endereco || !vol.endereco) return 'SEM_LOCAL';
  return vol.endereco.id === endereco.id ? 'ENCONTRADO' : 'LOCAL_ERRADO';
}

export function estoqueQrSomaQtde(fila: EstoqueQrVolumeInfo[]): string {
  let s = 0;
  for (const v of fila) {
    const n = Number(String(v.qtde).replace(',', '.'));
    if (Number.isFinite(n) && n > 0) s += n;
  }
  // Mantém escala operacional típica (4 casas) sem depender de formatters.
  return s.toFixed(4);
}

export function estoqueQrTemLocalErrado(
  fila: EstoqueQrVolumeInfo[],
  endereco: EstoqueQrEnderecoInfo | null,
): boolean {
  if (!endereco) return false;
  return fila.some((v) => estoqueQrStatusVolume(v, endereco) === 'LOCAL_ERRADO');
}

/** Evidência de auditoria no AJU — não alimenta Writer / lote_payload. */
export type EstoqueAjusteContagemEvidencia = {
  modo: 'QR_VOLUME_LOCAL';
  endereco: { id: number; codigo: string };
  volumes: Array<{
    lote_id: number;
    codigo: string;
    qtde: string;
    unidade: string;
    status: EstoqueQrVolumeStatus;
    endereco_atual: string | null;
  }>;
  qtde_soma: string;
};
