import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { DocStatusChip } from '../components/StatusChip';
import { formatDate, formatQty, getErrorMessage, producaoApi } from '../lib/api';
import { ETAPAS } from '../lib/stages';
import type { ApiRow } from '../types';

export function ProducaoPage() {
  const etapa = ETAPAS[4];
  const [lista, setLista] = useState<ApiRow[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [expandido, setExpandido] = useState<number | null>(null);

  async function carregar() {
    try {
      const rows = await producaoApi.list();
      setLista(rows as ApiRow[]);
    } catch (e) {
      setErro(getErrorMessage(e));
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function concluir(id: number) {
    setPending(true);
    setErro(null);
    try {
      await producaoApi.concluir(id);
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
        regra="Ao concluir: BAIXA_MP (consome empenho) + ENTRADA_SOBRA + ENTRADA_PA. Veja movimentos em Estoque."
      />

      {erro ? <p className="error">{erro}</p> : null}

      <p className="muted" style={{ marginBottom: '0.75rem' }}>
        Fluxo estoque:{' '}
        <Link to="/estoque">ver saldos e MOV</Link> ligados à OP (empenho → baixa MP → sobra → PA).
      </p>

      <section className="panel">
        <table className="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Tipo</th>
              <th>Descrição</th>
              <th>Qtd.</th>
              <th>Status</th>
              <th>Criado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lista.map((op) => {
              const status = String(op.status);
              const podeConcluir = status === 'ABERTA' || status === 'EM_ANDAMENTO';
              const id = op.id as number;
              const aptos = (op.apontamentos as ApiRow[]) ?? [];
              const aberto = expandido === id;
              return (
                <Fragment key={String(id)}>
                  <tr>
                    <td>{String(op.codigo)}</td>
                    <td>{String(op.tipo)}</td>
                    <td>{String(op.descricao)}</td>
                    <td>{formatQty(op.quantidade as number, 0)}</td>
                    <td>
                      <DocStatusChip status={status} />
                    </td>
                    <td>{formatDate(String(op.created_at))}</td>
                    <td>
                      <div className="btn-row">
                        {podeConcluir ? (
                          <button
                            type="button"
                            className="btn sm primary"
                            disabled={pending}
                            onClick={() => concluir(id)}
                          >
                            Concluir
                          </button>
                        ) : null}
                        <button type="button" className="btn sm" onClick={() => setExpandido(aberto ? null : id)}>
                          Apontamentos
                        </button>
                      </div>
                    </td>
                  </tr>
                  {aberto ? (
                    <tr>
                      <td colSpan={7}>
                        {aptos.length ? (
                          <ul className="queue-list">
                            {aptos.map((a, i) => (
                              <li key={i} className="queue-item">
                                <span>
                                  <strong>{String(a.evento)}</strong>
                                  {a.quantidade ? ` · qtd ${String(a.quantidade)}` : ''}
                                  {a.motivo ? ` · ${String(a.motivo)}` : ''}
                                </span>
                                <span className="muted">{formatDate(String(a.em))}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="muted">Sem apontamentos</p>
                        )}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
