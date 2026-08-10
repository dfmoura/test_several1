import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, api } from '../lib/api';
import { useTableSort } from '../lib/useTableSort';
import {
  FacaShapeIcon,
  facaAspectFromRecord,
  formatoKind,
  formatoLabel,
} from './FacaShapeIcon';
import { SortableTh } from './SortableTh';

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
  completa?: boolean;
  cliente_nota?: string | null;
  fornecedor?: string | null;
  tamanho_tipo?: string;
  label?: string;
  /** GERACAO 7.3 — não está no mapa; custo/prazo no ORC; cadastra após aprovação */
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
  meta?: Record<string, string>;
};

const FORMATOS_PADRAO = ['RETA', 'REDONDA', 'OVAL', 'DESENHADA', 'ESPECIAL', 'LACRE'];

function fmtNum(v: unknown, d = 2): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString('pt-BR', { maximumFractionDigits: d });
}

function maquinaLabel(codigo: string): string {
  const nomes: Record<string, string> = {
    BETA: 'BETA (Betaflex)',
    '160': '160 (Reflexo 160)',
    '250': '250 (Reflexo 250)',
    ETIRAMA: 'ETIRAMA',
    BATIDA: 'BATIDA',
    MODULAR: 'MODULAR (Modular SPX)',
  };
  return nomes[codigo] || codigo;
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

export function buildFacaNova(partial?: Partial<FacaRecord>): FacaRecord {
  return {
    faca_nova: true,
    completa: false,
    medida: partial?.medida ?? '',
    formato: partial?.formato ?? 'RETA',
    faca: partial?.formato ?? 'RETA',
    maquina_catalogo: partial?.maquina_catalogo ?? 'BETA',
    puxada: partial?.puxada ?? null,
    z: partial?.z ?? null,
    repeticao: null,
    largura_faca: partial?.largura_faca ?? null,
    label: 'FACA NOVA (simulada)',
    cliente_nota: 'Faca nova — cadastrar no mapa após aprovação',
  };
}

const FACA_SORT = {
  formato: (f: FacaRecord) => String(f.formato || f.faca || ''),
  medida: (f: FacaRecord) => String(f.medida || ''),
  maquina: (f: FacaRecord) => String(f.maquina_catalogo || ''),
  z: (f: FacaRecord) => (f.z != null ? Number(f.z) : null),
  rep: (f: FacaRecord) => (f.repeticao != null ? Number(f.repeticao) : null),
  puxada: (f: FacaRecord) => (f.puxada != null ? Number(f.puxada) : null),
  nota: (f: FacaRecord) => String(f.cliente_nota || f.fornecedor || ''),
};

export function FacaPicker({ value, onChange, maquinasCatalogo = [], disabled = false }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'busca' | 'nova'>('busca');
  const [q, setQ] = useState('');
  const [maquina, setMaquina] = useState('');
  const [formato, setFormato] = useState('');
  const [soCompletas, setSoCompletas] = useState(true);
  const [items, setItems] = useState<FacaRecord[]>([]);
  const [formatos, setFormatos] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const { sorted: sortedItems, sortKey, sortDir, requestSort } = useTableSort(items, FACA_SORT);

  const [novaMedida, setNovaMedida] = useState('');
  const [novaFormato, setNovaFormato] = useState('RETA');
  const [novaMaquina, setNovaMaquina] = useState('');
  const [novaPuxada, setNovaPuxada] = useState('');
  const [novaZ, setNovaZ] = useState('');
  const [novaErro, setNovaErro] = useState<string | null>(null);

  const maquinas = useMemo(() => {
    if (maquinasCatalogo.length) return maquinasCatalogo;
    return ['BETA', '160', '250', 'ETIRAMA', 'BATIDA', 'MODULAR'];
  }, [maquinasCatalogo]);

  const formatosLista = formatos.length ? formatos : FORMATOS_PADRAO;

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
      })
      .catch(() => undefined);
  }, []);

  function abrir(tab: 'busca' | 'nova' = 'busca') {
    setMode(tab);
    setNovaErro(null);
    if (tab === 'nova') {
      setNovaMaquina((prev) => prev || maquinas[0] || 'BETA');
    }
    setOpen(true);
  }

  function escolher(f: FacaRecord) {
    onChange({ ...f, faca_nova: false });
    setOpen(false);
  }

  function confirmarNova() {
    const medida = novaMedida.trim();
    if (!medida) {
      setNovaErro('Informe a medida da faca nova.');
      return;
    }
    const maq = novaMaquina || maquinas[0] || 'BETA';
    const puxada = novaPuxada === '' ? null : Number(novaPuxada);
    const z = novaZ === '' ? null : Number(novaZ);
    if (puxada != null && (Number.isNaN(puxada) || puxada <= 0)) {
      setNovaErro('Puxada inválida.');
      return;
    }
    if (z != null && (Number.isNaN(z) || z < 0)) {
      setNovaErro('Z inválido.');
      return;
    }
    onChange(
      buildFacaNova({
        medida,
        formato: novaFormato,
        maquina_catalogo: maq,
        puxada,
        z,
      }),
    );
    setOpen(false);
  }

  const incompleta = value != null && value.completa === false;
  const isNova = value?.faca_nova === true;
  const aspect = value ? facaAspectFromRecord(value) : undefined;

  return (
    <div className={`faca-picker${isNova ? ' is-nova' : ''}`}>
      <div className="faca-summary">
        <div className="faca-summary-main">
          <div className="faca-summary-top">
            <span className="faca-kicker">
              {isNova ? 'Faca nova (simulada)' : 'Faca do mapa oficial'}
            </span>
            <div className="faca-summary-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm faca-btn"
                disabled={disabled}
                onClick={() => abrir('busca')}
              >
                {value && !isNova ? 'Trocar faca' : 'Buscar no mapa'}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={disabled}
                onClick={() => abrir('nova')}
              >
                Orçar faca nova
              </button>
            </div>
          </div>

          {value ? (
            <div className="faca-summary-body">
              <div className="faca-summary-visual" title={formatoLabel(value.formato || value.faca)}>
                <FacaShapeIcon
                  formato={String(value.formato || value.faca || '')}
                  aspect={aspect}
                  size={52}
                />
                <span className="faca-shape-caption">
                  {isNova ? 'NOVA' : formatoKind(String(value.formato || value.faca || ''))}
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
                    Faca nova: informe medida, puxada, Z e o valor/prazo cotados. Entra no mapa só
                    após aprovação do ORC (GERACAO §7.3).
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
              <div className="faca-shape-strip" aria-hidden>
                {FORMATOS_PADRAO.map((f) => (
                  <div key={f} className="faca-shape-strip-item">
                    <FacaShapeIcon formato={f} size={28} />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <p className="muted" style={{ margin: '0.65rem 0 0' }}>
                Busque no mapa oficial ou orçe como faca nova se a medida ainda não existir.
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
                <h2 id="faca-modal-title">
                  {mode === 'nova' ? 'Orçar faca nova' : 'Mapa de facas'}
                </h2>
                <p className="faca-modal-sub">
                  {mode === 'nova'
                    ? 'Medida ainda não está no mapa. Simule no ORC com custo/prazo cotados — cadastro oficial só após aprovação.'
                    : 'Fonte oficial · medida, formato, Z, REP e puxada vêm juntos. Clique na linha para selecionar.'}
                </p>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(false)}>
                Fechar
              </button>
            </header>

            <div className="faca-modal-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'busca'}
                className={mode === 'busca' ? 'active' : ''}
                onClick={() => setMode('busca')}
              >
                Buscar no mapa
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'nova'}
                className={mode === 'nova' ? 'active' : ''}
                onClick={() => setMode('nova')}
              >
                Faca nova
              </button>
            </div>

            {mode === 'busca' ? (
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
                    <FacaShapeIcon formato={formato} size={40} />
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
                  </p>
                  {!loading && total === 0 ? (
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => setMode('nova')}>
                      Orçar como faca nova
                    </button>
                  ) : null}
                </div>

                <div className="faca-table-wrap">
                  <table className="faca-table">
                    <thead>
                      <tr>
                        <SortableTh column="formato" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                          Formato
                        </SortableTh>
                        <SortableTh column="medida" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                          Medida
                        </SortableTh>
                        <SortableTh column="maquina" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                          Máquina
                        </SortableTh>
                        <SortableTh column="z" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                          Z
                        </SortableTh>
                        <SortableTh column="rep" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                          REP
                        </SortableTh>
                        <SortableTh column="puxada" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                          Puxada
                        </SortableTh>
                        <SortableTh column="nota" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                          Nota
                        </SortableTh>
                      </tr>
                    </thead>
                    <tbody>
                      {!items.length && !loading ? (
                        <tr>
                          <td colSpan={7} className="faca-empty">
                            Nenhuma faca neste filtro. Use a aba <strong>Faca nova</strong> para
                            orçar medida inexistente.
                          </td>
                        </tr>
                      ) : (
                        sortedItems.map((f) => {
                          const selected = value?.id != null && value.id === f.id && !isNova;
                          const aspectRow = facaAspectFromRecord(f);
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
                                  <FacaShapeIcon formato={fmt} aspect={aspectRow} size={32} />
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
              </>
            ) : (
              <div className="faca-nova-form">
                {novaErro ? <p className="form-error">{novaErro}</p> : null}
                <div className="form-grid">
                  <div className="form-group">
                    <label>Medida *</label>
                    <input
                      value={novaMedida}
                      onChange={(e) => setNovaMedida(e.target.value)}
                      placeholder="ex.: 8,0X12,4 ou Ø50"
                      autoFocus
                    />
                  </div>
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
                      <FacaShapeIcon formato={novaFormato} size={40} />
                      <div>
                        <strong>{novaMedida || '—'}</strong>
                        <span className="muted">
                          {' '}
                          · {novaFormato} · {novaMaquina || maquinas[0]}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="form-hint">
                  O valor cotado da faca e o prazo extra ficam na seção <strong>Produção /
                  ferramental</strong> do orçamento. O mapa oficial não é alterado nesta etapa.
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
      ) : null}
    </div>
  );
}
