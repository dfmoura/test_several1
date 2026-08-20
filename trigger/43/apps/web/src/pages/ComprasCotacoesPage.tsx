import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import {
  ApiError,
  api,
  type Cotacao,
  type Parceiro,
  type Produto,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { cotStatusLabel } from '../lib/comprasUi';
import { formatCurrency } from '../lib/format';

export function ComprasCotacoesPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('compras.escrever');
  const navigate = useNavigate();
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Parceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [produtoId, setProdutoId] = useState('');
  const [qtde, setQtde] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [valor, setValor] = useState('');
  const [prazo, setPrazo] = useState('');
  const [cotacaoAtiva, setCotacaoAtiva] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ data: Cotacao[] }>('/cotacoes');
      setCotacoes(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    void api.get<{ data: Produto[] }>('/produtos').then((r) => setProdutos(r.data));
    void api
      .get<{ data: Parceiro[] }>('/parceiros')
      .then((r) => setFornecedores(r.data.filter((p) => p.papel_fornecedor)));
  }, []);

  const criar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMsg(null);
    try {
      const produto = produtos.find((p) => String(p.id) === produtoId);
      const res = await api.post<{ data: Cotacao }>('/cotacoes', {
        itens: [
          {
            produto_id: Number(produtoId),
            qtde,
            unidade: produto?.unidade_comercial || 'UN',
          },
        ],
      });
      setCotacaoAtiva(res.data.id);
      setProdutoId('');
      setQtde('');
      setMsg(`Cotação ${res.data.codigo} aberta.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao criar cotação.');
    }
  };

  const addProposta = async (e: FormEvent) => {
    e.preventDefault();
    if (!cotacaoAtiva) return;
    setError(null);
    setMsg(null);
    try {
      const cot =
        cotacoes.find((c) => c.id === cotacaoAtiva) ??
        (await api.get<{ data: Cotacao }>(`/cotacoes/${cotacaoAtiva}`)).data;
      const itemId = cot.itens?.[0]?.id;
      if (!itemId) throw new Error('Cotação sem item.');
      await api.post(`/cotacoes/${cotacaoAtiva}/propostas`, {
        cotacao_item_id: itemId,
        fornecedor_id: Number(fornecedorId),
        valor_unitario: valor,
        prazo_dias: prazo ? Number(prazo) : null,
      });
      setValor('');
      setPrazo('');
      setMsg('Proposta registrada.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao registrar proposta.');
    }
  };

  const decidir = async (cotacaoId: number, propostaId: number) => {
    setError(null);
    setMsg(null);
    try {
      const res = await api.post<{
        data: { ordem_compra?: { id: number }; id?: number };
      }>(`/cotacoes/${cotacaoId}/decidir`, { proposta_ids: [propostaId] });
      const ocId = res.data.ordem_compra?.id ?? res.data.id;
      if (ocId) navigate(`/compras/ordens/${ocId}`);
      else await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao gerar OC.');
    }
  };

  return (
    <>
      <PageHeader
        title="Cotações"
        description="COT- compara fornecedores. Pule esta etapa quando houver preço homologado e vá direto à OC."
        actions={
          <Link to="/compras/ordens" className="btn btn-secondary">
            Ordens de compra
          </Link>
        }
      />

      {error && <div className="alert alert-error">{error}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      {canWrite && (
        <form onSubmit={(e) => void criar(e)} style={{ marginBottom: '1rem' }}>
          <div className="card">
            <div className="card-body">
              <div className="form-section">
                <h3>Nova cotação</h3>
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
                          {p.codigo} — {p.descricao_comercial || p.descricao_fiscal}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Qtde</label>
                    <input
                      required
                      inputMode="decimal"
                      value={qtde}
                      onChange={(e) => setQtde(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    Abrir COT
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {canWrite && cotacaoAtiva && (
        <form onSubmit={(e) => void addProposta(e)} style={{ marginBottom: '1rem' }}>
          <div className="card">
            <div className="card-body">
              <div className="form-section">
                <h3>Proposta na cotação #{cotacaoAtiva}</h3>
                <div className="form-grid">
                  <div className="form-group span-2">
                    <label>Fornecedor</label>
                    <select
                      required
                      value={fornecedorId}
                      onChange={(e) => setFornecedorId(e.target.value)}
                    >
                      <option value="">Selecione…</option>
                      {fornecedores.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.codigo} — {f.nome_fantasia || f.razao_social}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Valor unitário</label>
                    <input
                      required
                      inputMode="decimal"
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Prazo (dias)</label>
                    <input
                      inputMode="numeric"
                      value={prazo}
                      onChange={(e) => setPrazo(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-secondary">
                    Registrar proposta
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
          ) : cotacoes.length === 0 ? (
            <div className="empty-state">Nenhuma cotação encontrada.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Status</th>
                  <th>Itens</th>
                  <th>Propostas</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {cotacoes.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.codigo}</strong>
                    </td>
                    <td>
                      <StatusPill status={cotStatusLabel(c.status)} />
                    </td>
                    <td className="muted">
                      {(c.itens ?? [])
                        .map(
                          (i) =>
                            `${i.produto?.codigo ?? i.produto_id} · ${i.qtde} ${i.unidade}`,
                        )
                        .join(' · ') || '—'}
                    </td>
                    <td>
                      {(c.propostas ?? []).length === 0 ? (
                        <span className="muted">Nenhuma</span>
                      ) : (
                        <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                          {(c.propostas ?? []).map((p) => (
                            <li key={p.id}>
                              {p.fornecedor?.razao_social} · {formatCurrency(p.valor_unitario)}
                              {p.prazo_dias != null ? ` · ${p.prazo_dias}d` : ''}
                              {p.vencedora && (
                                <span className="muted"> · vencedora</span>
                              )}
                              {canWrite && c.status !== 'DECIDIDA' && (
                                <>
                                  {' '}
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ padding: '0.15rem 0.5rem', fontSize: '0.8rem' }}
                                    onClick={() => void decidir(c.id, p.id)}
                                  >
                                    Escolher → OC
                                  </button>
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td>
                      {canWrite && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setCotacaoAtiva(c.id)}
                        >
                          Usar para proposta
                        </button>
                      )}
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
