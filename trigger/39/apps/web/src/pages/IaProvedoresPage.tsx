import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { ApiError, api, type IaProvedor } from '../lib/api';
import { formatDateTime } from '../lib/format';

type Mode = 'closed' | 'create' | 'edit';

type FormState = {
  nome: string;
  provedor: string;
  base_url: string;
  modelo: string;
  api_key: string;
  prioridade: string;
  ativo: boolean;
};

const EMPTY_FORM: FormState = {
  nome: '',
  provedor: 'openai',
  base_url: '',
  modelo: '',
  api_key: '',
  prioridade: '100',
  ativo: true,
};

export const IA_PROVEDOR_OPTIONS: { value: string; label: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'groq', label: 'Groq' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'xai', label: 'xAI (Grok)' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'together', label: 'Together AI' },
  { value: 'perplexity', label: 'Perplexity' },
  { value: 'openai_compatible', label: 'OpenAI-compatible (custom)' },
];

const IA_MODELO_SUGESTAO: Record<string, string> = {
  openai: 'gpt-4o-mini',
  openai_compatible: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
  anthropic: 'claude-3-5-haiku-latest',
  deepseek: 'deepseek-chat',
  groq: 'llama-3.3-70b-versatile',
  mistral: 'mistral-small-latest',
  xai: 'grok-2-latest',
  openrouter: 'openai/gpt-4o-mini',
  together: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
  perplexity: 'sonar',
};

function provedorLabel(tipo: string): string {
  return IA_PROVEDOR_OPTIONS.find((o) => o.value === tipo)?.label ?? tipo;
}

function fieldErrors(err: unknown): string {
  if (err instanceof ApiError && err.details) {
    return Object.entries(err.details)
      .flatMap(([k, msgs]) => msgs.map((m) => `${k}: ${m}`))
      .join(' ');
  }
  return err instanceof Error ? err.message : 'Erro ao salvar.';
}

