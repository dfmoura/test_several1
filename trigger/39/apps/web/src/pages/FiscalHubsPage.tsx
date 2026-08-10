import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import { ApiError, api, type FiscalHub } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { useTableSort } from '../lib/useTableSort';

type Mode = 'closed' | 'create' | 'edit';

type FormState = {
  nome: string;
  provedor: string;
  ambiente_ativo: string;
  padrao: boolean;
  ativo: boolean;
  base_url_homologacao: string;
  base_url_producao: string;
  token_homologacao: string;
  token_producao: string;
};

const EMPTY_FORM: FormState = {
  nome: '',
  provedor: 'focusnfe',
  ambiente_ativo: 'homologacao',
  padrao: true,
  ativo: true,
  base_url_homologacao: '',
  base_url_producao: '',
  token_homologacao: '',
  token_producao: '',
};

export const FISCAL_HUB_OPTIONS: { value: string; label: string }[] = [
  { value: 'focusnfe', label: 'Focus NFe' },
  { value: 'generico', label: 'Genérico (URL customizada)' },
];

function provedorLabel(tipo: string): string {
  return FISCAL_HUB_OPTIONS.find((o) => o.value === tipo)?.label ?? tipo;
}

const HUB_SORT = {
  codigo: (h: FiscalHub) => h.codigo,
  nome: (h: FiscalHub) => h.nome,
  provedor: (h: FiscalHub) => provedorLabel(h.provedor),
  ambiente: (h: FiscalHub) => h.ambiente_ativo,
  tokens: (h: FiscalHub) =>
    `${h.tem_token_homologacao ? '1' : '0'}${h.tem_token_producao ? '1' : '0'}`,
  status: (h: FiscalHub) => (h.ativo ? 'ATIVO' : 'INATIVO'),
  teste: (h: FiscalHub) => h.ultimo_teste_em,
};

function ambienteLabel(amb: string): string {
  return amb === 'producao' ? 'Produção' : 'Homologação';
}

function fieldErrors(err: unknown): string {
  if (err instanceof ApiError && err.details) {
    return Object.entries(err.details)
      .flatMap(([k, msgs]) => msgs.map((m) => `${k}: ${m}`))
      .join(' ');
  }
  return err instanceof Error ? err.message : 'Erro ao salvar.';
}

