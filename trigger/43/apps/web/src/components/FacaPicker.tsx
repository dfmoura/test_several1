import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, api } from '../lib/api';
import { FORMATOS_CANONICOS, composeMedidaIdentidade, facaDimensoesExibicao, formatoUsaDiametro, mergeVocabulario } from '../lib/facasMapa';
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
  tamanho_raw?: string | null;
  completa?: boolean;
  cliente_nota?: string | null;
  fornecedor?: string | null;
  label?: string;
  /**
   * Cotação comercial sem registro no mapa (`mapa_faca_id` nulo).
   * Inventário oficial continua em Mapa de facas; aqui só se cota ferramental/geometria.
   */
  faca_nova?: boolean;
};

type Props = {
  value: FacaRecord | null;
  onChange: (faca: FacaRecord | null) => void;
  maquinasCatalogo?: string[];
  disabled?: boolean;
  /** Abas Buscar no mapa | Faca nova. Default: true. */
  permitirFacaNova?: boolean;
  /**
   * completa — card com resumo (legado / standalone).
   * compacta — só botões + modal (composição ORC; sem chrome vazio).
   */
  variante?: 'completa' | 'compacta';
};

/** Monta faca nova pronta para o ORC — sem id de mapa. */
export function buildFacaNova(partial?: Partial<FacaRecord>): FacaRecord {
  const formato = String(partial?.formato || partial?.faca || 'RETA');
  const isDiam = formatoUsaDiametro(formato);
  const largura =
    partial?.largura_faca != null && Number(partial.largura_faca) > 0
      ? Number(partial.largura_faca)
      : null;
  const diametro =
    partial?.diametro_cm != null && Number(partial.diametro_cm) > 0
      ? Number(partial.diametro_cm)
      : null;
  const tamanho =
    diametro ??
    (partial?.tamanho_raw != null && String(partial.tamanho_raw).trim() !== ''
      ? Number(String(partial.tamanho_raw).replace(',', '.'))
      : null);
  const tamanhoOk = tamanho != null && Number.isFinite(tamanho) && tamanho > 0 ? tamanho : null;
  const medida =
    String(partial?.medida || '').trim() ||
    composeMedidaIdentidade({
      larguraCm: isDiam ? largura ?? tamanhoOk : largura,
      tamanhoCm: tamanhoOk,
      isDiametro: isDiam,
    });
  return {
    faca_nova: true,
    completa: false,
    medida,
    formato,
    faca: formato,
    maquina_catalogo: partial?.maquina_catalogo ?? 'BETA',
    puxada: partial?.puxada ?? null,
    z: partial?.z ?? null,
    repeticao: null,
    largura_faca: isDiam ? largura ?? tamanhoOk : largura,
    diametro_cm: isDiam ? tamanhoOk : null,
    tamanho_raw: tamanhoOk != null ? String(tamanhoOk) : null,
    tamanho_tipo: isDiam ? 'diametro' : 'altura',
    label: 'Faca nova',
    cliente_nota: 'Faca nova — cadastrar no mapa após aprovação',
  };
}

