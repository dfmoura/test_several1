import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PedidoItemFichaCabecalho } from '../components/PedidoFichaSheet';
import {
  ApiError,
  api,
  type EstoqueSeparacaoDetalhe,
  type OpRetiradaVolume,
  type Pedido,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import type { EstoqueQrVolumeInfo } from '../lib/estoqueQrFila';
import { onAbrirFichaClick } from '../lib/fichaNav';
import { formatDateTime, formatDecimalBr } from '../lib/format';
import {
  formatLotePick,
  formatVolumeDimensao,
  marcasDePreviewVolumes,
  type VolumePickMarca,
} from '../lib/producaoPick';
import { parseQtdeDigitada } from '../lib/producaoUi';

function qtdeLegivel(raw: string | null | undefined): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw ?? '';
  return String(n);
}

/**
 * Porta A separar — mesma linguagem visual do kit da OP.
 * Confirmar = snapshot no PED (sem MOV). Baixa na NF-e.
 */
export function EstoqueSeparacaoChaoPage() {
  const { id } = useParams();
  const { hasPermission } = useAuth();
  const podeEscrever = hasPermission('estoque.escrever') || hasPermission('producao.escrever');
  const [detalhe, setDetalhe] = useState<EstoqueSeparacaoDetalhe | null>(null);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [marcas, setMarcas] = useState<VolumePickMarca[]>([]);
  const [qr, setQr] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await api.get<{ data: EstoqueSeparacaoDetalhe }>(`/estoque/separacoes/${id}`);
      setDetalhe(res.data);
      setMarcas(
        marcasDePreviewVolumes(res.data.retirada.volumes ?? [], res.data.retirada.candidatos ?? []),
      );
      if (res.data.pedido_id) {
        try {
          const ped = await api.get<{ data: Pedido }>(`/pedidos/${res.data.pedido_id}`);
          setPedido(ped.data);
        } catch {
          setPedido(null);
        }
      } else {
        setPedido(null);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao abrir a separação.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const catalogo: OpRetiradaVolume[] = useMemo(
    () => [...(detalhe?.retirada.volumes ?? []), ...(detalhe?.retirada.candidatos ?? [])],
    [detalhe],
  );

  const fichaHref = useMemo(() => {
    if (!id) return '/estoque/separacoes';
    const ativos = marcas.filter((m) => m.marcado && parseQtdeDigitada(m.qtde) > 0);
    if (ativos.length === 0) return `/estoque/separacoes/${id}/ficha`;
    const q = ativos.map((m) => `${m.lote_id}:${parseQtdeDigitada(m.qtde)}`).join(',');
    return `/estoque/separacoes/${id}/ficha?m=${encodeURIComponent(q)}`;
  }, [id, marcas]);

  const volDo = (loteId: number) => catalogo.find((v) => v.lote_id === loteId);
  const marcados = marcas.filter((m) => m.marcado && parseQtdeDigitada(m.qtde) > 0);
  const separada = detalhe?.separacao?.volumes ?? [];

  const marcarVolume = (loteId: number, qtde?: string, lido = false) => {
    const vol = volDo(loteId);
    const fallback = qtdeLegivel(vol?.qtde_volume ?? vol?.qtde_retirar ?? '0');
    setMarcas((atual) => {
      const existe = atual.find((x) => x.lote_id === loteId);
      if (existe) {
        return atual.map((x) =>
          x.lote_id === loteId
            ? {
                ...x,
                marcado: true,
                lido: x.lido || lido,
                qtde: qtde && parseQtdeDigitada(qtde) > 0 ? qtdeLegivel(qtde) : x.qtde || fallback,
              }
            : x,
        );
      }
      return [
        ...atual,
        {
          lote_id: loteId,
          qtde: qtde && parseQtdeDigitada(qtde) > 0 ? qtdeLegivel(qtde) : fallback,
          marcado: true,
          lido,
        },
      ];
    });
  };

  const lerVolume = async (payload: string) => {
    if (!id) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api.get<{ data: EstoqueQrVolumeInfo }>(
        `/estoque/separacoes/${id}/volume?payload=${encodeURIComponent(payload)}`,
      );
      const vol = res.data;
      marcarVolume(vol.lote_id, vol.qtde, true);
      setMsg(`Volume ${vol.codigo} marcado.`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Volume não reconhecido neste produto.');
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const confirmar = async () => {
    if (!id || !detalhe?.pode_confirmar) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const volumes = marcados.map((m) => ({
        lote_id: m.lote_id,
        qtde: String(parseQtdeDigitada(m.qtde)),
      }));
      const res = await api.post<{ data: EstoqueSeparacaoDetalhe }>(
        `/estoque/separacoes/${id}/confirmar`,
        detalhe.produto?.controla_lote ? { volumes } : {},
      );
      setDetalhe(res.data);
      setMsg('Separação confirmada. O saldo sai na NF-e.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Não foi possível confirmar.');
    } finally {
      setBusy(false);
    }
  };

  const nome = detalhe?.produto
    ? `${detalhe.produto.codigo} · ${detalhe.produto.descricao}`
    : detalhe?.descricao;
  const qtdePedida = detalhe
    ? formatDecimalBr(detalhe.qtde_pedida, 4, { stripTrailingZeros: true })
    : '';
  const itemPedido =
    pedido?.itens.find((i) => i.id === detalhe?.pedido_item_id) ?? null;
  const proximoVolume = catalogo.find(
    (v) => v.lote_id && !marcas.some((m) => m.lote_id === v.lote_id && m.marcado),
  );

  const acrescentarVolume = () => {
    if (!proximoVolume?.lote_id) return;
    marcarVolume(proximoVolume.lote_id);
  };

  const onQrKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !podeEscrever) return;
    const payload = qr.trim();
    if (!payload) return;
    e.preventDefault();
    void lerVolume(payload)
      .then(() => setQr(''))
      .catch(() => undefined);
  };

  return (
    <div className="page">
      <div className="pick-toolbar">
        <Link className="btn btn-secondary btn-sm" to="/estoque/separacoes">
          Fila
        </Link>
        {detalhe?.pedido_id ? (
          <Link className="btn btn-secondary btn-sm" to={`/pedidos/${detalhe.pedido_id}`}>
            Pedido
          </Link>
        ) : null}
        {detalhe ? (
          <a
            className="btn btn-secondary btn-sm"
            href={fichaHref}
            onClick={(e) => onAbrirFichaClick(e, fichaHref)}
          >
            Ficha para o estoque
          </a>
        ) : null}
        {detalhe ? <span className="pick-toolbar__ref">{detalhe.pedido_codigo}</span> : null}
      </div>

      {err ? <div className="alert alert-danger">{err}</div> : null}
      {msg ? <div className="alert alert-success">{msg}</div> : null}
      {loading ? <p className="muted">Carregando…</p> : null}

      {detalhe && !loading ? (
        <>
          {pedido && itemPedido ? (
            <PedidoItemFichaCabecalho pedido={pedido} item={itemPedido} />
          ) : null}

          <section className="op-insumos" aria-label="Volumes da revenda">
            <div className="card">
              <div className="card-body">
                <div className="orc-section-head">
                  <h3 className="orc-subsection-title" style={{ fontSize: '1.05rem' }}>
                    {nome}
                  </h3>
                  {detalhe.pode_confirmar && detalhe.produto?.controla_lote && podeEscrever ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={busy || !proximoVolume}
                      onClick={acrescentarVolume}
                    >
                      + volume
                    </button>
                  ) : null}
                </div>

                {detalhe.pode_confirmar && detalhe.produto?.controla_lote && podeEscrever ? (
                  <div className="form-group" style={{ maxWidth: 320, marginBottom: '0.75rem' }}>
                    <label>Ler QR do volume</label>
                    <input
                      value={qr}
                      disabled={busy}
                      placeholder="VOL:…"
                      onChange={(e) => setQr(e.target.value)}
                      onKeyDown={onQrKey}
                    />
                  </div>
                ) : null}

                {detalhe.produto?.controla_lote && detalhe.pode_confirmar ? (
                  marcados.length === 0 ? (
                    <p className="form-hint" style={{ marginTop: 0 }}>
                      Nenhum volume nesta lista.
                    </p>
                  ) : (
                    marcados.map((m) => {
                      const vol = volDo(m.lote_id);
                      const max = vol
                        ? parseQtdeDigitada(vol.qtde_volume ?? vol.qtde_retirar)
                        : 0;
                      return (
                        <div key={m.lote_id} className="form-grid faixa-row">
                          <div className="form-group">
                            <label>Volume</label>
                            <input
                              value={formatLotePick(vol ?? { lote_id: m.lote_id })}
                              disabled
                            />
                          </div>
                          <div className="form-group">
                            <label>Local</label>
                            <input value={vol?.endereco?.codigo ?? '—'} disabled />
                          </div>
                          <div className="form-group">
                            <label>Medida</label>
                            <input value={vol ? formatVolumeDimensao(vol) ?? '—' : '—'} disabled />
                          </div>
                          <div className="form-group">
                            <label>Quantidade ({vol?.unidade ?? detalhe.unidade})</label>
                            <input
                              inputMode="decimal"
                              disabled={!podeEscrever || busy}
                              value={m.qtde}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const n = parseQtdeDigitada(raw);
                                const qtde = max > 0 && n > max ? String(max) : raw;
                                setMarcas((atual) =>
                                  atual.map((x) => (x.lote_id === m.lote_id ? { ...x, qtde } : x)),
                                );
                              }}
                            />
                          </div>
                          {podeEscrever ? (
                            <div className="form-group faixa-remove">
                              <label>&nbsp;</label>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled={busy}
                                onClick={() =>
                                  setMarcas((atual) =>
                                    atual.map((x) =>
                                      x.lote_id === m.lote_id ? { ...x, marcado: false } : x,
                                    ),
                                  )
                                }
                              >
                                Remover
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )
                ) : null}

                {detalhe.produto?.controla_lote && !detalhe.pode_confirmar && separada.length > 0
                  ? separada.map((v) => (
                      <div key={v.lote_id} className="form-grid faixa-row">
                        <div className="form-group">
                          <label>Volume</label>
                          <input value={v.codigo ?? '—'} disabled />
                        </div>
                        <div className="form-group">
                          <label>Local</label>
                          <input value={v.endereco ?? '—'} disabled />
                        </div>
                        <div className="form-group">
                          <label>Quantidade ({v.unidade ?? detalhe.unidade})</label>
                          <input
                            value={formatDecimalBr(v.qtde, 4, { stripTrailingZeros: true })}
                            disabled
                          />
                        </div>
                        <div className="form-group">
                          <label>
                            {detalhe.separacao?.em
                              ? `Em ${formatDateTime(detalhe.separacao.em)}`
                              : 'Separado'}
                          </label>
                          <input value="Ok" disabled />
                        </div>
                      </div>
                    ))
                  : null}

                {!detalhe.produto?.controla_lote && detalhe.pode_confirmar ? (
                  <div className="form-grid faixa-row">
                    <div className="form-group">
                      <label>Quantidade ({detalhe.unidade})</label>
                      <input value={qtdePedida} disabled />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {detalhe.pode_confirmar ? (
              <div className="btn-row">
                {podeEscrever ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={
                      busy || (Boolean(detalhe.produto?.controla_lote) && marcados.length === 0)
                    }
                    onClick={() => void confirmar()}
                  >
                    Confirmar: separado para revenda
                  </button>
                ) : (
                  <p className="muted">Quem confirma a separação é quem escreve no estoque.</p>
                )}
                <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
                  Confirmar não baixa saldo — a saída oficial é a NF-e.
                </p>
              </div>
            ) : (
              <p className="muted">Esta linha já foi separada.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
