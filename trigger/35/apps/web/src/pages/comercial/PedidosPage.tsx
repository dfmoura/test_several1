import { Fragment, useEffect, useState } from 'react';
import { api, type ApiError, type Pedido } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export function PedidosPage() {
  const { token, usuario } = useAuth();
  const [items, setItems] = useState<Pedido[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const podeCredito = usuario?.permissoes.includes('fin.credito.alterar');
  const podeEstoque = usuario?.permissoes.includes('est.movimento.escrever');
  const podeOp = usuario?.permissoes.includes('prd.op.operar');
  const podeEntrega = usuario?.permissoes.includes('com.pedido.escrever');

  async function load() {
    if (!token) return;
    try {
      setItems(await api.pedidos(token));
      setErro(null);
    } catch (e) {
      setErro((e as ApiError).message);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function liberar(id: string) {
    if (!token) return;
    try {
      await api.liberarCredito(token, id, 'Liberação homologação');
      setOkMsg(null);
      await load();
    } catch (e) {
      setErro((e as ApiError).message);
    }
  }

  async function separar(pedidoId: string, itemId: string) {
    if (!token) return;
    try {
      const r = await api.separarItem(token, pedidoId, itemId);
      setOkMsg(
        `${r.movimento.codigo} · ${r.pedidoCodigo} → ${r.pedidoStatus} · sep ${r.quantidadeSeparadaAgora}`,
      );
      setErro(null);
      await load();
    } catch (e) {
      setErro((e as ApiError).message);
      setOkMsg(null);
    }
  }

  async function abrirOrdem(pedidoId: string, itemId: string, tipo: string) {
    if (!token) return;
    try {
      const o =
        tipo === 'SERVICO'
          ? await api.abrirOs(token, pedidoId, itemId)
          : await api.abrirOp(token, pedidoId, itemId);
      setOkMsg(`${o.codigo} aberta · ${o.status}`);
      setErro(null);
      await load();
    } catch (e) {
      setErro((e as ApiError).message);
      setOkMsg(null);
    }
  }

  async function entregar(pedidoId: string) {
    if (!token) return;
    try {
      const e = await api.registrarEntrega(token, pedidoId, {
        volumes: 1,
        confirmarAgora: true,
      });
      setOkMsg(`${e.codigo} · PED ${e.pedido.status}`);
      setErro(null);
      await load();
    } catch (e) {
      setErro((e as ApiError).message);
      setOkMsg(null);
    }
  }

  const statusAcao = ['LIBERADO', 'EM_SEPARACAO', 'EM_PRODUCAO', 'FATURADO', 'FATURADO_PARCIAL'];

  return (
    <section className="page">
      <header className="page-header">
        <h1>Pedidos</h1>
        <p className="muted">
          Crédito → LIBERADO · OP/OS (PROD/SVC) · Separar só REVENDA
        </p>
      </header>
      {erro ? <p className="error">{erro}</p> : null}
      {okMsg ? <p className="callout">{okMsg}</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>ORC</th>
              <th>Cliente</th>
              <th>Status</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <Fragment key={p.id}>
                <tr>
                  <td className="mono">{p.codigo}</td>
                  <td className="mono">
                    {p.orcamentoCodigo} v{p.orcamentoVersao}
                  </td>
                  <td>{p.parceiro.razaoSocial}</td>
                  <td>{p.status}</td>
                  <td className="mono">R$ {p.valorTotal}</td>
                  <td>
                    {podeCredito && ['AGUARDA_CREDITO', 'NOVO'].includes(p.status) ? (
                      <button type="button" className="btn" onClick={() => void liberar(p.id)}>
                        Liberar crédito
                      </button>
                    ) : null}
                    {podeEntrega &&
                    ['FATURADO', 'FATURADO_PARCIAL'].includes(p.status) ? (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => void entregar(p.id)}
                      >
                        Confirmar entrega
                      </button>
                    ) : null}
                  </td>
                </tr>
                {statusAcao.includes(p.status) && (p.itens ?? []).length > 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="muted" style={{ marginBottom: 6 }}>
                        Itens
                      </div>
                      {(p.itens ?? []).map((i) => (
                        <div
                          key={i.id}
                          style={{
                            display: 'flex',
                            gap: 12,
                            alignItems: 'center',
                            marginBottom: 6,
                            flexWrap: 'wrap',
                          }}
                        >
                          <span className="mono">
                            #{i.sequencia} {i.produtoCodigo ?? '—'} · {i.tipoItem} ·{' '}
                            {i.quantidade} {i.unidadeCodigo}
                          </span>
                          {podeOp && i.tipoItem === 'PRODUCAO' ? (
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => void abrirOrdem(p.id, i.id, 'PRODUCAO')}
                            >
                              Abrir OP
                            </button>
                          ) : null}
                          {podeOp && i.tipoItem === 'SERVICO' ? (
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => void abrirOrdem(p.id, i.id, 'SERVICO')}
                            >
                              Abrir OS
                            </button>
                          ) : null}
                          {podeEstoque && i.tipoItem === 'REVENDA' ? (
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => void separar(p.id, i.id)}
                            >
                              Separar
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