/** @deprecated use buildFacaNova — mantido para imports residuais */
export function stubFacaNova(): FacaRecord {
  return buildFacaNova();
}

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
  permitirFacaNova = true,
  variante = 'completa',
}: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'busca' | 'nova'>('busca');
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

  const [novaLargura, setNovaLargura] = useState('');
  const [novaTamanho, setNovaTamanho] = useState('');
  const [novaFormato, setNovaFormato] = useState('RETA');
  const [novaMaquina, setNovaMaquina] = useState('');
  const [novaPuxada, setNovaPuxada] = useState('');
  const [novaZ, setNovaZ] = useState('');
  const [novaErro, setNovaErro] = useState<string | null>(null);

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
    if (!open || mode !== 'busca') return;
    const t = window.setTimeout(() => {
      void load();
    }, q ? 220 : 0);
    return () => window.clearTimeout(t);
  }, [open, load, q, mode]);

  useEffect(() => {
    listFacas({ so_completas: true })
      .then((res) => {
        if (res.formatos?.length) setFormatos(res.formatos);
        if (res.maquinas?.length) setMaquinasApi(res.maquinas);
      })
      .catch(() => undefined);
  }, []);

  function abrir(tab: 'busca' | 'nova' = 'busca') {
    if (tab === 'nova' && !permitirFacaNova) {
      tab = 'busca';
    }
    setMode(tab);
    setNovaErro(null);
    if (tab === 'nova') {
      setNovaMaquina((prev) => prev || maquinas[0] || 'BETA');
      if (value?.faca_nova) {
        const dim = facaDimensoesExibicao(value);
        setNovaLargura(
          value.largura_faca != null
            ? String(value.largura_faca)
            : dim.larguraSort != null
              ? String(dim.larguraSort)
              : '',
        );
        setNovaTamanho(
          value.diametro_cm != null
            ? String(value.diametro_cm)
            : value.tamanho_raw != null
              ? String(value.tamanho_raw)
              : dim.tamanhoSort != null
                ? String(dim.tamanhoSort)
                : '',
        );
        setNovaFormato(String(value.formato || value.faca || 'RETA'));
        setNovaMaquina(String(value.maquina_catalogo || maquinas[0] || 'BETA'));
        setNovaPuxada(value.puxada != null ? String(value.puxada) : '');
        setNovaZ(value.z != null ? String(value.z) : '');
      }
    }
    setOpen(true);
  }

  function escolher(f: FacaRecord) {
    onChange({ ...f, faca_nova: false });
    setOpen(false);
  }

  function confirmarNova() {
    const isDiam = formatoUsaDiametro(novaFormato);
    const parseNum = (raw: string): number | null => {
      const t = raw.trim().replace(',', '.');
      if (!t) return null;
      const n = Number(t);
      if (!Number.isFinite(n)) return Number.NaN;
      return n;
    };
    const tamanho = parseNum(novaTamanho);
    const larguraInformada = parseNum(novaLargura);
    const largura = isDiam
      ? larguraInformada == null || Number.isNaN(larguraInformada)
        ? tamanho
        : larguraInformada
      : larguraInformada;

    if (tamanho == null || Number.isNaN(tamanho) || !(tamanho > 0)) {
      setNovaErro(isDiam ? 'Informe o diâmetro (cm).' : 'Informe o tamanho (cm).');
      return;
    }
    if (!isDiam && (largura == null || Number.isNaN(largura) || !(largura > 0))) {
      setNovaErro('Informe a largura (cm).');
      return;
    }
    const maq = novaMaquina || maquinas[0] || 'BETA';
    const puxada = novaPuxada === '' ? null : Number(novaPuxada.replace(',', '.'));
    const z = novaZ === '' ? null : Number(novaZ.replace(',', '.'));
    if (puxada != null && (Number.isNaN(puxada) || puxada <= 0)) {
      setNovaErro('Puxada inválida.');
      return;
    }
    if (z != null && (Number.isNaN(z) || z < 0)) {
      setNovaErro('Z inválido.');
      return;
    }
    const medida = composeMedidaIdentidade({
      larguraCm: Number.isNaN(largura as number) ? null : largura,
      tamanhoCm: tamanho,
      isDiametro: isDiam,
    });
    if (!medida) {
      setNovaErro('Revise largura e tamanho.');
      return;
    }
    onChange(
      buildFacaNova({
        medida,
        formato: novaFormato,
        maquina_catalogo: maq,
        puxada,
        z,
        largura_faca: Number.isNaN(largura as number) ? null : largura,
        diametro_cm: isDiam ? tamanho : null,
        tamanho_raw: String(tamanho),
        tamanho_tipo: isDiam ? 'diametro' : 'altura',
      }),
    );
    setOpen(false);
  }

  const incompleta = value != null && value.completa === false;
  const isNova = value?.faca_nova === true;
  const colsFaca =
    value && !isNova ? formatColunasMapaLabel(String(value.colunas_mapa ?? '')) ?? '1×' : null;
  const posicaoMapa = String(value?.posicao ?? '');
  const compacta = variante === 'compacta';

  const acoes = (
    <div className="faca-summary-actions">
      <button
        type="button"
        className="btn btn-secondary btn-sm faca-btn"
        disabled={disabled}
        onClick={() => abrir('busca')}
      >
        {value && !isNova ? 'Trocar faca' : 'Buscar no mapa'}
      </button>
      {permitirFacaNova ? (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={disabled}
          onClick={() => abrir('nova')}
        >
          {isNova ? 'Editar faca nova' : 'Orçar faca nova'}
        </button>
      ) : null}
    </div>
  );

  const modal = open ? (
    <div className="faca-modal" role="dialog" aria-modal="true" aria-labelledby="faca-modal-title">
      <div className="faca-modal-backdrop" onClick={() => setOpen(false)} />
      <div className="faca-modal-panel">
        <header className="faca-modal-head">
          <div>
            <h2 id="faca-modal-title">
              {mode === 'nova' ? 'Orçar faca nova' : 'Mapa de facas'}
            </h2>
            <p className="faca-modal-sub">
              {mode === 'nova'
                ? 'Medida ainda não está no mapa. Simule no ORC com custo/prazo cotados — cadastro oficial só após aprovação.'
                : 'Fonte oficial · medida, N facas, formato, Z, REP e puxada vêm juntos. Clique na linha para selecionar.'}
            </p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(false)}>
            Fechar
          </button>
        </header>

        {permitirFacaNova ? (
          <div className="faca-modal-tabs" role="tablist" aria-label="Origem da faca">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'busca'}
              className={mode === 'busca' ? 'active' : ''}
              onClick={() => setMode('busca')}
            >
              Faca existente
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'nova'}
              className={mode === 'nova' ? 'active' : ''}
              onClick={() => {
                setNovaErro(null);
                setNovaMaquina((prev) => prev || maquinas[0] || 'BETA');
                setMode('nova');
              }}
            >
              Faca nova
            </button>
          </div>
        ) : null}

        {mode === 'busca' || !permitirFacaNova ? (
          <>
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
              {!loading && total === 0 && permitirFacaNova ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setMode('nova')}
                >
                  Orçar como faca nova
                </button>
              ) : null}
            </div>

            <div className="faca-table-wrap">
              <table className="faca-table faca-table--mapa">
                <thead>
                  <tr>
                    <SortableTh
                      column="formato"
                      sorts={sorts}
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={requestSort}
                    >
                      Formato
                    </SortableTh>
                    <th className="faca-th-silhueta" scope="col">
                      Silhueta
                    </th>
                    <SortableTh
                      column="medida"
                      sorts={sorts}
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={requestSort}
                    >
                      Medida
                    </SortableTh>
                    <SortableTh
                      column="n_facas"
                      className="num"
                      sorts={sorts}
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={requestSort}
                      label="N FACA"
                    >
                      N FACA
                    </SortableTh>
                    <SortableTh
                      column="maquina"
                      sorts={sorts}
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={requestSort}
                    >
                      Máquina
                    </SortableTh>
                    <SortableTh
                      column="z"
                      sorts={sorts}
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={requestSort}
                    >
                      Z
                    </SortableTh>
                    <SortableTh
                      column="rep"
                      sorts={sorts}
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={requestSort}
                    >
                      REP
                    </SortableTh>
                    <SortableTh
                      column="puxada"
                      sorts={sorts}
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={requestSort}
                    >
                      Puxada
                    </SortableTh>
                    <SortableTh
                      column="nota"
                      sorts={sorts}
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={requestSort}
                    >
                      Nota
                    </SortableTh>
                  </tr>
                </thead>
                <tbody>
                  {!items.length && !loading ? (
                    <tr>
                      <td colSpan={9} className="faca-empty">
                        Nenhuma faca neste filtro.
                        {permitirFacaNova ? (
                          <>
                            {' '}
                            Use a aba <strong>Faca nova</strong> para orçar medida inexistente.
                          </>
                        ) : (
                          <> Cadastre em Mapa de facas.</>
                        )}
                      </td>
                    </tr>
                  ) : (
                    sortedItems.map((f) => {
                      const selected = value?.id != null && value.id === f.id && !isNova;
                      const fmt = String(f.formato || f.faca || '');
                      const isDiam =
                        formatoUsaDiametro(fmt) ||
                        String(f.tamanho_tipo ?? '')
                          .trim()
                          .toLowerCase()
                          .startsWith('diam') ||
                        /^[Øø]/.test(String(f.medida || '').trim());
                      return (
                        <tr
                          key={String(f.id ?? f.label)}
                          className={`faca-row${selected ? ' selected' : ''}${
                            f.completa === false ? ' incompleta' : ''
                          }`}
                          onClick={() => escolher(f)}
                          title={String(f.label || f.medida || '')}
                        >
                          <td>
                            <span>{formatoLabel(fmt)}</span>
                          </td>
                          <td className="faca-silhueta-cell">
                            <FacaApresentacao posicao={String(f.posicao ?? '')} size="compact">
                              <FacaSilhuetaReal
                                {...facaSilhuetaFromRecord(f)}
                                size={36}
                                variant="compact"
                              />
                            </FacaApresentacao>
                          </td>
                          <td className="medida">
                            {isDiam ? (
                              <span className="badge-diam">{String(f.medida)}</span>
                            ) : (
                              String(f.medida || '—')
                            )}
                          </td>
                          <td className="num">{f.n_facas != null ? fmtNum(f.n_facas, 0) : '—'}</td>
                          <td>{String(f.maquina_catalogo || '')}</td>
                          <td className="num">{f.z != null ? fmtNum(f.z, 0) : '—'}</td>
                          <td className="num">
                            {f.repeticao != null ? fmtNum(f.repeticao, 4) : '—'}
                          </td>
                          <td className="num">
                            {f.puxada != null ? fmtNum(f.puxada) : <em className="warn-txt">manual</em>}
                          </td>
                          <td className="nota">{String(f.cliente_nota || f.fornecedor || '')}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="faca-nova-form">
            {novaErro ? <p className="form-error">{novaErro}</p> : null}
            <div className="form-grid">
              <div className="form-group">
                <label>Formato *</label>
                <select value={novaFormato} onChange={(e) => setNovaFormato(e.target.value)}>
                  {formatosLista.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              {!formatoUsaDiametro(novaFormato) ? (
                <div className="form-group">
                  <label>Largura (cm) *</label>
                  <input
                    value={novaLargura}
                    onChange={(e) => setNovaLargura(e.target.value)}
                    placeholder="ex.: 8,0"
                    inputMode="decimal"
                    autoFocus
                  />
                </div>
              ) : null}
              <div className="form-group">
                <label>
                  {formatoUsaDiametro(novaFormato) ? 'Diâmetro (cm) *' : 'Tamanho (cm) *'}
                </label>
                <input
                  value={novaTamanho}
                  onChange={(e) => setNovaTamanho(e.target.value)}
                  placeholder={formatoUsaDiametro(novaFormato) ? 'ex.: 5' : 'ex.: 12,4'}
                  inputMode="decimal"
                  autoFocus={formatoUsaDiametro(novaFormato)}
                />
              </div>
              <div className="form-group">
                <label>Máquina *</label>
                <select
                  value={novaMaquina || maquinas[0] || ''}
                  onChange={(e) => setNovaMaquina(e.target.value)}
                >
                  {maquinas.map((m) => (
                    <option key={m} value={m}>
                      {maquinaLabel(m)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Puxada estimada (cm)</label>
                <input
                  type="number"
                  step="0.00001"
                  value={novaPuxada}
                  onChange={(e) => setNovaPuxada(e.target.value)}
                  placeholder="pode completar no formulário"
                />
              </div>
              <div className="form-group">
                <label>Z estimado</label>
                <input
                  type="number"
                  step="0.1"
                  value={novaZ}
                  onChange={(e) => setNovaZ(e.target.value)}
                  placeholder="opcional agora"
                />
              </div>
              <div className="form-group faca-nova-preview-field">
                <label>Prévia</label>
                <div className="faca-formato-preview" style={{ margin: 0 }}>
                  <FacaSilhuetaReal
                    formato={novaFormato}
                    larguraCm={novaLargura || null}
                    diametroCm={formatoUsaDiametro(novaFormato) ? novaTamanho || null : null}
                    tamanhoTipo={formatoUsaDiametro(novaFormato) ? 'diametro' : 'altura'}
                    size={40}
                    variant="compact"
                  />
                  <div>
                    <strong>
                      {(() => {
                        const isDiam = formatoUsaDiametro(novaFormato);
                        const tamanho = Number(String(novaTamanho).replace(',', '.'));
                        const largura = Number(String(novaLargura).replace(',', '.'));
                        const medida = composeMedidaIdentidade({
                          larguraCm: isDiam
                            ? Number.isFinite(tamanho) && tamanho > 0
                              ? tamanho
                              : Number.isFinite(largura) && largura > 0
                                ? largura
                                : null
                            : Number.isFinite(largura) && largura > 0
                              ? largura
                              : null,
                          tamanhoCm:
                            Number.isFinite(tamanho) && tamanho > 0 ? tamanho : null,
                          isDiametro: isDiam,
                        });
                        return medida || '—';
                      })()}
                    </strong>
                    <span className="muted">
                      {' '}
                      · {novaFormato} · {novaMaquina || maquinas[0]}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <p className="form-hint">
              Cadastro por Largura e Tamanho (como no Mapa de facas). A identidade <strong>medida</strong>{' '}
              é composta automaticamente para o mapa e o cálculo. Valor/prazo do ferramental na linha do
              orçamento — o mapa oficial não muda aqui.
            </p>
            <div className="btn-row">
              <button type="button" className="btn btn-primary" onClick={confirmarNova}>
                Usar faca nova no ORC
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setMode('busca')}>
                Voltar ao mapa
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  ) : null;

  if (compacta) {
    return (
      <div className={`faca-picker faca-picker--compacta${isNova ? ' is-nova' : ''}`}>
        {acoes}
        {modal}
      </div>
    );
  }

  return (
    <div className={`faca-picker${isNova ? ' is-nova' : ''}`}>
      <div className="faca-summary">
        <div className="faca-summary-main">
          <div className="faca-summary-top">
            <span className="faca-kicker">
              {isNova ? 'Faca nova (simulada)' : 'Faca do mapa oficial'}
            </span>
            {acoes}
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
                  {(() => {
                    if (isNova && !value.medida) {
                      return <span className="muted">Informe largura e tamanho na aba Faca nova</span>;
                    }
                    const medida = String(value.medida || '').trim();
                    if (!medida) return '—';
                    const isDiam =
                      formatoUsaDiametro(value.formato || value.faca) ||
                      String(value.tamanho_tipo ?? '')
                        .trim()
                        .toLowerCase()
                        .startsWith('diam') ||
                      /^[Øø]/.test(medida);
                    if (isDiam) {
                      return <span className="badge-diam">{medida}</span>;
                    }
                    return medida;
                  })()}
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
                    <div
                      className="faca-chip"
                      title="Colunas da faca no mapa (não é coluna de rebobinação)"
                    >
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
                      <span>Largura</span>
                      {fmtNum(value.largura_faca)} cm
                    </div>
                  ) : null}
                  {value.diametro_cm != null ? (
                    <div className="faca-chip">
                      <span>Ø</span>
                      {fmtNum(value.diametro_cm)} cm
                    </div>
                  ) : null}
                </div>
                {isNova ? (
                  <p className="faca-warn">
                    Faca nova: geometria e valor/prazo nesta proposta. O mapa oficial não muda —
                    cadastre após aprovação do ORC.
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
                {permitirFacaNova
                  ? 'Escolha: faca existente no mapa, ou orçar faca nova se a medida ainda não existe.'
                  : 'Busque e selecione uma faca do mapa oficial.'}
              </p>
            </div>
          )}
        </div>
      </div>
      {modal}
    </div>
  );
}
