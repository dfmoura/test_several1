import { useEffect, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { StatusPill } from '../components/StatusPill';
import { api, type EntregaFilaItem } from '../lib/api';
import { entStatusLabel, modoEntregaLabel } from '../lib/expedicaoUi';
import { pedStatusLabel } from '../lib/producaoUi';

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

export function ExpedicaoPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<EntregaFilaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

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
        description="Pedidos faturados prontos para retirada no balcão ou para transporte. A cobrança já existe — confirmar a entrega não baixa o título."
      />

      {erro ? <p className="form-error">{erro}</p> : null}

      <div className="card">
        {!loading && rows.length > 0 ? (
          <div className="card-body" style={{ paddingBottom: 0 }}>
            <span className="form-hint">{rows.length} pedido(s) na expedição desta EMP</span>
          </div>
        ) : null}
        <div className="table-wrap table-wrap--freeze">
          {loading ? (
            <div className="loading">Carregando…</div>
          ) : rows.length === 0 ? (
            <div className="empty-state">
              Nenhum pedido na expedição. Fature o produzido — a fila aparece aqui em seguida.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Saída</th>
                  <th>Situação</th>
                  <th>Romaneio</th>
                  <th>Próximo passo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const dest = row.entrega?.id
                    ? `/expedicao/${row.entrega.id}`
                    : `/pedidos/${row.pedido_id}`;
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
