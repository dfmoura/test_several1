import { Link } from 'react-router-dom';
import { StatusPill } from './StatusPill';
import type { RastreioDocumento, RastreioInsumo } from '../lib/api';
import { formatDate, formatDecimalBr } from '../lib/format';
import { onAbrirFichaClick } from '../lib/fichaNav';
import {
  insumosComSaida,
  nfLabel,
  nomeFornecedor,
  temSaida,
} from '../lib/rastreioUi';

type Props = {
  rastreio: RastreioDocumento | null | undefined;
  printHref?: string;
  compact?: boolean;
};

function qty(value: string | number | null | undefined, unidade?: string | null): string {
  const body = formatDecimalBr(value, 4);
  if (body === '—') return '—';
  return unidade ? `${body} ${unidade}` : body;
}

function FornecedorCell({ ins }: { ins: RastreioInsumo }) {
  const origens = ins.lotes.flatMap((l) => l.origens);
  const compras = origens.filter((o) => o.tipo === 'ENTRADA_COMPRA');
  if (compras.length === 0) {
    return <span className="muted">{ins.observacao ?? 'Sem NF de fornecedor'}</span>;
  }
  return (
    <div>
      {compras.map((o, i) => (
        <div key={`${o.movimento_id ?? i}`}>
          <strong>{nomeFornecedor(o)}</strong>
          <div className="muted" style={{ fontSize: '0.85em' }}>
            NF {nfLabel(o)}
            {o.oc?.codigo ? ` · ${o.oc.codigo}` : ''}
            {o.nf_data ? ` · ${formatDate(o.nf_data)}` : ''}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RastreioInsumosPanel({ rastreio, printHref, compact }: Props) {
  if (!rastreio) return null;

  const linhas = insumosComSaida(rastreio);
  const resumo = rastreio.resumo;
  const saida = temSaida(rastreio);

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="card-body">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
          }}
        >
          <div className="form-section" style={{ marginBottom: 0 }}>
            <h3>Rastreio de insumos</h3>
            <p className="muted" style={{ margin: 0 }}>
              Lote, nota e fornecedor usados nesta produção. Serve para reportar qualidade mesmo
              com o produto já no cliente.
            </p>
          </div>
          {printHref && saida ? (
            <a
              href={printHref}
              className="btn btn-secondary"
              onClick={(e) => onAbrirFichaClick(e, printHref)}
            >
              Imprimir rastreio
            </a>
          ) : null}
        </div>

        {resumo ? (
          <div className="detail-meta" style={{ marginTop: '1rem' }}>
            <div>
              <span>Lotes</span>
              <strong>{resumo.lotes}</strong>
            </div>
            <div>
              <span>Notas</span>
              <strong>{resumo.notas}</strong>
            </div>
            <div>
              <span>Fornecedores</span>
              <strong>{resumo.fornecedores}</strong>
            </div>
            <div>
              <span>Pronto para o fornecedor</span>
              <strong>
                <StatusPill
                  status={resumo.pronto_para_fornecedor ? 'Sim' : 'Parcial'}
                />
              </strong>
            </div>
          </div>
        ) : null}

        {!saida ? (
          <p className="muted" style={{ marginTop: '1rem', marginBottom: 0 }}>
            Ainda não há saída de material. O rastro nasce na requisição (lote FEFO) e fica
            permanente depois da conclusão.
          </p>
        ) : (
          <div className="table-wrap" style={{ marginTop: '1rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Lote</th>
                  <th>Validade</th>
                  <th>Qtde líquida</th>
                  <th>Fornecedor / NF</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((ins) => {
                  const lotes = ins.lotes.filter((l) => l.lote);
                  if (lotes.length === 0) {
                    return (
                      <tr key={ins.material_id}>
                        <td>
                          <strong>{ins.produto?.codigo ?? '—'}</strong>
                          <div className="muted">{ins.produto?.descricao_fiscal}</div>
                        </td>
                        <td colSpan={2}>
                          <span className="muted">
                            {ins.sem_lote ? 'Sem controle de lote' : '—'}
                          </span>
                        </td>
                        <td>{qty(ins.qtde_liquida, ins.unidade)}</td>
                        <td>
                          <FornecedorCell ins={ins} />
                        </td>
                      </tr>
                    );
                  }
                  return lotes.map((l, idx) => (
                    <tr key={`${ins.material_id}-${l.lote?.id ?? idx}`}>
                      {idx === 0 ? (
                        <td rowSpan={lotes.length}>
                          <strong>{ins.produto?.codigo ?? '—'}</strong>
                          <div className="muted">{ins.produto?.descricao_fiscal}</div>
                          {l.lote_misto ? (
                            <div className="muted" style={{ fontSize: '0.85em' }}>
                              Lote misto — reporte as notas listadas
                            </div>
                          ) : null}
                        </td>
                      ) : null}
                      <td>
                        {l.lote?.codigo ?? '—'}
                        {l.lote?.id ? (
                          <div>
                            <Link
                              to={`/rastreio?q=${encodeURIComponent(l.lote.codigo)}`}
                              className="muted"
                              style={{ fontSize: '0.85em' }}
                            >
                              Ver usos
                            </Link>
                          </div>
                        ) : null}
                      </td>
                      <td>{l.lote?.data_validade ? formatDate(l.lote.data_validade) : '—'}</td>
                      {idx === 0 ? (
                        <td rowSpan={lotes.length}>{qty(ins.qtde_liquida, ins.unidade)}</td>
                      ) : null}
                      {idx === 0 ? (
                        <td rowSpan={lotes.length}>
                          <FornecedorCell ins={ins} />
                        </td>
                      ) : null}
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        )}

        {rastreio.tipo === 'LOTE' && (rastreio.consumos ?? []).length > 0 && !compact ? (
          <div className="table-wrap" style={{ marginTop: '1rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>OP</th>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Qtde</th>
                </tr>
              </thead>
              <tbody>
                {(rastreio.consumos ?? []).map((c) => (
                  <tr key={`${c.movimento.id}`}>
                    <td>
                      <Link to={`/ordens-producao/${c.op.id}`}>{c.op.codigo}</Link>
                    </td>
                    <td>
                      {c.pedido ? (
                        <Link to={`/pedidos/${c.pedido.id}`}>{c.pedido.codigo}</Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{c.cliente?.razao_social ?? '—'}</td>
                    <td>
                      {qty(c.qtde, c.unidade)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
