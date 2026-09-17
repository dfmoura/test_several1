import { FacaApresentacao } from './FacaApresentacao';
import { formatoLabel } from './FacaShapeIcon';
import {
  FacaSilhuetaReal,
  facaSilhuetaFromRecord,
} from './FacaSilhuetaReal';
import { TriggerAttribution } from './TriggerAttribution';
import { BRAND } from '../lib/brand';
import {
  agruparFacasPorMaquina,
  descricaoRecorteMapaFacas,
  facaDimensoesExibicao,
  type FacaMapaItem,
  type MapaFacasFichaFiltros,
} from '../lib/facasMapa';
import { facaPosicaoLabel, isFacaPosicao } from '../lib/facaPosicao';

function dash(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const s = String(value).trim();
  return s === '' ? '—' : s;
}

function fmtNum(v: number | null | undefined, d = 2): string {
  if (v == null) return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { maximumFractionDigits: d });
}

function formatDateTimeBr(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div className="ficha-kv">
      <span className="ficha-kv-label">{label}</span>
      <span className="ficha-kv-value">{value}</span>
    </div>
  );
}

function FichaFacaSilhuetaCell({ faca }: { faca: FacaMapaItem }) {
  const posLabel = isFacaPosicao(faca.posicao) ? facaPosicaoLabel(faca.posicao) : null;

  return (
    <div className="ficha-mapa-facas-silhueta">
      <FacaApresentacao
        className="ficha-mapa-facas-silhueta-visual"
        posicao={faca.posicao}
        size="compact"
        arrowWeight="fine"
        title={posLabel ? `Posição: ${posLabel}` : undefined}
      >
        <FacaSilhuetaReal
          {...facaSilhuetaFromRecord({
            formato: faca.formato,
            medida: faca.medida,
            largura_faca: faca.largura_faca,
            puxada: faca.puxada,
            diametro_cm: faca.diametro_cm,
            tamanho_tipo: faca.tamanho_tipo,
            colunas_mapa: faca.colunas_mapa,
            contorno_svg: faca.contorno_svg,
          })}
          size={28}
          variant="compact"
          showColunasBadge={false}
        />
      </FacaApresentacao>
    </div>
  );
}

export type MapasFacasFichaSheetProps = {
  items: FacaMapaItem[];
  totalApi: number;
  filtros: MapaFacasFichaFiltros;
  empresaNome: string;
  emitidoPor: string;
  emitidoEm: Date;
};

/**
 * Ficha operacional do mapa de facas — inventário por máquina, ordenado por N FACA.
 * Padrão visual das demais fichas (masthead · seções · tabela · atribuição).
 */
