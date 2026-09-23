import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { EstoqueModuleNav } from '../components/EstoqueModuleNav';
import { StatusPill } from '../components/StatusPill';
import {
  api,
  ApiError,
  type OrdemProducao,
  type OrdemProducaoMaterial,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate, formatDecimalBr } from '../lib/format';
import { opStatusLabel, parseQtdeDigitada } from '../lib/producaoUi';
import { validadeStatusLabel } from '../lib/produtoLotePolitica';
import type { EstoqueQrVolumeInfo } from '../lib/estoqueQrFila';

type WalkRow = {
  key: string;
  materialId: number;
  sku: string;
  loteId: number;
  codigo: string;
  qtde: string;
  unidade: string;
  local: string | null;
  validade: string | null;
  status: string | null;
  statusLabel: string | null;
  sugerido: boolean;
  lido: boolean;
};

function walkDaOp(op: OrdemProducao): WalkRow[] {
  const rows: WalkRow[] = [];
  for (const m of op.materiais ?? []) {
    if (!m.pendente) continue;
    for (const v of m.retirada?.volumes ?? []) {
      if (!v.lote_id) continue;
      rows.push({
        key: `${m.id}-${v.lote_id}`,
        materialId: m.id,
        sku: m.produto?.codigo ?? 'SKU',
        loteId: v.lote_id,
        codigo: v.codigo ?? String(v.lote_id),
        qtde: v.qtde_retirar,
        unidade: v.unidade || m.unidade,
        local: v.endereco?.codigo ?? null,
        validade: v.data_validade,
        status: v.status,
        statusLabel: v.status_label,
        sugerido: true,
        lido: false,
      });
    }
  }
  rows.sort((a, b) => {
    const ea = a.local ?? '';
    const eb = b.local ?? '';
    if (ea === '' && eb !== '') return 1;
    if (ea !== '' && eb === '') return -1;
    return ea.localeCompare(eb) || a.sku.localeCompare(b.sku);
  });
  return rows;
}

