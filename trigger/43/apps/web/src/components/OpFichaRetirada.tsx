import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  api,
  ApiError,
  type OpRetiradaPreview,
  type OpRetiradaVolume,
  type OrdemProducao,
  type OrdemProducaoMaterial,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate, formatDecimalBr } from '../lib/format';
import {
  formatPickPrincipal,
  modoRetirada,
  modoRetiradaLabel,
  modoRetiradaPreview,
  opKitLinhasOrdenadas,
} from '../lib/producaoPick';
import { opKitNome, opKitOnde, parseQtdeDigitada } from '../lib/producaoUi';
import type { EstoqueQrVolumeInfo } from '../lib/estoqueQrFila';

type PickRow = {
  lote_id: number;
  codigo: string;
  qtde_volume: string;
  qtde: string;
  unidade: string | null;
  data_validade: string | null;
  status: string | null;
  status_label: string | null;
  endereco: string | null;
  sugerido: boolean;
  lido: boolean;
};

function volumeToPick(v: OpRetiradaVolume, qtde: string, lido: boolean): PickRow | null {
  if (!v.lote_id) return null;
  return {
    lote_id: v.lote_id,
    codigo: v.codigo ?? String(v.lote_id),
    qtde_volume: v.qtde_volume ?? '0',
    qtde,
    unidade: v.unidade,
    data_validade: v.data_validade,
    status: v.status,
    status_label: v.status_label,
    endereco: v.endereco?.codigo ?? null,
    sugerido: v.sugerido,
    lido,
  };
}

function qtdeVolumeInteiro(v: {
  qtde_volume?: string | null;
  qtde_retirar?: string | null;
  qtde?: string | number;
}): string {
  if (v.qtde_volume && parseQtdeDigitada(v.qtde_volume) > 0) return v.qtde_volume;
  if (v.qtde_retirar && parseQtdeDigitada(v.qtde_retirar) > 0) return v.qtde_retirar;
  if ('qtde' in v && v.qtde != null && parseQtdeDigitada(String(v.qtde)) > 0) return String(v.qtde);
  return '0';
}

function previewComVolumesInteiros(preview: OpRetiradaPreview): OpRetiradaPreview {
  return {
    ...preview,
    volumes: preview.volumes.map((v) => ({ ...v, qtde_retirar: qtdeVolumeInteiro(v) })),
  };
}

function picksDaPreview(preview: OpRetiradaPreview, porVolume = false): PickRow[] {
  return preview.volumes
    .map((v) => volumeToPick(v, porVolume ? qtdeVolumeInteiro(v) : v.qtde_retirar, false))
    .filter((v): v is PickRow => v !== null);
}

function somaPicks(picks: PickRow[]): number {
  return picks.reduce((acc, p) => acc + parseQtdeDigitada(p.qtde), 0);
}

function somaPreviewMarcados(preview: OpRetiradaPreview): number {
  return preview.volumes.reduce((acc, v) => acc + parseQtdeDigitada(v.qtde_retirar), 0);
}

function qtdeCanon(n: number): string {
  return n.toFixed(4);
}

function lotesIds(ids: Array<number | null | undefined>): number[] {
  return ids.filter((id): id is number => typeof id === 'number' && id > 0).sort((a, b) => a - b);
}

