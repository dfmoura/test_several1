import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { EstoqueModuleNav } from '../components/EstoqueModuleNav';
import { LocalSaldoCampo, type LocalSaldo } from '../components/LocalSaldoCampo';
import {
  api,
  ApiError,
  type EstoqueLote,
  type EstoqueMapaItemSemVolume,
  type EstoqueMapaLocal,
  type EstoqueMapaNomeado,
  type EstoqueMapaResumo,
} from '../lib/api';
import { useAuth } from '../lib/auth';

const LOCAIS_INICIAIS = 72;
const DOTS_MAX = 6;

function erroApi(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const first = err.details ? Object.values(err.details)[0]?.[0] : undefined;
    return first ?? err.message;
  }
  return fallback;
}

function ocupacaoLocal(cell: EstoqueMapaLocal): number {
  return cell.volumes_count + (cell.itens?.length ?? 0);
}

function densidadeClass(volumes: number): string {
  if (volumes <= 0) return 'estoque-mapa-celula--vazia';
  if (volumes <= 2) return 'estoque-mapa-celula--baixa';
  if (volumes <= 5) return 'estoque-mapa-celula--media';
  return 'estoque-mapa-celula--alta';
}

function rotuloDoLocal(codigo: string, nome?: string | null): string {
  const livre = nome?.trim();
  return livre ? `${codigo} · ${livre}` : codigo;
}

/**
 * Mapa de ocupação dos locais — código L00000001, sem prateleira.
 * Leitura agregada; saldo oficial continua em Saldos.
 */
