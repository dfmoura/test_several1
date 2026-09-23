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
import { parseQtdeDigitada } from '../lib/producaoUi';
import { validadeStatusLabel } from '../lib/produtoLotePolitica';
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

function picksDaPreview(preview: OpRetiradaPreview): PickRow[] {
  return preview.volumes
    .map((v) => volumeToPick(v, v.qtde_retirar, false))
    .filter((v): v is PickRow => v !== null);
}

function somaPicks(picks: PickRow[]): number {
  return picks.reduce((acc, p) => acc + parseQtdeDigitada(p.qtde), 0);
}

function mesmaAlocacao(preview: OpRetiradaPreview, picks: PickRow[]): boolean {
  const a = preview.volumes
    .filter((v) => v.lote_id && parseQtdeDigitada(v.qtde_retirar) > 0)
    .map((v) => `${v.lote_id}:${Number(v.qtde_retirar).toFixed(4)}`)
    .sort();
  const b = picks
    .filter((p) => parseQtdeDigitada(p.qtde) > 0)
    .map((p) => `${p.lote_id}:${parseQtdeDigitada(p.qtde).toFixed(4)}`)
    .sort();
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function picksIniciais(op: OrdemProducao): Record<number, PickRow[]> {
  const init: Record<number, PickRow[]> = {};
  for (const m of op.materiais ?? []) {
    if (m.pendente && m.retirada) {
      init[m.id] = picksDaPreview(m.retirada);
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
};

/**
 * Confrontação sistema × físico da requisição — mesma ficha no chão e na OP.
 * Fato oficial = MOV SAIDA_PRODUCAO. Sem documento REQ-.
 */
export function OpFichaRetirada({ op, mode, onOp, pedido }: Props) {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('producao.escrever') || hasPermission('estoque.escrever');
  const canHandoff = hasPermission('producao.escrever');
  const volRef = useRef<HTMLInputElement>(null);

  const [picks, setPicks] = useState<Record<number, PickRow[]>>(() => picksIniciais(op));
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
  } | null>(null);
  const [extra, setExtra] = useState<{
    produtoId: number;
    sku: string;
    qtde: string;
    preview: OpRetiradaPreview;
  } | null>(null);
  const [recebidoPor, setRecebidoPor] = useState(op.handoff?.recebidos_nome ?? '');

  useEffect(() => {
    setPicks(picksIniciais(op));
    setRecebidoPor(op.handoff?.recebidos_nome ?? '');
    setRepo(null);
  }, [op.id, op.handoff?.entregues_em, (op.materiais ?? []).map((m) => `${m.id}:${m.saida_movimento_id}:${m.qtde_requisitada}`).join('|')]);

  const ficha = op.ficha_retirada;
  const pendentes = (op.materiais ?? []).filter((m) => m.pendente);
  const requisitados = (op.materiais ?? []).filter((m) => !m.pendente);
  const chao = mode === 'chao';

  const resumoPicks = useMemo(() => {
    return pendentes.map((m) => {
      const lista = picks[m.id] ?? [];
      const alvo = parseQtdeDigitada(m.qtde_planejada ?? m.retirada?.qtde ?? '0');
      const soma = somaPicks(lista);
      const override = Boolean(m.retirada?.controla_lote && m.retirada && !mesmaAlocacao(m.retirada, lista));
      return { m, lista, alvo, soma, override, ok: Math.abs(soma - alvo) < 1e-6 };
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
    const qtde =
      previewVol?.qtde_retirar && parseQtdeDigitada(previewVol.qtde_retirar) > 0
        ? previewVol.qtde_retirar
        : previewVol?.qtde_volume ?? ('qtde' in vol ? String(vol.qtde) : '');
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
          [material.id]: atual.map((p) => (p.lote_id === loteId ? { ...p, lido: p.lido || lido } : p)),
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
        (m) =>
          m.produto?.id === vol.produto?.id &&
          (m.retirada?.volumes.some((v) => v.lote_id === vol.lote_id) ||
            m.retirada?.candidatos.some((c) => c.lote_id === vol.lote_id) ||
            !m.retirada?.controla_lote),
      );
      if (pendente) {
        incluirVolume(pendente, vol, true);
        setMsg(`Volume ${vol.codigo} confrontado com a requisição.`);
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
                ? repo.preview.volumes
                : [...repo.preview.volumes, { ...cand, qtde_retirar: cand.qtde_retirar || cand.qtde_volume || '0' }],
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
          ? `Volume ${vol.codigo} é de SKU já baixado. Use «Requisitar de novo» se houve avaria.`
          : `Volume ${vol.codigo} não pertence a esta requisição.`,
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
      if (r.m.retirada?.controla_lote) {
        const usar = r.lista.filter((p) => parseQtdeDigitada(p.qtde) > 0);
        if (usar.length === 0) continue;
        if (!r.ok) {
          setErr(
            `A soma dos volumes de ${r.m.produto?.codigo ?? 'SKU'} deve ser ${formatDecimalBr(r.alvo, 4)} ${r.m.unidade}.`,
          );
          return;
        }
        if (r.override && (motivos[r.m.id] ?? '').trim().length < 3) {
          setErr(`Informe o motivo (mínimo 3 caracteres) para o volume fora da sugestão em ${r.m.produto?.codigo}.`);
          return;
        }
        linhas.push({
          material_id: r.m.id,
          qtde: r.m.qtde_planejada ?? r.m.retirada.qtde,
          volumes: usar.map((p) => ({ lote_id: p.lote_id, qtde: String(parseQtdeDigitada(p.qtde)) })),
          volumes_motivo: r.override ? motivos[r.m.id]?.trim() : undefined,
        });
      } else {
        linhas.push({ material_id: r.m.id, qtde: r.m.qtde_planejada ?? r.m.retirada?.qtde });
      }
    }
    if (linhas.length === 0) {
      setErr('Marque a quantidade física (QR ou manual) para ao menos um item da requisição.');
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
      setMsg('Baixa na ficha. O que saiu fica anexo à OP. Entregue na produção ou registre avaria.');
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
      setRepo({ materialId: material.id, qtde, preview: res.data });
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
    const vols = repo.preview.controla_lote
      ? repo.preview.volumes
          .filter((v) => v.lote_id && parseQtdeDigitada(v.qtde_retirar) > 0)
          .map((v) => ({ lote_id: v.lote_id as number, qtde: String(parseQtdeDigitada(v.qtde_retirar)) }))
      : [];
    if (repo.preview.controla_lote && vols.length === 0) {
      setErr('Marque os volumes da reposição (QR ou incluir manual).');
      return;
    }
    const override = repo.preview.controla_lote && !mesmaAlocacao(repo.preview, picksDaPreview(repo.preview));
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
            qtde: repo.qtde,
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
      setExtra({
        produtoId,
        sku: `SKU #${produtoId}`,
        qtde,
        preview: res.data,
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
    const vols = extra.preview.controla_lote
      ? extra.preview.volumes
          .filter((v) => v.lote_id && parseQtdeDigitada(v.qtde_retirar) > 0)
          .map((v) => ({ lote_id: v.lote_id as number, qtde: String(parseQtdeDigitada(v.qtde_retirar)) }))
      : [];
    if (extra.preview.controla_lote && vols.length === 0) {
      setErr('Marque os volumes do extra (QR ou quantidade).');
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
            qtde: extra.qtde,
            volumes: vols.length > 0 ? vols : undefined,
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
      <header className="op-ficha__head">
        <div>
          <h3 id="op-ficha-title">{chao ? 'Ficha da requisição' : 'Ficha de retirada (anexo da OP)'}</h3>
          <p className="muted">
            Confronta o que o sistema pediu com o que saiu do estoque. QR ou quantidade manual —
            confirmar grava o MOV e anexa o ciclo à ordem. Avaria? Requisite de novo, o processo se
            repete. Sem segundo estoque.
          </p>
        </div>
        {mode === 'anexo' ? (
          <Link className="btn btn-secondary btn-sm" to={`/estoque/retiradas/${op.id}`}>
            Abrir no estoque
          </Link>
        ) : (
          <Link className="btn btn-secondary btn-sm" to={`/ordens-producao/${op.id}`}>
            Ficha da OP
          </Link>
        )}
      </header>

      {err ? <div className="alert alert-danger">{err}</div> : null}
      {msg ? <div className="alert alert-info">{msg}</div> : null}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Sistema (pedido)</th>
              <th>Físico baixado</th>
              <th>Avaria</th>
              <th>A retirar</th>
              <th>Δ</th>
            </tr>
          </thead>
          <tbody>
            {(ficha?.linhas ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  Sem linhas nesta requisição.
                </td>
              </tr>
            ) : (
              (ficha?.linhas ?? []).map((l) => (
                <tr key={l.material_id}>
                  <td>
                    <strong>{l.sku ?? '—'}</strong>
                    {l.descricao ? (
                      <div className="muted" style={{ fontSize: '0.85em' }}>
                        {l.descricao}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    {formatDecimalBr(Number(l.planejado), 4)} {l.unidade}
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
                        {formatDecimalBr(Number(l.a_retirar), 4)} {l.unidade}
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {chao && pendentes.length > 0 ? (
        <div className="op-ficha__bloco">
          <h4>Baixar agora — QR ou manual</h4>
          <p className="muted">
            Leia o VOL: no corredor ou ajuste a quantidade na linha. O sistema sugere FEFO; o físico
            manda se você trocar o volume (informe o motivo).
          </p>
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

          {resumoPicks.map((r) => (
            <div key={r.m.id} className="op-ficha__sku">
              <header>
                <strong>{r.m.produto?.codigo ?? 'SKU'}</strong>
                <span className="muted">
                  Pedido {formatDecimalBr(r.alvo, 4)} {r.m.unidade}
                  {r.m.retirada?.controla_lote
                    ? ` · marcado ${formatDecimalBr(r.soma, 4)} ${r.m.unidade}`
                    : ' · sem lote (baixa a quantidade)'}
                </span>
              </header>
              {r.m.retirada?.controla_lote ? (
                <>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Local</th>
                          <th>Volume</th>
                          <th>No volume</th>
                          <th>Retirar (físico)</th>
                          <th>Validade</th>
                          <th>Leitura</th>
                          <th className="acoes" />
                        </tr>
                      </thead>
                      <tbody>
                        {r.lista.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="muted">
                              Nenhum volume. Inclua abaixo ou leia o QR.
                            </td>
                          </tr>
                        ) : (
                          r.lista.map((p) => (
                            <tr key={p.lote_id} className={p.status === 'VENCIDO' ? 'is-vencido' : undefined}>
                              <td>{p.endereco ?? 'Sem local'}</td>
                              <td>
                                <strong>{p.codigo}</strong>
                                {!p.sugerido ? (
                                  <div className="muted" style={{ fontSize: '0.85em' }}>
                                    Fora da sugestão FEFO
                                  </div>
                                ) : null}
                              </td>
                              <td>
                                {formatDecimalBr(Number(p.qtde_volume), 4)} {p.unidade}
                              </td>
                              <td>
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
                                  aria-label={`Quantidade física ${p.codigo}`}
                                />
                              </td>
                              <td>
                                {p.status_label || (p.status ? validadeStatusLabel(p.status) : '—')}
                                {p.data_validade ? (
                                  <div className="muted" style={{ fontSize: '0.85em' }}>
                                    {formatDate(p.data_validade)}
                                  </div>
                                ) : null}
                              </td>
                              <td>{p.lido || parseQtdeDigitada(p.qtde) > 0 ? 'Marcado' : 'Pendente'}</td>
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  disabled={busy}
                                  onClick={() =>
                                    setPicks((prev) => ({
                                      ...prev,
                                      [r.m.id]: (prev[r.m.id] ?? []).filter((x) => x.lote_id !== p.lote_id),
                                    }))
                                  }
                                >
                                  Tirar
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {(r.m.retirada?.candidatos ?? []).length > 0 ? (
                    <details className="op-retirada__outros">
                      <summary>Outros volumes deste SKU (manual)</summary>
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
                              Incluir
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
                <p className="muted" style={{ margin: 0 }}>
                  Confirmar baixa {formatDecimalBr(r.alvo, 4)} {r.m.unidade} (sem volume).
                </p>
              )}
            </div>
          ))}

          <div style={{ marginTop: '0.9rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !canWrite}
              onClick={() => void confirmarBaixa()}
            >
              Confirmar e anexar à OP
            </button>
          </div>
        </div>
      ) : null}

      {(ficha?.ciclos ?? []).length > 0 ? (
        <div className="op-ficha__bloco">
          <h4>O que saiu do estoque</h4>
          <p className="muted">Ciclos anexados a {op.codigo}. Cada confirmação vira um MOV.</p>
          {ficha!.ciclos.map((c) => (
            <article key={c.movimento_id} className="op-ficha__ciclo">
              <header>
                <strong>
                  Ciclo {c.n}
                  {c.complementar ? ' · reposição' : ''}
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
      ) : (
        <p className="muted">Nada baixado ainda — a ficha fica vazia até a primeira confirmação.</p>
      )}

      {chao && requisitados.length > 0 ? (
        <div className="op-ficha__bloco">
          <h4>Avaria e requisitar de novo</h4>
          <p className="muted">
            Rasgo ou recusa na mesa. Não escreve saldo sozinho — a reposição é uma nova baixa (mesmo
            writer).
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
                    Registrar avaria
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy || !canWrite}
                    onClick={() => void prepararRepo(m)}
                  >
                    Requisitar de novo
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
              {repo.preview.controla_lote ? (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Volume</th>
                        <th>Local</th>
                        <th>Retirar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repo.preview.volumes.map((v) => (
                        <tr key={v.lote_id ?? v.codigo}>
                          <td>{v.codigo}</td>
                          <td>{v.endereco?.codigo ?? 'Sem local'}</td>
                          <td>
                            <input
                              className="op-retirada__qtde"
                              inputMode="decimal"
                              value={v.qtde_retirar}
                              disabled={busy}
                              onChange={(e) =>
                                setRepo({
                                  ...repo,
                                  preview: {
                                    ...repo.preview,
                                    volumes: repo.preview.volumes.map((x) =>
                                      x.lote_id === v.lote_id ? { ...x, qtde_retirar: e.target.value } : x,
                                    ),
                                  },
                                })
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted">SKU sem lote — a reposição baixa a quantidade.</p>
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
          <h4>Extra pedido pela OP</h4>
          <p className="muted">
            {extra.sku} · {formatDecimalBr(parseQtdeDigitada(extra.qtde), 4)} — confirme o físico.
          </p>
          {extra.preview.controla_lote ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Volume</th>
                    <th>Local</th>
                    <th>Retirar</th>
                  </tr>
                </thead>
                <tbody>
                  {extra.preview.volumes.map((v) => (
                    <tr key={v.lote_id ?? v.codigo}>
                      <td>{v.codigo}</td>
                      <td>{v.endereco?.codigo ?? 'Sem local'}</td>
                      <td>
                        <input
                          className="op-retirada__qtde"
                          inputMode="decimal"
                          value={v.qtde_retirar}
                          disabled={busy}
                          onChange={(e) =>
                            setExtra({
                              ...extra,
                              preview: {
                                ...extra.preview,
                                volumes: extra.preview.volumes.map((x) =>
                                  x.lote_id === v.lote_id ? { ...x, qtde_retirar: e.target.value } : x,
                                ),
                              },
                            })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">SKU sem lote — a confirmação baixa a quantidade.</p>
          )}
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !canWrite}
              onClick={() => void confirmarExtra()}
            >
              Confirmar extra
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
          <p className="muted">O estoque já baixou. Quem recebeu na máquina? Sem segundo movimento.</p>
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
          Ainda há quantidade a retirar.{' '}
          <Link to={`/estoque/retiradas/${op.id}`}>Confrontar no estoque</Link>.
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
