import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { api, type Comissao, type ComissaoFechamento } from '../lib/api';
import { useAuth } from '../lib/auth';
import { cfeStatusLabel, comOrigemLabel, comStatusLabel } from '../lib/comissaoUi';
import { formatCurrency, formatDate } from '../lib/format';

export function ComissoesPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('comissao.escrever');
  const [linhas, setLinhas] = useState<Comissao[]>([]);
  const [fechamentos, setFechamentos] = useState<ComissaoFechamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [status, setStatus] = useState('PREVISTA');
  const [selecionadas, setSelecionadas] = useState<number[]>([]);
  const [vencimento, setVencimento] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setErro(null);
    try {
      const qs = status ? `?status=${encodeURIComponent(status)}` : '';
      const [com, fec] = await Promise.all([
        api.get<{ data: Comissao[] }>(`/comissoes${qs}`),
        api.get<{ data: ComissaoFechamento[] }>('/comissoes/fechamentos'),
      ]);
      setLinhas(com.data);
      setFechamentos(fec.data);
      setSelecionadas([]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar comissões.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [status]);

  const toggle = (id: number) => {
    setSelecionadas((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const fechar = async (e: FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    setBusy(true);
    setErro(null);
    setMsg(null);
    try {
      const res = await api.post<{ data: ComissaoFechamento }>('/comissoes/fechamentos', {
        comissao_ids: selecionadas.length ? selecionadas : undefined,
        vencimento,
      });
      setMsg(`Fechamento ${res.data.codigo} liberado. Gere o título a pagar no lote.`);
      await load();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível liberar.');
    } finally {
      setBusy(false);
    }
  };

  const gerar = async (id: number) => {
    setBusy(true);
    setErro(null);
    setMsg(null);
    try {
      const res = await api.post<{ data: ComissaoFechamento }>(
        `/comissoes/fechamentos/${id}/gerar-pagamento`,
        {},
      );
      setMsg(`Título a pagar gerado no fechamento ${res.data.codigo}. Baixe em Contas a pagar.`);
      await load();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível gerar o título.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Comissões"
        description="Direito do vendedor nasce na baixa do recebimento do cliente. Liberar o lote gera o título a pagar (natureza 3.01.05). Entrega no transporte não paga comissão."
      />

      {erro ? <p className="form-error">{erro}</p> : null}
      {msg ? <p className="alert alert-success">{msg}</p> : null}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <div className="form-section">
            <h3>Apuração</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Base: etiquetas recebidas × % da faixa aceita. Sem frete, matriz ou faca.
            </p>
          </div>
          <div className="form-grid" style={{ marginBottom: '0.75rem' }}>
            <div className="form-group">
              <label>Situação</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Todas</option>
                <option value="PREVISTA">Prevista</option>
                <option value="LIBERADA">Liberada</option>
                <option value="PAGA">Paga</option>
                <option value="ESTORNADA">Estornada</option>
              </select>
            </div>
          </div>
          {canWrite && status === 'PREVISTA' ? (
            <form className="btn-row" onSubmit={(e) => void fechar(e)} style={{ marginBottom: '0.75rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Vencimento do pagamento</label>
                <input
                  type="date"
                  value={vencimento}
                  onChange={(e) => setVencimento(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={busy || loading}>
                Liberar {selecionadas.length > 0 ? `${selecionadas.length} selecionada(s)` : 'todas previstas'}
              </button>
            </form>
          ) : null}
          <div className="table-wrap">
            {loading ? (
              <div className="loading">Carregando…</div>
            ) : linhas.length === 0 ? (
              <div className="empty-state">
                Nenhuma comissão neste filtro. Cadastre o vendedor no orçamento e baixe o recebimento
                do cliente.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    {canWrite && status === 'PREVISTA' ? <th /> : null}
                    <th>Código</th>
                    <th>Vendedor</th>
                    <th>Pedido</th>
                    <th>Origem</th>
                    <th className="num">Base</th>
                    <th className="num">%</th>
                    <th className="num">Valor</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((c) => (
                    <tr key={c.id}>
                      {canWrite && status === 'PREVISTA' ? (
                        <td>
                          <input
                            type="checkbox"
                            checked={selecionadas.includes(c.id)}
                            onChange={() => toggle(c.id)}
                            aria-label={`Selecionar ${c.codigo}`}
                          />
                        </td>
                      ) : null}
                      <td>
                        <strong>{c.codigo}</strong>
                      </td>
                      <td>
                        {c.vendedor
                          ? `${c.vendedor.codigo} — ${c.vendedor.razao_social}`
                          : '—'}
                      </td>
                      <td>
                        {c.pedido ? (
                          <Link to={`/pedidos/${c.pedido.id}`}>{c.pedido.codigo}</Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{comOrigemLabel(c.origem_evento)}</td>
                      <td className="num">{formatCurrency(c.base_valor)}</td>
                      <td className="num">{c.aliquota}%</td>
                      <td className="num">{formatCurrency(c.valor)}</td>
                      <td>
                        <StatusPill status={comStatusLabel(c.status)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="form-section">
            <h3>Fechamentos</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Liberar gera o lote. Gerar pagamento abre o título a pagar no vendedor — baixe como
              qualquer conta a pagar.
            </p>
          </div>
          <div className="table-wrap">
            {fechamentos.length === 0 ? (
              <div className="empty-state">Nenhum fechamento ainda.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Lote</th>
                    <th>Situação</th>
                    <th>Vencimento</th>
                    <th className="num">Total</th>
                    <th className="acoes">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {fechamentos.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <strong>{f.codigo}</strong>
                      </td>
                      <td>
                        <StatusPill status={cfeStatusLabel(f.status)} />
                      </td>
                      <td>{f.vencimento ? formatDate(f.vencimento) : '—'}</td>
                      <td className="num">{formatCurrency(f.valor_total)}</td>
                      <td className="acoes">
                        {canWrite && f.status === 'ABERTO' ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={busy}
                            onClick={() => void gerar(f.id)}
                          >
                            Gerar título a pagar
                          </button>
                        ) : f.status === 'TITULO_GERADO' || f.status === 'PAGO' ? (
                          <Link to="/financeiro/contas-a-pagar" className="btn btn-secondary btn-sm">
                            Contas a pagar
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
