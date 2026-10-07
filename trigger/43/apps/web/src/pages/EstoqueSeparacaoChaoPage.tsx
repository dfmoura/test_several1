import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type EstoqueSeparacaoDetalhe, type OpRetiradaVolume } from '../lib/api';
import { useAuth } from '../lib/auth';
import { onAbrirFichaClick } from '../lib/fichaNav';
import { formatDateTime, formatDecimalBr } from '../lib/format';
import { parseQtdeDigitada } from '../lib/producaoUi';

type Marca = { lote_id: number; qtde: string; marcado: boolean };

function qtdeLegivel(raw: string | null | undefined): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw ?? '';
  return String(n);
}

function marcaInicial(vols: OpRetiradaVolume[], sugerido: boolean): Marca[] {
  return vols
    .filter((v) => v.lote_id)
    .map((v) => ({
      lote_id: v.lote_id as number,
      qtde: qtdeLegivel(
        sugerido && Number(v.qtde_retirar) > 0 ? v.qtde_retirar : (v.qtde_volume ?? v.qtde_retirar),
      ),
      marcado: sugerido && Number(v.qtde_retirar) > 0,
    }));
}

export function EstoqueSeparacaoChaoPage() {
  const { id } = useParams();
  const { hasPermission } = useAuth();
  const podeEscrever = hasPermission('estoque.escrever') || hasPermission('producao.escrever');
  const [detalhe, setDetalhe] = useState<EstoqueSeparacaoDetalhe | null>(null);
  const [marcas, setMarcas] = useState<Marca[]>([]);
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
      const sugeridos = res.data.retirada.volumes ?? [];
      const outros = (res.data.retirada.candidatos ?? []).filter(
        (c) => !sugeridos.some((s) => s.lote_id === c.lote_id),
      );
      setMarcas([...marcaInicial(sugeridos, true), ...marcaInicial(outros, false)]);
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

  const fichaHref = useMemo(() => {
    if (!id) return '/estoque/separacoes';
    const ativos = marcas.filter((m) => m.marcado && parseQtdeDigitada(m.qtde) > 0);
    if (ativos.length === 0) return `/estoque/separacoes/${id}/ficha`;
    const q = ativos.map((m) => `${m.lote_id}:${parseQtdeDigitada(m.qtde)}`).join(',');
    return `/estoque/separacoes/${id}/ficha?m=${encodeURIComponent(q)}`;
  }, [id, marcas]);

  const volDo = (loteId: number) =>
    [...(detalhe?.retirada.volumes ?? []), ...(detalhe?.retirada.candidatos ?? [])].find(
      (v) => v.lote_id === loteId,
    );
  const marcasNaCaminhada = [...marcas].sort((a, b) => {
    const ea = volDo(a.lote_id)?.endereco?.codigo ?? '';
    const eb = volDo(b.lote_id)?.endereco?.codigo ?? '';
    if (!ea && eb) return 1;
    if (ea && !eb) return -1;
    return ea.localeCompare(eb, 'pt-BR');
  });
  const separada = detalhe?.separacao?.volumes ?? [];
  const localPrimeiro = detalhe?.pode_confirmar
    ? (volDo(marcas.find((m) => m.marcado)?.lote_id ?? 0)?.endereco?.codigo ?? null)
    : (separada.find((v) => v.endereco)?.endereco ?? null);

  const confirmar = async () => {
    if (!id || !detalhe?.pode_confirmar) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const volumes = marcas
        .filter((m) => m.marcado && parseQtdeDigitada(m.qtde) > 0)
        .map((m) => ({ lote_id: m.lote_id, qtde: String(parseQtdeDigitada(m.qtde)) }));
      const res = await api.post<{ data: EstoqueSeparacaoDetalhe }>(
        `/estoque/separacoes/${id}/confirmar`,
        detalhe.produto?.controla_lote ? { volumes } : {},
      );
      setDetalhe(res.data);
      setMsg('Separação confirmada. O saldo deste produto sai na NF-e.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Não foi possível confirmar.');
    } finally {
      setBusy(false);
    }
  };

  const nome = detalhe?.produto
    ? `${detalhe.produto.codigo} · ${detalhe.produto.descricao}`
    : detalhe?.descricao;

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
          <section className="pick" aria-label="Separação de revenda">
            <header className="pick__job">
              <p className="pick__job-qtde">
                {formatDecimalBr(detalhe.qtde_pedida, 4, { stripTrailingZeros: true })} {detalhe.unidade}
              </p>
              <h2 className="pick__job-nome">{nome}</h2>
              <p className="pick__job-meta">
                {detalhe.parceiro?.razao_social ?? '—'}
                {detalhe.pedido_codigo ? ` · ${detalhe.pedido_codigo}` : ''}
              </p>
            </header>
            <div className="pick__next">
              <p className="pick__next-kicker">Destino: revenda</p>
              <p className="pick__bin">{localPrimeiro || 'Sem local'}</p>
              <p className="pick__hint">
                Saldo agora: {formatDecimalBr(detalhe.saldo, 4, { stripTrailingZeros: true })} {detalhe.unidade}. Confirmar
                registra o que vai sair da prateleira e deixa o item pronto para faturar. A baixa do
                saldo acontece na NF-e.
              </p>
            </div>
          </section>

          {detalhe.pode_confirmar && detalhe.produto?.controla_lote ? (
            <div className="card" style={{ marginTop: '1rem' }}>
              <div className="card-body">
                <h3 style={{ marginTop: 0 }}>Volumes nesta empresa</h3>
                <p className="muted" style={{ marginTop: 0 }}>
                  A lista segue o local. O que já vem marcado é a sugestão para a quantidade do pedido.
                </p>
                {marcasNaCaminhada.length === 0 ? (
                  <p className="muted">Nenhum volume com saldo para este produto.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Levar</th>
                          <th>Local</th>
                          <th>Volume</th>
                          <th>No volume</th>
                          <th>Quantidade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {marcasNaCaminhada.map((m) => {
                          const vol = volDo(m.lote_id);
                          return (
                            <tr key={m.lote_id}>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={m.marcado}
                                  disabled={busy}
                                  aria-label={`Levar volume ${vol?.codigo ?? m.lote_id}`}
                                  onChange={(e) =>
                                    setMarcas((atual) =>
                                      atual.map((x) =>
                                        x.lote_id === m.lote_id ? { ...x, marcado: e.target.checked } : x,
                                      ),
                                    )
                                  }
                                />
                              </td>
                              <td>{vol?.endereco?.codigo ?? '—'}</td>
                              <td>{vol?.codigo ?? '—'}</td>
                              <td>
                                {vol?.qtde_volume != null
                                  ? `${formatDecimalBr(vol.qtde_volume, 4, { stripTrailingZeros: true })} ${vol.unidade ?? ''}`
                                  : '—'}
                              </td>
                              <td>
                                <input
                                  className="input"
                                  inputMode="decimal"
                                  value={m.qtde}
                                  disabled={busy || !m.marcado}
                                  aria-label={`Quantidade do volume ${vol?.codigo ?? m.lote_id}`}
                                  onChange={(e) =>
                                    setMarcas((atual) =>
                                      atual.map((x) =>
                                        x.lote_id === m.lote_id ? { ...x, qtde: e.target.value } : x,
                                      ),
                                    )
                                  }
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {detalhe.pode_confirmar && !detalhe.produto?.controla_lote ? (
            <p className="muted">Este produto não controla volume. Separe a quantidade pedida no saldo.</p>
          ) : null}

          {!detalhe.pode_confirmar && separada.length > 0 ? (
            <div className="card" style={{ marginTop: '1rem' }}>
              <div className="card-body">
                <h3 style={{ marginTop: 0 }}>
                  Separado
                  {detalhe.separacao?.em ? ` em ${formatDateTime(detalhe.separacao.em)}` : ''}
                </h3>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Local</th>
                        <th>Volume</th>
                        <th>Quantidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {separada.map((v) => (
                        <tr key={v.lote_id}>
                          <td>{v.endereco ?? '—'}</td>
                          <td>{v.codigo ?? '—'}</td>
                          <td>
                            {formatDecimalBr(v.qtde, 4, { stripTrailingZeros: true })} {v.unidade ?? detalhe.unidade}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {detalhe.pode_confirmar ? (
            <div style={{ marginTop: '1rem' }}>
              {podeEscrever ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={
                    busy ||
                    (Boolean(detalhe.produto?.controla_lote) &&
                      marcas.length > 0 &&
                      !marcas.some((m) => m.marcado && parseQtdeDigitada(m.qtde) > 0))
                  }
                  onClick={() => void confirmar()}
                >
                  Confirmar: separado para revenda
                </button>
              ) : (
                <p className="muted">Quem confirma a separação é quem escreve no estoque.</p>
              )}
            </div>
          ) : (
            <p className="muted">Esta linha já foi separada.</p>
          )}
        </>
      ) : null}
    </div>
  );
}
