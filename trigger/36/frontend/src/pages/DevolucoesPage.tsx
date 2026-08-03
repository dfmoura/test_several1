import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { DocStatusChip } from '../components/StatusChip';
import {
  devolucoesApi,
  formatMoney,
  getErrorMessage,
  pedidosApi,
} from '../lib/api';
import type { ApiRow } from '../types';

export function DevolucoesPage() {
  const [lista, setLista] = useState<ApiRow[]>([]);
  const [pedidos, setPedidos] = useState<ApiRow[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pedidoId, setPedidoId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [estado, setEstado] = useState('INTEGRO');

  async function carregar() {
    try {
      const [devs, peds] = await Promise.all([devolucoesApi.list(), pedidosApi.list()]);
      setLista(devs as ApiRow[]);
      setPedidos(
        (peds as ApiRow[]).filter((p) =>
          ['FATURADO', 'FATURADO_PARCIAL', 'ENTREGUE', 'ENCERRADO'].includes(String(p.status)),
        ),
      );
    } catch (e) {
      setErro(getErrorMessage(e));
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!pedidoId) return;
    setPending(true);
    setErro(null);
    try {
      await devolucoesApi.create({
        pedido_id: Number(pedidoId),
        motivo,
        estado_mercadoria: estado,
      });
      setMotivo('');
      setPedidoId('');
      await carregar();
    } catch (err) {
      setErro(getErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageHeader
        ordem={8}
        codigo="DEV"
        titulo="Devolução de venda"
        modo="HOMOLOGAVEL"
        regra="DEV-AAAA-NNNNN — fiscal + estoque ENTRADA_DEVOLUCAO + financeiro natureza 1.02.01. Não apaga NF/PED."
      />
      {erro ? <p className="error">{erro}</p> : null}

      <section className="panel">
        <h2 className="panel-title">Abrir devolução</h2>
        <form className="grid-2" onSubmit={criar}>
          <label>
            Pedido faturado
            <select required value={pedidoId} onChange={(e) => setPedidoId(e.target.value)}>
              <option value="">Selecione…</option>
              {pedidos.map((p) => (
                <option key={String(p.id)} value={String(p.id)}>
                  {String(p.codigo)} — {String(p.cliente_nome)} ({formatMoney(p.valor_total as number)})
                </option>
              ))}
            </select>
          </label>
          <label>
            Estado mercadoria
            <select value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="INTEGRO">Íntegro (volta estoque)</option>
              <option value="AVARIADO">Avariado (sem entrada PA)</option>
            </select>
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Motivo
            <textarea required rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </label>
          <div className="btn-row">
            <button type="submit" className="btn primary" disabled={pending}>
              Concluir DEV (HML)
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <table className="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Pedido</th>
              <th>Motivo</th>
              <th>Valor</th>
              <th>Natureza</th>
              <th>NF devolução</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted">
                  Nenhuma devolução — use um pedido FATURADO da jornada demo.
                </td>
              </tr>
            ) : (
              lista.map((d) => (
                <tr key={String(d.id)}>
                  <td>{String(d.codigo)}</td>
                  <td>#{String(d.pedido_id)}</td>
                  <td>{String(d.motivo)}</td>
                  <td>{formatMoney(d.valor as string | number)}</td>
                  <td>
                    <code>{String(d.natureza_codigo)}</code>
                  </td>
                  <td>{String(d.nf_devolucao_numero ?? '—')}</td>
                  <td>
                    <DocStatusChip status={String(d.status)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