export function EstoqueMapaPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('estoque.escrever');
  const [locais, setLocais] = useState<EstoqueMapaLocal[]>([]);
  const [nomeados, setNomeados] = useState<EstoqueMapaNomeado[]>([]);
  const [resumo, setResumo] = useState<EstoqueMapaResumo | null>(null);
  const [semLocal, setSemLocal] = useState<EstoqueMapaItemSemVolume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [cadastrando, setCadastrando] = useState(false);
  const [inativando, setInativando] = useState(false);
  const [busca, setBusca] = useState('');
  const [soOcupados, setSoOcupados] = useState(false);
  const [selecionado, setSelecionado] = useState<EstoqueMapaLocal | null>(null);
  const [volumes, setVolumes] = useState<EstoqueLote[]>([]);
  const [loadingVolumes, setLoadingVolumes] = useState(false);
  const [erroVolumes, setErroVolumes] = useState<string | null>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const inativandoRef = useRef(false);
  inativandoRef.current = inativando;

  const load = useCallback(async (silencioso = false) => {
    if (!silencioso) {
      setError(null);
      setLoading(true);
    }
    try {
      const res = await api.get<{
        data: {
          locais: EstoqueMapaLocal[];
          nomeados?: EstoqueMapaNomeado[];
          sem_local?: EstoqueMapaItemSemVolume[];
          resumo: EstoqueMapaResumo;
        };
      }>('/estoque/mapa');
      setLocais(res.data.locais);
      setNomeados(res.data.nomeados ?? []);
      setSemLocal(res.data.sem_local ?? []);
      setResumo(res.data.resumo);
      return res.data.locais;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar o mapa.');
      return null;
    } finally {
      if (!silencioso) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return locais.filter((e) => {
      if (soOcupados && e.volumes_count <= 0 && (e.itens?.length ?? 0) === 0) return false;
      if (!termo) return true;
      const nome = (e.nome ?? '').toLowerCase();
      return e.codigo.toLowerCase().includes(termo) || nome.includes(termo);
    });
  }, [locais, busca, soOcupados]);

  const fecharLocal = useCallback(() => {
    if (inativandoRef.current) return;
    setSelecionado(null);
    setVolumes([]);
    setErroVolumes(null);
  }, []);

  useEffect(() => {
    if (!selecionado) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || inativandoRef.current) return;
      e.preventDefault();
      fecharLocal();
    };
    window.addEventListener('keydown', onKey);
    const foco = window.setTimeout(() => painelRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(foco);
    };
  }, [selecionado?.id, fecharLocal]);

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

  const aposMarcarLocal = async (local: LocalSaldo | null) => {
    const lista = await load(true);
    if (!lista) return;
    if (local) {
      const cell = lista.find((c) => c.id === local.id);
      if (cell) {
        void abrirLocal(cell);
        return;
      }
    }
    setSelecionado((atual) => (atual ? lista.find((c) => c.id === atual.id) ?? null : null));
    setVolumes([]);
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
      const renomeados = (d.renomeados ?? 0) > 0 ? `, ${d.renomeados} alinhados para L` : '';
      const desativados =
        d.desativados > 0 ? `, ${d.desativados} duplicado(s) inativado(s)` : '';
      setMsg(
        `Locais L00000001–L${String(d.total).padStart(8, '0')}: ${d.criados} criados, ${d.existentes} já existiam${renomeados}${desativados}.`,
      );
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao semear locais.');
    } finally {
      setSeeding(false);
    }
  };

  const cadastrar = async (event: FormEvent) => {
    event.preventDefault();
    setCadastrando(true);
    setMsg(null);
    setError(null);
    try {
      const res = await api.post<{ data: { codigo: string } }>('/estoque/enderecos', {});
      setMsg(`Local ${res.data.codigo} cadastrado. Imprima a etiqueta antes de guardar volume.`);
      await load();
    } catch (err) {
      setError(erroApi(err, 'Falha ao cadastrar o local.'));
    } finally {
      setCadastrando(false);
    }
  };

  const inativar = async (cell: EstoqueMapaLocal) => {
    const ocupacao =
      cell.volumes_count > 0
        ? ` Há ${cell.volumes_count} volume(s) neste endereço; eles continuam ligados a ele.`
        : '';
    if (
      !window.confirm(
        `Inativar ${cell.codigo}? O local sai do mapa e do Guardar.${ocupacao}`,
      )
    ) {
      return;
    }
    setInativando(true);
    setMsg(null);
    setError(null);
    try {
      await api.patch(`/estoque/enderecos/${cell.id}`, { ativo: false });
      setSelecionado(null);
      setVolumes([]);
      setMsg(`${cell.codigo} inativado. O número não volta a ser usado.`);
      await load();
    } catch (err) {
      setError(erroApi(err, 'Falha ao inativar o local.'));
    } finally {
      setInativando(false);
    }
  };

  return (
    <div className="page estoque-mapa-page">
      <PageHeader
        title="Mapa dos locais"
        description="Ocupação por local. O código é só o número L00000001, em sequência."
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

      {nomeados.length > 0 && (
        <div className="card" style={{ marginBottom: '0.75rem' }}>
          <div className="card-body">
            <h3 className="orc-subsection-title" style={{ marginTop: 0 }}>
              Com nome
            </h3>
            <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem' }}>
              {nomeados.map((lugar) => (
                <li key={lugar.id}>
                  <strong>{lugar.nome?.trim() || lugar.codigo}</strong>
                  {lugar.volumes_count > 0 ? ` · ${lugar.volumes_count} volume(s)` : ''}
                  {lugar.itens.length === 0 && lugar.volumes_count === 0 ? ' · vazio' : ''}
                  {lugar.itens.map((item) => (
                    <span key={item.produto_id}>
                      {` · ${item.codigo} ${item.qtde} ${item.unidade}`}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {semLocal.length > 0 && (
        <div className="card" style={{ marginBottom: '0.75rem' }}>
          <div className="card-body">
            <h3 className="orc-subsection-title" style={{ marginTop: 0 }}>
              No estoque, sem local
            </h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Caixa, tubete e os demais itens sem volume. O número do mapa marca o lugar da quantidade
              inteira e não gera movimento.
            </p>
            <div className="table-wrap">
              <table className="estoque-dense-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="num">Qtde</th>
                    <th>Local</th>
                  </tr>
                </thead>
                <tbody>
                  {semLocal.map((item) => (
                    <tr key={item.produto_id}>
                      <td>
                        <div>{item.codigo}</div>
                        {item.descricao ? (
                          <div className="muted" style={{ fontSize: '0.72rem' }}>
                            {item.descricao}
                          </div>
                        ) : null}
                      </td>
                      <td className="num">
                        {item.qtde} {item.unidade}
                      </td>
                      <td>
                        {canWrite ? (
                          <LocalSaldoCampo
                            produtoId={item.produto_id}
                            local={null}
                            onSaved={(local) => void aposMarcarLocal(local)}
                          />
                        ) : (
                          <Link to="/estoque">Marcar em Saldos</Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {resumo && resumo.volumes_sem_local > 0 && (
        <div className="alert alert-warning alert--compact" style={{ marginBottom: '0.75rem' }}>
          {resumo.volumes_sem_local} volume(s) com saldo ainda sem local —{' '}
          <Link to="/estoque/guardar">Guardar no local</Link>
          {' · '}
          <Link to="/estoque/lotes/etiquetas?sem_endereco=1">Etiquetas sem local</Link>
        </div>
      )}

      <div className="card estoque-filtros-card">
        <div className="card-body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="mapa-busca">Local</label>
            <input
              id="mapa-busca"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="L00000001"
              style={{ width: '9rem' }}
            />
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
          {(locais.length === 0 || (resumo && resumo.total_locais < LOCAIS_INICIAIS)) && (
            <button type="button" className="btn btn-secondary btn-sm" disabled={seeding} onClick={() => void seed()}>
              {seeding ? 'Alinhando…' : 'Gerar L00000001–L00000072'}
            </button>
          )}
        </div>
      </div>

      {canWrite && (
        <form className="card estoque-filtros-card" onSubmit={(e) => void cadastrar(e)}>
          <div className="card-body" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={cadastrando}>
              {cadastrando ? 'Cadastrando…' : 'Cadastrar próximo local'}
            </button>
            <p className="muted" style={{ margin: 0, flex: '1 1 16rem' }}>
              O número sai sozinho, em sequência. Local inativo não volta a ser usado.
            </p>
          </div>
        </form>
      )}

      {loading ? (
        <p className="muted">Carregando mapa…</p>
      ) : locais.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <p style={{ margin: '0 0 0.75rem' }}>
              Nenhum local cadastrado nesta empresa. Gere L00000001–L00000072 para ver o mapa.
            </p>
            <button type="button" className="btn btn-primary" disabled={seeding} onClick={() => void seed()}>
              {seeding ? 'Gerando…' : 'Gerar L00000001–L00000072'}
            </button>
          </div>
        </div>
      ) : (
        <>
        <div className="estoque-mapa-lista" role="region" aria-label="Locais">
          {visiveis.length === 0 ? (
            <p className="muted estoque-mapa-vazio" style={{ margin: 0 }}>
              Nenhum local com esse filtro.
            </p>
          ) : (
            visiveis.map((cell) => {
              const ocupacao = ocupacaoLocal(cell);
              const nDots = Math.min(ocupacao, DOTS_MAX);
              const ativo = selecionado?.id === cell.id;
              return (
                <button
                  key={cell.id}
                  type="button"
                  className={`estoque-mapa-celula ${densidadeClass(ocupacao)}${
                    ativo ? ' estoque-mapa-celula--ativa' : ''
                  }`}
                  onClick={() => void abrirLocal(cell)}
                  title={`${cell.codigo}: ${cell.volumes_count} volume(s)${
                    (cell.itens?.length ?? 0) > 0 ? `, ${cell.itens?.length} item(ns) sem volume` : ''
                  }`}
                  aria-pressed={ativo}
                  aria-haspopup="dialog"
                  aria-label={`${cell.codigo}, ${ocupacao} no local`}
                >
                  <span className="estoque-mapa-celula-cod">{cell.codigo}</span>
                  <span className="estoque-mapa-dots" aria-hidden>
                    {ocupacao <= 0 ? (
                      <span className="estoque-mapa-dot estoque-mapa-dot--vazio" />
                    ) : (
                      Array.from({ length: nDots }, (_, i) => (
                        <span key={i} className="estoque-mapa-dot" />
                      ))
                    )}
                    {ocupacao > DOTS_MAX && (
                      <span className="estoque-mapa-mais">+{ocupacao - DOTS_MAX}</span>
                    )}
                  </span>
                  <span className="estoque-mapa-celula-n">{ocupacao}</span>
                </button>
              );
            })
          )}
        </div>

        {selecionado && (
          <div
            className="faca-modal estoque-mapa-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mapa-local-title"
          >
            <button
              type="button"
              className="faca-modal-backdrop"
              aria-label="Fechar"
              onClick={fecharLocal}
            />
            <div
              className="faca-modal-panel estoque-mapa-dialog-panel"
              ref={painelRef}
              tabIndex={-1}
            >
              <div className="faca-modal-head estoque-mapa-detalhe-head">
                <div>
                  <h2 id="mapa-local-title">{selecionado.codigo}</h2>
                  <p className="faca-modal-sub">
                    {selecionado.nome?.trim() ? `${selecionado.nome.trim()} · ` : ''}
                    {selecionado.volumes_count} volume(s)
                    {(selecionado.itens?.length ?? 0) > 0
                      ? ` · ${selecionado.itens?.length} sem volume`
                      : ''}
                    {selecionado.skus_count > 0 ? ` · ${selecionado.skus_count} SKU(s)` : ''}
                  </p>
                </div>
                <div className="estoque-mapa-detalhe-acoes">
                  {canWrite && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={inativando}
                      onClick={() => void inativar(selecionado)}
                    >
                      {inativando ? 'Inativando…' : 'Inativar'}
                    </button>
                  )}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={fecharLocal}>
                    Fechar
                  </button>
                </div>
              </div>

              <div className="estoque-mapa-dialog-body" aria-live="polite">
                {loadingVolumes && <p className="muted">Carregando volumes…</p>}
                {erroVolumes && <div className="alert alert-error">{erroVolumes}</div>}

                {(selecionado.itens?.length ?? 0) > 0 && (
                  <>
                    <h3 className="estoque-mapa-ficha-titulo">Sem volume</h3>
                    <ul className="estoque-mapa-ficha">
                      <li className="estoque-mapa-linha estoque-mapa-linha--registro estoque-mapa-linha--head" aria-hidden>
                        <span>Código</span>
                        <span>Descrição</span>
                        <span>Medida</span>
                        <span className="estoque-mapa-ficha-qtde">Qtde</span>
                        <span>Local</span>
                        <span />
                      </li>
                      {selecionado.itens?.map((item) => {
                        const lugar = rotuloDoLocal(selecionado.codigo, selecionado.nome);
                        return (
                          <li key={item.produto_id} className="estoque-mapa-linha estoque-mapa-linha--registro">
                            <strong className="estoque-mapa-cel" title={item.codigo}>
                              {item.codigo}
                            </strong>
                            <span className="estoque-mapa-cel estoque-mapa-cel--muted" title={item.descricao || undefined}>
                              {item.descricao || '—'}
                            </span>
                            <span className="estoque-mapa-cel estoque-mapa-cel--muted">—</span>
                            <span className="estoque-mapa-ficha-qtde">
                              {item.qtde} {item.unidade}
                            </span>
                            {canWrite ? (
                              <LocalSaldoCampo
                                produtoId={item.produto_id}
                                local={{
                                  id: selecionado.id,
                                  codigo: selecionado.codigo,
                                  nome: selecionado.nome,
                                }}
                                onSaved={(local) => void aposMarcarLocal(local)}
                              />
                            ) : (
                              <span className="estoque-mapa-cel" title={lugar}>
                                {lugar}
                              </span>
                            )}
                            <span />
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}

                {!loadingVolumes && !erroVolumes && volumes.length === 0 && (selecionado.itens?.length ?? 0) === 0 && (
                  <p className="muted">Local vazio. Use Guardar para amarrar um volume aqui.</p>
                )}

                {!loadingVolumes && volumes.length > 0 && (
                  <>
                    <h3 className="estoque-mapa-ficha-titulo">Volumes</h3>
                    <ul className="estoque-mapa-ficha">
                      <li className="estoque-mapa-linha estoque-mapa-linha--registro estoque-mapa-linha--head" aria-hidden>
                        <span>Código</span>
                        <span>Descrição</span>
                        <span>Medida</span>
                        <span className="estoque-mapa-ficha-qtde">Qtde</span>
                        <span>Local</span>
                        <span />
                      </li>
                      {volumes.map((l) => {
                        const medida =
                          l.largura_mm && l.comprimento_m
                            ? `${l.largura_mm} mm × ${l.comprimento_m} m`
                            : '—';
                        const descricao = [l.produto?.codigo, l.produto?.descricao_fiscal]
                          .filter(Boolean)
                          .join(' · ');
                        const lugar = rotuloDoLocal(selecionado.codigo, selecionado.nome);
                        return (
                          <li key={l.id} className="estoque-mapa-linha estoque-mapa-linha--registro">
                            <code className="estoque-mapa-cel" title={l.codigo}>
                              {l.codigo}
                            </code>
                            <span className="estoque-mapa-cel estoque-mapa-cel--muted" title={descricao || undefined}>
                              {descricao || '—'}
                            </span>
                            <span className="estoque-mapa-cel estoque-mapa-cel--muted" title={medida === '—' ? undefined : medida}>
                              {medida}
                            </span>
                            <span className="estoque-mapa-ficha-qtde">
                              {l.qtde} {l.unidade}
                            </span>
                            <span className="estoque-mapa-cel" title={lugar}>
                              {lugar}
                            </span>
                            <Link
                              className="btn btn-secondary btn-sm"
                              to={`/estoque/lotes/${l.id}/etiqueta`}
                            >
                              Etiqueta
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}

                <p className="estoque-ops-line muted" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                  <Link to="/estoque/guardar">Guardar neste / outro local</Link>
                </p>
              </div>
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
}
