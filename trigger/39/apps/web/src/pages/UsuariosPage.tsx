import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { ApiError, api, type Parceiro, type Usuario } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  ROLE_CATALOG,
  findSodConflict,
  formatApiFieldErrors,
  passwordIssues,
  roleLabel,
  rolesCompatibleWith,
} from '../lib/usuarios';

type Mode = 'closed' | 'create' | 'edit';

type FormState = {
  parceiro_id: string;
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  roles: string[];
  empresa_ids: number[];
  empresa_default_id: string;
  vigencia_ate: string;
};

const EMPTY_FORM: FormState = {
  parceiro_id: '',
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  roles: ['CONSULTA'],
  empresa_ids: [],
  empresa_default_id: '',
  vigencia_ate: '',
};

function userRoleNames(user: Usuario): string[] {
  return (user.roles ?? []).map((r) => (typeof r === 'string' ? r : r.name));
}

export function UsuariosPage() {
  const { empresas: authEmpresas, empresaId } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [colaboradores, setColaboradores] = useState<Parceiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('closed');
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ATIVO' | 'INATIVO'>('TODOS');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const usedParceiroIds = useMemo(
    () => new Set(usuarios.map((u) => u.parceiro_id).filter((id): id is number => id != null)),
    [usuarios],
  );

  const colaboradoresDisponiveis = useMemo(
    () =>
      colaboradores.filter(
        (p) =>
          p.papel_colaborador &&
          p.situacao === 'ATIVO' &&
          (!usedParceiroIds.has(p.id) || (editing && editing.parceiro_id === p.id)),
      ),
    [colaboradores, usedParceiroIds, editing],
  );

  const sodError = findSodConflict(form.roles);
  const pwdIssues = form.password ? passwordIssues(form.password) : [];

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return usuarios.filter((u) => {
      if (statusFilter === 'ATIVO' && !u.ativo) return false;
      if (statusFilter === 'INATIVO' && u.ativo) return false;
      if (!q) return true;
      const roles = userRoleNames(u).join(' ').toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.codigo.toLowerCase().includes(q) ||
        (u.parceiro?.codigo ?? '').toLowerCase().includes(q) ||
        roles.includes(q)
      );
    });
  }, [usuarios, query, statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const [usersRes, parceirosRes] = await Promise.all([
        api.get<{ data: Usuario[] }>('/usuarios'),
        api.get<{ data: Parceiro[] }>('/parceiros?papel=colaborador'),
      ]);
      setUsuarios(usersRes.data);
      setColaboradores(parceirosRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    const defaultEmpresa = empresaId ?? authEmpresas[0]?.id ?? null;
    setEditing(null);
    setMode('create');
    setError('');
    setMessage('');
    setForm({
      ...EMPTY_FORM,
      empresa_ids: defaultEmpresa ? [defaultEmpresa] : [],
      empresa_default_id: defaultEmpresa ? String(defaultEmpresa) : '',
    });
  };

  const openEdit = (user: Usuario) => {
    const roleNames = userRoleNames(user);
    const empresaIds = (user.empresas ?? []).map((e) => e.id);
    setEditing(user);
    setMode('edit');
    setError('');
    setMessage('');
    setForm({
      parceiro_id: user.parceiro_id ? String(user.parceiro_id) : '',
      name: user.name,
      email: user.email,
      password: '',
      password_confirmation: '',
      roles: roleNames.length ? roleNames : ['CONSULTA'],
      empresa_ids: empresaIds.length
        ? empresaIds
        : user.empresa_default_id
          ? [user.empresa_default_id]
          : [],
      empresa_default_id: user.empresa_default_id ? String(user.empresa_default_id) : '',
      vigencia_ate: user.vigencia_ate ? user.vigencia_ate.slice(0, 10) : '',
    });
  };

  const closeForm = () => {
    setMode('closed');
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const onColaboradorChange = (parceiroId: string) => {
    const parceiro = colaboradores.find((p) => String(p.id) === parceiroId);
    setForm((prev) => ({
      ...prev,
      parceiro_id: parceiroId,
      name: parceiro?.razao_social || parceiro?.nome_fantasia || prev.name,
      email: parceiro?.email || prev.email,
      empresa_ids:
        prev.empresa_ids.length > 0
          ? prev.empresa_ids
          : parceiro?.empresa_id
            ? [parceiro.empresa_id]
            : prev.empresa_ids,
      empresa_default_id:
        prev.empresa_default_id ||
        (parceiro?.empresa_id ? String(parceiro.empresa_id) : ''),
    }));
  };

  const toggleRole = (role: string) => {
    setForm((prev) => {
      const has = prev.roles.includes(role);
      if (has) {
        const next = prev.roles.filter((r) => r !== role);
        return { ...prev, roles: next.length ? next : prev.roles };
      }
      if (!rolesCompatibleWith(prev.roles, role)) {
        return { ...prev, roles: [role] };
      }
      return { ...prev, roles: [...prev.roles, role] };
    });
  };

  const toggleEmpresa = (id: number) => {
    setForm((prev) => {
      const has = prev.empresa_ids.includes(id);
      const empresa_ids = has
        ? prev.empresa_ids.filter((x) => x !== id)
        : [...prev.empresa_ids, id];
      let empresa_default_id = prev.empresa_default_id;
      if (!empresa_ids.map(String).includes(empresa_default_id)) {
        empresa_default_id = empresa_ids[0] ? String(empresa_ids[0]) : '';
      }
      return { ...prev, empresa_ids, empresa_default_id };
    });
  };

  const validateForm = (): string | null => {
    if (mode === 'create' && !form.parceiro_id) {
      return 'Selecione o colaborador vinculado (obrigatório).';
    }
    if (!form.name.trim()) return 'Informe o nome.';
    if (!form.email.trim()) return 'Informe o e-mail corporativo.';
    if (form.roles.length === 0) return 'Selecione ao menos um perfil.';
    if (sodError) return `Segregação de funções: ${sodError}`;
    if (form.empresa_ids.length === 0) return 'Selecione ao menos uma empresa de acesso.';
    if (mode === 'create') {
      if (!form.password) return 'Defina a senha inicial.';
      if (pwdIssues.length) return `Senha fraca: precisa de ${pwdIssues.join(', ')}.`;
      if (form.password !== form.password_confirmation) {
        return 'Confirmação de senha não confere.';
      }
    } else if (form.password) {
      if (pwdIssues.length) return `Senha fraca: precisa de ${pwdIssues.join(', ')}.`;
      if (form.password !== form.password_confirmation) {
        return 'Confirmação de senha não confere.';
      }
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      roles: form.roles,
      empresa_ids: form.empresa_ids,
      empresa_default_id: form.empresa_default_id
        ? parseInt(form.empresa_default_id, 10)
        : form.empresa_ids[0],
      vigencia_ate: form.vigencia_ate || null,
    };

    if (form.password) {
      payload.password = form.password;
    }

    try {
      if (mode === 'create') {
        payload.parceiro_id = parseInt(form.parceiro_id, 10);
        await api.post('/usuarios', payload);
        setMessage('Usuário criado. O acesso é individual e intransferível.');
      } else if (editing) {
        await api.put(`/usuarios/${editing.id}`, payload);
        setMessage('Usuário atualizado.');
      }
      closeForm();
      await load();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(formatApiFieldErrors(err.details, err.message));
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao salvar usuário.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (user: Usuario) => {
    if (!confirm(`Desativar acesso de ${user.name}? O histórico será preservado.`)) return;
    try {
      await api.patch(`/usuarios/${user.id}/deactivate`);
      setMessage(`${user.name} desativado (não excluído).`);
      await load();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(formatApiFieldErrors(err.details, err.message));
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao desativar.');
      }
    }
  };

  const handleActivate = async (user: Usuario) => {
    try {
      await api.patch(`/usuarios/${user.id}/activate`);
      setMessage(`${user.name} reativado.`);
      await load();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(formatApiFieldErrors(err.details, err.message));
      } else {
        setError(err instanceof Error ? err.message : 'Erro ao reativar.');
      }
    }
  };

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Acesso individual vinculado a colaborador · perfis RBAC com segregação de funções"
        actions={
          mode === 'closed' ? (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              Novo usuário
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={closeForm}>
              Cancelar
            </button>
          )
        }
      />

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {mode !== 'closed' && (
        <form className="card usuario-form-card" onSubmit={handleSubmit}>
          <div className="card-body">
            <div className="usuario-form-intro">
              <h2>{mode === 'create' ? 'Criar usuário' : `Editar ${editing?.codigo}`}</h2>
              <p>
                Login individual por e-mail corporativo. Permissões vêm só do perfil —
                nunca avulsas. Em caso de desligamento, desative (não exclua).
              </p>
            </div>

            <section className="usuario-section">
              <h3>1. Colaborador</h3>
              {mode === 'create' ? (
                colaboradoresDisponiveis.length === 0 ? (
                  <div className="alert alert-warning">
                    Não há colaboradores ativos sem usuário. Cadastre o colaborador em{' '}
                    <Link to="/parceiros/novo">Parceiros</Link> (papel Colaborador) e
                    volte aqui.
                  </div>
                ) : (
                  <div className="form-grid">
                    <div className="form-group span-2">
                      <label htmlFor="parceiro_id">Colaborador (PAR)</label>
                      <select
                        id="parceiro_id"
                        value={form.parceiro_id}
                        onChange={(e) => onColaboradorChange(e.target.value)}
                        required
                      >
                        <option value="">Selecione o colaborador…</option>
                        {colaboradoresDisponiveis.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.codigo} — {p.razao_social}
                            {p.cargo ? ` (${p.cargo})` : ''}
                          </option>
                        ))}
                      </select>
                      <span className="form-hint">
                        Usuário nasce vinculado ao cadastro de colaborador — nunca solto.
                      </span>
                    </div>
                  </div>
                )
              ) : (
                <div className="form-grid">
                  <div className="form-group span-2">
                    <label>Colaborador vinculado</label>
                    <input
                      value={
                        editing?.parceiro
                          ? `${editing.parceiro.codigo} — ${editing.parceiro.razao_social}`
                          : '—'
                      }
                      disabled
                    />
                  </div>
                </div>
              )}
            </section>

            <section className="usuario-section">
              <h3>2. Identidade de acesso</h3>
              <div className="form-grid">
                <div className="form-group span-2">
                  <label htmlFor="name">Nome</label>
                  <input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    autoComplete="name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">E-mail corporativo</label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    autoComplete="username"
                    placeholder="nome@rlp.com.br"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="vigencia_ate">Vigência até (opcional)</label>
                  <input
                    id="vigencia_ate"
                    type="date"
                    value={form.vigencia_ate}
                    onChange={(e) => setForm({ ...form, vigencia_ate: e.target.value })}
                  />
                  <span className="form-hint">Estágio / contrato com prazo.</span>
                </div>
                <div className="form-group">
                  <label htmlFor="password">
                    {mode === 'create' ? 'Senha inicial' : 'Nova senha (opcional)'}
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    minLength={8}
                    autoComplete="new-password"
                    required={mode === 'create'}
                  />
                  {form.password && pwdIssues.length > 0 && (
                    <span className="form-error">Falta: {pwdIssues.join(', ')}</span>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="password_confirmation">Confirmar senha</label>
                  <input
                    id="password_confirmation"
                    type="password"
                    value={form.password_confirmation}
                    onChange={(e) =>
                      setForm({ ...form, password_confirmation: e.target.value })
                    }
                    autoComplete="new-password"
                    required={mode === 'create' || !!form.password}
                  />
                </div>
              </div>
            </section>

            <section className="usuario-section">
              <h3>3. Perfil de acesso (função)</h3>
              <p className="usuario-section-hint">
                Prefira um perfil. Um segundo perfil só é permitido se compatível com a
                matriz de segregação. ADMIN é exceção — não use como login do dia a dia.
              </p>
              {sodError && (
                <div className="alert alert-warning" style={{ marginBottom: '0.85rem' }}>
                  Segregação: {sodError}
                </div>
              )}
              <div className="role-card-grid">
                {ROLE_CATALOG.map((role) => {
                  const checked = form.roles.includes(role.id);
                  const blocked =
                    !checked && findSodConflict([...form.roles, role.id]) !== null;
                  return (
                    <label
                      key={role.id}
                      className={`role-card role-card--${role.tone}${checked ? ' is-selected' : ''}${blocked ? ' is-blocked' : ''}`}
                      title={
                        blocked
                          ? 'Incompatível com a seleção atual — clicar troca para este perfil'
                          : undefined
                      }
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRole(role.id)}
                      />
                      <span className="role-card-title">{role.label}</span>
                      <span className="role-card-summary">{role.summary}</span>
                      {blocked && (
                        <span className="role-card-block">Clique para trocar o perfil</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="usuario-section">
              <h3>4. Empresas</h3>
              <div className="form-grid">
                <div className="form-group span-full">
                  <label>Empresas com acesso</label>
                  <div className="checkbox-grid">
                    {authEmpresas.map((emp) => (
                      <label key={emp.id} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={form.empresa_ids.includes(emp.id)}
                          onChange={() => toggleEmpresa(emp.id)}
                        />
                        {emp.codigo} — {emp.nome_fantasia || emp.razao_social}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="empresa_default_id">Empresa padrão</label>
                  <select
                    id="empresa_default_id"
                    value={form.empresa_default_id}
                    onChange={(e) =>
                      setForm({ ...form, empresa_default_id: e.target.value })
                    }
                  >
                    <option value="">Selecione…</option>
                    {authEmpresas
                      .filter((e) => form.empresa_ids.includes(e.id))
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.codigo}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </section>

            <div className="usuario-form-actions">
              <button type="button" className="btn btn-ghost" onClick={closeForm}>
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  saving ||
                  !!sodError ||
                  (mode === 'create' && colaboradoresDisponiveis.length === 0)
                }
              >
                {saving
                  ? 'Salvando…'
                  : mode === 'create'
                    ? 'Criar usuário'
                    : 'Salvar alterações'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <div className="usuario-toolbar">
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label htmlFor="user-q">Buscar</label>
              <input
                id="user-q"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nome, e-mail, código ou perfil"
              />
            </div>
            <div className="form-group" style={{ minWidth: 140 }}>
              <label htmlFor="user-status">Status</label>
              <select
                id="user-status"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'TODOS' | 'ATIVO' | 'INATIVO')
                }
              >
                <option value="TODOS">Todos</option>
                <option value="ATIVO">Ativos</option>
                <option value="INATIVO">Inativos</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div className="loading">Carregando…</div>
          ) : filteredUsers.length === 0 ? (
            <div className="empty-state">
              {usuarios.length === 0
                ? 'Nenhum usuário cadastrado.'
                : 'Nenhum usuário corresponde ao filtro.'}
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Colaborador</th>
                  <th>Perfis</th>
                  <th>Empresas</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const roles = userRoleNames(u);
                  return (
                    <tr key={u.id} className={u.ativo ? undefined : 'row-inactive'}>
                      <td>{u.codigo}</td>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.parceiro?.codigo ?? '—'}</td>
                      <td>
                        <div className="role-pill-row">
                          {roles.map((r) => (
                            <span key={r} className="role-pill">
                              {roleLabel(r)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        {(u.empresas ?? [])
                          .map((e) => e.codigo)
                          .join(', ') || '—'}
                      </td>
                      <td>
                        <StatusPill status={u.ativo ? 'ATIVO' : 'INATIVO'} />
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => openEdit(u)}
                          >
                            Editar
                          </button>
                          {u.ativo ? (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => void handleDeactivate(u)}
                            >
                              Desativar
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => void handleActivate(u)}
                            >
                              Reativar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
