import { Fragment, useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { DocStatusChip } from '../components/StatusChip';
import { formatMoney, getErrorMessage, financeiroApi } from '../lib/api';
import { ETAPAS } from '../lib/stages';
import type { ApiRow } from '../types';

export function FinanceiroPage() {
  const etapa = ETAPAS[7];
  const [titulos, setTitulos] = useState<ApiRow[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [expandido, setExpandido] = useState<number | null>(null);

  async function carregar() {
    try {
      const rows = await financeiroApi.titulos();
      setTitulos(rows as ApiRow[]);
    } catch (e) {
      setErro(getErrorMessage(e));
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function baixar(id: number) {
    setPending(true);
    setErro(null);
    try {
      await financeiroApi.baixar(id);
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
              <th>Tipo</th>
              <th>Descrição</th>
              <th>Natureza</th>
              <th>Valor</th>
              <th>Aberto</th>
              <th>Vencimento</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {titulos.map((t) => {
              const status = String(t.status);
              const id = t.id as number;
              const cobrancas = (t.cobrancas as ApiRow[]) ?? [];
              const baixas = (t.baixas as ApiRow[]) ?? [];
              const aberto = expandido === id;
              return (
                <Fragment key={String(id)}>
                  <tr>
                    <td>{String(t.codigo)}</td>
                    <td>{String(t.tipo)}</td>
                    <td>{String(t.descricao)}</td>
                    <td>
                      <code>{String(t.natureza_codigo ?? '—')}</code>
                    </td>
                    <td>{formatMoney(t.valor as string | number)}</td>
                    <td>{formatMoney(t.valor_aberto as string | number)}</td>
                    <td>{String(t.vencimento ?? '—')}</td>
                    <td>
                      <DocStatusChip status={status} />
                    </td>
                    <td>
                      <div className="btn-row">
                        {status === 'ABERTO' || status === 'PARCIAL' ? (
                          <button
                            type="button"
                            className="btn sm primary"
                            disabled={pending}
                            onClick={() => baixar(id)}
                          >
                            Baixar
                          </button>
                        ) : null}
                        <button type="button" className="btn sm" onClick={() => setExpandido(aberto ? null : id)}>
                          {aberto ? 'Ocultar' : 'Detalhes'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {aberto ? (
                    <tr key={`${id}-det`}>
                      <td colSpan={9}>
                        <div className="grid-2">
                          <div>
                            <h4 className="panel-title">Cobranças</h4>
                            {cobrancas.length ? (
                              <ul className="queue-list">
                                {cobrancas.map((c) => (
                                  <li key={String(c.id)} className="queue-item">
                                    <span>
                                      {String(c.codigo)} — {String(c.status)}
                                      {c.linha_digitavel ? (
                                        <div className="muted" style={{ fontSize: '0.75rem' }}>
                                          {String(c.linha_digitavel)}
                                        </div>
                                      ) : null}
                                    </span>
                                    <span>{formatMoney(c.valor as string | number)}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="muted">Nenhuma cobrança</p>
                            )}
                          </div>
                          <div>
                            <h4 className="panel-title">Baixas / recebimento</h4>
                            {baixas.length ? (
                              <ul className="queue-list">
                                {baixas.map((b) => (
                                  <li key={String(b.id)} className="queue-item">
                                    <span>
                                      {String(b.codigo)} — {String(b.origem)}
                                    </span>
                                    <span>{formatMoney(b.valor as string | number)}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="muted">Nenhuma baixa</p>
                            )}
                          </div>
                        </div>
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
