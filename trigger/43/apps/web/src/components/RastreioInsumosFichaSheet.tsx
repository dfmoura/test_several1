import { FichaKv, FichaSection } from './ProducaoFichaBlocks';
import { RegistroMetaStrip } from './RegistroMetaStrip';
import { TriggerAttribution } from './TriggerAttribution';
import type { RastreioDocumento } from '../lib/api';
import { BRAND } from '../lib/brand';
import { formatDate, formatDateTime, formatDecimalBr } from '../lib/format';
import {
  insumosComSaida,
  nfLabel,
  nomeFornecedor,
  origemTipoLabel,
} from '../lib/rastreioUi';
import { formatDateTimeBr } from '../lib/producaoFicha';

type Props = {
  rastreio: RastreioDocumento;
  empresaNome: string;
  emitidoPor: string;
  emitidoEm: Date;
};

function qty(value: string | number | null | undefined, unidade?: string | null): string {
  const body = formatDecimalBr(value, 4);
  if (body === '—') return '—';
  return unidade ? `${body} ${unidade}` : body;
}

export function RastreioFichaSection({ rastreio }: { rastreio: RastreioDocumento }) {
  const linhas = insumosComSaida(rastreio);
  const consumos = rastreio.consumos ?? [];

  if (linhas.length === 0 && consumos.length === 0) {
    return (
      <FichaSection title="Rastreio de insumos">
        <p className="ficha-empty">
          Sem saída de material. O rastro (lote, NF, fornecedor) nasce na requisição da OP.
        </p>
      </FichaSection>
    );
  }

  return (
    <FichaSection title="Rastreio de insumos (lote · NF · fornecedor)">
      {linhas.length > 0 ? (
        <table className="ficha-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Lote</th>
              <th>Validade</th>
              <th>Qtde</th>
              <th>Fornecedor</th>
              <th>NF</th>
              <th>OC</th>
            </tr>
          </thead>
          <tbody>
            {linhas.flatMap((ins) => {
              const lotes = ins.lotes.length > 0 ? ins.lotes : [null];
              return lotes.flatMap((l, li) => {
                const origens =
                  l && l.origens.length > 0
                    ? l.origens
                    : [null];
                return origens.map((o, oi) => (
                  <tr key={`${ins.material_id}-${li}-${oi}`}>
                    <td>
                      {ins.produto
                        ? `${ins.produto.codigo} — ${ins.produto.descricao_fiscal}`
                        : '—'}
                      {ins.sem_lote ? ' · sem lote' : ''}
                    </td>
                    <td>{l?.lote?.codigo ?? '—'}</td>
                    <td>
                      {l?.lote?.data_validade ? formatDate(l.lote.data_validade) : '—'}
                    </td>
                    <td>
                      {li === 0 && oi === 0 ? qty(ins.qtde_liquida, ins.unidade) : ''}
                    </td>
                    <td>{o ? nomeFornecedor(o) : ins.observacao ?? '—'}</td>
                    <td>
                      {o ? (
                        <>
                          {nfLabel(o)}
                          {o.tipo && o.tipo !== 'ENTRADA_COMPRA'
                            ? ` · ${origemTipoLabel(o.tipo)}`
                            : ''}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{o?.oc?.codigo ?? '—'}</td>
                  </tr>
                ));
              });
            })}
          </tbody>
        </table>
      ) : null}

      {consumos.length > 0 ? (
        <table className="ficha-table" style={{ marginTop: linhas.length > 0 ? '0.75rem' : 0 }}>
          <thead>
            <tr>
              <th>OP</th>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Qtde</th>
            </tr>
          </thead>
          <tbody>
            {consumos.map((c) => (
              <tr key={c.movimento.id}>
                <td>{c.op.codigo}</td>
                <td>{c.pedido?.codigo ?? '—'}</td>
                <td>{c.cliente?.razao_social ?? '—'}</td>
                <td>{qty(c.qtde, c.unidade)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {rastreio.resumo?.sem_rastro_fornecedor ? (
        <p className="ficha-note" style={{ marginTop: '0.75rem' }}>
          {rastreio.resumo.sem_rastro_fornecedor} insumo(s) sem NF unívoca (SKU sem lote ou lote
          de abertura/ajuste). Não inventar fornecedor.
        </p>
      ) : null}
    </FichaSection>
  );
}

export function RastreioInsumosFichaSheet({
  rastreio,
  empresaNome,
  emitidoPor,
  emitidoEm,
}: Props) {
  const titulo =
    rastreio.tipo === 'LOTE'
      ? `Lote ${rastreio.lote?.codigo ?? ''}`
      : rastreio.op?.codigo ?? rastreio.pedido?.codigo ?? 'Rastreio';
  const sub =
    rastreio.tipo === 'LOTE'
      ? [rastreio.produto?.codigo, rastreio.produto?.descricao_fiscal].filter(Boolean).join(' — ')
      : [rastreio.pedido?.codigo, rastreio.cliente?.razao_social].filter(Boolean).join(' · ');

  return (
    <article className="ficha-sheet" aria-label={`Rastreio de insumos ${titulo}`}>
      <header className="ficha-masthead">
        <div className="ficha-masthead-brand">
          <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} className="ficha-logo" />
          <div>
            <strong className="ficha-org">{empresaNome}</strong>
            <span className="ficha-doc-label">Rastreio de insumos · lote / NF / fornecedor</span>
          </div>
        </div>
        <div className="ficha-masthead-id">
          <span className="ficha-doc-code">{titulo}</span>
          <span className="ficha-doc-when">{formatDateTimeBr(emitidoEm)}</span>
        </div>
      </header>

      <div className="ficha-title-block">
        <div className="ficha-title-main">
          <h2 className="ficha-razao">{titulo}</h2>
          <p className="ficha-fantasia">{sub || '—'}</p>
        </div>
      </div>

      <div className="ficha-kv-strip">
        <FichaKv label="Pedido" value={rastreio.pedido?.codigo ?? '—'} />
        <FichaKv
          label="Cliente"
          value={rastreio.cliente?.razao_social ?? '—'}
        />
        <FichaKv label="OP" value={rastreio.op?.codigo ?? (rastreio.ops?.map((o) => o.op.codigo).join(', ') || '—')} />
        <FichaKv
          label="Concluída"
          value={rastreio.op?.concluida_em ? formatDateTime(rastreio.op.concluida_em) : '—'}
        />
      </div>

      <RastreioFichaSection rastreio={rastreio} />

      <p className="ficha-note">
        <strong>Uso interno</strong> — genealogia para reportar qualidade ao fornecedor (estudo 32
        · CONTROLE_ESTOQUE §6). Sem preço de venda. Origem da NF limitada ao instante da saída da
        OP.
      </p>

      <RegistroMetaStrip
        registro={{ created_at: rastreio.op?.concluida_em ?? null }}
        className="ficha-autoria"
      />

      <footer className="ficha-footer">
        <span>Uso interno · rastreio de insumos · emitido por {emitidoPor}</span>
        <TriggerAttribution
          variant="print"
          className="ficha-powered"
          logoClassName="ficha-trigger"
        />
      </footer>
    </article>
  );
}
