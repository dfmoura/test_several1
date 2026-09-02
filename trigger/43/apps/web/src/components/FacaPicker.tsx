import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, api } from '../lib/api';
import { FORMATOS_CANONICOS, mergeVocabulario } from '../lib/facasMapa';
import { useTableSort } from '../lib/useTableSort';
import { formatoKind, formatoLabel } from './FacaShapeIcon';
import { FacaApresentacao } from './FacaApresentacao';
import { FacaSilhuetaReal, facaSilhuetaFromRecord } from './FacaSilhuetaReal';
import { SortableTh } from './SortableTh';
import { formatColunasMapaLabel } from '../lib/facaSilhueta';
import { facaPosicaoLabel, isFacaPosicao } from '../lib/facaPosicao';

export type FacaRecord = Record<string, unknown> & {
  id?: number;
  medida?: string;
  formato?: string;
  faca?: string;
  puxada?: number | null;
  z?: number | null;
  repeticao?: number | null;
  maquina_catalogo?: string;
  maquina_origem?: string;
  largura_faca?: number | null;
  n_facas?: number | null;
  colunas_mapa?: string | null;
  posicao?: string | null;
  contorno_svg?: string | null;
  diametro_cm?: number | null;
  tamanho_tipo?: string | null;
  completa?: boolean;
  cliente_nota?: string | null;
  fornecedor?: string | null;
  label?: string;
  /**
   * GERACAO 7.3 — legado em ORCs já gravados.
   * Novos ORCs só selecionam faca do mapa oficial (cadastro em Mapa de facas).
   */
  faca_nova?: boolean;
};

type Props = {
  value: FacaRecord | null;
  onChange: (faca: FacaRecord | null) => void;
  maquinasCatalogo?: string[];
  disabled?: boolean;
};

type FacasResponse = {
  total: number;
  items: FacaRecord[];
  formatos: string[];
  maquinas?: string[];
  meta?: Record<string, string>;
};

function maquinaLabel(codigo: string): string {
  return codigo;
}

function fmtNum(v: unknown, d = 2): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString('pt-BR', { maximumFractionDigits: d });
}

async function listFacas(params: {
  q?: string;
  maquina?: string;
  formato?: string;
  so_completas?: boolean;
}): Promise<FacasResponse> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.maquina) qs.set('maquina', params.maquina);
  if (params.formato) qs.set('formato', params.formato);
  if (params.so_completas != null) qs.set('so_completas', params.so_completas ? '1' : '0');
  const suffix = qs.toString() ? `?${qs}` : '';
  return api.get<FacasResponse>(`/facas${suffix}`);
}

const FACA_SORT = {
  formato: (f: FacaRecord) => String(f.formato || f.faca || ''),
  medida: (f: FacaRecord) => String(f.medida || ''),
  n_facas: (f: FacaRecord) => (f.n_facas != null ? Number(f.n_facas) : null),
  maquina: (f: FacaRecord) => String(f.maquina_catalogo || ''),
  z: (f: FacaRecord) => (f.z != null ? Number(f.z) : null),
  rep: (f: FacaRecord) => (f.repeticao != null ? Number(f.repeticao) : null),
  puxada: (f: FacaRecord) => (f.puxada != null ? Number(f.puxada) : null),
  nota: (f: FacaRecord) => String(f.cliente_nota || f.fornecedor || ''),
};