function mesmosLotes(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function volumeInteiro(p: PickRow): boolean {
  const vol = parseQtdeDigitada(p.qtde_volume);
  const q = parseQtdeDigitada(p.qtde);
  return vol > 0 && Math.abs(q - vol) < 1e-4;
}

function volumePreviewInteiro(v: OpRetiradaVolume): boolean {
  const vol = parseQtdeDigitada(v.qtde_volume);
  const q = parseQtdeDigitada(v.qtde_retirar);
  return vol > 0 && Math.abs(q - vol) < 1e-4;
}

function PreviewVolumesEscolha({
  preview,
  disabled,
  onChange,
}: {
  preview: OpRetiradaPreview;
  disabled: boolean;
  onChange: (next: OpRetiradaPreview) => void;
}) {
  if (preview.volumes.length === 0) {
    return <p className="muted">Nenhum volume sugerido. Leia o QR ou inclua outro.</p>;
  }
  return (
    <ul className="op-pick-vols">
      {preview.volumes.map((v) => {
        const marcado = parseQtdeDigitada(v.qtde_retirar) > 0;
        return (
          <li
            key={v.lote_id ?? v.codigo}
            className={`op-pick-vols__item${marcado ? ' is-on' : ''}`}
          >
            <label className="op-pick-vols__check">
              <input
                type="checkbox"
                checked={marcado}
                disabled={disabled}
                onChange={() =>
                  onChange({
                    ...preview,
                    volumes: preview.volumes.map((x) =>
                      x.lote_id === v.lote_id
                        ? {
                            ...x,
                            qtde_retirar: marcado ? '0' : x.qtde_volume || x.qtde_retirar || '0',
                          }
                        : x,
                    ),
                  })
                }
              />
              <span>
                <strong>{v.codigo}</strong>
                {v.endereco ? ` · ${v.endereco.codigo}` : ' · sem local'}
                {marcado ? (volumePreviewInteiro(v) ? ' · volume inteiro' : ' · só parte') : ' · não levar'}
              </span>
            </label>
            {marcado && !volumePreviewInteiro(v) ? (
              <div className="form-group op-pick-vols__parte">
                <label>Só esta parte ({v.unidade})</label>
                <input
                  className="op-retirada__qtde"
                  inputMode="decimal"
                  value={v.qtde_retirar}
                  disabled={disabled}
                  onChange={(e) =>
                    onChange({
                      ...preview,
                      volumes: preview.volumes.map((x) =>
                        x.lote_id === v.lote_id ? { ...x, qtde_retirar: e.target.value } : x,
                      ),
                    })
                  }
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function lotesFefo(preview?: OpRetiradaPreview | null): number[] {
  if (!preview) return [];
  return lotesIds(preview.volumes.map((v) => v.lote_id));
}

function lotesMarcadosPicks(picks: PickRow[]): number[] {
  return lotesIds(picks.filter((p) => parseQtdeDigitada(p.qtde) > 0).map((p) => p.lote_id));
}

function lotesMarcadosPreview(preview: OpRetiradaPreview): number[] {
  return lotesIds(
    preview.volumes.filter((v) => parseQtdeDigitada(v.qtde_retirar) > 0).map((v) => v.lote_id),
  );
}

function picksIniciais(op: OrdemProducao): Record<number, PickRow[]> {
  const init: Record<number, PickRow[]> = {};
  for (const m of op.materiais ?? []) {
    if (m.pendente && m.retirada) {
      init[m.id] = picksDaPreview(m.retirada, modoRetirada(m) === 'volume');
    }
  }
  return init;
}

function qtdesUnidadeIniciais(op: OrdemProducao): Record<number, string> {
  const init: Record<number, string> = {};
  for (const m of op.materiais ?? []) {
    if (m.pendente && modoRetirada(m) === 'unidade') {
      init[m.id] = m.qtde_planejada ?? m.retirada?.qtde ?? '0';
    }
  }
  return init;
}

export type PedidoFichaEstoque = {
  materialId?: number;
  produtoId?: number;
  qtde?: string;
};

type Props = {
  op: OrdemProducao;
  mode: 'chao' | 'anexo';
  onOp: (data: OrdemProducao) => void;
  /** Pedido vindo da OP (complemento / extra) — estoque confirma aqui. */
  pedido?: PedidoFichaEstoque;
  /** Pick ticket já mostra o que pegar — some a tabela de 6 colunas. */
  hideResumo?: boolean;
  /** Azulejo + overlay marcam a baixa — some a lista de trabalho. */
  hideMarcar?: boolean;
};

/**
 * Confrontação sistema × físico da requisição — mesma ficha no chão e na OP.
 * Fato oficial = MOV SAIDA_PRODUCAO. Sem documento REQ-.
 */
export function OpFichaRetirada({ op, mode, onOp, pedido, hideResumo = false, hideMarcar = false }: Props) {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('producao.escrever') || hasPermission('estoque.escrever');
  const canHandoff = hasPermission('producao.escrever');
  const volRef = useRef<HTMLInputElement>(null);

  const [picks, setPicks] = useState<Record<number, PickRow[]>>(() => picksIniciais(op));
  const [qtdesUnidade, setQtdesUnidade] = useState<Record<number, string>>(() => qtdesUnidadeIniciais(op));
  const [motivos, setMotivos] = useState<Record<number, string>>({});
  const [qr, setQr] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [avaria, setAvaria] = useState<Record<number, { qtde: string; motivo: string }>>({});
  const [repo, setRepo] = useState<{
    materialId: number;
    qtde: string;
    preview: OpRetiradaPreview;
    fefoLotes: number[];
  } | null>(null);
  const [extra, setExtra] = useState<{
    produtoId: number;
    sku: string;
    qtde: string;
    preview: OpRetiradaPreview;
    fefoLotes: number[];
  } | null>(null);
  const [recebidoPor, setRecebidoPor] = useState(op.handoff?.recebidos_nome ?? '');

  useEffect(() => {
    setPicks(picksIniciais(op));
    setQtdesUnidade(qtdesUnidadeIniciais(op));
    setRecebidoPor(op.handoff?.recebidos_nome ?? '');
    setRepo(null);
  }, [op.id, op.handoff?.entregues_em, (op.materiais ?? []).map((m) => `${m.id}:${m.saida_movimento_id}:${m.qtde_requisitada}`).join('|')]);

  const ficha = op.ficha_retirada;
  const pendentes = (op.materiais ?? []).filter((m) => m.pendente);
  const requisitados = (op.materiais ?? []).filter((m) => !m.pendente);
  const chao = mode === 'chao';

  const resumoPicks = useMemo(() => {
    return opKitLinhasOrdenadas(pendentes).map((m) => {
      const lista = picks[m.id] ?? [];
      const alvo = parseQtdeDigitada(m.qtde_planejada ?? m.retirada?.qtde ?? '0');
      const soma = somaPicks(lista);
      const override = Boolean(
        modoRetirada(m) === 'volume' && m.retirada && !mesmosLotes(lotesFefo(m.retirada), lotesMarcadosPicks(lista)),
      );
      return { m, lista, alvo, soma, override };
    });
  }, [pendentes, picks]);

  const aplicar = (data: OrdemProducao) => {
    onOp(data);
  };

  const incluirVolume = (material: OrdemProducaoMaterial, vol: OpRetiradaVolume | EstoqueQrVolumeInfo, lido: boolean) => {
    const loteId = 'lote_id' in vol ? vol.lote_id : null;
    if (!loteId) return;
    const previewVol =
      material.retirada?.volumes.find((v) => v.lote_id === loteId) ??
      material.retirada?.candidatos.find((v) => v.lote_id === loteId);
    const qtde = qtdeVolumeInteiro(
      previewVol ?? { qtde_volume: 'qtde' in vol ? String(vol.qtde) : undefined, qtde: 'qtde' in vol ? vol.qtde : undefined },
    );
    const row = previewVol
      ? volumeToPick(previewVol, qtde, lido)
      : {
          lote_id: loteId,
          codigo: vol.codigo ?? String(loteId),
          qtde_volume: 'qtde' in vol ? String(vol.qtde) : '0',
          qtde,
          unidade: vol.unidade ?? material.unidade,
          data_validade: 'data_validade' in vol ? (vol.data_validade ?? null) : null,
          status: 'status' in vol ? (vol.status ?? null) : null,
          status_label: 'status_label' in vol ? (vol.status_label ?? null) : null,
          endereco: vol.endereco?.codigo ?? null,
          sugerido: false,
          lido,
        };
    if (!row) return;
    setPicks((prev) => {
      const atual = prev[material.id] ?? [];
      if (atual.some((p) => p.lote_id === loteId)) {
        return {
          ...prev,
          [material.id]: atual.map((p) =>
            p.lote_id === loteId
              ? {
                  ...p,
                  lido: p.lido || lido,
                  qtde: parseQtdeDigitada(p.qtde) > 0 ? p.qtde : qtde,
                }
              : p,
          ),
        };
      }
      return { ...prev, [material.id]: [...atual, row] };
    });
  };

  const lerVolume = async (payload: string) => {
    const p = payload.trim();
    if (!p) return;
    if (p.toUpperCase().startsWith('END:')) {
      setErr('Esse QR é de local (END:…). A ficha já mostra o local de cada volume.');
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api.get<{ data: EstoqueQrVolumeInfo }>(
        `/estoque/retiradas/${op.id}/volume?payload=${encodeURIComponent(p)}`,
      );
      const vol = res.data;
      const pendente = pendentes.find(
        (m) => m.produto?.id === vol.produto?.id && modoRetirada(m) === 'volume',
      );
      if (pendente) {
        incluirVolume(pendente, vol, true);
        setMsg(`Volume ${vol.codigo} marcado no kit.`);
        setQr('');
        setTimeout(() => volRef.current?.focus(), 50);
        return;
      }
      if (repo && (op.materiais ?? []).find((m) => m.id === repo.materialId)?.produto?.id === vol.produto?.id) {
        const cand =
          repo.preview.volumes.find((v) => v.lote_id === vol.lote_id) ??
          repo.preview.candidatos.find((v) => v.lote_id === vol.lote_id);
        if (cand) {
          setRepo({
            ...repo,
            preview: {
              ...repo.preview,
              volumes: repo.preview.volumes.some((v) => v.lote_id === vol.lote_id)
                ? repo.preview.volumes.map((v) =>
                    v.lote_id === vol.lote_id
                      ? { ...v, qtde_retirar: qtdeVolumeInteiro(v) }
                      : v,
                  )
                : [...repo.preview.volumes, { ...cand, qtde_retirar: qtdeVolumeInteiro(cand) }],
            },
          });
          setMsg(`Volume ${vol.codigo} incluído na reposição.`);
          setQr('');
          return;
        }
      }
      const ja = (op.materiais ?? []).find((m) => m.produto?.id === vol.produto?.id);
      setErr(
        ja && !ja.pendente
          ? `Volume ${vol.codigo} já saiu. Use «Pegar de novo» se rasgou ou faltou.`
          : `Volume ${vol.codigo} não é deste kit.`,
      );
      volRef.current?.select();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Volume não reconhecido.');
      volRef.current?.select();
    } finally {
      setBusy(false);
    }
  };

  const confirmarBaixa = async () => {
    const linhas: Record<string, unknown>[] = [];
    for (const r of resumoPicks) {
      if (modoRetirada(r.m) === 'volume') {
        const usar = r.lista.filter((p) => parseQtdeDigitada(p.qtde) > 0);
        if (usar.length === 0) continue;
        if (r.override && (motivos[r.m.id] ?? '').trim().length < 3) {
          setErr(`Informe o motivo (mínimo 3 caracteres) para o volume fora da sugestão em ${r.m.produto?.codigo}.`);
          return;
        }
        linhas.push({
          material_id: r.m.id,
          qtde: qtdeCanon(r.soma),
          volumes: usar.map((p) => ({ lote_id: p.lote_id, qtde: qtdeCanon(parseQtdeDigitada(p.qtde)) })),
          volumes_motivo: r.override ? motivos[r.m.id]?.trim() : undefined,
        });
      } else {
        const qtdeU = parseQtdeDigitada(qtdesUnidade[r.m.id] ?? String(r.alvo));
        if (qtdeU <= 0) continue;
        linhas.push({
          material_id: r.m.id,
          qtde: qtdeCanon(qtdeU),
        });
      }
    }
    if (linhas.length === 0) {
      setErr('Marque os volumes ou as unidades que vai levar.');
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api.post<{ data: OrdemProducao }>(`/estoque/retiradas/${op.id}/confirmar`, {
        linhas,
      });
      aplicar(res.data);
      setMotivos({});
      setMsg('Saiu do estoque. Entregue na produção ou, se rasgou, pegue de novo.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao confirmar a retirada.');
    } finally {
      setBusy(false);
    }
  };

  const registrarAvaria = async (material: OrdemProducaoMaterial) => {
    const form = avaria[material.id] ?? { qtde: '', motivo: '' };
    if (parseQtdeDigitada(form.qtde) <= 0) {
      setErr('Informe a quantidade avariada.');
      return;
    }
    if (form.motivo.trim().length < 3) {
      setErr('Informe o motivo da avaria (mínimo 3 caracteres).');
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api.post<{ data: OrdemProducao }>(`/estoque/retiradas/${op.id}/avaria`, {
        material_id: material.id,
        qtde: String(parseQtdeDigitada(form.qtde)),
        motivo: form.motivo.trim(),
      });
      aplicar(res.data);
      setMsg('Avaria na ficha. Requisite de novo a quantidade que falta — o processo se repete.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao registrar avaria.');
    } finally {
      setBusy(false);
    }
  };

  const prepararRepo = async (material: OrdemProducaoMaterial, qtdeForcada?: string) => {
    const form = avaria[material.id];
    const qtde =
      qtdeForcada && parseQtdeDigitada(qtdeForcada) > 0
        ? String(parseQtdeDigitada(qtdeForcada))
        : form && parseQtdeDigitada(form.qtde) > 0
          ? String(parseQtdeDigitada(form.qtde))
          : String(parseQtdeDigitada(material.qtde_avaria));
    if (parseQtdeDigitada(qtde) <= 0) {
      setErr('Informe a quantidade a requisitar de novo.');
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const q = new URLSearchParams({
        material_id: String(material.id),
        qtde,
      });
      const res = await api.get<{ data: OpRetiradaPreview }>(
        `/estoque/retiradas/${op.id}/preview?${q.toString()}`,
      );
      const porVolume = modoRetirada(material) === 'volume';
      setRepo({
        materialId: material.id,
        qtde,
        preview: porVolume ? previewComVolumesInteiros(res.data) : res.data,
        fefoLotes: lotesFefo(res.data),
      });
      setMsg(`Reposição ${material.produto?.codigo ?? 'SKU'} · ${formatDecimalBr(parseQtdeDigitada(qtde), 4)} ${material.unidade}.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao preparar a reposição.');
    } finally {
      setBusy(false);
    }
  };

  const confirmarRepo = async () => {
    if (!repo) return;
    const material = (op.materiais ?? []).find((m) => m.id === repo.materialId);
    if (!material) return;
    const porVolume = modoRetiradaPreview(repo.preview, material) === 'volume';
    const vols = porVolume
      ? repo.preview.volumes
          .filter((v) => v.lote_id && parseQtdeDigitada(v.qtde_retirar) > 0)
          .map((v) => ({ lote_id: v.lote_id as number, qtde: qtdeCanon(parseQtdeDigitada(v.qtde_retirar)) }))
      : [];
    if (porVolume && vols.length === 0) {
      setErr('Escolha os volumes da reposição (QR ou incluir).');
      return;
    }
    const somaVol = somaPreviewMarcados(repo.preview);
    const qtde = porVolume ? qtdeCanon(somaVol) : repo.qtde;
    const override = porVolume && !mesmosLotes(repo.fefoLotes, lotesMarcadosPreview(repo.preview));
    const motivo = motivos[-repo.materialId] ?? '';
    if (override && motivo.trim().length < 3) {
      setErr('Informe o motivo da troca de volume na reposição.');
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api.post<{ data: OrdemProducao }>(`/estoque/retiradas/${op.id}/confirmar`, {
        linhas: [
          {
            material_id: repo.materialId,
            qtde,
            complementar: true,
            volumes: vols.length > 0 ? vols : undefined,
            volumes_motivo: override ? motivo.trim() : undefined,
          },
        ],
      });
      aplicar(res.data);
      setRepo(null);
      setMsg('Reposição baixada. Novo ciclo na ficha da OP.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao requisitar de novo.');
    } finally {
      setBusy(false);
    }
  };

  const prepararExtra = async (produtoId: number, qtdeRaw: string) => {
    const qtde = String(parseQtdeDigitada(qtdeRaw));
    if (produtoId <= 0 || parseQtdeDigitada(qtde) <= 0) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const q = new URLSearchParams({
        produto_id: String(produtoId),
        qtde,
      });
      const res = await api.get<{ data: OpRetiradaPreview }>(
        `/estoque/retiradas/${op.id}/preview?${q.toString()}`,
      );
      const porVolume = modoRetiradaPreview(res.data) === 'volume';
      setExtra({
        produtoId,
        sku: `SKU #${produtoId}`,
        qtde,
        preview: porVolume ? previewComVolumesInteiros(res.data) : res.data,
        fefoLotes: lotesFefo(res.data),
      });
      setMsg(`Extra pedido pela OP · ${formatDecimalBr(parseQtdeDigitada(qtde), 4)}. Confirme o físico.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao preparar o extra.');
    } finally {
      setBusy(false);
    }
  };

  const confirmarExtra = async () => {
    if (!extra) return;
    const porVolume = modoRetiradaPreview(extra.preview) === 'volume';
    const vols = porVolume
      ? extra.preview.volumes
          .filter((v) => v.lote_id && parseQtdeDigitada(v.qtde_retirar) > 0)
          .map((v) => ({ lote_id: v.lote_id as number, qtde: qtdeCanon(parseQtdeDigitada(v.qtde_retirar)) }))
      : [];
    if (porVolume && vols.length === 0) {
      setErr('Escolha os volumes do extra (QR ou incluir).');
      return;
    }
    const somaVol = somaPreviewMarcados(extra.preview);
    const qtde = porVolume ? qtdeCanon(somaVol) : extra.qtde;
    const override = porVolume && !mesmosLotes(extra.fefoLotes, lotesMarcadosPreview(extra.preview));
    if (override && (motivos[-extra.produtoId] ?? '').trim().length < 3) {
      setErr('Informe o motivo da troca de volume no extra.');
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api.post<{ data: OrdemProducao }>(`/estoque/retiradas/${op.id}/confirmar`, {
        linhas: [
          {
            produto_id: extra.produtoId,
            qtde,
            volumes: vols.length > 0 ? vols : undefined,
            volumes_motivo: override ? (motivos[-extra.produtoId] ?? '').trim() : undefined,
          },
        ],
      });
      aplicar(res.data);
      setExtra(null);
      setMsg('Extra baixado. Ciclo anexado à OP.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao confirmar o extra.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (mode !== 'chao' || !pedido) return;
    if (pedido.materialId && pedido.qtde) {
      const m = (op.materiais ?? []).find((x) => x.id === pedido.materialId);
      if (m) void prepararRepo(m, pedido.qtde);
      return;
    }
    if (pedido.produtoId && pedido.qtde) {
      void prepararExtra(pedido.produtoId, pedido.qtde);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [op.id, mode, pedido?.materialId, pedido?.produtoId, pedido?.qtde]);

  const entregar = async () => {
    if (recebidoPor.trim().length < 2) {
      setErr('Informe quem recebeu na produção.');
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api.post<{ data: OrdemProducao }>(
        `/ordens-producao/${op.id}/entregar-insumos`,
        { recebido_por: recebidoPor.trim() },
      );
      aplicar(res.data);
      setMsg('Material entregue na produção.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao registrar a entrega.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="op-ficha" aria-labelledby="op-ficha-title">
      {hideResumo && chao ? (
        <h3 id="op-ficha-title" className="sr-only">
          Marcar o que pegou
        </h3>
      ) : (
      <header className="op-ficha__head">
        <div>
          <h3 id="op-ficha-title">{chao ? 'Marcar o que pegou' : 'O que saiu do estoque'}</h3>
          <p className="muted">
            {chao
              ? 'Bobina: escolha os volumes. Tubete, tinta e caixa: marque as unidades. Confirmar tira do estoque.'
              : 'O que já saiu. Rasgou? Pegue de novo.'}
          </p>
        </div>
        {mode === 'anexo' ? (
          <Link className="btn btn-secondary btn-sm" to={`/estoque/retiradas/${op.id}`}>
            Ir buscar
          </Link>
        ) : (
          <Link className="btn btn-secondary btn-sm" to={`/ordens-producao/${op.id}`}>
            Ficha da ordem
          </Link>
        )}
      </header>
      )}

      {err ? <div className="alert alert-danger">{err}</div> : null}
      {msg ? <div className="alert alert-info">{msg}</div> : null}

      {hideResumo ? null : (
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Material</th>
              <th>Precisa</th>
              <th>Já saiu</th>
              <th>Rasgou</th>
              <th>A pegar</th>
              <th>Diferença</th>
            </tr>
          </thead>
          <tbody>
            {(ficha?.linhas ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  Sem itens neste kit.
                </td>
              </tr>
            ) : (
              (ficha?.linhas ?? []).map((l) => {
                const mat = (op.materiais ?? []).find((m) => m.id === l.material_id);
                const porVolume = mat ? modoRetirada(mat) === 'volume' : false;
                return (
                <tr key={l.material_id}>
                  <td>
                    <strong>{l.sku ?? '—'}</strong>
                    {l.descricao ? (
                      <div className="muted" style={{ fontSize: '0.85em' }}>
                        {l.descricao}
                      </div>
                    ) : null}
                    <div className="muted" style={{ fontSize: '0.85em' }}>
                      {porVolume ? 'Por volumes' : 'Por unidades'}
                    </div>
                  </td>
                  <td>
                    {mat && porVolume
                      ? formatPickPrincipal(mat)
                      : `${formatDecimalBr(Number(l.planejado), 4)} ${l.unidade}`}
                  </td>
                  <td>
                    {parseQtdeDigitada(l.requisitado) > 0
                      ? `${formatDecimalBr(Number(l.requisitado), 4)} ${l.unidade}`
                      : '—'}
                  </td>
                  <td>
                    {parseQtdeDigitada(l.avaria) > 0 ? (
                      <>
                        {formatDecimalBr(Number(l.avaria), 4)} {l.unidade}
                        {l.motivo_avaria ? (
                          <div className="muted" style={{ fontSize: '0.85em' }}>
                            {l.motivo_avaria}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {l.pendente ? (
                      <strong>
                        {mat && porVolume
                          ? formatPickPrincipal(mat)
                          : `${formatDecimalBr(Number(l.a_retirar), 4)} ${l.unidade}`}
                      </strong>
                    ) : (
                      '—'
                    )}
                    {l.aguardando_material ? (
                      <div className="muted" style={{ color: 'var(--danger, #b42318)', fontSize: '0.85em' }}>
                        Sem saldo
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {parseQtdeDigitada(l.delta) > 0
                      ? `+${formatDecimalBr(Number(l.delta), 4)}`
                      : parseQtdeDigitada(l.delta) < 0
                        ? formatDecimalBr(Number(l.delta), 4)
                        : '0'}
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      )}

      {chao && !hideMarcar && pendentes.length > 0 ? (
        <div className="op-ficha__bloco">
          {pendentes.some((m) => modoRetirada(m) === 'volume') ? (
            <div className="form-group" style={{ maxWidth: 420 }}>
              <label htmlFor="ficha-vol-qr">Ler volume (VOL:…)</label>
              <input
                id="ficha-vol-qr"
                ref={volRef}
                value={qr}
                disabled={busy || !canWrite}
                onChange={(e) => setQr(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void lerVolume(qr);
                  }
                }}
                placeholder="Cole ou leia o QR do volume"
                autoComplete="off"
              />
            </div>
          ) : null}

          {resumoPicks.map((r, i) => {
            const porVolume = modoRetirada(r.m) === 'volume';
            const onde = opKitOnde(r.m);
            return (
            <article
              key={r.m.id}
              className={`op-pick-line op-pick-line--${porVolume ? 'volume' : 'unidade'}`}
            >
              <header className="op-pick-line__head">
                <span className="op-pick-line__n">{i + 1}</span>
                <div>
                  <p className="op-pick-line__bin">{onde === '—' ? 'Sem local' : onde}</p>
                  <p className="op-pick-line__modo">{modoRetiradaLabel(porVolume ? 'volume' : 'unidade')}</p>
                  <h4 className="op-pick-line__nome">{opKitNome(r.m)}</h4>
                  <p className="muted op-pick-line__meta">
                    {porVolume
                      ? `Pedido ${formatDecimalBr(r.alvo, 4)} ${r.m.unidade} · marcado ${formatDecimalBr(r.soma, 4)} ${r.m.unidade}`
                      : `Pedido ${formatDecimalBr(r.alvo, 4)} ${r.m.unidade}`}
                  </p>
                </div>
              </header>
              {porVolume ? (
                <>
                  {r.lista.length === 0 ? (
                    <p className="muted">Nenhum volume. Inclua abaixo ou leia o QR.</p>
                  ) : (
                    <ul className="op-pick-vols">
                      {r.lista.map((p) => {
                        const marcado = parseQtdeDigitada(p.qtde) > 0;
                        return (
                          <li
                            key={p.lote_id}
                            className={`op-pick-vols__item${p.status === 'VENCIDO' ? ' is-vencido' : ''}${marcado ? ' is-on' : ''}`}
                          >
                            <label className="op-pick-vols__check">
                              <input
                                type="checkbox"
                                checked={marcado}
                                disabled={busy || !canWrite}
                                onChange={() => {
                                  setPicks((prev) => ({
                                    ...prev,
                                    [r.m.id]: (prev[r.m.id] ?? []).map((x) =>
                                      x.lote_id === p.lote_id
                                        ? {
                                            ...x,
                                            qtde: marcado ? '0' : x.qtde_volume || '0',
                                            lido: !marcado,
                                          }
                                        : x,
                                    ),
                                  }));
                                }}
                              />
                              <span>
                                <strong>{p.codigo}</strong>
                                {p.endereco ? ` · ${p.endereco}` : ' · sem local'}
                                {marcado
                                  ? volumeInteiro(p)
                                    ? ' · volume inteiro'
                                    : ' · só parte'
                                  : ' · não levar'}
                                {' · '}
                                {formatDecimalBr(Number(p.qtde_volume), 4)} {p.unidade}
                                {!p.sugerido ? ' · fora da sugestão' : ''}
                              </span>
                            </label>
                            {marcado && !volumeInteiro(p) ? (
                              <div className="form-group op-pick-vols__parte">
                                <label>Só esta parte ({p.unidade})</label>
                                <input
                                  className="op-retirada__qtde"
                                  inputMode="decimal"
                                  value={p.qtde}
                                  disabled={busy || !canWrite}
                                  onChange={(e) =>
                                    setPicks((prev) => ({
                                      ...prev,
                                      [r.m.id]: (prev[r.m.id] ?? []).map((x) =>
                                        x.lote_id === p.lote_id ? { ...x, qtde: e.target.value, lido: true } : x,
                                      ),
                                    }))
                                  }
                                  aria-label={`Parte do volume ${p.codigo}`}
                                />
                              </div>
                            ) : null}
                            {marcado && volumeInteiro(p) ? (
                              <details className="op-pick-vols__parte">
                                <summary>Só parte deste volume</summary>
                                <input
                                  className="op-retirada__qtde"
                                  inputMode="decimal"
                                  value={p.qtde}
                                  disabled={busy || !canWrite}
                                  onChange={(e) =>
                                    setPicks((prev) => ({
                                      ...prev,
                                      [r.m.id]: (prev[r.m.id] ?? []).map((x) =>
                                        x.lote_id === p.lote_id ? { ...x, qtde: e.target.value, lido: true } : x,
                                      ),
                                    }))
                                  }
                                  aria-label={`Parte do volume ${p.codigo}`}
                                />
                              </details>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {(r.m.retirada?.candidatos ?? []).length > 0 ? (
                    <details className="op-retirada__outros">
                      <summary>Outros volumes deste produto</summary>
                      <ul>
                        {r.m.retirada!.candidatos.map((c) => (
                          <li key={c.lote_id ?? c.codigo}>
                            <span>
                              <strong>{c.codigo}</strong>
                              {c.endereco ? ` · ${c.endereco.codigo}` : ' · sem local'}
                              {' · '}
                              {formatDecimalBr(Number(c.qtde_volume ?? 0), 4)} {c.unidade}
                            </span>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={busy || !canWrite || !c.lote_id}
                              onClick={() => incluirVolume(r.m, c, true)}
                            >
                              Pegar este volume
                            </button>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                  {r.override ? (
                    <div className="form-group" style={{ marginTop: '0.65rem', maxWidth: 420 }}>
                      <label>Motivo da troca de volume</label>
                      <input
                        value={motivos[r.m.id] ?? ''}
                        onChange={(e) => setMotivos((prev) => ({ ...prev, [r.m.id]: e.target.value }))}
                        disabled={busy}
                        placeholder="Ex.: rasgo no rolo sugerido, já na máquina"
                      />
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="form-group op-pick-un">
                  <label htmlFor={`ficha-un-${r.m.id}`}>Quantas unidades vai levar ({r.m.unidade})</label>
                  <input
                    id={`ficha-un-${r.m.id}`}
                    className="op-retirada__qtde"
                    inputMode="decimal"
                    value={qtdesUnidade[r.m.id] ?? String(r.alvo || '')}
                    disabled={busy || !canWrite}
                    onChange={(e) =>
                      setQtdesUnidade((prev) => ({ ...prev, [r.m.id]: e.target.value }))
                    }
                  />
                  <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                    Pedido da ordem: {formatDecimalBr(r.alvo, 4)} {r.m.unidade}. Sem volume — só a quantidade.
                  </p>
                </div>
              )}
            </article>
            );
          })}

          <div style={{ marginTop: '0.9rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !canWrite}
              onClick={() => void confirmarBaixa()}
            >
              Confirmar: saiu do estoque
            </button>
          </div>
        </div>
      ) : null}

      {(ficha?.ciclos ?? []).length > 0 ? (
        <div className="op-ficha__bloco">
          <h4>O que já saiu</h4>
          <p className="muted">Retiradas de {op.codigo}. Cada confirmação é uma saída.</p>
          {ficha!.ciclos.map((c) => (
            <article key={c.movimento_id} className="op-ficha__ciclo">
              <header>
                <strong>
                  {c.n}ª retirada
                  {c.complementar ? ' · pegou de novo' : ''}
                </strong>
                <span className="muted">
                  {c.movimento_codigo}
                  {c.em ? ` · ${formatDate(c.em)}` : ''}
                </span>
              </header>
              <ul>
                {c.itens.map((it, i) => (
                  <li key={`${c.movimento_id}-${it.lote_id ?? 'q'}-${i}`}>
                    <strong>{it.sku ?? 'SKU'}</strong>
                    {it.codigo ? ` · ${it.codigo}` : ' · quantidade'}
                    {it.endereco ? ` · ${it.endereco.codigo}` : ''}
                    {' · '}
                    {formatDecimalBr(Number(it.qtde), 4)} {it.unidade}
                  </li>
                ))}
              </ul>
              {c.observacao ? <p className="muted">{c.observacao}</p> : null}
            </article>
          ))}
        </div>
      ) : hideMarcar ? null : (
        <p className="muted">Nada baixado ainda — a ficha fica vazia até a primeira confirmação.</p>
      )}

      {chao && requisitados.length > 0 ? (
        <div className="op-ficha__bloco">
          <h4>Rasgou ou faltou — pegar de novo</h4>
          <p className="muted">
            Informe o que perdeu. Depois busque de novo a mesma quantidade — a lista se repete.
          </p>
          {requisitados.map((m) => {
            const form = avaria[m.id] ?? {
              qtde: parseQtdeDigitada(m.qtde_avaria) > 0 ? String(m.qtde_avaria) : '',
              motivo: m.motivo_avaria ?? '',
            };
            return (
              <div key={m.id} className="op-ficha__avaria">
                <strong>{m.produto?.codigo ?? 'SKU'}</strong>
                <span className="muted">
                  Já saiu {formatDecimalBr(parseQtdeDigitada(m.qtde_requisitada), 4)} {m.unidade}
                </span>
                <div className="op-ficha__avaria-row">
                  <div className="form-group">
                    <label>Qtde avariada</label>
                    <input
                      inputMode="decimal"
                      value={form.qtde}
                      disabled={busy || !canWrite}
                      onChange={(e) =>
                        setAvaria((prev) => ({
                          ...prev,
                          [m.id]: { ...form, qtde: e.target.value },
                        }))
                      }
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Motivo</label>
                    <input
                      value={form.motivo}
                      disabled={busy || !canWrite}
                      onChange={(e) =>
                        setAvaria((prev) => ({
                          ...prev,
                          [m.id]: { ...form, motivo: e.target.value },
                        }))
                      }
                      placeholder="Ex.: bobina rasgada na mesa"
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy || !canWrite}
                    onClick={() => void registrarAvaria(m)}
                  >
                    Registrar perda
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy || !canWrite}
                    onClick={() => void prepararRepo(m)}
                  >
                    Pegar de novo
                  </button>
                </div>
              </div>
            );
          })}

          {repo ? (
            <div className="op-retirada" style={{ marginTop: '0.85rem' }}>
              <h4 style={{ margin: '0 0 0.35rem' }}>
                Reposição · {(op.materiais ?? []).find((x) => x.id === repo.materialId)?.produto?.codigo}{' '}
                · {formatDecimalBr(parseQtdeDigitada(repo.qtde), 4)}
              </h4>
              {modoRetiradaPreview(
                repo.preview,
                (op.materiais ?? []).find((x) => x.id === repo.materialId),
              ) === 'volume' ? (
                <>
                  <p className="muted">
                    Escolha os volumes. Marcado {formatDecimalBr(somaPreviewMarcados(repo.preview), 4)}{' '}
                    {repo.preview.unidade}.
                  </p>
                  <PreviewVolumesEscolha
                    preview={repo.preview}
                    disabled={busy}
                    onChange={(preview) => setRepo({ ...repo, preview })}
                  />
                  {!mesmosLotes(repo.fefoLotes, lotesMarcadosPreview(repo.preview)) ? (
                    <div className="form-group" style={{ marginTop: '0.65rem', maxWidth: 420 }}>
                      <label>Motivo da troca de volume</label>
                      <input
                        value={motivos[-repo.materialId] ?? ''}
                        onChange={(e) => setMotivos((prev) => ({ ...prev, [-repo.materialId]: e.target.value }))}
                        disabled={busy}
                        placeholder="Ex.: rasgo no rolo sugerido"
                      />
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="muted">
                  Este produto sai por unidade — a reposição baixa{' '}
                  {formatDecimalBr(parseQtdeDigitada(repo.qtde), 4)} {repo.preview.unidade}.
                </p>
              )}
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => void confirmarRepo()}
                >
                  Confirmar reposição
                </button>
                <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setRepo(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {chao && extra ? (
        <div className="op-ficha__bloco">
          <h4>Acrescentado no kit</h4>
          <p className="muted">
            {extra.sku} · {formatDecimalBr(parseQtdeDigitada(extra.qtde), 4)} — confirme o que pegou.
          </p>
          {modoRetiradaPreview(extra.preview) === 'volume' ? (
            <>
              <p className="muted">
                Escolha os volumes. Marcado {formatDecimalBr(somaPreviewMarcados(extra.preview), 4)}{' '}
                {extra.preview.unidade}.
              </p>
              <PreviewVolumesEscolha
                preview={extra.preview}
                disabled={busy}
                onChange={(preview) => setExtra({ ...extra, preview })}
              />
              {!mesmosLotes(extra.fefoLotes, lotesMarcadosPreview(extra.preview)) ? (
                <div className="form-group" style={{ marginTop: '0.65rem', maxWidth: 420 }}>
                  <label>Motivo da troca de volume</label>
                  <input
                    value={motivos[-extra.produtoId] ?? ''}
                    onChange={(e) => setMotivos((prev) => ({ ...prev, [-extra.produtoId]: e.target.value }))}
                    disabled={busy}
                    placeholder="Ex.: rasgo no rolo sugerido"
                  />
                </div>
              ) : null}
            </>
          ) : (
            <p className="muted">
              Este produto sai por unidade — confirmar {formatDecimalBr(parseQtdeDigitada(extra.qtde), 4)}{' '}
              {extra.preview.unidade}.
            </p>
          )}
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !canWrite}
              onClick={() => void confirmarExtra()}
            >
              Confirmar: saiu do estoque
            </button>
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setExtra(null)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {chao && op.pode_entregar_insumos ? (
        <div className="op-ficha__bloco">
          <h4>Entregar na produção</h4>
          <p className="muted">O material já saiu. Quem recebeu na máquina?</p>
          <div className="form-group" style={{ maxWidth: 320 }}>
            <label>Quem recebeu</label>
            <input
              value={recebidoPor}
              onChange={(e) => setRecebidoPor(e.target.value)}
              disabled={busy || !canHandoff}
              placeholder="Nome no chão de fábrica"
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !canHandoff}
            onClick={() => void entregar()}
          >
            Confirmar entrega
          </button>
        </div>
      ) : null}

      {op.handoff?.entregue ? (
        <p className="muted">
          Entregue
          {op.handoff.entregues_em ? ` em ${formatDate(op.handoff.entregues_em)}` : ''}
          {op.handoff.recebidos_nome ? ` · ${op.handoff.recebidos_nome}` : ''}
          {op.handoff.entregues_por ? ` · registrado por ${op.handoff.entregues_por.nome}` : ''}.
        </p>
      ) : null}

      {chao && !canWrite ? (
        <p className="muted">
          Leitura liberada. Baixa e avaria exigem <strong>produção.escrever</strong> ou{' '}
          <strong>estoque.escrever</strong>.
        </p>
      ) : null}

      {mode === 'anexo' && ficha?.linhas.some((l) => l.pendente) ? (
        <p className="muted">
          Ainda falta pegar.{' '}
          <Link to={`/estoque/retiradas/${op.id}`}>Abrir lista de retirada</Link>.
        </p>
      ) : null}
    </section>
  );
}

export function OpVolumesBaixadosFicha({
  volumes,
  unidade,
}: {
  volumes: OpRetiradaVolume[];
  unidade: string;
}) {
  if (volumes.length === 0) return null;
  return (
    <ul className="op-retirada__baixados">
      {volumes.map((v, i) => (
        <li key={`${v.lote_id ?? 'q'}-${v.movimento_id ?? i}`}>
          {v.codigo ? <strong>{v.codigo}</strong> : <strong>Quantidade</strong>}
          {v.endereco ? ` · ${v.endereco.codigo}` : ''}
          {' · '}
          {formatDecimalBr(Number(v.qtde_retirar), 4)} {v.unidade || unidade}
          {v.movimento_codigo ? ` · ${v.movimento_codigo}` : ''}
        </li>
      ))}
    </ul>
  );
}