export function MapasFacasFichaSheet({
  items,
  totalApi,
  filtros,
  empresaNome,
  emitidoPor,
  emitidoEm,
}: MapasFacasFichaSheetProps) {
  const grupos = agruparFacasPorMaquina(items);
  const recorte = descricaoRecorteMapaFacas(filtros);
  const truncado = totalApi > items.length;

  return (
    <article className="ficha-sheet ficha-sheet-mapa-facas" aria-label="Ficha do mapa de facas">
      <header className="ficha-masthead">
        <div className="ficha-masthead-brand">
          <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} className="ficha-logo" />
          <div>
            <strong className="ficha-org">{empresaNome}</strong>
            <span className="ficha-doc-label">Ficha operacional · Mapa de facas</span>
          </div>
        </div>
        <div className="ficha-masthead-id">
          <span className="ficha-doc-code">MAPA-FACAS</span>
          <span className="ficha-doc-when">{formatDateTimeBr(emitidoEm)}</span>
        </div>
      </header>

      <div className="ficha-title-block">
        <div className="ficha-title-main">
          <h2 className="ficha-razao">Mapa de facas</h2>
          <p className="ficha-fantasia">
            Agrupado por máquina · ordenado por N FACA
          </p>
        </div>
        <div className="ficha-title-meta">
          <span className="ficha-chip ficha-chip-papel">
            {items.length} faca{items.length === 1 ? '' : 's'}
          </span>
          <span className="ficha-chip ficha-chip-muted">
            {grupos.length} máquina{grupos.length === 1 ? '' : 's'}
          </span>
          {filtros.soCompletas ? (
            <span className="ficha-chip ficha-chip-muted">Só completas</span>
          ) : null}
          {filtros.incluirInativas ? (
            <span className="ficha-chip ficha-chip-muted">Inclui inativas</span>
          ) : null}
        </div>
      </div>

      <div className="ficha-kv-strip">
        <Kv label="Recorte" value={recorte} />
        <Kv
          label="Facas listadas"
          value={truncado ? `${items.length} de ${totalApi}` : String(items.length)}
        />
        <Kv label="Máquinas" value={String(grupos.length)} />
        <Kv label="Emitido em" value={formatDateTimeBr(emitidoEm)} />
      </div>

      {truncado ? (
        <p className="ficha-note">
          Exibindo {items.length} de {totalApi} facas (limite da listagem). Refine os filtros
          na tela do mapa para imprimir o recorte completo.
        </p>
      ) : null}

      {grupos.length === 0 ? (
        <p className="ficha-empty">Nenhuma faca neste recorte.</p>
      ) : (
        grupos.map((g) => (
          <section
            key={g.maquina || '__sem__'}
            className="ficha-section ficha-mapa-facas-grupo"
          >
            <header className="ficha-mapa-facas-grupo-head">
              <span className="ficha-mapa-facas-grupo-eyebrow">Máquina</span>
              <h3 className="ficha-mapa-facas-grupo-title">{g.label}</h3>
              <span className="ficha-mapa-facas-grupo-count">
                {g.items.length} faca{g.items.length === 1 ? '' : 's'}
              </span>
            </header>
            <div className="ficha-section-body">
              <table className="ficha-table ficha-table-num ficha-mapa-facas-table">
                <thead>
                  <tr>
                    <th className="ficha-th-num ficha-mapa-facas-col-n">N FACA</th>
                    <th className="ficha-mapa-facas-col-silhueta">Silhueta</th>
                    <th className="ficha-th-num ficha-mapa-facas-col-largura">Largura</th>
                    <th className="ficha-th-num ficha-mapa-facas-col-tamanho">Tamanho</th>
                    <th className="ficha-mapa-facas-col-formato">Formato</th>
                    <th className="ficha-th-num ficha-mapa-facas-col-z">Z</th>
                    <th className="ficha-th-num ficha-mapa-facas-col-rep">Rep</th>
                    <th className="ficha-th-num ficha-mapa-facas-col-num">Puxada</th>
                    <th className="ficha-mapa-facas-col-cil">Cil.</th>
                    <th className="ficha-mapa-facas-col-cliente">Cliente</th>
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((f) => {
                    const cliente = dash(f.cliente_nota);
                    const dim = facaDimensoesExibicao(f);
                    return (
                      <tr
                        key={f.id}
                        className={!f.ativo ? 'ficha-mapa-facas-row-inativa' : undefined}
                      >
                        <td className="ficha-td-num">{dash(f.n_facas)}</td>
                        <td className="ficha-mapa-facas-silhueta-cell">
                          <FichaFacaSilhuetaCell faca={f} />
                        </td>
                        <td className="ficha-td-num ficha-mapa-facas-dim">{dim.largura}</td>
                        <td className="ficha-td-num ficha-mapa-facas-dim">
                          {dim.isDiametro && dim.tamanho !== '—'
                            ? `Ø ${dim.tamanho}`
                            : dim.tamanho}
                        </td>
                        <td className="ficha-mapa-facas-formato">{formatoLabel(f.formato)}</td>
                        <td className="ficha-td-num">{dash(f.z)}</td>
                        <td className="ficha-td-num">{fmtNum(f.repeticao, 8)}</td>
                        <td className="ficha-td-num">{fmtNum(f.puxada, 4)}</td>
                        <td>{dash(f.cilindro)}</td>
                        <td className="ficha-mapa-facas-cliente" title={cliente === '—' ? undefined : cliente}>
                          {cliente}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}

      <p className="ficha-note">
        Documento de consulta do ferramental · não altera o cadastro · N FACA = número da
        faca na máquina · silhueta com seta de posição no cilindro.
      </p>

      <footer className="ficha-footer">
        <span>
          Uso interno · mapa de facas · emitido por {emitidoPor}
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
