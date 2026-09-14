import { useMemo } from 'react';
import type { EstoqueSaldo, EstoqueSaldoVolumePorQtde } from '../lib/api';
import {
  coincideBusca,
  ESTOQUE_FAMILIAS_ORDEM,
  estoqueGrupoCodigo,
  formatValorPosicao,
  textoBusca,
} from '../lib/estoqueUi';
import { familiaLabel, formatQty, formatQtyCompact } from '../lib/format';
import { formatVolumeDimensao } from '../lib/volumeEtiquetaPrint';

type Props = {
  saldos: EstoqueSaldo[];
  q: string;
  familia: string;
  grupo: string;
  soComVolumes: boolean;
  onFamiliaChange: (familia: string) => void;
  onGrupoChange: (grupo: string) => void;
  onSoComVolumesChange: (value: boolean) => void;
};

type LinhaConsolidado = {
  key: string;
  saldo: EstoqueSaldo;
  faixa: EstoqueSaldoVolumePorQtde | null;
};

/** Subtotal de apresentação: qtde da faixa × N volumes (não altera saldo oficial). */
function subtotalFaixa(qtde: string, volumes: number): string {
  const n = Number(qtde) * volumes;
  if (!Number.isFinite(n)) return '—';
  return formatQty(n);
}

function produtoNome(s: EstoqueSaldo): string {
  return (
    s.produto?.descricao_comercial?.trim() ||
    s.produto?.descricao_fiscal?.trim() ||
    ''
  );
}

function ordenaSaldos(a: EstoqueSaldo, b: EstoqueSaldo): number {
  const ca = a.produto?.codigo ?? '';
  const cb = b.produto?.codigo ?? '';
  return ca.localeCompare(cb, 'pt-BR', { numeric: true, sensitivity: 'base' });
}

/**
 * Visão Excel do chão: família → grupo → uma linha por faixa consolidada,
 * com código + nome do produto no início. Densidade máxima, só leitura.
 */
