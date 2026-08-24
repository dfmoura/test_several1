import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { FornecedorMapaCombobox } from '../components/FornecedorMapaCombobox';
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
import { FORMATOS_CANONICOS, mergeVocabulario } from '../lib/facasMapa';
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
  maquinas?: string[];
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

const FACA_SORT = {
  formato: (f: FacaMapa) => formatoLabel(f.formato),
  medida: (f: FacaMapa) => f.medida,
  n_facas: (f: FacaMapa) => (f.n_facas != null ? Number(f.n_facas) : null),
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
  maquina_catalogo: '',
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
  const [maquinas, setMaquinas] = useState<string[]>([]);
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
  const [editMeta, setEditMeta] = useState({
    maquina_catalogo: '',
    n_facas: '',
    cilindro: '',
    colunas_mapa: '',
    conjugada: '',
    fornecedor: '',
    cliente_nota: '',
  });

  const { sorted, sorts, sortKey, sortDir, requestSort } = useTableSort(items, FACA_SORT);

  const formatosLista = mergeVocabulario(FORMATOS_CANONICOS, formatos);
  const maquinasLista = maquinas;

  useEffect(() => {
    if (!selected) return;
    setEditMeta({
      maquina_catalogo: selected.maquina_catalogo ?? '',
      n_facas: selected.n_facas != null ? String(selected.n_facas) : '',
      cilindro: selected.cilindro ?? '',
      colunas_mapa: selected.colunas_mapa ?? '',
      conjugada: selected.conjugada ?? '',
      fornecedor: selected.fornecedor ?? '',
      cliente_nota: selected.cliente_nota ?? '',
    });
  }, [selected]);

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
      if (list.maquinas?.length) setMaquinas(list.maquinas);
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

  const handleAlinharFornecedores = async () => {
    if (!canWrite) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await api.post<{
        data: {
          atualizados: number;
          ja_alinhados: number;
          sem_match: { rotulo: string; facas: number }[];
          ambiguos: { rotulo: string; facas: number }[];
          mapa: { de: string; para: string; facas: number; parceiro: string }[];
          materializado?: boolean;
          materializados?: number;
        };
      }>('/facas/alinhar-fornecedores');
      const d = res.data;
      const linhas = d.mapa.map((m) => `${m.de} → ${m.para} (${m.facas})`);
      const pendentes = d.sem_match.map((s) => `${s.rotulo} (${s.facas})`);
      const partes = [
        d.materializado && d.materializados
          ? `mapa da empresa materializado (${d.materializados} facas)`
          : '',
        `${d.atualizados} faca(s) atualizada(s)`,
        d.ja_alinhados ? `${d.ja_alinhados} já alinhada(s)` : '',
        linhas.length ? `mapeamento: ${linhas.join('; ')}` : '',
        pendentes.length ? `sem PAR correspondente: ${pendentes.join(', ')}` : '',
      ].filter(Boolean);
      setMessage(partes.join(' · ') || 'Nada a alinhar.');
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

  const saveMetadados = async () => {
    if (!canWrite || !selected) return;
    const nFacas = editMeta.n_facas.trim() === '' ? null : Number(editMeta.n_facas);
    if (nFacas != null && Number.isNaN(nFacas)) {
      setError('Nº de facas inválido.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await api.patch<{ data: FacaMapa }>(`/facas/${selected.id}`, {
        maquina_catalogo: editMeta.maquina_catalogo || selected.maquina_catalogo,
        n_facas: nFacas,
        cilindro: editMeta.cilindro.trim() || null,
        colunas_mapa: editMeta.colunas_mapa.trim() || null,
        conjugada: editMeta.conjugada.trim() || null,
        fornecedor: editMeta.fornecedor.trim() || null,
        cliente_nota: editMeta.cliente_nota.trim() || null,
      });
      setMessage(`Faca #${selected.id}: dados operacionais atualizados.`);
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
        description="Catálogo da empresa usado no orçamento. Formatos e máquinas vêm do mapa e do catálogo ORC. Geometria existente não se edita — ajuste nota, fornecedor e grupo hora-máquina; para corrigir medida, cadastre nova e inative a antiga."
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
                  className="btn btn-secondary"
                  disabled={saving}
                  title="Atualiza o texto legado (PERFIL, MLC…) com o nome do fornecedor cadastrado em Parceiros. Não cria cadastro e não altera geometria."
                  onClick={() => void handleAlinharFornecedores()}
                >
                  Alinhar fornecedores
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving}
                  onClick={() => {
                    const firstMaq = maquinasLista[0] ?? '';
                    setNova({ ...EMPTY_NOVA, maquina_catalogo: firstMaq, formato: formatosLista[0] ?? 'RETA' });
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
            {maquinasLista.map((m) => (
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
            {!loading ? (
              <span
                className="mapa-facas-sort-hint"
                title="Clique no cabeçalho ordena por uma coluna. Shift+clique soma o próximo critério (desempate)."
              >
                {sorts.length > 1
                  ? ` · ${sorts.length} critérios`
                  : ' · Shift+clique soma'}
              </span>
            ) : null}
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
                      <SortableTh
                        column="z"
                        className="num"
                        sorts={sorts} sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={requestSort}
                        label="Z"
                      >
                        Z
                      </SortableTh>
                      <SortableTh
                        column="rep"
                        className="num"
                        sorts={sorts} sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={requestSort}
                        label="REP"
                      >
                        REP
                      </SortableTh>
                      <SortableTh
                        column="puxada"
                        className="num"
                        sorts={sorts} sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={requestSort}
                      >
                        Puxada
                      </SortableTh>
                      <SortableTh column="fornecedor" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                        Fornecedor
                      </SortableTh>
                      <SortableTh column="nota" sorts={sorts} sortKey={sortKey} sortDir={sortDir} onSort={requestSort}>
                        Nota
                      </SortableTh>
                    </tr>
                  </thead>
                  <tbody>
                    {!loading && items.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="mapa-facas-empty-cell">
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
                            <td className="num">{f.n_facas != null ? fmtNum(f.n_facas, 0) : '—'}</td>
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
              <p className="hint">Geometria (medida, puxada, Z) não é editável. Nota, fornecedor e grupo ORC podem acompanhar a operação desta empresa.</p>
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
                <form
                  className="mapa-facas-meta-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void saveMetadados();
                  }}
                >
                  <p className="hint" style={{ margin: '0 0 0.75rem' }}>
                    Dados operacionais desta empresa — não altera a geometria.
                  </p>
                  <div className="form-grid">
                    <label className="form-group">
                      <span>Grupo ORC (máquina)</span>
                      {maquinasLista.length > 0 ? (
                        <select
                          value={editMeta.maquina_catalogo}
                          onChange={(e) =>
                            setEditMeta((p) => ({ ...p, maquina_catalogo: e.target.value }))
                          }
                        >
                          {editMeta.maquina_catalogo &&
                          !maquinasLista.includes(editMeta.maquina_catalogo) ? (
                            <option value={editMeta.maquina_catalogo}>
                              {editMeta.maquina_catalogo}
                            </option>
                          ) : null}
                          {maquinasLista.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={editMeta.maquina_catalogo}
                          onChange={(e) =>
                            setEditMeta((p) => ({ ...p, maquina_catalogo: e.target.value }))
                          }
                        />
                      )}
                    </label>
                    <label className="form-group">
                      <span>N facas</span>
                      <input
                        value={editMeta.n_facas}
                        onChange={(e) => setEditMeta((p) => ({ ...p, n_facas: e.target.value }))}
                        inputMode="numeric"
                      />
                    </label>
                    <label className="form-group">
                      <span>Cilindro</span>
                      <input
                        value={editMeta.cilindro}
                        onChange={(e) => setEditMeta((p) => ({ ...p, cilindro: e.target.value }))}
                      />
                    </label>
                    <label className="form-group">
                      <span>Colunas</span>
                      <input
                        value={editMeta.colunas_mapa}
                        onChange={(e) => setEditMeta((p) => ({ ...p, colunas_mapa: e.target.value }))}
                      />
                    </label>
                    <FornecedorMapaCombobox
                      className="span-full"
                      value={editMeta.fornecedor}
                      onChange={(fornecedor) => setEditMeta((p) => ({ ...p, fornecedor }))}
                      disabled={!canWrite}
                    />
                    <label className="form-group span-full">
                      <span>Conjugada</span>
                      <input
                        value={editMeta.conjugada}
                        onChange={(e) => setEditMeta((p) => ({ ...p, conjugada: e.target.value }))}
                      />
                    </label>
                    <label className="form-group span-full">
                      <span>Nota / parceiro</span>
                      <input
                        value={editMeta.cliente_nota}
                        onChange={(e) => setEditMeta((p) => ({ ...p, cliente_nota: e.target.value }))}
                      />
                    </label>
                  </div>
                  <div className="btn-row mapa-facas-detail-actions">
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? 'Salvando…' : 'Salvar ajuste'}
                    </button>
                    <button
                      type="button"
                      className={selected.ativo ? 'btn btn-secondary' : 'btn btn-primary'}
                      disabled={saving}
                      onClick={() => void toggleAtivo(selected)}
                    >
                      {selected.ativo ? 'Inativar' : 'Reativar'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="btn-row mapa-facas-detail-actions" />
              )}
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
                  <input
                    list="mapa-facas-formatos"
                    value={nova.formato}
                    onChange={(e) =>
                      setNova((p) => ({ ...p, formato: e.target.value.toUpperCase() }))
                    }
                    placeholder="RETA, REDONDA, ou o formato da casa"
                    required
                  />
                  <datalist id="mapa-facas-formatos">
                    {formatosLista.map((f) => (
                      <option key={f} value={f} />
                    ))}
                  </datalist>
                </label>
                <label className="form-group">
                  <span>Máquina *</span>
                  {maquinasLista.length > 0 ? (
                    <select
                      value={nova.maquina_catalogo}
                      onChange={(e) => setNova((p) => ({ ...p, maquina_catalogo: e.target.value }))}
                      required
                    >
                      <option value="" disabled>
                        Selecione o grupo ORC
                      </option>
                      {maquinasLista.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={nova.maquina_catalogo}
                      onChange={(e) =>
                        setNova((p) => ({ ...p, maquina_catalogo: e.target.value.toUpperCase() }))
                      }
                      placeholder="Código do grupo hora-máquina"
                      required
                    />
                  )}
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
                <FornecedorMapaCombobox
                  value={nova.fornecedor}
                  onChange={(fornecedor) => setNova((p) => ({ ...p, fornecedor }))}
                />
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
