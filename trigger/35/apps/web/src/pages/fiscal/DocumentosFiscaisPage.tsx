import { useEffect, useState } from 'react';
import { api, type ApiError, type DocumentoFiscal, type Pedido } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export function DocumentosFiscaisPage() {
  const { token, usuario } = useAuth();
  const [docs, setDocs] = useState<DocumentoFiscal[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoId, setPedidoId] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const podeEmitir = usuario?.permissoes.includes('fis.nf.emitir');
  const podeCancelar = usuario?.permissoes.includes('fis.nf.cancelar');

  async function load() {
    if (!token) return;
    try {
      const [d, p] = await Promise.all([
        api.documentosFiscais(token),
        api.pedidos(token).catch(() => [] as Pedido[]),
      ]);
      setDocs(d);
      setPedidos(
        p.filter((x) =>
          ['LIBERADO', 'EM_PRODUCAO', 'EM_SEPARACAO', 'FATURADO_PARCIAL', 'FATURADO'].includes(
            x.status,
          ),
        ),
      );
      setErro(null);
    } catch (e) {
      setErro((e as ApiError).message);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function emitir() {
    if (!token || !pedidoId) return;
    try {
      const ped = pedidos.find((p) => p.id === pedidoId);
      const itens = ped?.itens ?? [];
      const merc = itens.filter((i) => i.tipoItem !== 'SERVICO').map((i) => i.id);
      const svc = itens.filter((i) => i.tipoItem === 'SERVICO').map((i) => i.id);
      const emits: string[] = [];
      if (merc.length && svc.length) {
        const a = await api.emitirNf(token, { pedidoId, pedidoItemIds: merc });
        const b = await api.emitirNf(token, { pedidoId, pedidoItemIds: svc });
        emits.push(a.codigo, b.codigo);
      } else {
        const doc = await api.emitirNf(token, {
          pedidoId,
          pedidoItemIds: merc.length ? merc : svc.length ? svc : undefined,
        });
        emits.push(doc.codigo);
      }
      setOkMsg(`${emits.join(' + ')} · TIT não gerado (M06)`);
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
        <h1>Documentos fiscais</h1>
        <p className="muted">
          M05 · Focus adapter stub · NF ≠ TIT · idempotência na emissão
        </p>
      </header>
      {erro ? <p className="error">{erro}</p> : null}
      {okMsg ? <p className="callout">{okMsg}</p> : null}

      {podeEmitir ? (
        <form
          className="panel-form"
          onSubmit={(e) => {
            e.preventDefault();
            void emitir();
          }}
        >
          <h2>Emitir NF (pedido com itens aptos)</h2>
          <div className="form-grid">
            <label>
              Pedido
              <select
                required
                value={pedidoId}
                onChange={(e) => setPedidoId(e.target.value)}
              >
                <option value="">Selecione…</option>
                {pedidos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo} · {p.status} · {p.parceiro.razaoSocial}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" className="btn">
            Emitir via Focus (stub)
          </button>
        </form>
      ) : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Tipo</th>
              <th>PED</th>
              <th>Status</th>
              <th>Série/Nº</th>
              <th>Chave</th>
              <th>Total</th>
              <th>TIT?</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {docs.length === 0 ? (
              <tr>
                <td colSpan={9} className="muted">
                  Nenhum documento fiscal
                </td>
              </tr>
            ) : (
              docs.map((d) => (
                <tr key={d.id}>
                  <td className="mono">{d.codigo}</td>
                  <td>{d.tipo}</td>
                  <td className="mono">{d.pedido.codigo}</td>
                  <td>{d.status}</td>
                  <td className="mono">
                    {d.serie ?? '—'}/{d.numero ?? '—'}
                  </td>
                  <td className="mono" style={{ fontSize: '0.75rem' }}>
                    {d.chave44 ?? '—'}
                  </td>
                  <td className="mono">R$ {d.valorTotal}</td>
                  <td>{d.tituloGerado ? 'sim' : 'não'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={async () => {
                          if (!token) return;
                          try {
                            const a = await api.artefatosNf(token, d.id);
                            setOkMsg(`XML ${a.xmlRef ?? '—'} · PDF ${a.pdfRef ?? '—'}`);
                          } catch (e) {
                            setErro((e as ApiError).message);
                          }
                        }}
                      >
                        Artefatos
                      </button>
                      {podeCancelar && d.status === 'AUTORIZADA' ? (
                        <>
                          <button
                            type="button"
                            className="btn ghost"
                            onClick={async () => {
                              if (!token) return;
                              try {
                                const r = await api.cancelarNf(token, d.id, {
                                  justificativa: 'Cancelamento homologacao ERP RLP',
                                  idempotencyKey: `ui-canc-${d.id}`,
                                });
                                setOkMsg(`${r.codigo} cancelada`);
                                await load();
                              } catch (e) {
                                setErro((e as ApiError).message);
                              }
                            }}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            className="btn ghost"
                            onClick={async () => {
                              if (!token) return;
                              try {
                                await api.emitirCce(token, d.id, {
                                  correcao: 'Correcao texto complementar homologacao',
                                  idempotencyKey: `ui-cce-${d.id}`,
                                });
                                setOkMsg(`CC-e emitida ${d.codigo}`);
                                await load();
                              } catch (e) {
                                setErro((e as ApiError).message);
                              }
                            }}
                          >
                            CC-e
                          </button>
                        </>
                      ) : null}
                    </div>
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