export function FacaPicker({
  value,
  onChange,
  maquinasCatalogo = [],
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [maquina, setMaquina] = useState('');
  const [formato, setFormato] = useState('');
  const [soCompletas, setSoCompletas] = useState(true);
  const [items, setItems] = useState<FacaRecord[]>([]);
  const [formatos, setFormatos] = useState<string[]>([]);
  const [maquinasApi, setMaquinasApi] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { sorted: sortedItems, sorts, sortKey, sortDir, requestSort } = useTableSort(items, FACA_SORT);

  const maquinas = useMemo(
    () => mergeVocabulario(maquinasCatalogo, maquinasApi),
    [maquinasCatalogo, maquinasApi],
  );

  const formatosLista = mergeVocabulario(FORMATOS_CANONICOS, formatos);

  const load = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await listFacas({
        q: q || undefined,
        maquina: maquina || undefined,
        formato: formato || undefined,
        so_completas: soCompletas,
      });
      setItems(res.items);
      setTotal(res.total);
      if (res.formatos?.length) setFormatos(res.formatos);
      if (res.maquinas?.length) setMaquinasApi(res.maquinas);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Falha ao carregar mapa de facas');
    } finally {
      setLoading(false);
    }
  }, [q, maquina, formato, soCompletas]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      void load();
    }, q ? 220 : 0);
    return () => window.clearTimeout(t);
  }, [open, load, q]);

  useEffect(() => {
    listFacas({ so_completas: true })
      .then((res) => {
        if (res.formatos?.length) setFormatos(res.formatos);
        if (res.maquinas?.length) setMaquinasApi(res.maquinas);
      })
      .catch(() => undefined);
  }, []);

  function abrir() {
    setOpen(true);
  }

  function escolher(f: FacaRecord) {
    onChange({ ...f, faca_nova: false });
    setOpen(false);
  }

  const incompleta = value != null && value.completa === false;
  const isNova = value?.faca_nova === true;
  const colsFaca =
    value && !isNova ? formatColunasMapaLabel(String(value.colunas_mapa ?? '')) ?? '1×' : null;
  const posicaoMapa = String(value?.posicao ?? '');

  return (
    <div className={`faca-picker${isNova ? ' is-nova' : ''}`}>
      <div className="faca-summary">
        <div className="faca-summary-main">
          <div className="faca-summary-top">
            <span className="faca-kicker">
              {isNova ? 'Faca nova (legado nesta proposta)' : 'Faca do mapa oficial'}
            </span>
            <div className="faca-summary-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm faca-btn"
                disabled={disabled}
                onClick={() => abrir()}
              >
                {value && !isNova ? 'Trocar faca' : 'Buscar no mapa'}
              </button>
            </div>
          </div>

          {value ? (
            <div className="faca-summary-body">
              <div className="faca-summary-visual" title={formatoLabel(value.formato || value.faca)}>
                <FacaApresentacao
                  className="faca-summary-apresentacao"
                  title={formatoLabel(value.formato || value.faca)}
                  posicao={posicaoMapa}
                  size="featured"
                >
                  <FacaSilhuetaReal
                    {...facaSilhuetaFromRecord(value)}
                    size={56}
                    variant="featured"
                  />
                </FacaApresentacao>
                <span className="faca-shape-caption">
                  {isNova ? 'NOVA' : formatoKind(String(value.formato || value.faca || ''))}
                  {isFacaPosicao(posicaoMapa) ? ` · ${facaPosicaoLabel(posicaoMapa)}` : ''}
                </span>
              </div>
              <div className="faca-summary-text">
                <div className="faca-summary-title">
                  {isNova && !value.medida ? (
                    <span className="muted">Informe a medida abaixo</span>
                  ) : String(value.tamanho_tipo) === 'diametro' ? (
                    <span className="badge-diam">{String(value.medida)}</span>
                  ) : (
                    String(value.medida || '—')
                  )}
                </div>
                <div className="faca-summary-meta">
                  {[
                    formatoLabel(value.formato || value.faca),
                    value.maquina_catalogo ? maquinaLabel(String(value.maquina_catalogo)) : null,
                    isNova ? 'não cadastrada no mapa' : value.cliente_nota,
                    String(value.tamanho_tipo) === 'diametro' ? 'diâmetro (Ø)' : null,
                    !isNova && value.completa === false ? 'puxada/Z manuais' : null,
                    !isNova && value.completa !== false ? 'dados completos' : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
                <div className="faca-chips">
                  <div className="faca-chip">
                    <span>N facas</span>
                    {isNova || value.n_facas == null ? '—' : fmtNum(value.n_facas, 0)}
                  </div>
                  {colsFaca ? (
                    <div className="faca-chip" title="Colunas da faca no mapa (não é coluna de rebobinação)">
                      <span>Cols. faca</span>
                      {colsFaca}
                    </div>
                  ) : null}
                  <div className="faca-chip">
                    <span>Z</span>
                    {fmtNum(value.z, 0)}
                  </div>
                  <div className="faca-chip">
                    <span>REP</span>
                    {isNova ? '—' : fmtNum(value.repeticao, 4)}
                  </div>
                  <div className={`faca-chip${value.puxada == null ? ' warn' : ''}`}>
                    <span>Puxada</span>
                    {value.puxada != null ? `${fmtNum(value.puxada)} cm` : 'manual'}
                  </div>
                  <div className="faca-chip">
                    <span>Máq.</span>
                    {String(value.maquina_catalogo || '—')}
                  </div>
                  {isNova ? (
                    <div className="faca-chip warn">
                      <span>Tipo</span>
                      FACA NOVA
                    </div>
                  ) : null}
                  {value.largura_faca != null ? (
                    <div className="faca-chip">
                      <span>Larg. faca</span>
                      {fmtNum(value.largura_faca)} cm
                    </div>
                  ) : null}
                </div>
                {isNova ? (
                  <p className="faca-warn">
                    Proposta legada com faca nova. Valor e prazo cotados permanecem em Produção /
                    ferramental. Para novos orçamentos, cadastre a geometria em Mapa de facas e
                    selecione-a aqui.
                  </p>
                ) : incompleta ? (
                  <p className="faca-warn">
                    Registro incompleto no mapa — preencha puxada (e Z se preciso) manualmente.
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="faca-summary-empty">
              <p className="muted" style={{ margin: 0 }}>
                Busque e selecione uma faca do mapa oficial. Medidas novas devem ser cadastradas em
                Mapa de facas.
              </p>
            </div>
          )}
        </div>
      </div>

      {open ? (
        <div className="faca-modal" role="dialog" aria-modal="true" aria-labelledby="faca-modal-title">
          <div className="faca-modal-backdrop" onClick={() => setOpen(false)} />
          <div className="faca-modal-panel">
            <header className="faca-modal-head">
              <div>
                <h2 id="faca-modal-title">Mapa de facas</h2>
                <p className="faca-modal-sub">
                  Fonte oficial · medida, N facas, formato, Z, REP e puxada vêm juntos. Clique na
                  linha para selecionar · Shift+clique no cabeçalho soma ordenação.
                </p>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(false)}>
                Fechar
              </button>
            </header>

            <div className="faca-filters">
              <label className="faca-filter-field faca-busca-wrap">
                <span>Buscar</span>
                <input
                  type="search"
                  value={q}
                  autoFocus
                  placeholder="Medida, Ø, cliente, fornecedor…"
                  onChange={(e) => setQ(e.target.value)}
                />
              </label>
              <label className="faca-filter-field">
                <span>Máquina</span>
                <select value={maquina} onChange={(e) => setMaquina(e.target.value)}>
                  <option value="">Todas</option>
                  {maquinas.map((m) => (
                    <option key={m} value={m}>
                      {maquinaLabel(m)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="faca-filter-field">
                <span>Formato</span>
                <select value={formato} onChange={(e) => setFormato(e.target.value)}>
                  <option value="">Todos</option>
                  {formatosLista.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
              <label className="faca-check">
                <input
                  type="checkbox"
                  checked={soCompletas}
                  onChange={(e) => setSoCompletas(e.target.checked)}
                />
                <span>Só completas</span>
              </label>
            </div>

            {formato ? (
              <div className="faca-formato-preview">
                <FacaSilhuetaReal formato={formato} size={40} variant="compact" />
                <div>
                  <strong>{formato}</strong>
                  <span className="muted"> · formato filtrado no mapa</span>
                </div>
              </div>
            ) : null}

            <div className="faca-toolbar">
              <p className="hint auto-note">
                {loading ? 'Carregando…' : `${total} faca(s)`}
                {erro ? ` · ${erro}` : ''}
                {!loading && !erro
                  ? sorts.length > 1
                    ? ` · ${sorts.length} critérios`
                    : ' · Shift+clique soma ordenação'
                  : ''}
              </p>
            </div>

            <div className="faca-table-wrap">
              <table className="faca-table">
                <thead>
                  <tr>
                    <SortableTh column="formato" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                      Formato
                    </SortableTh>
                    <SortableTh column="medida" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                      Medida
                    </SortableTh>
                    <SortableTh
                      column="n_facas"
                      className="num"
                      sorts={sorts} sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={requestSort}
                      label="N facas"
                    >
                      N facas
                    </SortableTh>
                    <SortableTh column="maquina" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                      Máquina
                    </SortableTh>
                    <SortableTh column="z" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                      Z
                    </SortableTh>
                    <SortableTh column="rep" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                      REP
                    </SortableTh>
                    <SortableTh column="puxada" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                      Puxada
                    </SortableTh>
                    <SortableTh column="nota" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                      Nota
                    </SortableTh>
                  </tr>
                </thead>
                <tbody>
                  {!items.length && !loading ? (
                    <tr>
                      <td colSpan={8} className="faca-empty">
                        Nenhuma faca neste filtro. Ajuste a busca ou cadastre a medida em{' '}
                        <strong>Mapa de facas</strong>.
                      </td>
                    </tr>
                  ) : (
                    sortedItems.map((f) => {
                      const selected = value?.id != null && value.id === f.id && !isNova;
                      const fmt = String(f.formato || f.faca || '');
                      return (
                        <tr
                          key={String(f.id ?? f.label)}
                          className={`faca-row${selected ? ' selected' : ''}${
                            f.completa === false ? ' incompleta' : ''
                          }`}
                          onClick={() => escolher(f)}
                          title={String(f.label || '')}
                        >
                          <td>
                            <div className="faca-row-formato">
                              <FacaApresentacao
                                posicao={String(f.posicao ?? '')}
                                size="compact"
                              >
                                <FacaSilhuetaReal
                                  {...facaSilhuetaFromRecord(f)}
                                  size={28}
                                  variant="compact"
                                />
                              </FacaApresentacao>
                              <span>{formatoLabel(fmt)}</span>
                            </div>
                          </td>
                          <td className="medida">
                            {String(f.tamanho_tipo) === 'diametro' ? (
                              <span className="badge-diam">{String(f.medida)}</span>
                            ) : (
                              String(f.medida || '—')
                            )}
                          </td>
                          <td className="num">
                            {f.n_facas != null ? fmtNum(f.n_facas, 0) : '—'}
                          </td>
                          <td>{String(f.maquina_catalogo || '')}</td>
                          <td className="num">{f.z != null ? fmtNum(f.z, 0) : '—'}</td>
                          <td className="num">
                            {f.repeticao != null ? fmtNum(f.repeticao, 4) : '—'}
                          </td>
                          <td className="num">
                            {f.puxada != null ? (
                              fmtNum(f.puxada)
                            ) : (
                              <em className="warn-txt">manual</em>
                            )}
                          </td>
                          <td className="nota">{String(f.cliente_nota || f.fornecedor || '')}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
