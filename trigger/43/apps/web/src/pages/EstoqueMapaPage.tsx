import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { EstoqueModuleNav } from '../components/EstoqueModuleNav';
import {
  api,
  ApiError,
  type EstoqueLote,
  type EstoqueMapaLocal,
  type EstoqueMapaResumo,
} from '../lib/api';

const PRATELEIRAS = [1, 2, 3, 4, 5, 6] as const;
const COLUNAS = [1, 2, 3, 4] as const;
const LOCAIS = [1, 2, 3] as const;
const DOTS_MAX = 6;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function densidadeClass(volumes: number): string {
  if (volumes <= 0) return 'estoque-mapa-celula--vazia';
  if (volumes <= 2) return 'estoque-mapa-celula--baixa';
  if (volumes <= 5) return 'estoque-mapa-celula--media';
  return 'estoque-mapa-celula--alta';
}

/**
 * Mapa de ocupação dos locais (6×4×3) — ADR_CADASTRO_INSUMO_VOLUME F4.
 * Leitura agregada; saldo oficial continua em Saldos. Sem geometria inventada.
 */
export function EstoqueMapaPage() {
  const [locais, setLocais] = useState<EstoqueMapaLocal[]>([]);
  const [resumo, setResumo] = useState<EstoqueMapaResumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [prateleiraFiltro, setPrateleiraFiltro] = useState<string>('');
  const [soOcupados, setSoOcupados] = useState(false);
  const [selecionado, setSelecionado] = useState<EstoqueMapaLocal | null>(null);
  const [volumes, setVolumes] = useState<EstoqueLote[]>([]);
  const [loadingVolumes, setLoadingVolumes] = useState(false);
  const [erroVolumes, setErroVolumes] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.get<{
        data: { locais: EstoqueMapaLocal[]; resumo: EstoqueMapaResumo };
      }>('/estoque/mapa');
      setLocais(res.data.locais);
      setResumo(res.data.resumo);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar o mapa.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const bySlot = useMemo(() => {
    const map = new Map<string, EstoqueMapaLocal>();
    for (const e of locais) {
      map.set(`${e.prateleira}-${e.coluna}-${e.vao}`, e);
    }
    return map;
  }, [locais]);

  const prateleirasVisiveis = useMemo(() => {
    if (!prateleiraFiltro) return [...PRATELEIRAS];
    return PRATELEIRAS.filter((p) => p === Number(prateleiraFiltro));
  }, [prateleiraFiltro]);

  const abrirLocal = async (cell: EstoqueMapaLocal) => {
    setSelecionado(cell);
    setErroVolumes(null);
    setVolumes([]);
    setLoadingVolumes(true);
    try {
      const res = await api.get<{ data: EstoqueLote[] }>(
        `/estoque/lotes?endereco_id=${cell.id}&com_qtde=1`,
      );
      setVolumes(res.data);
    } catch (err) {
      setErroVolumes(err instanceof ApiError ? err.message : 'Falha ao listar volumes.');
    } finally {
      setLoadingVolumes(false);
    }
  };

  const seed = async () => {
    setSeeding(true);
    setMsg(null);
    setError(null);
    try {
      const res = await api.post<{
        data: {
          criados: number;
          existentes: number;
          renomeados?: number;
          desativados: number;
          total: number;
        };
      }>('/estoque/enderecos/seed');
      const d = res.data;
      const renomeados = (d.renomeados ?? 0) > 0 ? `, ${d.renomeados} V→L` : '';
      const desativados =
        d.desativados > 0 ? `, ${d.desativados} fora do gabarito desativado(s)` : '';
      setMsg(
        `Gabarito 6×4×3: ${d.total} locais (${d.criados} criados, ${d.existentes} ok${renomeados}${desativados}).`,
      );
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao semear locais.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="page estoque-mapa-page">
      <PageHeader
        title="Mapa dos locais"
        description="Ocupação do almoxarifado por endereço (Pxx-Cxx-Lxx). Clique na célula para ver os volumes."
        actions={
          <>
            <Link className="btn btn-secondary" to="/estoque">
              Saldos
            </Link>
            <Link className="btn btn-secondary" to="/estoque/guardar">
              Guardar
            </Link>
            <Link className="btn btn-secondary" to="/estoque/enderecos/etiquetas">
              Etiquetas
            </Link>
          </>
        }
      />

      <EstoqueModuleNav />

      <p className="estoque-ops-line muted">
        Visão de <strong>ocupação</strong> — saldo oficial continua em{' '}
        <Link to="/estoque">Saldos</Link>
        {' · '}
        <Link to="/estoque/guardar">Guardar volume</Link>
        {' · '}
        <Link to="/estoque/enderecos/etiquetas">Etiquetas dos locais</Link>
      </p>

      {msg && (
        <div className="alert alert-success" style={{ marginBottom: '0.75rem' }}>
          {msg}
        </div>
      )}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '0.75rem' }}>
          {error}
        </div>
      )}

      {!loading && resumo && (
        <div className="estoque-kpi detail-meta" aria-label="Resumo do mapa">
          <div>
            <span>Locais</span>
            <strong>{resumo.total_locais}</strong>
          </div>
          <div>
            <span>Ocupados</span>
            <strong>{resumo.ocupados}</strong>
          </div>
          <div>
            <span>Vazios</span>
            <strong>{resumo.vazios}</strong>
          </div>
          <div>
            <span>Volumes</span>
            <strong>{resumo.volumes_guardados}</strong>
          </div>
          <div>
            <span>SKUs</span>
            <strong>{resumo.skus_distintos}</strong>
          </div>
          <div>
            <span>Sem local</span>
            <strong>{resumo.volumes_sem_local}</strong>
          </div>
        </div>
      )}

      {resumo && resumo.volumes_sem_local > 0 && (
        <div className="alert alert-warning alert--compact" style={{ marginBottom: '0.75rem' }}>
          {resumo.volumes_sem_local} volume(s) com saldo ainda sem local —{' '}
          <Link to="/estoque/guardar">Guardar</Link>
          {' · '}
          <Link to="/estoque/lotes/etiquetas">Reimprimir volumes</Link>
        </div>
      )}

      <div className="card estoque-filtros-card">
        <div className="card-body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="mapa-prateleira">Prateleira</label>
            <select
              id="mapa-prateleira"
              value={prateleiraFiltro}
              onChange={(e) => setPrateleiraFiltro(e.target.value)}
            >
              <option value="">Todas</option>
              {PRATELEIRAS.map((p) => (
                <option key={p} value={String(p)}>
                  P{pad2(p)}
                </option>
              ))}
            </select>
          </div>
          <label className="estoque-mapa-check" htmlFor="mapa-ocupados">
            <input
              id="mapa-ocupados"
              type="checkbox"
              checked={soOcupados}
              onChange={(e) => setSoOcupados(e.target.checked)}
            />
            Só ocupados
          </label>
          <button type="button" className="btn btn-secondary btn-sm" disabled={loading} onClick={() => void load()}>
            Atualizar
          </button>
          {(locais.length === 0 || (resumo && resumo.total_locais < 72)) && (
            <button type="button" className="btn btn-secondary btn-sm" disabled={seeding} onClick={() => void seed()}>
              {seeding ? 'Alinhando…' : 'Gerar gabarito 6×4×3'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="muted">Carregando mapa…</p>
      ) : locais.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <p style={{ margin: '0 0 0.75rem' }}>
              Nenhum local cadastrado nesta empresa. Gere o gabarito 6×4×3 para ver o mapa.
            </p>
            <button type="button" className="btn btn-primary" disabled={seeding} onClick={() => void seed()}>
              {seeding ? 'Gerando…' : 'Gerar gabarito 6×4×3'}
            </button>
          </div>
        </div>
      ) : (
        <div className="estoque-mapa-layout">
          <div className="estoque-mapa-grades" role="region" aria-label="Grade de locais">
            {prateleirasVisiveis.map((p) => (
              <section key={p} className="estoque-mapa-prateleira" aria-label={`Prateleira P${pad2(p)}`}>
                <header className="estoque-mapa-prateleira-head">
                  <h2>P{pad2(p)}</h2>
                </header>
                <div className="estoque-mapa-colunas">
                  {COLUNAS.map((c) => (
                    <div key={c} className="estoque-mapa-coluna">
                      <div className="estoque-mapa-coluna-head">C{pad2(c)}</div>
                      <div className="estoque-mapa-locais">
                        {LOCAIS.map((v) => {
                          const cell = bySlot.get(`${p}-${c}-${v}`);
                          if (!cell) {
                            return (
                              <div
                                key={v}
                                className="estoque-mapa-celula estoque-mapa-celula--ausente"
                                aria-hidden
                              />
                            );
                          }
                          if (soOcupados && cell.volumes_count <= 0) {
                            return (
                              <div
                                key={v}
                                className="estoque-mapa-celula estoque-mapa-celula--oculta"
                                aria-hidden
                              />
                            );
                          }
                          const nDots = Math.min(cell.volumes_count, DOTS_MAX);
                          const ativo = selecionado?.id === cell.id;
                          return (
                            <button
                              key={v}
                              type="button"
                              className={`estoque-mapa-celula ${densidadeClass(cell.volumes_count)}${
                                ativo ? ' estoque-mapa-celula--ativa' : ''
                              }`}
                              onClick={() => void abrirLocal(cell)}
                              title={`${cell.codigo}: ${cell.volumes_count} volume(s)`}
                              aria-pressed={ativo}
                              aria-label={`${cell.codigo}, ${cell.volumes_count} volumes`}
                            >
                              <span className="estoque-mapa-celula-cod">L{pad2(v)}</span>
                              <span className="estoque-mapa-dots" aria-hidden>
                                {cell.volumes_count <= 0 ? (
                                  <span className="estoque-mapa-dot estoque-mapa-dot--vazio" />
                                ) : (
                                  Array.from({ length: nDots }, (_, i) => (
                                    <span key={i} className="estoque-mapa-dot" />
                                  ))
                                )}
                                {cell.volumes_count > DOTS_MAX && (
                                  <span className="estoque-mapa-mais">+{cell.volumes_count - DOTS_MAX}</span>
                                )}
                              </span>
                              <span className="estoque-mapa-celula-n">{cell.volumes_count}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <aside className="estoque-mapa-detalhe card" aria-live="polite">
            <div className="card-body">
              {!selecionado ? (
                <p className="muted" style={{ margin: 0 }}>
                  Selecione um local na grade para listar os volumes guardados.
                </p>
              ) : (
                <>
                  <div className="estoque-mapa-detalhe-head">
                    <div>
                      <h3 style={{ margin: 0 }}>{selecionado.codigo}</h3>
                      <p className="muted" style={{ margin: '0.2rem 0 0' }}>
                        {selecionado.volumes_count} volume(s)
                        {selecionado.skus_count > 0 ? ` · ${selecionado.skus_count} SKU(s)` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setSelecionado(null);
                        setVolumes([]);
                      }}
                    >
                      Fechar
                    </button>
                  </div>

                  {loadingVolumes && <p className="muted">Carregando volumes…</p>}
                  {erroVolumes && <div className="alert alert-error">{erroVolumes}</div>}

                  {!loadingVolumes && !erroVolumes && volumes.length === 0 && (
                    <p className="muted">Local vazio. Use Guardar para amarrar um volume aqui.</p>
                  )}

                  {!loadingVolumes && volumes.length > 0 && (
                    <div className="table-wrap">
                      <table className="estoque-dense-table">
                        <thead>
                          <tr>
                            <th>Volume</th>
                            <th>SKU</th>
                            <th className="num">Qtde</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {volumes.map((l) => (
                            <tr key={l.id}>
                              <td>
                                <code>{l.codigo}</code>
                                {l.largura_mm && l.comprimento_m ? (
                                  <div className="muted" style={{ fontSize: '0.72rem' }}>
                                    {l.largura_mm} mm × {l.comprimento_m} m
                                  </div>
                                ) : null}
                              </td>
                              <td>
                                {l.produto ? (
                                  <>
                                    <div>{l.produto.codigo}</div>
                                    <div className="muted" style={{ fontSize: '0.72rem' }}>
                                      {l.produto.descricao_fiscal}
                                    </div>
                                  </>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="num">
                                {l.qtde} {l.unidade}
                              </td>
                              <td>
                                <Link
                                  className="btn btn-secondary btn-sm"
                                  to={`/estoque/lotes/${l.id}/etiqueta`}
                                >
                                  Etiqueta
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <p className="estoque-ops-line muted" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                    <Link to="/estoque/guardar">Guardar neste / outro local</Link>
                  </p>
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
