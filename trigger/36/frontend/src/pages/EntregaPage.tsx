import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { DocStatusChip } from '../components/StatusChip';
import { formatDate, getErrorMessage, entregaApi } from '../lib/api';
import { ETAPAS } from '../lib/stages';
import type { ApiRow } from '../types';

export function EntregaPage() {
  const etapa = ETAPAS[8];
  const [lista, setLista] = useState<ApiRow[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function carregar() {
    try {
      const rows = await entregaApi.list();
      setLista(rows as ApiRow[]);
    } catch (e) {
      setErro(getErrorMessage(e));
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function confirmar(id: number) {
    setPending(true);
    setErro(null);
    try {
      await entregaApi.confirmar(id);
      await carregar();
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageHeader
        ordem={etapa.ordem}
        codigo={etapa.codigo}
        titulo={etapa.titulo}
        modo={etapa.modo}
        regra={etapa.regra}
      />

      {erro ? <p className="error">{erro}</p> : null}

      <section className="panel">
        <table className="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Pedido</th>
              <th>Status</th>
              <th>Volumes</th>
              <th>Transportadora</th>
              <th>Expedida</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lista.map((e) => {
              const status = String(e.status);
              return (
                <tr key={String(e.id)}>
                  <td>{String(e.codigo)}</td>
                  <td>{e.pedido_id != null ? `#${e.pedido_id}` : '—'}</td>
                  <td>
                    <DocStatusChip status={status} />
                  </td>
                  <td>{String(e.volumes ?? '—')}</td>
                  <td>{String(e.transportadora ?? '—')}</td>
                  <td>{formatDate(String(e.expedida_em ?? e.created_at))}</td>
                  <td>
                    {status !== 'CONFIRMADA' ? (
                      <button
                        type="button"
                        className="btn sm primary"
                        disabled={pending}
                        onClick={() => confirmar(e.id as number)}
                      >
                        Confirmar
                      </button>
                    ) : (
                      <span className="muted">{formatDate(String(e.confirmada_em))}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
