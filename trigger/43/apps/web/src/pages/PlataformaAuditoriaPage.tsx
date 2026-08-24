import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { api, type PlataformaAuditoriaItem } from '../lib/api';
import { formatDateTime } from '../lib/format';

export function PlataformaAuditoriaPage() {
  const [rows, setRows] = useState<PlataformaAuditoriaItem[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const load = useCallback(() => {
    setErro(null);
    void api
      .plataformaAuditoria()
      .then((res) => setRows(res.data))
      .catch((e: unknown) => setErro(e instanceof Error ? e.message : 'Falha ao carregar auditoria.'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Auditoria operacional"
        description="Ações do console TRIGGER (consulta de conta e provisionamento de operador)."
      />

      {erro ? (
        <div className="alert alert-error" role="alert">
          {erro}
        </div>
      ) : null}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Quando</th>
              <th>Operador</th>
              <th>Ação</th>
              <th>Alvo</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty-cell">
                  Nenhuma ação do console ainda.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>{formatDateTime(r.created_at)}</td>
                  <td>
                    {r.user ? (
                      <>
                        {r.user.name}
                        <div className="table-muted">{r.user.email}</div>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{r.acao}</td>
                  <td>
                    {r.entidade}
                    {r.entidade_id ? ` #${r.entidade_id}` : ''}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
