import { TriggerAttribution } from './TriggerAttribution';
import type { OrdemProducao, OpRetiradaVolume } from '../lib/api';
import { formatDate, formatDateTime, formatDecimalBr } from '../lib/format';
import {
  formatNecessidadeOp,
  modoRetirada,
  modoRetiradaLabel,
  opKitLinhasOrdenadas,
  volumesParaEscolha,
} from '../lib/producaoPick';
import { opKitEstado, opKitEstadoLabel, opKitNome, opKitOnde } from '../lib/producaoUi';

type Props = {
  op: OrdemProducao;
  empresaNome: string;
  emitidoPor: string;
  emitidoEm: Date;
};

function qtdeVol(v: OpRetiradaVolume): string {
  const levar = formatDecimalBr(v.qtde_retirar, 4, { stripTrailingZeros: true });
  const noVol = v.qtde_volume != null ? formatDecimalBr(v.qtde_volume, 4, { stripTrailingZeros: true }) : '—';
  return `${levar} ${v.unidade ?? ''}`.trim() + (noVol !== '—' ? ` · no volume ${noVol}` : '');
}

/**
 * Folha que o almoxarifado leva na mão para a etiqueta.
 * A ordem de flexo continua em /ordens-producao/:id/ficha.
 */
export function EstoqueRetiradaFichaSheet({ op, empresaNome, emitidoPor, emitidoEm }: Props) {
  const linhas = opKitLinhasOrdenadas(op.materiais ?? []);

  return (
    <article className="ficha-sheet ficha-sheet-pick">
      <header className="ficha-pick-head">
        <p className="ficha-pick-kicker">{empresaNome}</p>
        <h1>Retirada para produção</h1>
        <p className="ficha-pick-ref">
          {op.codigo}
          {op.pedido?.codigo ? ` · ${op.pedido.codigo}` : ''}
          {op.parceiro?.razao_social ? ` · ${op.parceiro.razao_social}` : ''}
        </p>
        <p className="ficha-pick-destino">
          Destino: máquina. Confirmar na tela A buscar tira o material do estoque.
        </p>
      </header>

      {linhas.length === 0 ? (
        <p>Esta ordem ainda não tem kit.</p>
      ) : (
        linhas.map((m, i) => {
          const estado = opKitEstado(m);
          const vols =
            estado === 'ja_saiu'
              ? (m.retirada?.volumes_baixados ?? [])
              : volumesParaEscolha(m).filter((v) => Number(v.qtde_retirar) > 0 || v.sugerido);
          const onde = opKitOnde(m);
          return (
            <section key={m.id} className="ficha-pick-bloco">
              <h2>
                <span>{i + 1}</span>
                {opKitNome(m)}
              </h2>
              <p className="ficha-pick-onde">{onde === '—' ? 'Sem local' : onde}</p>
              <p>
                A ordem pede: {formatNecessidadeOp(m, op)} · {modoRetiradaLabel(modoRetirada(m))} ·{' '}
                {opKitEstadoLabel(estado)}
                {m.produto?.codigo ? ` · ${m.produto.codigo}` : ''}
              </p>
              {vols.length === 0 ? (
                estado === 'sem_estoque' ? (
                  <p className="ficha-pick-nota">Sem saldo para este material.</p>
                ) : (
                  <table className="ficha-pick-table">
                    <thead>
                      <tr>
                        <th />
                        <th>Local</th>
                        <th>Volume</th>
                        <th>Levar</th>
                        <th>Validade</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <span className="ficha-pick-check" aria-hidden />
                        </td>
                        <td>Saldo</td>
                        <td>—</td>
                        <td>{formatNecessidadeOp(m, op)}</td>
                        <td>—</td>
                      </tr>
                    </tbody>
                  </table>
                )
              ) : (
                <table className="ficha-pick-table">
                  <thead>
                    <tr>
                      <th />
                      <th>Local</th>
                      <th>Volume</th>
                      <th>Levar</th>
                      <th>Validade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vols.map((v) => (
                      <tr key={`${m.id}-${v.lote_id ?? v.codigo}`}>
                        <td>
                          <span className="ficha-pick-check" aria-hidden />
                        </td>
                        <td>{v.endereco?.codigo ?? '—'}</td>
                        <td>{v.codigo ?? '—'}</td>
                        <td>{qtdeVol(v)}</td>
                        <td>{v.data_validade ? formatDate(v.data_validade) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          );
        })
      )}

      <footer className="ficha-pick-foot">
        <span>
          Emitida em {formatDateTime(emitidoEm.toISOString())} por {emitidoPor}
        </span>
        <TriggerAttribution variant="print" className="ficha-powered" logoClassName="ficha-trigger" />
      </footer>
    </article>
  );
}
