import { useEffect, useState } from 'react';
import { api, type AuditItem, type ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';

export function AuditoriaPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<AuditItem[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void api
      .auditoria(token)
      .then(setItems)
      .catch((e: ApiError) => setErro(e.message));
  }, [token]);

  return (
    <section className="page">
      <header className="page-header">
        <h1>Auditoria</h1>
        <p className="muted">Quem / quando / entidade — trilha da empresa da sessão.</p>
      </header>
      {erro ? <p className="error">{erro}</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Quando</th>
              <th>Ação</th>
              <th>Entidade</th>
              <th>Usuário</th>
              <th>OK</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id}>
                <td className="mono">{new Date(a.ocorridoEm).toLocaleString('pt-BR')}</td>
                <td>{a.acao}</td>
                <td className="mono">
                  {a.entidade}
                  {a.entidadeId ? ` #${a.entidadeId.slice(0, 12)}` : ''}
                </td>
                <td>{a.usuario?.email ?? '—'}</td>
                <td>{a.sucesso ? 'sim' : 'não'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
