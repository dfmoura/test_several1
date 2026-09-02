import { useEffect, useState, type FormEvent } from 'react';
import { PageHeader } from '../components/PageHeader';
import { EstoqueModuleNav } from '../components/EstoqueModuleNav';
import { StatusPill } from '../components/StatusPill';
import {
  ApiError,
  api,
  type EstoqueAjuste,
  type EstoqueAjusteMeta,
  type Produto,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { ajStatusLabel } from '../lib/comprasUi';
import { ajuAlcadaLabel, ajuOrigemLabel } from '../lib/estoqueUi';
import { formatCurrency, formatDateTime, formatQty } from '../lib/format';
import { formatApiFieldErrors } from '../lib/usuarios';

function sameUser(a?: number | null, b?: number | null): boolean {
  return a != null && b != null && Number(a) === Number(b);
}

export function EstoqueAjustesPage() {
  const { hasPermission, user } = useAuth();
  const canWrite = hasPermission('estoque.escrever');
  const canAprovar = hasPermission('estoque.aprovar');
  const canGestor = hasPermission('estoque.aprovar_gestor');
  const [ajustes, setAjustes] = useState<EstoqueAjuste[]>([]);
  const [meta, setMeta] = useState<EstoqueAjusteMeta | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('PENDENTE');

  const [produtoId, setProdutoId] = useState('');
  const [motivo, setMotivo] = useState('A01');
  const [complemento, setComplemento] = useState('');
  const [qtdeContada, setQtdeContada] = useState('');
  const [checklist, setChecklist] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [loteCodigo, setLoteCodigo] = useState('');
  const [loteEntrada, setLoteEntrada] = useState('');
  const [loteValidade, setLoteValidade] = useState('');

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [causaAprovar, setCausaAprovar] = useState('');
  const [cienciaDir, setCienciaDir] = useState(false);
  const [cienciaCont, setCienciaCont] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFiltro) qs.set('status', statusFiltro);
      if (de) qs.set('de', de);
      if (ate) qs.set('ate', ate);
      const suffix = qs.toString() ? `?${qs.toString()}` : '';
      const [aj, prd] = await Promise.all([
        api.get<{ data: EstoqueAjuste[]; meta: EstoqueAjusteMeta }>(`/estoque/ajustes${suffix}`),
        api.get<{ data: Produto[] }>('/produtos'),
      ]);
      setAjustes(aj.data);
      setMeta(aj.meta);
      setProdutos(
        prd.data.filter((p) => p.familia === 'MP' || p.familia === 'EMB' || p.familia === 'REV'),
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? formatApiFieldErrors(err.details, err.message)
          : 'Falha ao carregar ajustes.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (selectedId == null) return;
    document.getElementById('aju-conferir')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selectedId]);

  const selectedProduto = produtos.find((p) => String(p.id) === produtoId);
  const produtoControlaLote = !!selectedProduto?.controla_lote;
  const selected = ajustes.find((a) => a.id === selectedId) ?? null;

  const openAprovar = (a: EstoqueAjuste) => {
    setError(null);
    setMsg(null);
    setSelectedId(a.id);
    setCausaAprovar(a.causa_raiz ?? '');
    setCienciaDir(!!a.ciencia_diretoria);
    setCienciaCont(!!a.ciencia_contabilidade);
  };

  const closeAprovar = () => {
    setSelectedId(null);
    setCausaAprovar('');
    setCienciaDir(false);
    setCienciaCont(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    setError(null);
    setMsg(null);
    setSaving(true);
    try {
      await api.post('/estoque/ajustes', {
        produto_id: Number(produtoId),
        motivo_codigo: motivo,
        motivo_complemento: complemento || null,
        qtde_contada: qtdeContada,
        checklist_confirmado: checklist,
        observacao: observacao || null,
        origem: 'CONTAGEM_AVULSA',
        lote_codigo: loteCodigo || null,
        lote_data_entrada: loteEntrada || null,
        lote_data_validade: loteValidade || null,
      });
      setQtdeContada('');
      setComplemento('');
      setObservacao('');
      setLoteCodigo('');
      setLoteEntrada('');
      setLoteValidade('');
      setChecklist(false);
      setMsg('Solicitação de ajuste registrada.');
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? formatApiFieldErrors(err.details, err.message)
          : 'Falha ao solicitar ajuste.',
      );
    } finally {
      setSaving(false);
    }
  };

  const aprovar = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setMsg(null);
    setSaving(true);
    try {
      await api.post(`/estoque/ajustes/${selected.id}/aprovar`, {
        causa_raiz: causaAprovar || selected.causa_raiz || null,
        ciencia_diretoria: cienciaDir,
        ciencia_contabilidade: cienciaCont,
      });
      setMsg(`${selected.codigo} aprovado.`);
      closeAprovar();
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError ? formatApiFieldErrors(err.details, err.message) : 'Falha ao aprovar.',
      );
    } finally {
      setSaving(false);
    }
  };

  const rejeitar = async () => {
    if (!selected) return;
    setError(null);
    setMsg(null);
    setSaving(true);
    try {
      await api.post(`/estoque/ajustes/${selected.id}/rejeitar`, {
        observacao: 'Rejeitado na conferência',
      });
      setMsg(`${selected.codigo} rejeitado.`);
      closeAprovar();
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? formatApiFieldErrors(err.details, err.message)
          : 'Falha ao rejeitar.',
      );
    } finally {
      setSaving(false);
    }
  };

  const cancelar = async (id: number) => {
    if (
      !window.confirm(
        'Cancelar esta solicitação de ajuste? O registro permanece no histórico como CANCELADO.',
      )
    ) {
      return;
    }
    setError(null);
    setMsg(null);
    try {
      await api.post(`/estoque/ajustes/${id}/cancelar`);
      if (selectedId === id) closeAprovar();
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? formatApiFieldErrors(err.details, err.message)
          : 'Falha ao cancelar.',
      );
    }
  };

  const motivoFiscal = ['A04', 'A06', 'A09'].includes(motivo);
  const solicitanteSouEu = sameUser(user?.id, selected?.solicitado_por?.id);
  const podeAprovarSelecionado =
    !!selected &&
    selected.status === 'PENDENTE' &&
    canAprovar &&
    !solicitanteSouEu &&
    ((selected.alcada ?? 'LIDER') === 'LIDER' || canGestor);

  return (
    <>
      <PageHeader
        title="Ajustes de estoque"
        description="AJU nasce pendente. Outro usuário com alçada confere e aprova — o saldo só muda no movimento. Motivo A03 = virada/saldo inicial (legado); inventário cíclico nasce em Inventários."
      />

      <EstoqueModuleNav />

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {canWrite && !selected && (
        <form onSubmit={submit} className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <div className="form-section">
              <h3>Nova contagem avulsa</h3>
              <p className="muted" style={{ marginBottom: '1rem' }}>
                Use para divergência pontual autorizada. Inventário cíclico/geral deve nascer em
                Inventários.
              </p>
              <div className="form-grid">
                <div className="form-group span-2">
                  <label>Produto</label>
                  <select
                    required
                    value={produtoId}
                    onChange={(e) => setProdutoId(e.target.value)}
                  >
                    <option value="">Selecione…</option>
                    {produtos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo} — {p.descricao_fiscal}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Motivo</label>
                  <select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                    {(meta?.motivos ?? []).map((m) => (
                      <option key={m.codigo} value={m.codigo}>
                        {m.codigo} — {m.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Qtde contada (unidade interna)</label>
                  <input
                    required
                    inputMode="decimal"
                    value={qtdeContada}
                    onChange={(e) => setQtdeContada(e.target.value)}
                    placeholder="0.0000"
                  />
                </div>
                {produtoControlaLote && (
                  <>
                    <div className="form-group">
                      <label>Lote (opcional na baixa / informado na entrada)</label>
                      <input
                        value={loteCodigo}
                        onChange={(e) => setLoteCodigo(e.target.value)}
                        placeholder="Lote do fornecedor"
                      />
                    </div>
                    <div className="form-group">
                      <label>Entrada do lote</label>
                      <input
                        type="date"
                        value={loteEntrada}
                        onChange={(e) => setLoteEntrada(e.target.value)}
                      />
                    </div>
                    {selectedProduto?.controla_validade && (
                      <div className="form-group">
                        <label>Vencimento</label>
                        <input
                          type="date"
                          value={loteValidade}
                          onChange={(e) => setLoteValidade(e.target.value)}
                        />
                      </div>
                    )}
                  </>
                )}
                <div className="form-group">
                  <label>Complemento / evidência</label>
                  <input value={complemento} onChange={(e) => setComplemento(e.target.value)} />
                </div>
                <div className="form-group span-2">
                  <label>Observação</label>
                  <input value={observacao} onChange={(e) => setObservacao(e.target.value)} />
                </div>
                <div className="form-group span-full">
                  <label className="checkbox-item" style={{ maxWidth: '40rem' }}>
                    <input
                      type="checkbox"
                      checked={checklist}
                      onChange={(e) => setChecklist(e.target.checked)}
                      required
                    />
                    <span>
                      Confirmei o checklist (NF pendente, OP, sobra, endereço, unidade) — ajuste é
                      último recurso.
                    </span>
                  </label>
                </div>
              </div>
              {motivoFiscal && (
                <div className="alert alert-warning" style={{ marginTop: '1rem' }}>
                  Pode exigir NF-e de baixa (CFOP 5.927) — validar com a contabilidade. O ERP não
                  emite a nota pelo ajuste.
                </div>
              )}
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving || !checklist}>
                  {saving ? 'Salvando…' : 'Solicitar AJU'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <p className="muted" style={{ margin: '0 0 0.85rem' }}>
            Fila da alçada. Quem solicitou não aprova. Pendente pode ser cancelado — o registro
            permanece no histórico.
          </p>
          <div className="form-grid" style={{ alignItems: 'end' }}>
            <div className="form-group">
              <label>Situação</label>
              <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>
                <option value="PENDENTE">Pendentes (fila)</option>
                <option value="">Todas</option>
                <option value="APROVADO">Aprovados</option>
                <option value="REJEITADO">Rejeitados</option>
                <option value="CANCELADO">Cancelados</option>
              </select>
            </div>
            <div className="form-group">
              <label>De</label>
              <input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Até</label>
              <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
            </div>
            <div className="form-group">
              <label>&nbsp;</label>
              <button type="button" className="btn btn-secondary" onClick={() => void load()}>
                Filtrar
              </button>
            </div>
          </div>
        </div>
      </div>

      {selected && selected.status === 'PENDENTE' && (
        <form
          id="aju-conferir"
          onSubmit={(e) => void aprovar(e)}
          style={{ marginBottom: '1rem' }}
        >
          <div className="card">
            <div className="card-body">
              <div className="form-section">
                <h3>Conferir {selected.codigo}</h3>
                <div className="detail-meta" style={{ marginBottom: '1rem' }}>
                  <div>
                    <span>Produto</span>
                    <strong>{selected.produto?.codigo}</strong>
                  </div>
                  <div>
                    <span>Sistema</span>
                    <strong>
                      {formatQty(selected.qtde_sistema)} {selected.unidade}
                    </strong>
                  </div>
                  <div>
                    <span>Contado</span>
                    <strong>
                      {formatQty(selected.qtde_contada)} {selected.unidade}
                    </strong>
                  </div>
                  <div>
                    <span>Diferença</span>
                    <strong>
                      {formatQty(selected.qtde_diferenca)} {selected.unidade}
                    </strong>
                  </div>
                  <div>
                    <span>Valor</span>
                    <strong>
                      {selected.valor_ajuste != null
                        ? formatCurrency(selected.valor_ajuste)
                        : '—'}
                    </strong>
                  </div>
                  <div>
                    <span>Alçada</span>
                    <strong>{ajuAlcadaLabel(selected.alcada)}</strong>
                  </div>
                  <div>
                    <span>Origem</span>
                    <strong>{ajuOrigemLabel(selected.origem)}</strong>
                  </div>
                  <div>
                    <span>Solicitado por</span>
                    <strong>{selected.solicitado_por?.name ?? '—'}</strong>
                  </div>
                </div>
                <p className="muted" style={{ marginTop: 0, marginBottom: '1rem' }}>
                  {selected.produto?.descricao_fiscal}
                  {selected.motivo_codigo
                    ? ` · ${selected.motivo_codigo} ${selected.motivo_nome ?? ''}`
                    : ''}
                </p>

                {solicitanteSouEu && (
                  <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
                    Quem solicitou o ajuste não pode aprová-lo (segregação de funções). Entre com
                    outro usuário que tenha alçada de estoque.
                  </div>
                )}

                {(selected.divergencia_relevante || selected.alcada === 'DIRECAO') && (
                  <div className="form-grid" style={{ marginBottom: '1rem' }}>
                    <div className="form-group span-2">
                      <label>Causa raiz</label>
                      <input
                        value={causaAprovar}
                        onChange={(e) => setCausaAprovar(e.target.value)}
                        placeholder="Obrigatória em divergência relevante / alçada direção"
                        required={
                          !!selected.divergencia_relevante || selected.alcada === 'DIRECAO'
                        }
                      />
                    </div>
                  </div>
                )}

                {selected.alcada === 'DIRECAO' && canGestor && (
                  <div className="form-grid" style={{ marginBottom: '1rem' }}>
                    <div className="form-group">
                      <label className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={cienciaDir}
                          onChange={(e) => setCienciaDir(e.target.checked)}
                          required
                        />
                        <span>Ciência diretoria</span>
                      </label>
                    </div>
                    <div className="form-group">
                      <label className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={cienciaCont}
                          onChange={(e) => setCienciaCont(e.target.checked)}
                          required
                        />
                        <span>Ciência contabilidade</span>
                      </label>
                    </div>
                  </div>
                )}

                {(selected.alcada ?? 'LIDER') !== 'LIDER' && !canGestor && (
                  <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
                    Esta solicitação exige alçada de gestor.
                  </div>
                )}

                <div className="form-actions">
                  {podeAprovarSelecionado && (
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? 'Aprovando…' : 'Aprovar e lançar movimento'}
                    </button>
                  )}
                  {podeAprovarSelecionado && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={saving}
                      onClick={() => void rejeitar()}
                    >
                      Rejeitar
                    </button>
                  )}
                  <button type="button" className="btn btn-secondary" onClick={closeAprovar}>
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      <div className="card">
        <div className="table-wrap table-wrap--freeze">
          {loading ? (
            <div className="loading">Carregando…</div>
          ) : ajustes.length === 0 ? (
            <div className="empty-state">
              {statusFiltro === 'PENDENTE'
                ? 'Nenhum ajuste pendente de aprovação.'
                : 'Nenhum ajuste neste filtro.'}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Produto</th>
                  <th>Sistema</th>
                  <th>Contado</th>
                  <th>Δ / Valor</th>
                  <th>Motivo</th>
                  <th>Alçada</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {ajustes.map((a) => (
                  <tr
                    key={a.id}
                    style={
                      selectedId === a.id
                        ? { background: 'rgba(26, 53, 104, 0.06)' }
                        : undefined
                    }
                  >
                    <td>
                      {a.codigo}
                      <div className="muted">{ajuOrigemLabel(a.origem)}</div>
                    </td>
                    <td>
                      <strong>{a.produto?.codigo}</strong>
                      <div className="muted">{a.produto?.descricao_fiscal}</div>
                    </td>
                    <td className="num">
                      {formatQty(a.qtde_sistema)} {a.unidade}
                    </td>
                    <td className="num">
                      {formatQty(a.qtde_contada)} {a.unidade}
                    </td>
                    <td className="num">
                      {formatQty(a.qtde_diferenca)}
                      <div className="muted">
                        {a.valor_ajuste != null ? formatCurrency(a.valor_ajuste) : '—'}
                      </div>
                    </td>
                    <td>
                      {a.motivo_codigo}
                      <div className="muted">{a.motivo_nome}</div>
                      {a.aviso_fiscal && <div className="muted">{a.aviso_fiscal}</div>}
                    </td>
                    <td>
                      {ajuAlcadaLabel(a.alcada)}
                      {a.divergencia_relevante && <div className="muted">Relevante</div>}
                    </td>
                    <td>
                      <StatusPill status={ajStatusLabel(a.status)} />
                      <div className="muted" style={{ marginTop: '0.25rem' }}>
                        {a.solicitado_por?.name}
                      </div>
                      <div className="muted">{formatDateTime(a.created_at)}</div>
                      {a.movimento && <div className="muted">{a.movimento.codigo}</div>}
                    </td>
                    <td>
                      <div className="table-actions">
                        {a.status === 'PENDENTE' &&
                          canWrite &&
                          (sameUser(user?.id, a.solicitado_por?.id) || canAprovar) && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => void cancelar(a.id)}
                            >
                              Cancelar
                            </button>
                          )}
                        {a.status === 'PENDENTE' && canAprovar && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => openAprovar(a)}
                          >
                            Conferir
                          </button>
                        )}
                        {a.status === 'PENDENTE' && !canAprovar && (
                          <span className="muted">
                            {sameUser(user?.id, a.solicitado_por?.id)
                              ? 'Você solicitou — outro usuário com alçada aprova'
                              : 'Aguardando quem tem alçada de estoque'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
