import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SeparacaoVolumesOverlay } from '../components/SeparacaoVolumesOverlay';
import { ApiError, api, type EstoqueSeparacaoDetalhe, type OpRetiradaVolume } from '../lib/api';
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
  const [marcas, setMarcas] = useState<VolumePickMarca[]>([]);
  const [overlayAberto, setOverlayAberto] = useState(false);
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
  const localPrimeiro = detalhe?.pode_confirmar
    ? (volDo(marcados[0]?.lote_id ?? 0)?.endereco?.codigo ?? null)
    : (separada.find((v) => v.endereco)?.endereco ?? null);

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
      setOverlayAberto(false);
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
        <section className="pick op-kit" aria-label="Separação de revenda">
          <header className="pick__job">
            <p className="pick__job-qtde">
              {qtdePedida} {detalhe.unidade}
            </p>
            <h2 className="pick__job-nome">{nome}</h2>
            <p className="pick__job-meta">
              {detalhe.parceiro?.razao_social ?? '—'}
              {detalhe.pedido_codigo ? ` · ${detalhe.pedido_codigo}` : ''}
              {' · '}
              saldo {formatDecimalBr(detalhe.saldo, 4, { stripTrailingZeros: true })} {detalhe.unidade}
            </p>
          </header>

          <ol className="op-kit-lista">
            <li
              className={`op-kit-lista__item op-kit-lista__item--${
                detalhe.pode_confirmar ? 'falta_pegar' : 'ja_saiu'
              }`}
            >
              <div className="op-kit-lista__topo">
                <span className="op-kit-lista__n" aria-hidden>
                  1
                </span>
                <div className="op-kit-lista__corpo">
                  <div className="op-kit-lista__titulo">
                    <span className="op-kit-lista__tipo">Revenda</span>
                    <strong>{nome}</strong>
                    {detalhe.produto?.codigo ? (
                      <span className="op-kit-lista__sku">{detalhe.produto.codigo}</span>
                    ) : null}
                  </div>
                  <div className="op-kit-lista__meta">
                    <span>
                      Pedido:{' '}
                      <strong>
                        {qtdePedida} {detalhe.unidade}
                      </strong>
                    </span>
                    <span className="op-kit-lista__sep" aria-hidden>
                      ·
                    </span>
                    <span>{localPrimeiro || 'Sem local'}</span>
                    <span className="op-kit-lista__sep" aria-hidden>
                      ·
                    </span>
                    <span
                      className={`op-kit-lista__st op-kit-lista__st--${
                        detalhe.pode_confirmar ? 'falta_pegar' : 'ja_saiu'
                      }`}
                    >
                      {detalhe.pode_confirmar ? 'A separar' : 'Separado'}
                    </span>
                  </div>
                </div>
                {detalhe.pode_confirmar && detalhe.produto?.controla_lote ? (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm op-kit-lista__acao"
                    onClick={() => setOverlayAberto(true)}
                  >
                    {marcados.length > 0 ? 'Alterar volumes' : 'Adicionar volumes'}
                  </button>
                ) : null}
              </div>

              {detalhe.produto?.controla_lote ? (
                <div className="op-kit-lista__vols">
                  {detalhe.pode_confirmar ? (
                    marcados.length === 0 ? (
                      <p className="op-kit-lista__vols-vazio">
                        Nenhum volume escolhido. Use «Adicionar volumes».
                      </p>
                    ) : (
                      <table className="op-kit-lista__table">
                        <thead>
                          <tr>
                            <th>Volume</th>
                            <th>Local</th>
                            <th>Dimensão</th>
                            <th>Levar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {marcados.map((m) => {
                            const vol = volDo(m.lote_id);
                            return (
                              <tr key={m.lote_id}>
                                <td>
                                  {formatLotePick(vol ?? { lote_id: m.lote_id })}
                                  {m.lido ? (
                                    <span className="muted" style={{ marginLeft: 6, fontSize: '0.85em' }}>
                                      QR
                                    </span>
                                  ) : null}
                                </td>
                                <td>{vol?.endereco?.codigo ?? '—'}</td>
                                <td>{vol ? formatVolumeDimensao(vol) ?? '—' : '—'}</td>
                                <td>
                                  {formatDecimalBr(m.qtde, 4, { stripTrailingZeros: true })}{' '}
                                  {vol?.unidade ?? detalhe.unidade}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )
                  ) : separada.length > 0 ? (
                    <table className="op-kit-lista__table">
                      <thead>
                        <tr>
                          <th>Volume</th>
                          <th>Local</th>
                          <th>Quantidade</th>
                          <th>
                            {detalhe.separacao?.em
                              ? `Em ${formatDateTime(detalhe.separacao.em)}`
                              : 'Separado'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {separada.map((v) => (
                          <tr key={v.lote_id}>
                            <td>{v.codigo ?? '—'}</td>
                            <td>{v.endereco ?? '—'}</td>
                            <td>
                              {formatDecimalBr(v.qtde, 4, { stripTrailingZeros: true })}{' '}
                              {v.unidade ?? detalhe.unidade}
                            </td>
                            <td>Ok</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}
                </div>
              ) : detalhe.pode_confirmar ? (
                <p className="op-kit-lista__vols-vazio" style={{ margin: '0.65rem 0 0 2.35rem' }}>
                  Este produto não controla volume. Confirme a quantidade pedida no saldo.
                </p>
              ) : null}
            </li>
          </ol>

          {detalhe.pode_confirmar ? (
            <div className="op-kit__cta">
              {podeEscrever ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={
                    busy ||
                    (Boolean(detalhe.produto?.controla_lote) && marcados.length === 0)
                  }
                  onClick={() => void confirmar()}
                >
                  Confirmar: separado para revenda
                </button>
              ) : (
                <p className="muted">Quem confirma a separação é quem escreve no estoque.</p>
              )}
              <p className="muted" style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>
                Confirmar não baixa saldo — a saída oficial é a NF-e.
              </p>
            </div>
          ) : (
            <p className="muted" style={{ padding: '0 1.15rem 1.2rem' }}>
              Esta linha já foi separada.
            </p>
          )}
        </section>
      ) : null}

      {overlayAberto && detalhe ? (
        <SeparacaoVolumesOverlay
          titulo={nome ?? 'Produto'}
          pedidoQtde={qtdePedida}
          unidade={detalhe.unidade}
          volumes={catalogo}
          marcas={marcas}
          busy={busy}
          onLerQr={podeEscrever ? lerVolume : undefined}
          onChangeMarcas={setMarcas}
          onClose={() => setOverlayAberto(false)}
        />
      ) : null}
    </div>
  );
}