export function FiscalHubsPage() {
  const [items, setItems] = useState<FiscalHub[]>([]);
  const [aviso, setAviso] = useState('');
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('closed');
  const [editing, setEditing] = useState<FiscalHub | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (h) =>
        h.nome.toLowerCase().includes(q) ||
        h.codigo.toLowerCase().includes(q) ||
        h.provedor.toLowerCase().includes(q) ||
        h.token_homologacao_mascara.toLowerCase().includes(q) ||
        h.token_producao_mascara.toLowerCase().includes(q),
    );
  }, [items, query]);

  const {
    sorted,
    sortKey,
    sortDir,
    requestSort,
  } = useTableSort(filtered, HUB_SORT);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<{
        data: FiscalHub[];
        aviso?: string;
        total?: number;
        ativos?: number;
      }>('/fiscal-hubs');
      setItems(res.data);
      setAviso(res.aviso ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar hubs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const closeForm = () => {
    setMode('closed');
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const startCreate = () => {
    setMode('create');
    setEditing(null);
    setForm({ ...EMPTY_FORM, padrao: items.length === 0 });
    setError('');
    setMessage('');
  };

  const startEdit = (h: FiscalHub) => {
    setMode('edit');
    setEditing(h);
    setForm({
      nome: h.nome,
      provedor: h.provedor,
      ambiente_ativo: h.ambiente_ativo,
      padrao: h.padrao,
      ativo: h.ativo,
      base_url_homologacao: h.base_url_homologacao ?? '',
      base_url_producao: h.base_url_producao ?? '',
      token_homologacao: '',
      token_producao: '',
    });
    setError('');
    setMessage('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'create') {
      const hasHom = form.token_homologacao.trim().length >= 8;
      const hasProd = form.token_producao.trim().length >= 8;
      if (!hasHom && !hasProd) {
        setError('Informe ao menos um token (homologação ou produção) com 8+ caracteres.');
        return;
      }
      if (form.ambiente_ativo === 'homologacao' && !hasHom) {
        setError('Ambiente homologação exige token de homologação.');
        return;
      }
      if (form.ambiente_ativo === 'producao' && !hasProd) {
        setError('Ambiente produção exige token de produção.');
        return;
      }
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload: Record<string, unknown> = {
        nome: form.nome.trim(),
        provedor: form.provedor,
        ambiente_ativo: form.ambiente_ativo,
        padrao: form.padrao,
        ativo: form.ativo,
        base_url_homologacao: form.base_url_homologacao.trim() || null,
        base_url_producao: form.base_url_producao.trim() || null,
      };
      if (form.token_homologacao.trim()) {
        payload.token_homologacao = form.token_homologacao.trim();
      }
      if (form.token_producao.trim()) {
        payload.token_producao = form.token_producao.trim();
      }

      if (mode === 'create') {
        await api.post('/fiscal-hubs', payload);
        setMessage('Hub fiscal cadastrado.');
      } else if (editing) {
        await api.put(`/fiscal-hubs/${editing.id}`, payload);
        setMessage('Hub fiscal atualizado.');
      }
      closeForm();
      await load();
    } catch (err) {
      setError(fieldErrors(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (h: FiscalHub) => {
    setError('');
    try {
      await api.put(`/fiscal-hubs/${h.id}`, { ativo: !h.ativo });
      await load();
    } catch (err) {
      setError(fieldErrors(err));
    }
  };

  const handleTornarPadrao = async (h: FiscalHub) => {
    setError('');
    try {
      await api.put(`/fiscal-hubs/${h.id}`, { padrao: true, ativo: true });
      setMessage(`Hub ${h.codigo} vinculado como padrão da empresa.`);
      await load();
    } catch (err) {
      setError(fieldErrors(err));
    }
  };

  const handleTestar = async (h: FiscalHub, ambiente: string) => {
    const key = `${h.id}:${ambiente}`;
    setTestingKey(key);
    setError('');
    setMessage('');
    try {
      const res = await api.post<{ ok: boolean; mensagem: string; ambiente: string }>(
        `/fiscal-hubs/${h.id}/testar`,
        { ambiente },
      );
      setMessage(res.mensagem);
      await load();
    } catch (err) {
      setError(fieldErrors(err));
    } finally {
      setTestingKey(null);
    }
  };

  const handleRemover = async (h: FiscalHub) => {
    if (!window.confirm(`Remover o hub "${h.nome}" (${h.codigo})? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setError('');
    try {
      await api.delete(`/fiscal-hubs/${h.id}`);
      setMessage('Hub removido.');
      if (editing?.id === h.id) closeForm();
      await load();
    } catch (err) {
      setError(fieldErrors(err));
    }
  };

  const showUrlOverride = form.provedor === 'generico';

  return (
    <>
      <PageHeader
        title="Hubs fiscais"
        description="Cadastro do hub que conversa com o fisco (Focus NFe etc.) — tokens e vínculo da empresa"
        actions={
          <button type="button" className="btn btn-primary" onClick={startCreate}>
            Novo hub
          </button>
        }
      />

      {aviso && <div className="alert alert-warning">{aviso}</div>}
      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {mode !== 'closed' && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--navy)' }}>
              {mode === 'create' ? 'Novo hub fiscal' : `Editar: ${editing?.codigo} · ${editing?.nome}`}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="hub-nome">Nome</label>
                  <input
                    id="hub-nome"
                    required
                    minLength={2}
                    maxLength={120}
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    placeholder="ex: Focus NFe RLP"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="hub-provedor">Provedor</label>
                  <select
                    id="hub-provedor"
                    value={form.provedor}
                    onChange={(e) => setForm((f) => ({ ...f, provedor: e.target.value }))}
                  >
                    {FISCAL_HUB_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="hub-ambiente">Ambiente ativo</label>
                  <select
                    id="hub-ambiente"
                    value={form.ambiente_ativo}
                    onChange={(e) => setForm((f) => ({ ...f, ambiente_ativo: e.target.value }))}
                  >
                    <option value="homologacao">Homologação</option>
                    <option value="producao">Produção</option>
                  </select>
                  <small style={{ color: 'var(--muted)', marginTop: '0.25rem', display: 'block' }}>
                    Ambiente que o sistema usará nas operações fiscais
                  </small>
                </div>
                <div className="form-group span-2">
                  <label htmlFor="hub-token-hom">
                    Token homologação
                    {mode === 'edit' ? ' (deixe em branco para manter)' : ''}
                  </label>
                  <input
                    id="hub-token-hom"
                    type="password"
                    autoComplete="off"
                    required={mode === 'create' && form.ambiente_ativo === 'homologacao'}
                    minLength={mode === 'create' ? 8 : undefined}
                    value={form.token_homologacao}
                    onChange={(e) => setForm((f) => ({ ...f, token_homologacao: e.target.value }))}
                    placeholder={
                      mode === 'edit' ? editing?.token_homologacao_mascara || '••••••••' : 'Token Focus homologação'
                    }
                  />
                </div>
                <div className="form-group span-2">
                  <label htmlFor="hub-token-prod">
                    Token produção
                    {mode === 'edit' ? ' (deixe em branco para manter)' : ''}
                  </label>
                  <input
                    id="hub-token-prod"
                    type="password"
                    autoComplete="off"
                    required={mode === 'create' && form.ambiente_ativo === 'producao'}
                    minLength={mode === 'create' ? 8 : undefined}
                    value={form.token_producao}
                    onChange={(e) => setForm((f) => ({ ...f, token_producao: e.target.value }))}
                    placeholder={
                      mode === 'edit' ? editing?.token_producao_mascara || '••••••••' : 'Token Focus produção'
                    }
                  />
                </div>
                {showUrlOverride && (
                  <>
                    <div className="form-group span-2">
                      <label htmlFor="hub-url-hom">Base URL homologação</label>
                      <input
                        id="hub-url-hom"
                        value={form.base_url_homologacao}
                        onChange={(e) => setForm((f) => ({ ...f, base_url_homologacao: e.target.value }))}
                        placeholder="https://…"
                      />
                    </div>
                    <div className="form-group span-2">
                      <label htmlFor="hub-url-prod">Base URL produção</label>
                      <input
                        id="hub-url-prod"
                        value={form.base_url_producao}
                        onChange={(e) => setForm((f) => ({ ...f, base_url_producao: e.target.value }))}
                        placeholder="https://…"
                      />
                    </div>
                  </>
                )}
                {!showUrlOverride && (
                  <div className="form-group span-2">
                    <small style={{ color: 'var(--muted)' }}>
                      Focus NFe usa URLs oficiais (
                      <code>homologacao.focusnfe.com.br</code> / <code>api.focusnfe.com.br</code>
                      ). Auth: Basic com token como usuário e senha vazia.
                    </small>
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="hub-padrao">Vínculo</label>
                  <label
                    htmlFor="hub-padrao"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
                  >
                    <input
                      id="hub-padrao"
                      type="checkbox"
                      checked={form.padrao}
                      onChange={(e) => setForm((f) => ({ ...f, padrao: e.target.checked }))}
                      disabled={mode === 'edit' && editing?.padrao === true}
                    />
                    Hub padrão da empresa (usado pelo sistema)
                  </label>
                </div>
                <div className="form-group">
                  <label htmlFor="hub-ativo">Situação</label>
                  <label
                    htmlFor="hub-ativo"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
                  >
                    <input
                      id="hub-ativo"
                      type="checkbox"
                      checked={form.ativo}
                      onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                    />
                    Ativo
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Salvando…' : 'Salvar'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={closeForm} disabled={saving}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body" style={{ paddingBottom: 0 }}>
          <div className="form-group" style={{ maxWidth: 360 }}>
            <label htmlFor="hub-busca">Buscar</label>
            <input
              id="hub-busca"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Código, nome, provedor…"
            />
          </div>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="loading">Carregando…</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">Nenhum hub fiscal cadastrado para esta empresa.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <SortableTh column="codigo" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Código
                  </SortableTh>
                  <SortableTh column="nome" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Nome
                  </SortableTh>
                  <SortableTh column="provedor" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Provedor
                  </SortableTh>
                  <SortableTh column="ambiente" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Ambiente
                  </SortableTh>
                  <SortableTh column="tokens" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Tokens
                  </SortableTh>
                  <SortableTh column="status" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Status
                  </SortableTh>
                  <SortableTh
                    column="teste"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                    label="Último teste"
                  >
                    Último teste
                  </SortableTh>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((h) => (
                  <tr key={h.id}>
                    <td>
                      <code>{h.codigo}</code>
                      {h.padrao && (
                        <span style={{ marginLeft: '0.35rem', color: 'var(--navy)', fontSize: '0.8rem' }}>
                          padrão
                        </span>
                      )}
                    </td>
                    <td>{h.nome}</td>
                    <td>{provedorLabel(h.provedor)}</td>
                    <td>{ambienteLabel(h.ambiente_ativo)}</td>
                    <td>
                      <div style={{ fontSize: '0.85rem', lineHeight: 1.45 }}>
                        <div>
                          Hom:{' '}
                          <code>{h.tem_token_homologacao ? h.token_homologacao_mascara : '—'}</code>
                        </div>
                        <div>
                          Prod:{' '}
                          <code>{h.tem_token_producao ? h.token_producao_mascara : '—'}</code>
                        </div>
                      </div>
                    </td>
                    <td>
                      <StatusPill status={h.ativo ? 'ATIVO' : 'INATIVO'} />
                    </td>
                    <td>
                      {h.ultimo_teste_em ? (
                        <span title={h.ultimo_teste_msg ?? undefined}>
                          {h.ultimo_teste_ok === true
                            ? 'OK'
                            : h.ultimo_teste_ok === false
                              ? 'Falha'
                              : '—'}{' '}
                          · {ambienteLabel(h.ultimo_teste_ambiente ?? '')} ·{' '}
                          {formatDateTime(h.ultimo_teste_em)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => void handleTestar(h, 'homologacao')}
                          disabled={testingKey === `${h.id}:homologacao` || !h.tem_token_homologacao}
                        >
                          {testingKey === `${h.id}:homologacao` ? 'Testando…' : 'Testar hom.'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => void handleTestar(h, 'producao')}
                          disabled={testingKey === `${h.id}:producao` || !h.tem_token_producao}
                        >
                          {testingKey === `${h.id}:producao` ? 'Testando…' : 'Testar prod.'}
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => startEdit(h)}>
                          Editar
                        </button>
                        {!h.padrao && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => void handleTornarPadrao(h)}
                          >
                            Tornar padrão
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => void handleToggleAtivo(h)}
                        >
                          {h.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => void handleRemover(h)}
                        >
                          Remover
                        </button>
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
