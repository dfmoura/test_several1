import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { DocStatusChip } from '../components/StatusChip';
import { formatDate, formatMoney, getErrorMessage, fiscalApi } from '../lib/api';
import { ETAPAS } from '../lib/stages';
import type { ApiRow } from '../types';

export function FiscalPage() {
  const etapa = ETAPAS[6];
  const [lista, setLista] = useState<ApiRow[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fiscalApi
      .list()
      .then((rows) => setLista(rows as ApiRow[]))
      .catch((e) => setErro(getErrorMessage(e)));
  }, []);

  return (
    <>
      <PageHeader
        ordem={etapa.ordem}
        codigo={etapa.codigo}
        titulo={etapa.titulo}
        modo={etapa.modo}
        regra={etapa.regra}
        actions={
          <Link to="/pedidos" className="btn">
            Faturar via pedidos
          </Link>
        }
      />

      <p className="muted">
        A emissão fiscal é acionada na tela de <Link to="/pedidos">Pedidos</Link> (botão Faturar). Esta lista
        mostra documentos já emitidos ou simulados.
      </p>

      {erro ? <p className="error">{erro}</p> : null}

      <section className="panel">
        <table className="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Pedido</th>
              <th>Tipo</th>
              <th>Número</th>
              <th>Status</th>
              <th>Valor</th>
              <th>Emitido</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((d) => (
              <tr key={String(d.id)}>
                <td>{String(d.codigo)}</td>
                <td>{d.pedido_id != null ? `#${d.pedido_id}` : '—'}</td>
                <td>{String(d.tipo)}</td>
                <td>{String(d.numero ?? '—')}</td>
                <td>
                  <DocStatusChip status={String(d.status)} />
                </td>
                <td>{formatMoney(d.valor_total as string | number)}</td>
                <td>{formatDate(String(d.created_at))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
