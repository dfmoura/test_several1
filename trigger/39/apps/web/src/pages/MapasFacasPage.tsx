import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { PageHeader } from '../components/PageHeader';
import { RegistroMetaStrip } from '../components/RegistroMetaStrip';
import { SortableTh } from '../components/SortableTh';
import { StatusPill } from '../components/StatusPill';
import {
  FacaShapeIcon,
  facaAspectFromRecord,
  formatoKind,
  formatoLabel,
} from '../components/FacaShapeIcon';
import { ApiError, api, type UsuarioRef } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useTableSort } from '../lib/useTableSort';

type FacaMapa = {
  id: number;
  medida: string;
  formato: string;
  faca?: string | null;
  puxada?: number | null;
  z?: number | null;
  repeticao?: number | null;
  maquina_catalogo?: string | null;
  maquina_origem?: string | null;
  largura_faca?: number | null;
  diametro_cm?: number | null;
  n_facas?: number | null;
  cilindro?: string | null;
  colunas_mapa?: string | null;
  conjugada?: string | null;
  fornecedor?: string | null;
  cliente_nota?: string | null;
  completa: boolean;
  label?: string | null;
  ativo: boolean;
  tamanho_raw?: string | null;
  tamanho_tipo?: string | null;
  criado_por?: UsuarioRef | null;
  atualizado_por?: UsuarioRef | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type FacasListResponse = {
  total: number;
  items: FacaMapa[];
  formatos: string[];
  meta?: Record<string, string>;
};

type Resumo = {
  total: number;
  ativas: number;
  inativas: number;
  completas: number;
  incompletas: number;
  fonte: string;
};

const FORMATOS_PADRAO = ['RETA', 'REDONDA', 'OVAL', 'DESENHADA', 'ESPECIAL', 'LACRE'];
const MAQUINAS = ['BETA', '160', '250', 'ETIRAMA', 'BATIDA', 'MODULAR'];

const FACA_SORT = {
  formato: (f: FacaMapa) => formatoLabel(f.formato),
  medida: (f: FacaMapa) => f.medida,
  maquina: (f: FacaMapa) => f.maquina_catalogo,
  z: (f: FacaMapa) => (f.z != null ? Number(f.z) : null),
  rep: (f: FacaMapa) => (f.repeticao != null ? Number(f.repeticao) : null),
  puxada: (f: FacaMapa) => (f.puxada != null ? Number(f.puxada) : null),
  fornecedor: (f: FacaMapa) => f.fornecedor,
  nota: (f: FacaMapa) => f.cliente_nota,
};

function fmtNum(v: unknown, d = 2): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString('pt-BR', { maximumFractionDigits: d });
}

function fieldErrors(err: unknown): string {
  if (err instanceof ApiError && err.details) {
    return Object.entries(err.details)
      .flatMap(([k, msgs]) => msgs.map((m) => `${k}: ${m}`))
      .join(' ');
  }
  return err instanceof Error ? err.message : 'Falha na operação.';
}

