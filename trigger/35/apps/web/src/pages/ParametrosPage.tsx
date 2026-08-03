import { useEffect, useState } from 'react';
import { api, type Parametro, type ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';

export function ParametrosPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<Parametro[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void api
      .parametros(token)
      .then(setItems)
      .catch((e: ApiError) => setErro(e.message));
  }, [token]);

  return (
    <section className="page">
      <header className="page-header">
        <h1>Parâmetros</h1>
        <p className="muted">Sugestões oficiais com status de ratificação.</p>
      </header>
      {erro ? <p className="error">{erro}</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Chave</th>
              <th>Valor</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Descrição</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td className="mono">{p.chave}</td>
                <td className="mono">{p.valor}</td>
                <td>{p.tipo}</td>
                <td>
                  <span className={`badge ${badgeClass(p.statusRatificacao)}`}>
                    {p.statusRatificacao}
                  </span>
                </td>
                <td>{p.descricao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function badgeClass(status: string) {
  if (status === 'RATIFICADO') return 'ok';
  if (status === 'FIXO') return 'fixed';
  return 'pending';
}
