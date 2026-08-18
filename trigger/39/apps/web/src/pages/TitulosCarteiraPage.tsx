import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import {
  ApiError,
  api,
  type EmpresaContaFinanceira,
  type NaturezaGerencial,
  type Parceiro,
  type Titulo,
  type TituloCarteiraMeta,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { titStatusLabel } from '../lib/comprasUi';
import { titFaixaLabel, titFormaLabel, titOrigemLabel, TIT_FORMAS } from '../lib/financeiroUi';
import { formatCurrency, formatDate } from '../lib/format';
import { useTableSort } from '../lib/useTableSort';

const SORT = {
  codigo: (t: Titulo) => t.codigo,
  parceiro: (t: Titulo) => t.parceiro?.razao_social,
  origem: (t: Titulo) => t.origem,
  documento: (t: Titulo) => t.documento,
  natureza: (t: Titulo) => t.natureza?.codigo,
  vencimento: (t: Titulo) => t.vencimento,
  valor: (t: Titulo) => Number(t.valor),
  saldo: (t: Titulo) => Number(t.saldo),
  status: (t: Titulo) => t.status,
};

function activateRow(e: KeyboardEvent, go: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    go();
  }
}

function parceiroNome(t: Titulo): string {
  return t.parceiro?.nome_fantasia || t.parceiro?.razao_social || '—';
}

type Props = {
  tipo: 'RECEBER' | 'PAGAR';
};

const EMPTY_META: TituloCarteiraMeta = {
  tipo: 'PAGAR',
  statuses: [],
  formas: TIT_FORMAS,
  faixas: [],
  aging: [],
  aberto: { count: 0, saldo: '0.00' },
  previsao: {
    receber_saldo: '0.00',
    pagar_saldo: '0.00',
    liquido: '0.00',
    legenda: '',
  },
};