function numOrNull(v: string): number | null {
  const t = v.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

type NovaForm = {
  medida: string;
  formato: string;
  maquina_catalogo: string;
  puxada: string;
  z: string;
  repeticao: string;
  largura_faca: string;
  diametro_cm: string;
  n_facas: string;
  cilindro: string;
  colunas_mapa: string;
  conjugada: string;
  fornecedor: string;
  cliente_nota: string;
};

const EMPTY_NOVA: NovaForm = {
  medida: '',
  formato: 'RETA',
  maquina_catalogo: 'BETA',
  puxada: '',
  z: '',
  repeticao: '',
  largura_faca: '',
  diametro_cm: '',
  n_facas: '',
  cilindro: '',
  colunas_mapa: '',
  conjugada: '',
  fornecedor: '',
  cliente_nota: '',
};

export function MapasFacasPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('orcamento.escrever');

  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [items, setItems] = useState<FacaMapa[]>([]);
  const [total, setTotal] = useState(0);
  const [formatos, setFormatos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [q, setQ] = useState('');
  const [formato, setFormato] = useState('');
  const [maquina, setMaquina] = useState('');
  const [soCompletas, setSoCompletas] = useState(false);
  const [incluirInativas, setIncluirInativas] = useState(false);

  const [selected, setSelected] = useState<FacaMapa | null>(null);
  const [showNova, setShowNova] = useState(false);
  const [nova, setNova] = useState<NovaForm>(EMPTY_NOVA);
  const [novaErro, setNovaErro] = useState('');

  const { sorted, sortKey, sortDir, requestSort } = useTableSort(items, FACA_SORT);

  const formatosLista = formatos.length ? formatos : FORMATOS_PADRAO;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (q.trim()) qs.set('q', q.trim());
      if (formato) qs.set('formato', formato);
      if (maquina) qs.set('maquina', maquina);
      if (soCompletas) qs.set('so_completas', '1');
      if (incluirInativas) qs.set('incluir_inativas', '1');
      qs.set('limit', '400');

      const [list, sum] = await Promise.all([
        api.get<FacasListResponse>(`/facas?${qs}`),
        api.get<{ data: Resumo }>('/facas/resumo'),
      ]);
      setItems(list.items);
      setTotal(list.total);
      if (list.formatos?.length) setFormatos(list.formatos);
      setResumo(sum.data);
      setSelected((prev) => {
        if (!prev) return null;
        const next = list.items.find((i) => i.id === prev.id);
        return next ?? prev;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar mapa de facas');
    } finally {
      setLoading(false);
    }
  }, [q, formato, maquina, soCompletas, incluirInativas]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, q ? 220 : 0);
    return () => window.clearTimeout(t);
  }, [load, q]);

  const handleSeed = async () => {
    if (!canWrite) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.post('/facas/seed', { force: false });
      setMessage('Itens ausentes importados do mapa oficial (existentes preservados).');
      await load();
    } catch (e) {
      setError(fieldErrors(e));
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async (faca: FacaMapa) => {
    if (!canWrite) return;
    const next = !faca.ativo;
    const verb = next ? 'reativar' : 'inativar';
    if (!window.confirm(`${verb === 'inativar' ? 'Inativar' : 'Reativar'} a faca #${faca.id} (${faca.medida})?`)) {
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await api.patch<{ data: FacaMapa }>(`/facas/${faca.id}/ativo`, { ativo: next });
      setMessage(next ? `Faca #${faca.id} reativada.` : `Faca #${faca.id} inativada.`);
      setSelected(res.data);
      await load();
    } catch (e) {
      setError(fieldErrors(e));
    } finally {
      setSaving(false);
    }
  };

  const previewNova = useMemo(() => {
    const puxada = numOrNull(nova.puxada);
    const z = numOrNull(nova.z);
    const largura = numOrNull(nova.largura_faca);
    const diametro = numOrNull(nova.diametro_cm);
    return {
      medida: nova.medida || '—',
      formato: nova.formato,
      faca: nova.formato,
      puxada: Number.isNaN(puxada as number) ? null : puxada,
      z: Number.isNaN(z as number) ? null : z,
      largura_faca: Number.isNaN(largura as number) ? null : largura,
      diametro_cm: Number.isNaN(diametro as number) ? null : diametro,
      maquina_catalogo: nova.maquina_catalogo,
      completa: puxada != null && !Number.isNaN(puxada) && z != null && !Number.isNaN(z),
    } as FacaMapa;
  }, [nova]);

  const submitNova = async (e: FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    setNovaErro('');

    const medida = nova.medida.trim();
    if (!medida) {
      setNovaErro('Informe a medida.');
      return;
    }
    const puxada = numOrNull(nova.puxada);
    const z = numOrNull(nova.z);
    const repeticao = numOrNull(nova.repeticao);
    const largura = numOrNull(nova.largura_faca);
    const diametro = numOrNull(nova.diametro_cm);
    const nFacas = nova.n_facas.trim() === '' ? null : Number(nova.n_facas);

    for (const [label, val] of [
      ['Puxada', puxada],
      ['Z', z],
      ['Repetição', repeticao],
      ['Largura', largura],
      ['Diâmetro', diametro],
    ] as const) {
      if (val != null && Number.isNaN(val)) {
        setNovaErro(`${label} inválida.`);
        return;
      }
    }
    if (nFacas != null && Number.isNaN(nFacas)) {
      setNovaErro('Nº de facas inválido.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await api.post<{ data: FacaMapa }>('/facas', {
        medida,
        formato: nova.formato,
        maquina_catalogo: nova.maquina_catalogo,
        puxada,
        z,
        repeticao,
        largura_faca: largura,
        diametro_cm: diametro,
        n_facas: nFacas,
        cilindro: nova.cilindro.trim() || null,
        colunas_mapa: nova.colunas_mapa.trim() || null,
        conjugada: nova.conjugada.trim() || null,
        fornecedor: nova.fornecedor.trim() || null,
        cliente_nota: nova.cliente_nota.trim() || null,
      });
      setMessage(`Faca #${res.data.id} cadastrada no mapa.`);
      setShowNova(false);
      setNova(EMPTY_NOVA);
      setSelected(res.data);
      await load();
    } catch (err) {
      setNovaErro(fieldErrors(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Mapa de facas"
        description="Catálogo oficial usado no orçamento (estudo 32). Visualize o desenho, cadastre novas e inative — a geometria existente não é editável."
        actions={
          <div className="btn-row">
            {canWrite ? (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={saving}
                  onClick={() => void handleSeed()}
                >
                  Importar oficiais
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving}
                  onClick={() => {
                    setNova(EMPTY_NOVA);
                    setNovaErro('');
                    setShowNova(true);
                  }}
                >
                  Nova faca
                </button>
              </>
            ) : null}
          </div>
        }
      />

      {error ? <div className="alert alert-error">{error}</div> : null}
      {message ? <div className="alert alert-success">{message}</div> : null}

      <div className="mapa-facas-chrome">
        {resumo ? (
          <section className="mapa-facas-resumo" aria-label="Resumo do mapa">
            <div className="mapa-facas-metric">
              <span>Ativas</span>
              <strong>{resumo.ativas}</strong>
            </div>
            <div className="mapa-facas-metric">
              <span>Completas</span>
              <strong>{resumo.completas}</strong>
            </div>
            <div className="mapa-facas-metric">
              <span>Incompletas</span>
              <strong>{resumo.incompletas}</strong>
            </div>
            <div className="mapa-facas-metric">
              <span>Inativas</span>
              <strong>{resumo.inativas}</strong>
            </div>
            <div
              className="mapa-facas-fonte"
              title={
                resumo.fonte === 'database'
                  ? 'Dados vindos do banco'
                  : 'Fallback JSON do estudo 32'
              }
            >
              Fonte · {resumo.fonte === 'database' ? 'Banco' : 'JSON'}
            </div>
          </section>
        ) : null}

        <div className="mapa-facas-filters" role="search" aria-label="Filtros do mapa">
          <input
            className="mapa-facas-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar medida, cliente, fornecedor…"
            aria-label="Buscar facas"
          />
          <select
            className="mapa-facas-select"
            value={formato}
            onChange={(e) => setFormato(e.target.value)}
            aria-label="Formato"
          >
            <option value="">Formato · todos</option>
            {formatosLista.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <select
            className="mapa-facas-select"
            value={maquina}
            onChange={(e) => setMaquina(e.target.value)}
            aria-label="Máquina"
          >
            <option value="">Máquina · todas</option>
            {MAQUINAS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <label className={`mapa-facas-toggle${soCompletas ? ' is-on' : ''}`}>
            <input
              type="checkbox"
              checked={soCompletas}
              onChange={(e) => setSoCompletas(e.target.checked)}
            />
            Só completas
          </label>
          <label className={`mapa-facas-toggle${incluirInativas ? ' is-on' : ''}`}>
            <input
              type="checkbox"
              checked={incluirInativas}
              onChange={(e) => setIncluirInativas(e.target.checked)}
            />
            Incluir inativas
          </label>
          <p className="mapa-facas-count">
            {loading
              ? 'Carregando…'
              : `${total} faca${total === 1 ? '' : 's'} · ${items.length} na tela`}
          </p>
        </div>
      </div>

      <div className="mapa-facas-layout">
        <div className="card mapa-facas-list-card">
          <div className="card-body" style={{ padding: 0 }}>
            {loading && items.length === 0 ? (
              <p className="loading" style={{ padding: '1.5rem' }}>
                Carregando…
              </p>
            ) : (
              <div className="table-wrap table-wrap--freeze">
                <table className="data-table mapa-facas-table">
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
                      <SortableTh
                        column="z"
                        className="num"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={requestSort}
                        label="Z"
                      >
                        Z
                      </SortableTh>
                      <SortableTh
                        column="rep"
                        className="num"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={requestSort}
                        label="REP"
                      >
                        REP
                      </SortableTh>
                      <SortableTh
                        column="puxada"
                        className="num"
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={requestSort}
                      >
                        Puxada
                      </SortableTh>
                      <SortableTh column="fornecedor" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                        Fornecedor
                      </SortableTh>
                      <SortableTh column="nota" sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                        Nota
                      </SortableTh>
                    </tr>
                  </thead>
                  <tbody>
                    {!loading && items.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="mapa-facas-empty-cell">
                          Nenhuma faca com estes filtros.
                        </td>
                      </tr>
                    ) : (
                      sorted.map((f) => {
                        const aspect = facaAspectFromRecord(f);
                        const active = selected?.id === f.id;
                        const statusHint = [
                          f.ativo ? null : 'inativa',
                          f.completa ? null : 'incompleta',
                        ]
                          .filter(Boolean)
                          .join(' · ');
                        return (
                          <tr
                            key={f.id}
                            className={`clickable${active ? ' is-selected' : ''}${f.ativo ? '' : ' is-inactive'}${f.completa ? '' : ' is-incomplete'}`}
                            tabIndex={0}
                            aria-selected={active}
                            title={statusHint || undefined}
                            onClick={() => setSelected(f)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelected(f);
                              }
                            }}
                          >
                            <td>
                              <div className="mapa-facas-row-formato">
                                <FacaShapeIcon formato={f.formato} aspect={aspect} size={24} />
                                <span>{formatoLabel(f.formato)}</span>
                              </div>
                            </td>
                            <td className="medida">
                              <div className="mapa-facas-medida-cell">
                                {f.tamanho_tipo === 'diametro' ? (
                                  <span className="badge-diam">{f.medida}</span>
                                ) : (
                                  <strong>{f.medida}</strong>
                                )}
                                {!f.completa ? (
                                  <span className="mapa-facas-incomplete-tag">incompleta</span>
                                ) : null}
                              </div>
                            </td>
                            <td className="maquina">{f.maquina_catalogo || '—'}</td>
                            <td className="num">{fmtNum(f.z, 1)}</td>
                            <td className="num">{fmtNum(f.repeticao, 2)}</td>
                            <td className="num">
                              {f.puxada != null ? (
                                fmtNum(f.puxada, 2)
                              ) : (
                                <em className="warn-txt">manual</em>
                              )}
                            </td>
                            <td className="fornecedor" title={f.fornecedor || undefined}>
                              {f.fornecedor || '—'}
                            </td>
                            <td className="nota" title={f.cliente_nota || undefined}>
                              {f.cliente_nota || '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <aside className="mapa-facas-detail card" aria-live="polite">
          {!selected ? (
            <div className="card-body mapa-facas-detail-empty">
              <p>Selecione uma faca para ver o desenho e os parâmetros.</p>
              <p className="hint">Geometria não é editável — cadastre uma nova e inative a antiga se precisar corrigir.</p>
            </div>
          ) : (
            <div className="card-body mapa-facas-detail-body">
              <div className="mapa-facas-detail-head">
                <div
                  className={`mapa-facas-detail-visual${selected.completa ? '' : ' is-incomplete'}`}
                  title={formatoLabel(selected.formato)}
                >
                  <FacaShapeIcon
                    formato={selected.formato}
                    aspect={facaAspectFromRecord(selected)}
                    size={72}
                  />
                  <span>{formatoKind(selected.formato)}</span>
                </div>
                <div>
                  <div className="mapa-facas-detail-kicker">#{selected.id}</div>
                  <h2>{selected.medida}</h2>
                  <p>{selected.label || formatoLabel(selected.formato)}</p>
                  <div className="mapa-facas-detail-pills">
                    <StatusPill status={selected.ativo ? 'ATIVA' : 'INATIVA'} />
                    <StatusPill status={selected.completa ? 'COMPLETA' : 'INCOMPLETA'} />
                  </div>
                </div>
              </div>

              <dl className="mapa-facas-dl">
                <div>
                  <dt>Formato</dt>
                  <dd>{formatoLabel(selected.formato)}</dd>
                </div>
                <div>
                  <dt>Máquina</dt>
                  <dd>{selected.maquina_catalogo || '—'}</dd>
                </div>
                <div>
                  <dt>Fornecedor</dt>
                  <dd title={selected.fornecedor || undefined}>{selected.fornecedor || '—'}</dd>
                </div>
                <div>
                  <dt>Conjugada</dt>
                  <dd title={selected.conjugada || undefined}>{selected.conjugada || '—'}</dd>
                </div>
                <div>
                  <dt>Puxada</dt>
                  <dd>{fmtNum(selected.puxada, 4)}</dd>
                </div>
                <div>
                  <dt>Z</dt>
                  <dd>{fmtNum(selected.z, 2)}</dd>
                </div>
                <div>
                  <dt>Repetição</dt>
                  <dd>{fmtNum(selected.repeticao, 4)}</dd>
                </div>
                <div>
                  <dt>N facas</dt>
                  <dd>{selected.n_facas ?? '—'}</dd>
                </div>
                <div>
                  <dt>Largura</dt>
                  <dd>{fmtNum(selected.largura_faca, 2)} cm</dd>
                </div>
                <div>
                  <dt>Diâmetro</dt>
                  <dd>{fmtNum(selected.diametro_cm, 2)} cm</dd>
                </div>
                <div>
                  <dt>Cilindro</dt>
                  <dd>{selected.cilindro || '—'}</dd>
                </div>
                <div>
                  <dt>Colunas</dt>
                  <dd>{selected.colunas_mapa || '—'}</dd>
                </div>
                <div className="full">
                  <dt>Nota / cliente</dt>
                  <dd title={selected.cliente_nota || undefined}>{selected.cliente_nota || '—'}</dd>
                </div>
              </dl>

              <RegistroMetaStrip registro={selected} />

              {canWrite ? (
                <div className="btn-row mapa-facas-detail-actions">
                  <button
                    type="button"
                    className={selected.ativo ? 'btn btn-secondary' : 'btn btn-primary'}
                    disabled={saving}
                    onClick={() => void toggleAtivo(selected)}
                  >
                    {selected.ativo ? 'Inativar' : 'Reativar'}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </aside>
      </div>

      {showNova ? (
        <div className="faca-modal" role="dialog" aria-modal="true" aria-labelledby="mapa-nova-title">
          <button
            type="button"
            className="faca-modal-backdrop"
            aria-label="Fechar"
            onClick={() => !saving && setShowNova(false)}
          />
          <div className="faca-modal-panel mapa-facas-nova-panel">
            <div className="faca-modal-head">
              <div>
                <h2 id="mapa-nova-title">Cadastrar faca no mapa</h2>
                <p className="faca-modal-sub">
                  Após aprovação de FACA NOVA no ORC, registre aqui a geometria definitiva.
                </p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" disabled={saving} onClick={() => setShowNova(false)}>
                Fechar
              </button>
            </div>

            <form className="mapa-facas-nova" onSubmit={(e) => void submitNova(e)}>
              <div className="mapa-facas-nova-preview" aria-hidden>
                <FacaShapeIcon
                  formato={previewNova.formato}
                  aspect={facaAspectFromRecord(previewNova)}
                  size={96}
                />
                <div>
                  <strong>{previewNova.medida}</strong>
                  <span>
                    {formatoKind(previewNova.formato)} · {previewNova.maquina_catalogo}
                  </span>
                  <span className="hint">
                    {previewNova.completa ? 'Completa (puxada + Z)' : 'Incompleta — ORC pedirá puxada/Z manuais'}
                  </span>
                </div>
              </div>

              <div className="form-grid">
                <label className="form-group">
                  <span>Medida *</span>
                  <input
                    value={nova.medida}
                    onChange={(e) => setNova((p) => ({ ...p, medida: e.target.value }))}
                    placeholder="ex.: 8,0X12 ou Ø5"
                    required
                  />
                </label>
                <label className="form-group">
                  <span>Formato *</span>
                  <select
                    value={nova.formato}
                    onChange={(e) => setNova((p) => ({ ...p, formato: e.target.value }))}
                  >
                    {FORMATOS_PADRAO.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-group">
                  <span>Máquina *</span>
                  <select
                    value={nova.maquina_catalogo}
                    onChange={(e) => setNova((p) => ({ ...p, maquina_catalogo: e.target.value }))}
                  >
                    {MAQUINAS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-group">
                  <span>Puxada (cm)</span>
                  <input
                    value={nova.puxada}
                    onChange={(e) => setNova((p) => ({ ...p, puxada: e.target.value }))}
                    inputMode="decimal"
                  />
                </label>
                <label className="form-group">
                  <span>Z</span>
                  <input
                    value={nova.z}
                    onChange={(e) => setNova((p) => ({ ...p, z: e.target.value }))}
                    inputMode="decimal"
                  />
                </label>
                <label className="form-group">
                  <span>Repetição</span>
                  <input
                    value={nova.repeticao}
                    onChange={(e) => setNova((p) => ({ ...p, repeticao: e.target.value }))}
                    inputMode="decimal"
                  />
                </label>
                <label className="form-group">
                  <span>Largura faca (cm)</span>
                  <input
                    value={nova.largura_faca}
                    onChange={(e) => setNova((p) => ({ ...p, largura_faca: e.target.value }))}
                    inputMode="decimal"
                  />
                </label>
                <label className="form-group">
                  <span>Diâmetro (cm)</span>
                  <input
                    value={nova.diametro_cm}
                    onChange={(e) => setNova((p) => ({ ...p, diametro_cm: e.target.value }))}
                    inputMode="decimal"
                  />
                </label>
                <label className="form-group">
                  <span>N facas</span>
                  <input
                    value={nova.n_facas}
                    onChange={(e) => setNova((p) => ({ ...p, n_facas: e.target.value }))}
                    inputMode="numeric"
                  />
                </label>
                <label className="form-group">
                  <span>Cilindro</span>
                  <input
                    value={nova.cilindro}
                    onChange={(e) => setNova((p) => ({ ...p, cilindro: e.target.value }))}
                  />
                </label>
                <label className="form-group">
                  <span>Colunas mapa</span>
                  <input
                    value={nova.colunas_mapa}
                    onChange={(e) => setNova((p) => ({ ...p, colunas_mapa: e.target.value }))}
                  />
                </label>
                <label className="form-group">
                  <span>Fornecedor</span>
                  <input
                    value={nova.fornecedor}
                    onChange={(e) => setNova((p) => ({ ...p, fornecedor: e.target.value }))}
                  />
                </label>
                <label className="form-group span-full">
                  <span>Conjugada</span>
                  <input
                    value={nova.conjugada}
                    onChange={(e) => setNova((p) => ({ ...p, conjugada: e.target.value }))}
                  />
                </label>
                <label className="form-group span-full">
                  <span>Nota / cliente</span>
                  <input
                    value={nova.cliente_nota}
                    onChange={(e) => setNova((p) => ({ ...p, cliente_nota: e.target.value }))}
                  />
                </label>
              </div>

              {novaErro ? <div className="alert alert-error">{novaErro}</div> : null}

              <div className="btn-row" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setShowNova(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Salvando…' : 'Cadastrar no mapa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
