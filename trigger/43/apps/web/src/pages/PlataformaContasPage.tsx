import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { ApiError, api, type PlataformaContaResumo, type PlataformaListaMeta } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { BRAND } from '../lib/brand';

const FILTROS: { id: string; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'em_dia', label: 'Em dia' },
  { id: 'cortesia', label: 'Cortesia' },
  { id: 'pendente', label: 'Pendente' },
  { id: 'suspensa', label: 'Suspensa' },
];

const PRESETS_CORTESIA = [15, 30, 60, 90];

export function PlataformaContasPage() {
  const [params, setParams] = useSearchParams();
  const saude = params.get('saude') ?? 'todas';
  const qParam = params.get('q') ?? '';
  const [q, setQ] = useState(qParam);
  const [rows, setRows] = useState<PlataformaContaResumo[]>([]);
  const [meta, setMeta] = useState<PlataformaListaMeta | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formErro, setFormErro] = useState<string | null>(null);
  const [criada, setCriada] = useState<(PlataformaContaResumo & { senha_temporaria?: string }) | null>(
    null,
  );
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    cortesia_dias: '30',
    cortesia_motivo: '',
  });

  const load = useCallback(() => {
    setErro(null);
    void api
      .plataformaContas({ q: qParam, saude, page: Number(params.get('page') || 1) })
      .then((res) => {
        setRows(res.data);
        setMeta(res.meta);
      })
      .catch((e: unknown) => setErro(e instanceof Error ? e.message : 'Falha ao listar contas.'));
  }, [qParam, saude, params]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setQ(qParam);
  }, [qParam]);

  const setSaude = (next: string) => {
    const n = new URLSearchParams(params);
    if (next === 'todas') n.delete('saude');
    else n.set('saude', next);
    n.delete('page');
    setParams(n);
  };

  const buscar = () => {
    const n = new URLSearchParams(params);
    if (q.trim()) n.set('q', q.trim());
    else n.delete('q');
    n.delete('page');
    setParams(n);
  };

  const criar = async (e: FormEvent) => {
    e.preventDefault();
    setFormErro(null);
    setBusy(true);
    try {
      const dias = Number(form.cortesia_dias);
      const res = await api.plataformaCriarConta({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password.trim() || undefined,
        cortesia_dias: dias > 0 ? dias : undefined,
        cortesia_motivo: form.cortesia_motivo.trim() || undefined,
      });
      setCriada(res.data);
      setForm({ name: '', email: '', password: '', cortesia_dias: '30', cortesia_motivo: '' });
      setFormAberto(false);
      load();
    } catch (err) {
      if (err instanceof ApiError) {
        const first = Object.values(err.details ?? {})[0]?.[0];
        setFormErro(first ?? err.message);
      } else {
        setFormErro('Não foi possível criar a conta master.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title={`Contas ${BRAND.product.name}`}
        description="Provisiona o master, acompanha mensalidade e concede período cortesia. Cada conta tem até 3 empresas isoladas."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setFormAberto((v) => !v)}>
            {formAberto ? 'Fechar' : 'Nova conta master'}
          </button>
        }
      />

      {criada ? (
        <div className="alert alert-success" role="status">
          <strong>
            Conta {criada.master?.codigo} criada · {criada.master?.email}
          </strong>
          {criada.senha_temporaria ? (
            <p style={{ margin: '0.35rem 0 0' }}>
              Senha temporária (entregue fora do canal público):{' '}
              <code>{criada.senha_temporaria}</code>
            </p>
          ) : null}
          {criada.cortesia?.vigente ? (
            <p style={{ margin: '0.35rem 0 0' }}>
              Cortesia até {criada.cortesia.ate_formatada}.
            </p>
          ) : null}
          <p style={{ margin: '0.5rem 0 0' }}>
            <Link to={`/plataforma/contas/${criada.id}`}>Abrir conta</Link>
            {' · '}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCriada(null)}>
              Dispensar
            </button>
          </p>
        </div>
      ) : null}

      {formAberto ? (
        <form className="card ops-create-card" onSubmit={(e) => void criar(e)}>
          <div className="card-body">
            <h2>Nova conta master</h2>
            <p className="form-hint" style={{ marginTop: 0 }}>
              Cria o ADMIN da conta (sem EMP). O master entra no login e cadastra empresas em
              Empresas. Entregue e-mail e senha fora deste console.
            </p>
            {formErro ? (
              <div className="alert alert-error" role="alert">
                {formErro}
              </div>
            ) : null}
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="conta-nome">Nome</label>
                <input
                  id="conta-nome"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={120}
                />
              </div>
              <div className="form-group">
                <label htmlFor="conta-email">E-mail</label>
                <input
                  id="conta-email"
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  maxLength={190}
                />
              </div>
              <div className="form-group">
                <label htmlFor="conta-senha">Senha (opcional)</label>
                <input
                  id="conta-senha"
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Vazia = gera temporária"
                  autoComplete="new-password"
                />
              </div>
              <div className="form-group">
                <label htmlFor="conta-cortesia">Cortesia (dias)</label>
                <input
                  id="conta-cortesia"
                  type="number"
                  min={0}
                  max={3660}
                  value={form.cortesia_dias}
                  onChange={(e) => setForm({ ...form, cortesia_dias: e.target.value })}
                />
              </div>
              <div className="form-group span-2">
                <label htmlFor="conta-motivo">Motivo da cortesia (opcional)</label>
                <input
                  id="conta-motivo"
                  value={form.cortesia_motivo}
                  onChange={(e) => setForm({ ...form, cortesia_motivo: e.target.value })}
                  maxLength={255}
                  placeholder="Ex.: piloto comercial · 30 dias"
                />
              </div>
            </div>
            <div className="ops-filters" style={{ marginTop: '0.75rem' }}>
              {PRESETS_CORTESIA.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`btn btn-sm ${form.cortesia_dias === String(d) ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setForm({ ...form, cortesia_dias: String(d) })}
                >
                  {d} dias
                </button>
              ))}
              <button
                type="button"
                className={`btn btn-sm ${form.cortesia_dias === '0' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setForm({ ...form, cortesia_dias: '0' })}
              >
                Sem cortesia
              </button>
            </div>
            <div className="form-actions" style={{ marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Criando…' : 'Criar conta master'}
              </button>
            </div>
          </div>
        </form>
      ) : null}

      <form
        className="ops-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          buscar();
        }}
      >
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nome, e-mail ou ID da conta"
          aria-label="Buscar contas"
        />
        <button type="submit" className="btn btn-secondary">
          Buscar
        </button>
        <div className="ops-filters" role="group" aria-label="Situação de pagamento">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`btn btn-sm ${saude === f.id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setSaude(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </form>

      {erro ? (
        <div className="alert alert-error" role="alert">
          {erro}
        </div>
      ) : null}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Conta</th>
              <th>Master</th>
              <th>Pagamento</th>
              <th>EMP</th>
              <th>Usuários</th>
              <th>Último acesso</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-cell">
                  Nenhuma conta neste filtro.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.master?.codigo ?? '—'}</strong>
                  </td>
                  <td>
                    <div>{row.master?.name}</div>
                    <div className="table-muted">{row.master?.email}</div>
                  </td>
                  <td>
                    <StatusPill status={row.saude_label} />
                    {row.cortesia?.vigente && row.saude === 'cortesia' ? (
                      <div className="table-muted">até {row.cortesia.ate_formatada}</div>
                    ) : null}
                  </td>
                  <td>
                    {row.empresas_count}/{row.max_empresas}
                  </td>
                  <td>{row.usuarios_count}</td>
                  <td>{formatDateTime(row.master?.ultimo_login_em)}</td>
                  <td>
                    <Link to={`/plataforma/contas/${row.id}`}>Abrir</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {meta && meta.last_page > 1 ? (
        <p className="form-hint">
          Página {meta.current_page} de {meta.last_page} · {meta.total} contas
        </p>
      ) : null}
    </>
  );
}
