import { FormEvent, useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { getErrorMessage, PERFIS, usuariosApi, type Usuario } from '../lib/api';
import { useAuth } from '../lib/auth';

export function UsuariosPage() {
  const { can } = useAuth();
  const [rows, setRows] = useState<Usuario[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    email: '',
    nome: '',
    password: '',
    role: 'COMERCIAL',
  });

  const load = useCallback(() => {
    usuariosApi
      .list()
      .then(setRows)
      .catch((e) => setErro(getErrorMessage(e)));
  }, []);

  useEffect(() => {
    if (can('usuarios.gerir')) load();
  }, [can, load]);

  if (!can('usuarios.gerir')) {
    return (
      <div>
        <h1>Usuários</h1>
        <p className="error">Acesso restrito ao perfil ADMIN.</p>
      </div>
    );
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setOk(null);
    setPending(true);
    try {
      await usuariosApi.create(form);
      setOk('Usuário criado. Login individual — não compartilhe senha.');
      setForm({ email: '', nome: '', password: '', role: 'COMERCIAL' });
      load();
    } catch (err) {
      setErro(getErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function toggleAtivo(u: Usuario) {
    setErro(null);
    setOk(null);
    try {
      await usuariosApi.bloquear(u.id, !(u.ativo ?? true), u.ativo ? 'Bloqueio administrativo' : undefined);
      setOk(u.ativo ? `Usuário ${u.email} bloqueado (histórico preservado).` : `Usuário ${u.email} reativado.`);
      load();
    } catch (err) {
      setErro(getErrorMessage(err));
    }
  }

  async function changeRole(u: Usuario, role: string) {
    setErro(null);
    try {
      await usuariosApi.update(u.id, { role });
      setOk(`Perfil de ${u.email} → ${role}`);
      load();
    } catch (err) {
      setErro(getErrorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader
        ordem={0}
        codigo="M11"
        titulo="Usuários e perfis"
        modo="OPERACIONAL"
        regra="RBAC por PER — permissões só no perfil; bloquear sem apagar (UC-PLT-008). SoD CA-12."
      />

      {erro ? <p className="error">{erro}</p> : null}
      {ok ? <p className="success">{ok}</p> : null}

      <section className="panel" style={{ marginBottom: '1.25rem' }}>
        <h2 className="panel-title">Novo usuário</h2>
        <form className="form-grid" onSubmit={handleCreate}>
          <label>
            Nome
            <input
              required
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            />
          </label>
          <label>
            E-mail
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </label>
          <label>
            Senha inicial
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </label>
          <label>
            Perfil
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
              {PERFIS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" className="btn primary" disabled={pending}>
              {pending ? 'Salvando…' : 'Criar usuário'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2 className="panel-title">Cadastro ({rows.length})</h2>
        <table className="data">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>{u.nome}</td>
                <td>{u.email}</td>
                <td>
                  <select value={u.role} onChange={(e) => changeRole(u, e.target.value)}>
                    {PERFIS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{u.ativo === false ? 'Bloqueado' : 'Ativo'}</td>
                <td>
                  <button type="button" className="btn ghost sm" onClick={() => toggleAtivo(u)}>
                    {u.ativo === false ? 'Reativar' : 'Bloquear'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
          Demos: comercial@ / financeiro@ / fiscal@ / producao@ / compras@ / expedicao@ / consulta@ —
          senha Demo@123. Preferir perfil de área no dia a dia; ADMIN só para parametrizar.
        </p>
      </section>
    </div>
  );
}
