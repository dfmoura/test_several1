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
  const noVol =
    v.qtde_volume != null
      ? formatDecimalBr(v.qtde_volume, 4, { stripTrailingZeros: true })
      : '—';
  return `${levar} ${v.unidade ?? ''}`.trim() + (noVol !== '—' ? ` · no volume ${noVol}` : '');
}

function TabelaVolumes({
  rows,
}: {
  rows: { key: string; local: string; volume: string; levar: string; validade: string }[];
}) {
  return (
    <table className="ficha-pick-table">
      <thead>
        <tr>
          <th className="ficha-pick-th-check" scope="col">
            Levado
          </th>
          <th scope="col">Local</th>
          <th scope="col">Volume</th>
          <th scope="col">Levar</th>
          <th scope="col">Validade</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key}>
            <td className="ficha-pick-td-check">
              <span className="ficha-pick-check" aria-hidden />
            </td>
            <td className="ficha-pick-local">{r.local}</td>
            <td className="ficha-pick-volume">{r.volume}</td>
            <td>{r.levar}</td>
            <td>{r.validade}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Folha que o almoxarifado leva na mão — volume a volume (FEFO).
 * Confirmar saída só na tela A buscar. Sem misturar com ficha-chao / materiais.
 */
export function EstoqueRetiradaFichaSheet({ op, empresaNome, emitidoPor, emitidoEm }: Props) {
  const linhas = opKitLinhasOrdenadas(op.materiais ?? []);

  return (
    <article
      className="ficha-sheet ficha-sheet-pick"
      aria-label={`A buscar · volumes da ordem ${op.codigo}`}
    >
      <header className="ficha-pick-head">
        <p className="ficha-pick-kicker">{empresaNome}</p>
        <p className="ficha-pick-doc">Estoque · A buscar</p>
        <h1>A buscar · volumes</h1>
        <p className="ficha-pick-ref">
          {op.codigo}
          {op.pedido?.codigo ? ` · ${op.pedido.codigo}` : ''}
          {op.parceiro?.razao_social ? ` · ${op.parceiro.razao_social}` : ''}
        </p>
        <p className="ficha-pick-destino">
          Pegue cada volume na prateleira e marque <strong>Levado</strong>. Sugestão FEFO.
          Confirmar saída só na tela A buscar tira o material do estoque.
        </p>
      </header>

      {linhas.length === 0 ? (
        <p className="ficha-pick-empty">Esta ordem ainda não tem kit — nada a buscar.</p>
      ) : (
        linhas.map((m, i) => {
          const estado = opKitEstado(m);
          const vols =
            estado === 'ja_saiu'
              ? (m.retirada?.volumes_baixados ?? [])
              : volumesParaEscolha(m).filter((v) => Number(v.qtde_retirar) > 0 || v.sugerido);
          const onde = opKitOnde(m);
          const jaSaiu = estado === 'ja_saiu';

          return (
            <section
              key={m.id}
              className={`ficha-pick-bloco ficha-pick-bloco--${estado}`}
            >
              <h2>
                <span>{i + 1}</span>
                {opKitNome(m)}
              </h2>
              <p className="ficha-pick-onde">{onde === '—' ? 'Sem local' : onde}</p>
              <p className="ficha-pick-meta">
                A ordem pede: {formatNecessidadeOp(m, op)} · {modoRetiradaLabel(modoRetirada(m))} ·{' '}
                {opKitEstadoLabel(estado)}
                {m.produto?.codigo ? ` · ${m.produto.codigo}` : ''}
                {jaSaiu ? ' · volumes já baixados no sistema' : ''}
              </p>

              {vols.length === 0 ? (
                estado === 'sem_estoque' ? (
                  <p className="ficha-pick-nota ficha-pick-nota--alerta">
                    Sem saldo para este material — repor ou escolher outro volume na tela.
                  </p>
                ) : jaSaiu ? (
                  <p className="ficha-pick-nota">
                    Saída confirmada sem detalhe de volume nesta lista.
                  </p>
                ) : (
                  <TabelaVolumes
                    rows={[
                      {
                        key: `${m.id}-saldo`,
                        local: 'Saldo',
                        volume: '—',
                        levar: formatNecessidadeOp(m, op),
                        validade: '—',
                      },
                    ]}
                  />
                )
              ) : (
                <TabelaVolumes
                  rows={vols.map((v, vi) => ({
                    key: `${m.id}-${v.lote_id ?? v.codigo ?? vi}`,
                    local: v.endereco?.codigo ?? '—',
                    volume: v.codigo ?? '—',
                    levar: qtdeVol(v),
                    validade: v.data_validade ? formatDate(v.data_validade) : '—',
                  }))}
                />
              )}
            </section>
          );
        })
      )}

      <footer className="ficha-pick-foot">
        <span>
          Uso interno · {op.codigo} · A buscar · volumes · emitida em{' '}
          {formatDateTime(emitidoEm.toISOString())} por {emitidoPor}
        </span>
        <TriggerAttribution
          variant="print"
          className="ficha-powered"
          logoClassName="ficha-trigger"
        />
      </footer>
    </article>
  );
}