export function EstoqueRetiradaChaoPage() {
  const { id } = useParams();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('producao.escrever') || hasPermission('estoque.escrever');
  const canHandoff = hasPermission('producao.escrever');
  const volRef = useRef<HTMLInputElement>(null);

  const [op, setOp] = useState<OrdemProducao | null>(null);
  const [walk, setWalk] = useState<WalkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [qr, setQr] = useState('');
  const [motivo, setMotivo] = useState('');
  const [recebidoPor, setRecebidoPor] = useState('');

  const aplicar = (data: OrdemProducao) => {
    setOp(data);
    setWalk(walkDaOp(data));
    setRecebidoPor(data.handoff?.recebidos_nome ?? '');
  };

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get<{ data: OrdemProducao }>(`/estoque/retiradas/${id}`);
      aplicar(res.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao abrir a retirada.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const pendentes = (op?.materiais ?? []).filter((m) => m.pendente);
  const temOverride = walk.some((w) => w.lido && !w.sugerido);

  const lerVolume = async (payload: string) => {
    const p = payload.trim();
    if (!p || !op) return;
    if (p.toUpperCase().startsWith('END:')) {
      setErr('Esse QR é de local (END:…). A caminhada já mostra o local de cada volume.');
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
      const naSugestao = walk.find((w) => w.loteId === vol.lote_id);
      if (naSugestao) {
        setWalk((prev) =>
          prev.map((w) => (w.loteId === vol.lote_id ? { ...w, lido: true } : w)),
        );
        setMsg(`Volume ${vol.codigo} lido · ${naSugestao.local ?? 'sem local'}.`);
        setQr('');
        setTimeout(() => volRef.current?.focus(), 50);
        return;
      }

      const linha = (op.materiais ?? []).find(
        (m) =>
          m.pendente &&
          m.produto?.id === vol.produto?.id &&
          (m.retirada?.candidatos ?? []).some((c) => c.lote_id === vol.lote_id),
      );
      if (!linha) {
        const jaNaOp = (op.materiais ?? []).find((m) => m.produto?.id === vol.produto?.id);
        setErr(
          jaNaOp && !jaNaOp.pendente
            ? `Volume ${vol.codigo} é de SKU já requisitado. Complemente na OP.`
            : `Volume ${vol.codigo} não pertence a esta retirada.`,
        );
        volRef.current?.select();
        return;
      }
      const cand = (linha.retirada?.candidatos ?? []).find((c) => c.lote_id === vol.lote_id);
      setWalk((prev) => {
        if (prev.some((w) => w.loteId === vol.lote_id)) {
          return prev.map((w) => (w.loteId === vol.lote_id ? { ...w, lido: true } : w));
        }
        return [
          ...prev,
          {
            key: `${linha.id}-${vol.lote_id}`,
            materialId: linha.id,
            sku: linha.produto?.codigo ?? vol.produto?.codigo ?? 'SKU',
            loteId: vol.lote_id,
            codigo: vol.codigo,
            qtde: cand?.qtde_volume ?? vol.qtde,
            unidade: vol.unidade || linha.unidade,
            local: vol.endereco?.codigo ?? null,
            validade: cand?.data_validade ?? vol.data_entrada,
            status: cand?.status ?? null,
            statusLabel: cand?.status_label ?? null,
            sugerido: false,
            lido: true,
          },
        ];
      });
      setMsg(`Volume ${vol.codigo} incluído fora da sugestão FEFO — informe o motivo antes de baixar.`);
      setQr('');
      setTimeout(() => volRef.current?.focus(), 50);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Volume não reconhecido.');
      volRef.current?.select();
    } finally {
      setBusy(false);
    }
  };

  const confirmarBaixa = async () => {
    if (!op) return;
    if (temOverride && motivo.trim().length < 3) {
      setErr('Informe o motivo (mínimo 3 caracteres) para o volume fora da sugestão FEFO.');
      return;
    }
    const linhas = pendentes.map((m) => linhaConfirmacao(m, walk, motivo)).filter(Boolean);
    if (linhas.length === 0) {
      setErr('Nada pendente para baixar.');
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
      setMotivo('');
      setMsg('Baixa registrada. Entregue o material na produção.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao confirmar a retirada.');
    } finally {
      setBusy(false);
    }
  };

  const entregar = async () => {
    if (!op) return;
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

  const lidos = walk.filter((w) => w.lido).length;

  return (
    <div className="page">
      <PageHeader
        title={op ? `Retirada · ${op.codigo}` : 'Retirada'}
        description="Leia o QR do volume na ordem do corredor. Confirmar baixa o estoque (mesmo writer da OP)."
        actions={
          <>
            <Link className="btn btn-secondary" to="/estoque/retiradas">
              Fila
            </Link>
            {op ? (
              <Link className="btn btn-secondary" to={`/ordens-producao/${op.id}`}>
                Ficha da OP
              </Link>
            ) : null}
          </>
        }
      />
      <EstoqueModuleNav />

      {err ? <div className="alert alert-danger">{err}</div> : null}
      {msg ? <div className="alert alert-info">{msg}</div> : null}
      {loading ? <p className="muted">Carregando…</p> : null}

      {op ? (
        <>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-body detail-meta">
              <div>
                <span>Pedido</span>
                <strong>{op.pedido?.codigo ?? '—'}</strong>
              </div>
              <div>
                <span>Cliente</span>
                <strong>{op.parceiro?.razao_social ?? '—'}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>
                  <StatusPill status={opStatusLabel(op.status)} />
                </strong>
              </div>
              <div>
                <span>Leituras</span>
                <strong>
                  {lidos}/{walk.length}
                </strong>
              </div>
            </div>
          </div>

          {pendentes.length > 0 ? (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-body">
                <h3 style={{ margin: '0 0 0.5rem' }}>Caminhada</h3>
                <p className="muted">
                  Ordem pelos locais. SKU sem lote baixa por quantidade. Volume lido fica marcado —
                  confirmar envia a baixa.
                </p>
                <div className="form-group" style={{ maxWidth: 420 }}>
                  <label htmlFor="retirada-vol-qr">Ler volume (VOL:…)</label>
                  <input
                    id="retirada-vol-qr"
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

                {walk.length > 0 ? (
                  <div className="table-wrap" style={{ marginTop: '0.75rem' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Local</th>
                          <th>Volume</th>
                          <th>SKU</th>
                          <th>Retirar</th>
                          <th>Validade</th>
                          <th>Leitura</th>
                        </tr>
                      </thead>
                      <tbody>
                        {walk.map((w) => (
                          <tr key={w.key} className={w.status === 'VENCIDO' ? 'is-vencido' : undefined}>
                            <td>{w.local ?? 'Sem local'}</td>
                            <td>
                              <strong>{w.codigo}</strong>
                              {!w.sugerido ? (
                                <div className="muted" style={{ fontSize: '0.85em' }}>
                                  Fora da sugestão FEFO
                                </div>
                              ) : null}
                            </td>
                            <td>{w.sku}</td>
                            <td>
                              {formatDecimalBr(Number(w.qtde), 4)} {w.unidade}
                            </td>
                            <td>
                              {w.statusLabel || (w.status ? validadeStatusLabel(w.status) : '—')}
                              {w.validade ? (
                                <div className="muted" style={{ fontSize: '0.85em' }}>
                                  {formatDate(w.validade)}
                                </div>
                              ) : null}
                            </td>
                            <td>{w.lido ? 'Lido' : 'Pendente'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted">Nenhum volume sugerido — confira SKU sem lote abaixo.</p>
                )}

                {pendentes.some((m) => !m.retirada?.controla_lote) ? (
                  <ul className="muted" style={{ marginTop: '0.75rem' }}>
                    {pendentes
                      .filter((m) => !m.retirada?.controla_lote)
                      .map((m) => (
                        <li key={m.id}>
                          {m.produto?.codigo ?? 'SKU'} · {formatDecimalBr(Number(m.qtde_planejada ?? 0), 4)}{' '}
                          {m.unidade} (sem lote)
                        </li>
                      ))}
                  </ul>
                ) : null}

                {temOverride ? (
                  <div className="form-group" style={{ marginTop: '0.75rem', maxWidth: 420 }}>
                    <label>Motivo da troca de volume</label>
                    <input
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      disabled={busy}
                      placeholder="Ex.: rolo já na máquina"
                    />
                  </div>
                ) : null}

                <div style={{ marginTop: '0.9rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy || !canWrite}
                    onClick={() => void confirmarBaixa()}
                  >
                    Confirmar retirada e baixar estoque
                  </button>
                  {!canWrite ? (
                    <p className="muted" style={{ margin: '0.5rem 0 0' }}>
                      Leitura liberada. A baixa exige <strong>produção.escrever</strong> ou{' '}
                      <strong>estoque.escrever</strong>.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {op.pode_entregar_insumos ? (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-body">
                <h3 style={{ margin: '0 0 0.5rem' }}>Entregar na produção</h3>
                <p className="muted">
                  O estoque já baixou. Registre quem recebeu na máquina — sem segundo movimento.
                </p>
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
            </div>
          ) : null}

          {op.handoff?.entregue ? (
            <div className="alert alert-info">
              Entregue em {op.handoff.entregues_em ? formatDate(op.handoff.entregues_em) : '—'}
              {op.handoff.recebidos_nome ? ` · recebido por ${op.handoff.recebidos_nome}` : ''}
              {op.handoff.entregues_por ? ` · registrado por ${op.handoff.entregues_por.nome}` : ''}.
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function linhaConfirmacao(
  m: OrdemProducaoMaterial,
  walk: WalkRow[],
  motivo: string,
): Record<string, unknown> | null {
  if (!m.pendente) return null;
  const daLinha = walk.filter((w) => w.materialId === m.id);
  const lidos = daLinha.filter((w) => w.lido);
  const usar = lidos.length > 0 ? lidos : daLinha.filter((w) => w.sugerido);
  const body: Record<string, unknown> = {
    material_id: m.id,
    qtde: m.qtde_planejada ?? m.retirada?.qtde,
  };
  if (m.retirada?.controla_lote) {
    if (usar.length === 0) return null;
    const soma = usar.reduce((acc, w) => acc + parseQtdeDigitada(w.qtde), 0);
    body.qtde = String(soma);
    body.volumes = usar.map((w) => ({
      lote_id: w.loteId,
      qtde: String(parseQtdeDigitada(w.qtde)),
    }));
    if (usar.some((w) => !w.sugerido) && motivo.trim()) {
      body.volumes_motivo = motivo.trim();
    }
  }
  return body;
}