export function TitulosCarteiraPage({ tipo }: Props) {
  const receber = tipo === 'RECEBER';
  const { hasPermission, empresaId } = useAuth();
  const canWrite = hasPermission('financeiro.escrever');
  const [searchParams, setSearchParams] = useSearchParams();

  const situacao = (searchParams.get('situacao') ?? 'aberto').toLowerCase();
  const faixa = searchParams.get('faixa') ?? '';
  const qParam = searchParams.get('q') ?? '';
  const tituloParam = searchParams.get('titulo') ?? '';

  const [q, setQ] = useState(qParam);
  const [titulos, setTitulos] = useState<Titulo[]>([]);
  const [meta, setMeta] = useState<TituloCarteiraMeta>(EMPTY_META);
  const [contas, setContas] = useState<EmpresaContaFinanceira[]>([]);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [naturezas, setNaturezas] = useState<NaturezaGerencial[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Titulo | null>(null);
  const [baixando, setBaixando] = useState(false);
  const [novo, setNovo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [contaId, setContaId] = useState('');
  const [valor, setValor] = useState('');
  const [pagoEm, setPagoEm] = useState(() => new Date().toISOString().slice(0, 10));
  const [forma, setForma] = useState('PIX');
  const [obsBaixa, setObsBaixa] = useState('');

  const [avParceiro, setAvParceiro] = useState('');
  const [avNatureza, setAvNatureza] = useState('');
  const [avValor, setAvValor] = useState('');
  const [avEmissao, setAvEmissao] = useState(() => new Date().toISOString().slice(0, 10));
  const [avVencimento, setAvVencimento] = useState(() => new Date().toISOString().slice(0, 10));
  const [avDocumento, setAvDocumento] = useState('');
  const [avObs, setAvObs] = useState('');
  const [busy, setBusy] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [motivoCancel, setMotivoCancel] = useState('');

  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(titulos, SORT);

  const setFiltro = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    setSearchParams(next, { replace: true });
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('tipo', tipo);
      if (situacao && situacao !== 'todos') params.set('situacao', situacao);
      if (faixa) params.set('faixa', faixa);
      if (qParam) params.set('q', qParam);
      const res = await api.get<{ data: Titulo[]; meta: TituloCarteiraMeta }>(
        `/titulos?${params.toString()}`,
      );
      setTitulos(res.data);
      setMeta(res.meta ?? EMPTY_META);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setQ(qParam);
    void load();
  }, [tipo, situacao, faixa, qParam]);

  useEffect(() => {
    if (!empresaId) return;
    void api
      .get<{ data: { contas_financeiras?: EmpresaContaFinanceira[] } }>(`/empresas/${empresaId}`)
      .then((emp) => {
        const list = (emp.data.contas_financeiras ?? []).filter((c) => c.ativa !== false);
        setContas(list);
        const principal = list.find((c) => c.principal) ?? list[0];
        if (principal) setContaId(String(principal.id));
      })
      .catch(() => setContas([]));
  }, [empresaId]);

  useEffect(() => {
    if (!canWrite) return;
    void Promise.all([
      api.get<{ data: Parceiro[] }>('/parceiros'),
      api.get<{ data: NaturezaGerencial[] }>('/consulta/naturezas-gerenciais'),
    ])
      .then(([p, n]) => {
        setParceiros(p.data);
        setNaturezas(n.data);
      })
      .catch(() => {
        setParceiros([]);
        setNaturezas([]);
      });
  }, [canWrite, empresaId]);

  useEffect(() => {
    if (!tituloParam) return;
    const found = titulos.find((t) => String(t.id) === tituloParam);
    if (found) setSelected(found);
  }, [tituloParam, titulos]);

  const naturezasAvulso = useMemo(() => {
    return naturezas.filter((n) => {
      if (receber) return n.grupo === 1 || n.grupo === 5;
      return n.grupo === 2 || n.grupo === 3 || n.grupo === 4 || n.grupo === 5;
    });
  }, [naturezas, receber]);

  const openFicha = (t: Titulo, iniciarBaixa = false) => {
    setSelected(t);
    setBaixando(iniciarBaixa && (t.status === 'ABERTO' || t.status === 'PARCIAL'));
    setCancelando(false);
    setMotivoCancel('');
    setValor(t.saldo);
    setObsBaixa('');
    setError(null);
    setMsg(null);
    setNovo(false);
    setFiltro({ titulo: String(t.id) });
  };

  const closeFicha = () => {
    setSelected(null);
    setBaixando(false);
    setFiltro({ titulo: null });
  };

  const baixar = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setMsg(null);
    setBusy(true);
    try {
      await api.post(`/titulos/${selected.id}/baixar`, {
        conta_financeira_id: Number(contaId),
        valor,
        pago_em: pagoEm,
        forma: forma || undefined,
        observacao: obsBaixa || undefined,
      });
      setMsg(`Baixa registrada em ${selected.codigo}.`);
      closeFicha();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha na baixa.');
    } finally {
      setBusy(false);
    }
  };

  const criarAvulso = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);
    setBusy(true);
    try {
      const res = await api.post<{ data: Titulo }>('/titulos', {
        tipo,
        parceiro_id: Number(avParceiro),
        natureza_id: Number(avNatureza),
        valor: avValor,
        emissao: avEmissao,
        vencimento: avVencimento,
        documento: avDocumento || undefined,
        observacao: avObs || undefined,
      });
      setMsg(`Lançamento ${res.data.codigo} criado.`);
      setNovo(false);
      setAvValor('');
      setAvDocumento('');
      setAvObs('');
      await load();
      openFicha(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar o lançamento.');
    } finally {
      setBusy(false);
    }
  };

  const cancelarAvulso = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setBusy(true);
    try {
      await api.post(`/titulos/${selected.id}/cancelar`, { motivo: motivoCancel });
      setMsg(`${selected.codigo} cancelado.`);
      closeFicha();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível cancelar.');
    } finally {
      setBusy(false);
    }
  };

  const title = receber ? 'Contas a receber' : 'Contas a pagar';
  const description = receber
    ? 'Carteira a receber da EMP ativa. Aging operacional; baixa contra conta financeira. Não é DRE.'
    : 'Carteira a pagar da EMP ativa. Títulos de compra, comissão e lançamento pontual. Não é DRE.';

  const liquidoNeg = Number(meta.previsao.liquido) < 0;

  return (
    <>
      <PageHeader title={title} description={description} />

      {qParam ? (
        <p className="form-hint">Filtrado por «{qParam}».</p>
      ) : null}

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <section className="fin-previsao" aria-label="Previsão operacional">
        <div>
          <span className="fin-previsao-label">A receber</span>
          <strong>{formatCurrency(meta.previsao.receber_saldo)}</strong>
        </div>
        <div>
          <span className="fin-previsao-label">A pagar</span>
          <strong>{formatCurrency(meta.previsao.pagar_saldo)}</strong>
        </div>
        <div className={liquidoNeg ? 'is-neg' : undefined}>
          <span className="fin-previsao-label">Líquido operacional</span>
          <strong>{formatCurrency(meta.previsao.liquido)}</strong>
        </div>
        <p className="fin-previsao-hint">
          {meta.previsao.legenda ||
            'Títulos em aberto nesta EMP — não é DRE nem contabilidade oficial.'}
        </p>
      </section>

      <div className="fin-aging-grid" role="group" aria-label="Aging">
        <button
          type="button"
          className={`fin-aging${!faixa ? ' is-active' : ''}`}
          onClick={() => setFiltro({ faixa: null })}
        >
          <span>Em aberto</span>
          <strong>{formatCurrency(meta.aberto.saldo)}</strong>
          <em>{meta.aberto.count} título{meta.aberto.count === 1 ? '' : 's'}</em>
        </button>
        {meta.aging.map((fx) => {
          const alerta = fx.id !== 'A_VENCER' && fx.count > 0 && fx.id !== 'VENCE_HOJE';
          const hoje = fx.id === 'VENCE_HOJE' && fx.count > 0;
          return (
            <button
              key={fx.id}
              type="button"
              className={`fin-aging${faixa === fx.id ? ' is-active' : ''}${alerta ? ' is-alerta' : ''}${hoje ? ' is-hoje' : ''}`}
              onClick={() => setFiltro({ faixa: faixa === fx.id ? null : fx.id, situacao: 'aberto' })}
            >
              <span>{fx.label}</span>
              <strong>{formatCurrency(fx.saldo)}</strong>
              <em>{fx.count} título{fx.count === 1 ? '' : 's'}</em>
            </button>
          );
        })}
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setFiltro({ q: q.trim() || null });
            }}
            className="form-grid"
          >
            <div className="form-group span-2">
              <label>Buscar</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={receber ? 'TIT, cliente, PED, FAT, natureza…' : 'TIT, fornecedor, OC, documento…'}
              />
            </div>
            <div className="form-group">
              <label>Situação</label>
              <select
                value={situacao === 'todos' ? 'todos' : 'aberto'}
                onChange={(e) => setFiltro({ situacao: e.target.value })}
              >
                <option value="aberto">Em aberto</option>
                <option value="todos">Todas</option>
              </select>
            </div>
            <div className="form-group" style={{ alignSelf: 'end' }}>
              <div className="btn-row">
                <button type="submit" className="btn btn-secondary">
                  Filtrar
                </button>
                {canWrite ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      closeFicha();
                      setNovo(true);
                      setError(null);
                      setMsg(null);
                    }}
                  >
                    Lançamento pontual
                  </button>
                ) : null}
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="card" style={{ marginBottom: selected || novo ? '1rem' : undefined }}>
        <div className="table-wrap table-wrap--freeze">
          {loading ? (
            <div className="loading">Carregando…</div>
          ) : sorted.length === 0 ? (
            <div className="empty-state">
              {receber ? 'Nenhum título a receber neste filtro.' : 'Nenhum título a pagar neste filtro.'}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <SortableTh column="codigo" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Código
                  </SortableTh>
                  <SortableTh
                    column="parceiro"
                    sorts={sorts}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                  >
                    {receber ? 'Cliente' : 'Parceiro'}
                  </SortableTh>
                  <SortableTh
                    column="origem"
                    sorts={sorts}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                  >
                    Origem
                  </SortableTh>
                  <SortableTh
                    column="documento"
                    sorts={sorts}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                  >
                    Documento
                  </SortableTh>
                  <SortableTh
                    column="natureza"
                    sorts={sorts}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                  >
                    Natureza
                  </SortableTh>
                  <SortableTh
                    column="vencimento"
                    sorts={sorts}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                  >
                    Vencimento
                  </SortableTh>
                  <SortableTh column="saldo" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Saldo
                  </SortableTh>
                  <SortableTh column="status" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Status
                  </SortableTh>
                  <th className="acoes" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((t) => {
                  const go = () => openFicha(t);
                  return (
                    <tr
                      key={t.id}
                      className={`clickable${t.vencido ? ' is-vencido' : ''}${selected?.id === t.id ? ' is-selected' : ''}`}
                      onClick={go}
                      onKeyDown={(e) => activateRow(e, go)}
                      tabIndex={0}
                    >
                      <td>{t.codigo}</td>
                      <td>{parceiroNome(t)}</td>
                      <td>{titOrigemLabel(t.origem)}</td>
                      <td>
                        {t.documento || '—'}
                        {t.n_dup ? <div className="muted">dup {t.n_dup}</div> : null}
                      </td>
                      <td>
                        {t.natureza ? (
                          <>
                            {t.natureza.codigo_exibicao}
                            <div className="muted">{t.natureza.nome}</div>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        {formatDate(t.vencimento)}
                        {t.vencido ? (
                          <div className="muted">
                            {t.dias_atraso} dia{t.dias_atraso === 1 ? '' : 's'} · {titFaixaLabel(t.faixa_aging)}
                          </div>
                        ) : t.faixa_aging === 'VENCE_HOJE' ? (
                          <div className="muted">Hoje</div>
                        ) : null}
                      </td>
                      <td>{formatCurrency(t.saldo)}</td>
                      <td>
                        <StatusPill status={titStatusLabel(t.status)} />
                        {t.vencido ? <StatusPill status="Vencido" /> : null}
                      </td>
                      <td className="acoes" onClick={(e) => e.stopPropagation()}>
                        {canWrite && (t.status === 'ABERTO' || t.status === 'PARCIAL') ? (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => openFicha(t, true)}
                          >
                            {receber ? 'Baixar' : 'Pagar'}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected ? (
        <div className="card">
          <div className="card-body">
            <div className="form-section">
              <h3>
                {selected.codigo}
                <span className="muted" style={{ marginLeft: '0.5rem', fontWeight: 400 }}>
                  {titOrigemLabel(selected.origem)}
                </span>
              </h3>
              <dl className="fin-ficha-dl">
                <div>
                  <dt>{receber ? 'Cliente' : 'Parceiro'}</dt>
                  <dd>{parceiroNome(selected)}</dd>
                </div>
                <div>
                  <dt>Natureza</dt>
                  <dd>
                    {selected.natureza
                      ? `${selected.natureza.codigo_exibicao} · ${selected.natureza.nome}`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt>Documento</dt>
                  <dd>{selected.documento || '—'}</dd>
                </div>
                <div>
                  <dt>Vencimento</dt>
                  <dd>
                    {formatDate(selected.vencimento)}
                    {selected.vencido ? ` · ${titFaixaLabel(selected.faixa_aging)}` : ''}
                  </dd>
                </div>
                <div>
                  <dt>Valor / saldo</dt>
                  <dd>
                    {formatCurrency(selected.valor)} / {formatCurrency(selected.saldo)}
                  </dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <StatusPill status={titStatusLabel(selected.status)} />
                  </dd>
                </div>
              </dl>
              <p className="btn-row" style={{ marginTop: '0.75rem' }}>
                {selected.pedido ? (
                  <Link to={`/pedidos/${selected.pedido.id}`}>{selected.pedido.codigo}</Link>
                ) : null}
                {selected.faturamento ? (
                  <Link to={`/financeiro/faturamentos/${selected.faturamento.id}`}>
                    {selected.faturamento.codigo}
                  </Link>
                ) : null}
                {selected.orcamento ? (
                  <Link to={`/orcamentos/${selected.orcamento.id}`}>{selected.orcamento.codigo}</Link>
                ) : null}
                {selected.ordem_compra ? (
                  <Link to={`/compras/ordens/${selected.ordem_compra.id}`}>
                    {selected.ordem_compra.codigo}
                  </Link>
                ) : null}
              </p>
              {selected.observacao ? <p className="muted">{selected.observacao}</p> : null}

              {(selected.cobrancas ?? []).length > 0 ? (
                <div style={{ marginTop: '0.75rem' }}>
                  <h4 className="fin-subh">Cobrança</h4>
                  <ul className="fin-list">
                    {selected.cobrancas?.map((c) => (
                      <li key={c.id}>
                        {c.codigo} · {c.status}
                        {c.pix_copia_cola ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ marginLeft: '0.5rem' }}
                            onClick={() => void navigator.clipboard.writeText(c.pix_copia_cola ?? '')}
                          >
                            Copiar PIX
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {(selected.baixas ?? []).length > 0 ? (
                <div style={{ marginTop: '0.75rem' }}>
                  <h4 className="fin-subh">Baixas</h4>
                  <ul className="fin-list">
                    {selected.baixas?.map((b) => (
                      <li key={b.id}>
                        {b.codigo} · {formatCurrency(b.valor)} em {formatDate(b.pago_em)} ·{' '}
                        {titFormaLabel(b.forma)}
                        {b.conta_financeira ? ` · ${b.conta_financeira.codigo}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {canWrite && (selected.status === 'ABERTO' || selected.status === 'PARCIAL') ? (
                baixando ? (
                  <form onSubmit={(e) => void baixar(e)} style={{ marginTop: '1rem' }}>
                    <h4 className="fin-subh">{receber ? 'Registrar recebimento' : 'Registrar pagamento'}</h4>
                    <div className="form-grid">
                      <div className="form-group span-2">
                        <label>Conta financeira</label>
                        <select required value={contaId} onChange={(e) => setContaId(e.target.value)}>
                          <option value="">Selecione…</option>
                          {contas.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.codigo} — {c.descricao}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Valor</label>
                        <input required inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Pago em</label>
                        <input type="date" required value={pagoEm} onChange={(e) => setPagoEm(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>Forma</label>
                        <select value={forma} onChange={(e) => setForma(e.target.value)}>
                          {TIT_FORMAS.map((f) => (
                            <option key={f} value={f}>
                              {titFormaLabel(f)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group span-2">
                        <label>Observação</label>
                        <input value={obsBaixa} onChange={(e) => setObsBaixa(e.target.value)} />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary" disabled={busy}>
                        Confirmar BX
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => setBaixando(false)}>
                        Voltar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="form-actions">
                    <button type="button" className="btn btn-primary" onClick={() => setBaixando(true)}>
                      {receber ? 'Baixar' : 'Pagar'}
                    </button>
                    {selected.origem === 'AVULSO' && selected.status === 'ABERTO' ? (
                      cancelando ? (
                        <form onSubmit={(e) => void cancelarAvulso(e)} style={{ marginTop: '0.75rem' }}>
                          <div className="form-group">
                            <label>Motivo do cancelamento</label>
                            <input
                              required
                              minLength={3}
                              value={motivoCancel}
                              onChange={(e) => setMotivoCancel(e.target.value)}
                            />
                          </div>
                          <div className="form-actions">
                            <button type="submit" className="btn btn-primary" disabled={busy}>
                              Confirmar cancelamento
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => setCancelando(false)}>
                              Voltar
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button type="button" className="btn btn-secondary" onClick={() => setCancelando(true)}>
                          Cancelar lançamento
                        </button>
                      )
                    ) : null}
                    <button type="button" className="btn btn-secondary" onClick={closeFicha}>
                      Fechar
                    </button>
                  </div>
                )
              ) : (
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeFicha}>
                    Fechar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {novo && canWrite ? (
        <form onSubmit={(e) => void criarAvulso(e)}>
          <div className="card">
            <div className="card-body">
              <div className="form-section">
                <h3>Lançamento pontual</h3>
                <p className="muted" style={{ marginTop: 0 }}>
                  Para despesa ou receita que não nasce de faturamento, compra ou comissão. Naturezas
                  de venda, estoque e comissão permanecem nos documentos de origem.
                </p>
                <div className="form-grid">
                  <div className="form-group span-2">
                    <label>Parceiro</label>
                    <select required value={avParceiro} onChange={(e) => setAvParceiro(e.target.value)}>
                      <option value="">Selecione…</option>
                      {parceiros.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.codigo} — {p.nome_fantasia || p.razao_social}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group span-2">
                    <label>Natureza gerencial</label>
                    <select required value={avNatureza} onChange={(e) => setAvNatureza(e.target.value)}>
                      <option value="">Selecione…</option>
                      {naturezasAvulso.map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.codigo_exibicao} — {n.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Valor</label>
                    <input
                      required
                      inputMode="decimal"
                      value={avValor}
                      onChange={(e) => setAvValor(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Emissão</label>
                    <input type="date" required value={avEmissao} onChange={(e) => setAvEmissao(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Vencimento</label>
                    <input
                      type="date"
                      required
                      value={avVencimento}
                      onChange={(e) => setAvVencimento(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Documento</label>
                    <input value={avDocumento} onChange={(e) => setAvDocumento(e.target.value)} />
                  </div>
                  <div className="form-group span-2">
                    <label>Observação</label>
                    <input value={avObs} onChange={(e) => setAvObs(e.target.value)} />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={busy}>
                    Criar TIT
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setNovo(false)}>
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      ) : null}
    </>
  );
}