export function IaProvedoresPage() {
  const [items, setItems] = useState<IaProvedor[]>([]);
  const [aviso, setAviso] = useState('');
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('closed');
  const [editing, setEditing] = useState<IaProvedor | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        p.provedor.toLowerCase().includes(q) ||
        (p.modelo ?? '').toLowerCase().includes(q) ||
        p.api_key_mascara.toLowerCase().includes(q),
    );
  }, [items, query]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<{
        data: IaProvedor[];
        aviso_custo?: string;
        total?: number;
        ativos?: number;
      }>('/ia-provedores');
      setItems(res.data);
      setAviso(res.aviso_custo ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar provedores.');
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
    setForm(EMPTY_FORM);
    setError('');
    setMessage('');
  };

  const startEdit = (p: IaProvedor) => {
    setMode('edit');
    setEditing(p);
    setForm({
      nome: p.nome,
      provedor: p.provedor,
      base_url: p.base_url ?? '',
      modelo: p.modelo ?? '',
      api_key: '',
      prioridade: String(p.prioridade),
      ativo: p.ativo,
    });
    setError('');
    setMessage('');
  };

  const handleProvedorChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      provedor: value,
      modelo: prev.modelo || IA_MODELO_SUGESTAO[value] || '',
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'create' && form.api_key.trim().length < 8) {
      setError('Informe uma API key com ao menos 8 caracteres.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload: Record<string, unknown> = {
        nome: form.nome.trim(),
        provedor: form.provedor,
        base_url: form.base_url.trim() || null,
        modelo: form.modelo.trim() || null,
        prioridade: Number(form.prioridade) || 100,
        ativo: form.ativo,
      };
      if (form.api_key.trim()) {
        payload.api_key = form.api_key.trim();
      }

      if (mode === 'create') {
        await api.post('/ia-provedores', payload);
        setMessage('Provedor cadastrado.');
      } else if (editing) {
        await api.put(`/ia-provedores/${editing.id}`, payload);
        setMessage('Provedor atualizado.');
      }
      closeForm();
      await load();
    } catch (err) {
      setError(fieldErrors(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (p: IaProvedor) => {
    setError('');
    try {
      await api.put(`/ia-provedores/${p.id}`, { ativo: !p.ativo });
      await load();
    } catch (err) {
      setError(fieldErrors(err));
    }
  };

  const handleTestar = async (p: IaProvedor) => {
    setTestingId(p.id);
    setError('');
    setMessage('');
    try {
      const res = await api.post<{ ok: boolean; mensagem: string }>(
        `/ia-provedores/${p.id}/testar`,
      );
      setMessage(res.mensagem);
      await load();
    } catch (err) {
      setError(fieldErrors(err));
    } finally {
      setTestingId(null);
    }
  };

  const handleRemover = async (p: IaProvedor) => {
    if (!window.confirm(`Remover o provedor "${p.nome}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setError('');
    try {
      await api.delete(`/ia-provedores/${p.id}`);
      setMessage('Provedor removido.');
      if (editing?.id === p.id) closeForm();
      await load();
    } catch (err) {
      setError(fieldErrors(err));
    }
  };

  return (
    <>
      <PageHeader
        title="Provedores de IA"
        description="Cadastro administrativo de tokens e endpoints para uso futuro no sistema"
        actions={
          <button type="button" className="btn btn-primary" onClick={startCreate}>
            Novo provedor
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
              {mode === 'create' ? 'Novo provedor' : `Editar: ${editing?.nome}`}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="ia-nome">Nome</label>
                  <input
                    id="ia-nome"
                    required
                    minLength={2}
                    maxLength={120}
                    value={form.nome}
                    onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    placeholder="ex: OpenAI produção"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="ia-provedor">Tipo</label>
                  <select
                    id="ia-provedor"
                    value={form.provedor}
                    onChange={(e) => handleProvedorChange(e.target.value)}
                  >
                    {IA_PROVEDOR_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="ia-modelo">Modelo</label>
                  <input
                    id="ia-modelo"
                    value={form.modelo}
                    onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))}
                    placeholder={IA_MODELO_SUGESTAO[form.provedor] ?? 'modelo'}
                  />
                </div>
                <div className="form-group span-2">
                  <label htmlFor="ia-base">Base URL (opcional)</label>
                  <input
                    id="ia-base"
                    value={form.base_url}
                    onChange={(e) => setForm((f) => ({ ...f, base_url: e.target.value }))}
                    placeholder="Deixe vazio para usar o endpoint padrão do tipo"
                  />
                </div>
                <div className="form-group span-2">
                  <label htmlFor="ia-key">
                    API key{mode === 'edit' ? ' (deixe em branco para manter)' : ''}
                  </label>
                  <input
                    id="ia-key"
                    type="password"
                    autoComplete="off"
                    required={mode === 'create'}
                    minLength={mode === 'create' ? 8 : undefined}
                    value={form.api_key}
                    onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))}
                    placeholder={mode === 'edit' ? editing?.api_key_mascara : '••••••••'}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="ia-prio">Prioridade</label>
                  <input
                    id="ia-prio"
                    type="number"
                    min={1}
                    max={9999}
                    value={form.prioridade}
                    onChange={(e) => setForm((f) => ({ ...f, prioridade: e.target.value }))}
                  />
                  <small style={{ color: 'var(--muted)', marginTop: '0.25rem', display: 'block' }}>
                    Menor número = maior prioridade na rotação futura
                  </small>
                </div>
                <div className="form-group">
                  <label htmlFor="ia-ativo">Situação</label>
                  <label
                    htmlFor="ia-ativo"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
                  >
                    <input
                      id="ia-ativo"
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
            <label htmlFor="ia-busca">Buscar</label>
            <input
              id="ia-busca"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nome, tipo, modelo…"
            />
          </div>
        </div>
        <div className="table-wrap">
          {loading ? (
            <div className="loading">Carregando…</div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">Nenhum provedor de IA cadastrado.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Modelo</th>
                  <th>Key</th>
                  <th>Prioridade</th>
                  <th>Status</th>
                  <th>Último teste</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>{p.nome}</td>
                    <td>{provedorLabel(p.provedor)}</td>
                    <td>{p.modelo ?? '—'}</td>
                    <td>
                      <code>{p.api_key_mascara}</code>
                    </td>
                    <td>{p.prioridade}</td>
                    <td>
                      <StatusPill status={p.ativo ? 'ATIVO' : 'INATIVO'} />
                    </td>
                    <td>
                      {p.ultimo_teste_em ? (
                        <span title={p.ultimo_teste_msg ?? undefined}>
                          {p.ultimo_teste_ok === true
                            ? 'OK'
                            : p.ultimo_teste_ok === false
                              ? 'Falha'
                              : '—'}{' '}
                          · {formatDateTime(p.ultimo_teste_em)}
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
                          onClick={() => void handleTestar(p)}
                          disabled={testingId === p.id}
                        >
                          {testingId === p.id ? 'Testando…' : 'Testar'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => startEdit(p)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => void handleToggleAtivo(p)}
                        >
                          {p.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => void handleRemover(p)}
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
