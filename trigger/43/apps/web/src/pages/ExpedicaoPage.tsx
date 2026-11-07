import { useEffect, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import { api, type EntregaFilaItem } from '../lib/api';
import { entStatusLabel, modoEntregaLabel } from '../lib/expedicaoUi';
import { pedStatusLabel } from '../lib/producaoUi';
import { useTableSort } from '../lib/useTableSort';

function activateRow(e: KeyboardEvent, go: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    go();
  }
}

function acaoLabel(item: EntregaFilaItem): string {
  if (item.acao === 'confirmar_retirada') return 'Confirmar retirada';
  if (item.acao === 'confirmar_entrega') return 'Confirmar entrega';
  if (item.acao === 'expedir') return item.modo === 'RETIRAR' ? 'Preparar retirada' : 'Despachar';
  return 'Ver pedido';
}

const SORT = {
  pedido: (r: EntregaFilaItem) => r.pedido_codigo,
  cliente: (r: EntregaFilaItem) => r.parceiro?.razao_social,
  saida: (r: EntregaFilaItem) => r.modo,
  situacao: (r: EntregaFilaItem) =>
    r.entrega ? entStatusLabel(r.entrega.status) : pedStatusLabel(r.pedido_status),
  romaneio: (r: EntregaFilaItem) => r.entrega?.codigo,
  passo: (r: EntregaFilaItem) => acaoLabel(r),
};

export function ExpedicaoPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<EntregaFilaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(rows, SORT);

  const load = async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await api.get<{ data: EntregaFilaItem[] }>('/entregas/fila');
      setRows(res.data);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar a fila de expedição.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <>
      <PageHeader
        title="Expedição"
        description="Pedidos faturados prontos para retirada no balcão ou para transporte. No romaneio: embalagem, nota e cobrança. Confirmar a entrega não baixa o título."
      />

      {erro ? <p className="form-error">{erro}</p> : null}

      <div className="card">
        {!loading && sorted.length > 0 ? (
          <div className="card-body" style={{ paddingBottom: 0 }}>
            <span className="form-hint">{sorted.length} pedido(s) na expedição desta EMP</span>
          </div>
        ) : null}
        <div className="table-wrap table-wrap--freeze">
          {loading ? (
            <div className="loading">Carregando…</div>
          ) : sorted.length === 0 ? (
            <div className="empty-state">
              Nenhum pedido na expedição. Fature o produzido — a fila aparece aqui em seguida.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <SortableTh column="pedido" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Pedido
                  </SortableTh>
                  <SortableTh column="cliente" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Cliente
                  </SortableTh>
                  <SortableTh column="saida" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Saída
                  </SortableTh>
                  <SortableTh
                    column="situacao"
                    sorts={sorts}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                  >
                    Situação
                  </SortableTh>
                  <SortableTh
                    column="romaneio"
                    sorts={sorts}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={requestSort}
                  >
                    Romaneio
                  </SortableTh>
                  <SortableTh column="passo" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                    Próximo passo
                  </SortableTh>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => {
                  const dest = row.entrega?.id
                    ? `/expedicao/${row.entrega.id}`
                    : `/expedicao/pedido/${row.pedido_id}`;
                  const go = () => navigate(dest);
                  return (
                    <tr
                      key={row.pedido_id}
                      className="clickable"
                      tabIndex={0}
                      role="link"
                      onClick={go}
                      onKeyDown={(e) => activateRow(e, go)}
                    >
                      <td>
                        <strong>{row.pedido_codigo}</strong>
                      </td>
                      <td>{row.parceiro?.razao_social ?? '—'}</td>
                      <td>
                        {modoEntregaLabel(row.modo)}
                        {row.destino_label ? (
                          <div className="muted" style={{ fontSize: '0.85em' }}>
                            {row.destino_label}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <StatusPill
                          status={
                            row.entrega
                              ? entStatusLabel(row.entrega.status)
                              : pedStatusLabel(row.pedido_status)
                          }
                        />
                      </td>
                      <td
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        {row.entrega?.id ? (
                          <Link to={`/expedicao/${row.entrega.id}`}>{row.entrega.codigo}</Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{acaoLabel(row)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