export function EstoqueConsolidadoPanel({
  saldos,
  q,
  familia,
  grupo,
  soComVolumes,
  onFamiliaChange,
  onGrupoChange,
  onSoComVolumesChange,
}: Props) {
  const base = useMemo(() => {
    return saldos
      .filter((s) => {
        if (soComVolumes && !(s.controla_lote && (s.lotes_count ?? 0) > 0)) {
          return false;
        }
        return coincideBusca(
          textoBusca(
            s.produto?.codigo,
            s.produto?.descricao_comercial,
            s.produto?.descricao_fiscal,
            s.produto?.familia,
            estoqueGrupoCodigo(s.produto),
            s.produto?.grupo_catalogo?.nome,
          ),
          q,
        );
      })
      .slice()
      .sort(ordenaSaldos);
  }, [saldos, q, soComVolumes]);

  const familias = useMemo(() => {
    const present = new Set(
      base.map((s) => s.produto?.familia).filter((f): f is string => Boolean(f)),
    );
    const ordered: string[] = ESTOQUE_FAMILIAS_ORDEM.filter((f) => present.has(f));
    for (const f of present) {
      if (!ordered.includes(f)) ordered.push(f);
    }
    return ordered;
  }, [base]);

  const familiaAtiva = useMemo(() => {
    if (familia && familias.includes(familia)) return familia;
    return familias[0] ?? '';
  }, [familia, familias]);

  const naFamilia = useMemo(() => {
    if (!familiaAtiva) return [];
    return base.filter((s) => s.produto?.familia === familiaAtiva);
  }, [base, familiaAtiva]);

  const grupos = useMemo(() => {
    const map = new Map<string, { codigo: string; label: string; count: number }>();
    for (const s of naFamilia) {
      const codigo = estoqueGrupoCodigo(s.produto);
      const nome = s.produto?.grupo_catalogo?.nome?.trim();
      const label = nome && codigo !== '—' ? `${codigo} — ${nome}` : codigo;
      const cur = map.get(codigo);
      if (cur) cur.count += 1;
      else map.set(codigo, { codigo, label, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) =>
      a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true, sensitivity: 'base' }),
    );
  }, [naFamilia]);

  const grupoAtivo = useMemo(() => {
    if (grupo === '' || grupo === 'todos') return 'todos';
    if (grupos.some((g) => g.codigo === grupo)) return grupo;
    return 'todos';
  }, [grupo, grupos]);

  const skus = useMemo(() => {
    if (grupoAtivo === 'todos') return naFamilia;
    return naFamilia.filter((s) => estoqueGrupoCodigo(s.produto) === grupoAtivo);
  }, [naFamilia, grupoAtivo]);

  /** Uma linha por faixa; SKU sem faixa vira uma linha só (saldo). */
  const linhas = useMemo((): LinhaConsolidado[] => {
    const out: LinhaConsolidado[] = [];
    for (const s of skus) {
      const faixas = s.volumes_por_qtde ?? [];
      if (faixas.length === 0) {
        out.push({ key: `sku-${s.id}`, saldo: s, faixa: null });
        continue;
      }
      for (const faixa of faixas) {
        out.push({
          key: `sku-${s.id}-f-${faixa.qtde}|${faixa.largura_mm ?? ''}|${faixa.comprimento_m ?? ''}`,
          saldo: s,
          faixa,
        });
      }
    }
    return out;
  }, [skus]);

  const resumo = useMemo(() => {
    let volumes = 0;
    for (const s of skus) {
      volumes += s.controla_lote ? (s.lotes_count ?? 0) : 0;
    }
    return { skus: skus.length, volumes, linhas: linhas.length };
  }, [skus, linhas.length]);

  const countFamilia = (fam: string) =>
    base.filter((s) => s.produto?.familia === fam).length;

  return (
    <div className="estoque-consolidado">
      <div className="estoque-consolidado-chrome">
        <div className="estoque-consolidado-toolbar">
          <label className="estoque-consolidado-check">
            <input
              type="checkbox"
              checked={soComVolumes}
              onChange={(e) => onSoComVolumesChange(e.target.checked)}
            />
            Só com volumes
          </label>
          <span className="muted estoque-consolidado-resumo">
            {resumo.skus} SKU · {resumo.linhas} linha(s) · {resumo.volumes} volume(s)
          </span>
        </div>

        {familias.length === 0 ? null : (
          <>
            <div className="tabs tabs--nested" role="tablist" aria-label="Família">
              {familias.map((f) => (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  className={`tab${familiaAtiva === f ? ' active' : ''}`}
                  aria-selected={familiaAtiva === f}
                  title={familiaLabel(f)}
                  onClick={() => {
                    onFamiliaChange(f);
                    onGrupoChange('todos');
                  }}
                >
                  {f}
                  <span className="tab-count">{countFamilia(f)}</span>
                </button>
              ))}
            </div>
            <p className="estoque-consolidado-fam-hint muted">
              {familiaAtiva ? familiaLabel(familiaAtiva) : ''}
            </p>

            <div className="tabs tabs--nested tabs--grupo" role="tablist" aria-label="Grupo">
              <button
                type="button"
                role="tab"
                className={`tab${grupoAtivo === 'todos' ? ' active' : ''}`}
                aria-selected={grupoAtivo === 'todos'}
                onClick={() => onGrupoChange('todos')}
              >
                Todos
                <span className="tab-count">{naFamilia.length}</span>
              </button>
              {grupos.map((g) => (
                <button
                  key={g.codigo}
                  type="button"
                  role="tab"
                  className={`tab${grupoAtivo === g.codigo ? ' active' : ''}`}
                  aria-selected={grupoAtivo === g.codigo}
                  title={g.label}
                  onClick={() => onGrupoChange(g.codigo)}
                >
                  {g.codigo}
                  <span className="tab-count">{g.count}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {linhas.length === 0 ? (
        <div className="empty-state">
          {q || soComVolumes
            ? 'Nenhum produto neste consolidado com o filtro atual.'
            : 'Sem saldo nesta família/grupo.'}
        </div>
      ) : (
        <div className="table-wrap table-wrap--freeze">
          <table className="data-table estoque-dense-table estoque-consolidado-table estoque-consolidado-table--flat">
            <thead>
              <tr>
                <th className="estoque-consolidado-col-produto">Produto</th>
                <th className="num">Qtde / vol</th>
                <th>Dimensão</th>
                <th className="num">Vols</th>
                <th className="num">Subtotal</th>
                <th className="num">Saldo SKU</th>
                <th className="num">Valor</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map(({ key, saldo: s, faixa }) => {
                const nome = produtoNome(s);
                const codigo = s.produto?.codigo ?? '—';
                return (
                  <tr key={key} className="estoque-consolidado-row">
                    <td className="produto estoque-consolidado-produto">
                      <div className="estoque-consolidado-produto-inline" title={nome || undefined}>
                        <strong>{codigo}</strong>
                        {nome ? <span className="muted">{nome}</span> : null}
                      </div>
                    </td>
                    {faixa ? (
                      <>
                        <td className="num">
                          {formatQtyCompact(faixa.qtde)}{' '}
                          <span className="table-muted">{faixa.unidade}</span>
                        </td>
                        <td className="dimensao">
                          {formatVolumeDimensao(
                            faixa.largura_mm ?? null,
                            faixa.comprimento_m ?? null,
                          )}
                        </td>
                        <td className="num">{faixa.volumes}</td>
                        <td className="num">
                          {subtotalFaixa(faixa.qtde, faixa.volumes)}{' '}
                          <span className="table-muted">{faixa.unidade}</span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="num muted">—</td>
                        <td className="muted">
                          {s.controla_lote ? 'Sem volume' : 'Sem lote'}
                        </td>
                        <td className="num muted">—</td>
                        <td className="num muted">—</td>
                      </>
                    )}
                    <td className="num saldo-cell">
                      <strong>{formatQty(s.qtde)}</strong>{' '}
                      <span className="table-muted">{s.unidade}</span>
                    </td>
                    <td className="num">{formatValorPosicao(s.qtde, s.custo_medio)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
