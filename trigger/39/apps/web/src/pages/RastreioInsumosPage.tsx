import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { RastreioInsumosPanel } from '../components/RastreioInsumosPanel';
import { api, type RastreioDocumento, type RastreioHit } from '../lib/api';
import { onAbrirFichaClick } from '../lib/fichaNav';

export function RastreioInsumosPage() {
  const [params, setParams] = useSearchParams();
  const qInit = params.get('q') ?? '';
  const [q, setQ] = useState(qInit);
  const [hits, setHits] = useState<RastreioHit[]>([]);
  const [doc, setDoc] = useState<RastreioDocumento | null>(null);
  const [printHref, setPrintHref] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const buscar = async (termo: string) => {
    const t = termo.trim();
    setErr(null);
    setDoc(null);
    setPrintHref(null);
    if (t === '') {
      setHits([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get<{ data: { query: string; hits: RastreioHit[] } }>(
        `/rastreio?q=${encodeURIComponent(t)}`,
      );
      const list = res.data.hits ?? [];
      setHits(list);
      if (list.length === 1) {
        await abrirHit(list[0]);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha na busca.');
      setHits([]);
    } finally {
      setLoading(false);
    }
  };

  const abrirHit = async (hit: RastreioHit) => {
    setErr(null);
    setLoading(true);
    try {
      if (hit.tipo === 'OP') {
        const res = await api.get<{ data: RastreioDocumento }>(
          `/rastreio/ordens-producao/${hit.id}`,
        );
        setDoc(res.data);
        setPrintHref(`/ordens-producao/${hit.id}/rastreio`);
      } else if (hit.tipo === 'PED') {
        const res = await api.get<{ data: RastreioDocumento }>(`/rastreio/pedidos/${hit.id}`);
        setDoc(res.data);
        setPrintHref(`/pedidos/${hit.id}/rastreio`);
      } else if (hit.tipo === 'LOTE') {
        const res = await api.get<{ data: RastreioDocumento }>(`/rastreio/lotes/${hit.id}`);
        setDoc(res.data);
        setPrintHref(`/rastreio/lotes/${hit.id}/ficha`);
      } else if (hit.tipo === 'NF' && hit.lote_ids && hit.lote_ids.length > 0) {
        const res = await api.get<{ data: RastreioDocumento }>(
          `/rastreio/lotes/${hit.lote_ids[0]}`,
        );
        setDoc(res.data);
        setPrintHref(`/rastreio/lotes/${hit.lote_ids[0]}/ficha`);
      } else {
        setDoc(null);
        setPrintHref(null);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Não foi possível abrir o rastreio.');
      setDoc(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setQ(qInit);
    if (!qInit) {
      setHits([]);
      setDoc(null);
      setPrintHref(null);
      return;
    }
    void buscar(qInit);
    // qInit é a query da URL — a busca segue o endereço, não o campo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInit]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const t = q.trim();
    setParams(t ? { q: t } : {});
  };

  const hint = useMemo(
    () => 'OP, pedido, cliente, lote do fornecedor ou número da NF de entrada.',
    [],
  );

  return (
    <>
      <PageHeader
        title="Rastreio de insumos"
        description="Do pedido ou da OP até o lote, a nota e o fornecedor — mesmo com o produto já no cliente."
      />

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-body">
          <form onSubmit={onSubmit} className="toolbar" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 240, margin: 0 }}>
              <label htmlFor="rastreio-q">Buscar</label>
              <input
                id="rastreio-q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={hint}
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              Buscar
            </button>
          </form>
          <p className="muted" style={{ marginBottom: 0, marginTop: '0.75rem' }}>
            {hint} Relatório para CQ, SAC e compras reportarem ao fornecedor.
          </p>
        </div>
      </div>

      {err && <div className="alert alert-error">{err}</div>}
      {loading && <div className="loading">Buscando…</div>}

      {hits.length > 1 ? (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <div className="form-section">
              <h3>Resultados</h3>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Código</th>
                    <th>Detalhe</th>
                    <th className="acoes" />
                  </tr>
                </thead>
                <tbody>
                  {hits.map((h) => (
                    <tr key={`${h.tipo}-${h.id}`}>
                      <td>{h.tipo}</td>
                      <td>
                        <strong>{h.codigo}</strong>
                      </td>
                      <td>{h.rotulo}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => void abrirHit(h)}
                        >
                          Abrir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {doc ? (
        <>
          <div className="btn-row" style={{ marginBottom: '0.75rem' }}>
            {doc.op ? (
              <Link to={`/ordens-producao/${doc.op.id}`} className="btn btn-secondary">
                {doc.op.codigo}
              </Link>
            ) : null}
            {doc.pedido ? (
              <Link to={`/pedidos/${doc.pedido.id}`} className="btn btn-secondary">
                {doc.pedido.codigo}
              </Link>
            ) : null}
            {printHref ? (
              <a
                href={printHref}
                className="btn btn-secondary"
                onClick={(e) => onAbrirFichaClick(e, printHref)}
              >
                Imprimir rastreio
              </a>
            ) : null}
          </div>
          <RastreioInsumosPanel rastreio={doc} printHref={printHref ?? undefined} />
        </>
      ) : null}

      {!loading && qInit && hits.length === 0 && !doc ? (
        <div className="empty-state">Nenhum rastreio com este termo nesta empresa.</div>
      ) : null}
    </>
  );
}
