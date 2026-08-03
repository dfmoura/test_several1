import { useEffect, useState } from 'react';
import {
  api,
  type ApiError,
  type OrdemTrabalho,
  type Produto,
} from '../../lib/api';
import { useAuth } from '../../lib/auth';

export function ProducaoPage() {
  const { token } = useAuth();
  const [ordens, setOrdens] = useState<OrdemTrabalho[]>([]);
  const [mps, setMps] = useState<Produto[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [mpPorOp, setMpPorOp] = useState<Record<string, string>>({});

  async function load() {
    if (!token) return;
    try {
      const [o, produtos] = await Promise.all([
        api.ordens(token),
        api.produtos(token, { familia: 'MP' }),
      ]);
      setOrdens(o);
      setMps(produtos);
      setErro(null);
    } catch (e) {
      setErro((e as ApiError).message);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function run(label: string, fn: () => Promise<unknown>) {
    try {
      await fn();
      setOkMsg(label);
      setErro(null);
      await load();
    } catch (e) {
      setErro((e as ApiError).message);
      setOkMsg(null);
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Produção</h1>
        <p className="muted">
          M03 · OP (PRODUCAO) / OS (SERVICO) · consumo MP → retorno PA → concluir
        </p>
      </header>
      {erro ? <p className="error">{erro}</p> : null}
      {okMsg ? <p className="callout">{okMsg}</p> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Tipo</th>
              <th>PED</th>
              <th>Item</th>
              <th>Status</th>
              <th>Apont./PA</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {ordens.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted">
                  Nenhuma OP/OS — abra em Pedidos (item PRODUCAO ou SERVICO)
                </td>
              </tr>
            ) : (
              ordens.map((o) => (
                <tr key={`${o.tipo}-${o.id}`}>
                  <td className="mono">{o.codigo}</td>
                  <td>{o.tipo}</td>
                  <td className="mono">{o.pedido.codigo}</td>
                  <td>
                    <span className="mono">{o.item.produtoCodigo ?? '—'}</span>
                    <div className="muted">{o.item.descricao}</div>
                  </td>
                  <td>{o.status}</td>
                  <td className="mono">
                    {o.quantidadeApontada}
                    {o.tipo === 'OP' ? ` / PA ${o.quantidadePaRetornada}` : ''}
                  </td>
                  <td>
                    {['ABERTA', 'EM_ANDAMENTO'].includes(o.status) ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() =>
                            void run('Apontado', () =>
                              o.tipo === 'OP'
                                ? api.apontarOp(token!, o.id, o.quantidadePlanejada)
                                : api.apontarOs(token!, o.id, o.quantidadePlanejada),
                            )
                          }
                        >
                          Apontar plano
                        </button>
                        {o.tipo === 'OP' ? (
                          <>
                            <select
                              value={mpPorOp[o.id] ?? ''}
                              onChange={(e) =>
                                setMpPorOp({ ...mpPorOp, [o.id]: e.target.value })
                              }
                            >
                              <option value="">MP…</option>
                              {mps.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.codigo}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btn ghost"
                              disabled={!mpPorOp[o.id]}
                              onClick={() =>
                                void run('Consumo MP', () =>
                                  api.consumirMp(token!, o.id, mpPorOp[o.id], '1.0000'),
                                )
                              }
                            >
                              Consumir 1 MP
                            </button>
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() =>
                                void run('Retorno PA', () =>
                                  api.retornarPa(
                                    token!,
                                    o.id,
                                    o.quantidadePlanejada,
                                    '95.0000',
                                  ),
                                )
                              }
                            >
                              Retornar PA
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          className="btn"
                          onClick={() =>
                            void run('Concluída', () =>
                              o.tipo === 'OP'
                                ? api.concluirOp(token!, o.id)
                                : api.concluirOs(token!, o.id),
                            )
                          }
                        >
                          Concluir
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
