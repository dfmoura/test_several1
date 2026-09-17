import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FiscalCombobox, formatCest, formatNcm, type FiscalOption } from '../components/FiscalCombobox';
import { PageHeader } from '../components/PageHeader';
import { ProdutoFornecedorCodigosPanel } from '../components/ProdutoFornecedorCodigosPanel';
import { RegistroMetaStrip, type RegistroAutoria } from '../components/RegistroMetaStrip';
import { api, fiscalConsulta, type Produto, type ProdutoFornecedorCodigo, type ProdutoGrupo } from '../lib/api';
import { useAuth } from '../lib/auth';
import { onAbrirFichaClick } from '../lib/fichaNav';
import { decideBobinaDimensoesUi } from '../lib/produtoBobinaDimensoesUi';
import {
  buildCadastroChecklist,
  decideCadastroOrientacao,
  decideModeloOrigemBanner,
  nomesAindaIguaisAoModelo,
} from '../lib/produtoCadastroOrientacaoUi';
import { decideUnidadesConversaoUi, unidadesDiferem } from '../lib/produtoUnidadesConversaoUi';
import { politicaLotePorGrupo } from '../lib/produtoLotePolitica';
import { DECIMAL_SCALE, decimalStep, familiaLabel, naturezaGrupoLabel } from '../lib/format';

/** Chaves do formulário em `atributos` — espelho de ProdutoAtributos::FORM_KEYS. */
const ATRIBUTOS_FORM_KEYS = [
  'largura_mm',
  'comprimento_m',
  'gramatura_g_m2',
  'grupo_estoque',
  'programa_compra',
] as const;

const FAMILIAS = ['MP', 'EMB', 'REV', 'PA', 'SVC', 'FAC', 'MUC'] as const;

/** Grupo canônico padrão por família (estudo RLP / catálogo fixo). */
const DEFAULT_GRUPO_BY_FAMILIA: Record<string, string> = {
  MP: 'MP-PAP',
  EMB: 'EMB-TUB',
  REV: 'REV-RIB',
  PA: 'PA-ETQ',
  SVC: 'SVC',
  FAC: 'FAC',
  MUC: 'MUC-GER',
};

const FAMILIA_SPED_DEFAULT: Record<string, string> = {
  MP: '01',
  EMB: '02',
  REV: '00',
  PA: '04',
  SVC: '09',
  FAC: '04',
  MUC: '07',
};

/** Rótulo operacional da linha de estoque (atributo grupo_estoque / GG da máscara). */
function linhaEstoqueLabel(
  codigo: string,
  linhas?: Array<{ codigo: string; nome: string }> | null,
): string {
  const nome = linhas?.find((l) => l.codigo === codigo)?.nome;
  return nome ? `${codigo} — ${nome}` : codigo;
}

/** Alinha grupo_estoque ao catálogo do grupo canônico (padrao ou 1ª linha válida). */
function alinharLinhaEstoque(
  atual: string,
  grupo: Pick<ProdutoGrupo, 'grupo_estoque_padrao' | 'grupos_estoque'>,
): string {
  const linhas = grupo.grupos_estoque ?? [];
  const padrao = grupo.grupo_estoque_padrao ?? '';
  if (linhas.length > 0) {
    if (linhas.some((l) => l.codigo === atual)) return atual;
    return padrao || linhas[0].codigo;
  }
  return padrao;
}

/** Fallback local se /consulta/unidades falhar — espelha UnidadesMedida (API). */
const UNIDADES_FALLBACK: Array<{ codigo: string; descricao: string; uso?: string }> = [
  { codigo: 'RL', descricao: 'Rolo / bobina' },
  { codigo: 'M', descricao: 'Metro linear' },
  { codigo: 'M2', descricao: 'Metro quadrado' },
  { codigo: 'KG', descricao: 'Quilograma' },
  { codigo: 'G', descricao: 'Grama' },
  { codigo: 'UN', descricao: 'Unidade' },
  { codigo: 'MIL', descricao: 'Milheiro' },
  { codigo: 'L', descricao: 'Litro' },
  { codigo: 'CX', descricao: 'Caixa' },
  { codigo: 'PCT', descricao: 'Pacote' },
];

type TabId = 'comercial' | 'fiscal';

type FatorSugestao = {
  status: string;
  fator: string | null;
  formula: string | null;
  origem: string | null;
  faltando: string[];
  mensagem: string | null;
};

type ProdutoFormData = {
  familia: string;
  codigo: string;
  grupo_id: string;
  grupo: string;
  descricao_fiscal: string;
  descricao_comercial: string;
  ncm: string;
  cest: string;
  origem: string;
  tipo_item_sped: string;
  unidade_comercial: string;
  unidade_interna: string;
  fator_conversao: string;
  largura_mm: string;
  comprimento_m: string;
  gramatura_g_m2: string;
  programa_compra: string;
  grupo_estoque: string;
  cfop_saida_padrao: string;
  cfop_entrada_padrao: string;
  csosn: string;
  cst_icms: string;
  cst_pis: string;
  cst_cofins: string;
  cst_cbs: string;
  cclass_trib: string;
  aliquota_cbs: string;
  preco_tabela: string;
  estoque_minimo: string;
  lead_time_dias: string;
  controla_lote: boolean;
  controla_validade: boolean;
  prazo_validade_dias: string;
  gtin: string;
  situacao: string;
};

const emptyForm = (): ProdutoFormData => ({
  familia: 'MP',
  codigo: '',
  grupo_id: '',
  grupo: '',
  descricao_fiscal: '',
  descricao_comercial: '',
  ncm: '',
  cest: '',
  origem: '0',
  tipo_item_sped: '01',
  unidade_comercial: 'M2',
  unidade_interna: '',
  fator_conversao: '',
  largura_mm: '',
  comprimento_m: '',
  gramatura_g_m2: '',
  programa_compra: '',
  grupo_estoque: '',
  cfop_saida_padrao: '',
  cfop_entrada_padrao: '',
  csosn: '102',
  cst_icms: '',
  cst_pis: '',
  cst_cofins: '',
  cst_cbs: '',
  cclass_trib: '',
  // Ano-teste 2026 (LC 214) — contador pode ajustar.
  aliquota_cbs: '0.9000',
  preco_tabela: '',
  estoque_minimo: '',
  lead_time_dias: '',
  controla_lote: false,
  controla_validade: false,
  prazo_validade_dias: '',
  gtin: '',
  situacao: 'ATIVO',
});

function attrStr(attrs: Record<string, unknown> | null | undefined, key: string): string {
  const v = attrs?.[key];
  if (v === null || v === undefined || v === '') return '';
  return String(v);
}

/** Metadados de seed/sistema que o form não edita — reenviados no save. */
function atributosExtrasFromProduto(
  attrs: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!attrs) return {};
  const extras: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(attrs)) {
    if ((ATRIBUTOS_FORM_KEYS as readonly string[]).includes(k)) continue;
    extras[k] = v;
  }
  return extras;
}

function fromProduto(p: Produto): ProdutoFormData {
  return {
    familia: p.familia,
    codigo: p.codigo,
    grupo_id: p.grupo_id != null ? String(p.grupo_id) : '',
    grupo: p.grupo ?? p.grupo_catalogo?.codigo ?? '',
    descricao_fiscal: (p.descricao_fiscal ?? '').toUpperCase(),
    descricao_comercial: (p.descricao_comercial ?? '').toUpperCase(),
    ncm: p.ncm ?? '',
    cest: p.cest ?? '',
    origem: p.origem != null ? String(p.origem) : '0',
    tipo_item_sped: p.tipo_item_sped ?? FAMILIA_SPED_DEFAULT[p.familia] ?? '',
    unidade_comercial: p.unidade_comercial ?? 'UN',
    unidade_interna: p.unidade_interna ?? '',
    fator_conversao: p.fator_conversao ?? '',
    largura_mm: attrStr(p.atributos, 'largura_mm'),
    comprimento_m: attrStr(p.atributos, 'comprimento_m'),
    gramatura_g_m2: attrStr(p.atributos, 'gramatura_g_m2'),
    programa_compra: attrStr(p.atributos, 'programa_compra'),
    grupo_estoque: attrStr(p.atributos, 'grupo_estoque'),
    cfop_saida_padrao: p.cfop_saida_padrao ?? '',
    cfop_entrada_padrao: p.cfop_entrada_padrao ?? '',
    csosn: p.csosn ?? '',
    cst_icms: p.cst_icms ?? '',
    cst_pis: p.cst_pis ?? '',
    cst_cofins: p.cst_cofins ?? '',
    cst_cbs: p.cst_cbs ?? '',
    cclass_trib: p.cclass_trib ?? '',
    aliquota_cbs: p.aliquota_cbs ?? '',
    preco_tabela: p.preco_tabela ?? '',
    estoque_minimo: p.estoque_minimo ?? '',
    lead_time_dias: p.lead_time_dias != null ? String(p.lead_time_dias) : '',
    controla_lote: !!p.controla_lote,
    controla_validade: !!p.controla_validade,
    prazo_validade_dias: p.prazo_validade_dias != null ? String(p.prazo_validade_dias) : '',
    gtin: p.gtin ?? '',
    situacao: p.situacao,
  };
}

/**
 * Template para “Novo a partir deste”: copia cadastro útil, sem identidade operacional.
 * Não leva código, estoque, de-para, meta de seed/XML nem GTIN real.
 */
function fromProdutoTemplate(p: Produto): ProdutoFormData {
  const base = fromProduto(p);
  const gtinRaw = base.gtin.trim();
  const gtinKeep =
    !gtinRaw || gtinRaw.toUpperCase() === 'SEM GTIN' ? gtinRaw : '';
  return {
    ...base,
    codigo: '',
    situacao: 'ATIVO',
    gtin: gtinKeep,
  };
}

function templateAvancadoOpen(form: ProdutoFormData): boolean {
  return Boolean(
    form.preco_tabela.trim() ||
      form.estoque_minimo.trim() ||
      form.lead_time_dias.trim() ||
      form.controla_lote ||
      form.controla_validade ||
      form.prazo_validade_dias.trim() ||
      (form.gtin.trim() && form.gtin.trim().toUpperCase() !== 'SEM GTIN') ||
      form.situacao === 'INATIVO',
  );
}

function applyGrupoDefaults(base: ProdutoFormData, grupo: ProdutoGrupo, force: boolean): ProdutoFormData {
  const fill = (current: string, next: string | null | undefined) =>
    force || !current ? (next ?? '') : current;

  return {
    ...base,
    grupo_id: String(grupo.id),
    grupo: grupo.codigo,
    familia: grupo.familia,
    tipo_item_sped: fill(base.tipo_item_sped, grupo.tipo_item_sped),
    ncm: fill(base.ncm, grupo.ncm_padrao),
    unidade_comercial: fill(base.unidade_comercial, grupo.unidade_comercial_padrao),
    unidade_interna: fill(base.unidade_interna, grupo.unidade_interna_padrao),
    grupo_estoque: fill(base.grupo_estoque, grupo.grupo_estoque_padrao),
    cfop_entrada_padrao: fill(base.cfop_entrada_padrao, grupo.cfop_entrada_padrao),
    cfop_saida_padrao: fill(base.cfop_saida_padrao, grupo.cfop_saida_padrao),
    ...(() => {
      const pol = politicaLotePorGrupo(grupo.codigo);
      if (!force && (base.controla_lote || base.controla_validade || base.prazo_validade_dias)) {
        return {};
      }
      return {
        controla_lote: pol.controla_lote,
        controla_validade: pol.controla_validade,
        prazo_validade_dias: pol.prazo_validade_dias != null ? String(pol.prazo_validade_dias) : '',
      };
    })(),
  };
}

function toPayload(
  form: ProdutoFormData,
  atributosExtras: Record<string, unknown> = {},
): Record<string, unknown> {
  const atributos: Record<string, unknown> = { ...atributosExtras };
  if (form.largura_mm) atributos.largura_mm = form.largura_mm;
  else delete atributos.largura_mm;
  if (form.comprimento_m) atributos.comprimento_m = form.comprimento_m;
  else delete atributos.comprimento_m;
  if (form.gramatura_g_m2) atributos.gramatura_g_m2 = form.gramatura_g_m2;
  else delete atributos.gramatura_g_m2;
  if (form.programa_compra.trim()) atributos.programa_compra = form.programa_compra.trim();
  else delete atributos.programa_compra;
  if (form.grupo_estoque) atributos.grupo_estoque = form.grupo_estoque;
  else delete atributos.grupo_estoque;

  const payload: Record<string, unknown> = {
    familia: form.familia,
    grupo_id: form.grupo_id ? parseInt(form.grupo_id, 10) : null,
    grupo: form.grupo || null,
    descricao_fiscal: form.descricao_fiscal.trim().toUpperCase(),
    descricao_comercial: form.descricao_comercial.trim()
      ? form.descricao_comercial.trim().toUpperCase()
      : null,
    ncm: form.ncm || null,
    cest: form.cest || null,
    origem: form.origem !== '' ? parseInt(form.origem, 10) : null,
    tipo_item_sped: form.tipo_item_sped || null,
    unidade_comercial: form.unidade_comercial || null,
    unidade_interna: form.unidade_interna || null,
    fator_conversao: form.fator_conversao || null,
    cfop_saida_padrao: form.cfop_saida_padrao || null,
    cfop_entrada_padrao: form.cfop_entrada_padrao || null,
    csosn: form.csosn || null,
    cst_icms: form.cst_icms || null,
    cst_pis: form.cst_pis || null,
    cst_cofins: form.cst_cofins || null,
    cst_cbs: form.cst_cbs || null,
    cclass_trib: form.cclass_trib || null,
    aliquota_cbs: form.aliquota_cbs || null,
    preco_tabela: form.preco_tabela || null,
    estoque_minimo: form.estoque_minimo || null,
    lead_time_dias: form.lead_time_dias ? parseInt(form.lead_time_dias, 10) : null,
    controla_lote: form.controla_lote,
    controla_validade: form.controla_validade,
    prazo_validade_dias: form.prazo_validade_dias ? parseInt(form.prazo_validade_dias, 10) : null,
    gtin: form.gtin || null,
    situacao: form.situacao,
    atributos,
  };
  if (form.codigo) payload.codigo = form.codigo;
  return payload;
}

function mapFiscalOptions(
  rows: Array<{
    codigo: string;
    descricao: string;
    destaque?: boolean;
    observacao?: string | null;
    tipo?: string;
    regime?: string;
    vinculado_ncm?: boolean;
  }>
): FiscalOption[] {
  return rows.map((r) => ({
    codigo: r.codigo,
    descricao: r.descricao,
    destaque: r.destaque,
    observacao: r.observacao ?? null,
    meta: r.vinculado_ncm
      ? 'Vinculado ao NCM'
      : r.tipo
        ? r.tipo
        : r.regime
          ? r.regime
          : null,
  }));
}

function formatNcmHint(ncm: string | null | undefined): string {
  if (!ncm) return '—';
  if (ncm.length !== 8) return ncm;
  return `${ncm.slice(0, 4)}.${ncm.slice(4, 6)}.${ncm.slice(6)}`;
}

export function ProdutoFormPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isNew = id === 'novo';
  const fromId = isNew ? searchParams.get('from')?.trim() || null : null;
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('produto.escrever');
  const canFiscal = hasPermission('produto.fiscal');

  const [tab, setTab] = useState<TabId>('comercial');
  const [form, setForm] = useState<ProdutoFormData>(emptyForm());
  const [grupos, setGrupos] = useState<ProdutoGrupo[]>([]);
  const [origens, setOrigens] = useState<Array<{ codigo: string; descricao: string }>>([]);
  const [tiposSped, setTiposSped] = useState<Array<{ codigo: string; descricao: string }>>([]);
  const [unidades, setUnidades] = useState(UNIDADES_FALLBACK);
  const [fatorSugestao, setFatorSugestao] = useState<FatorSugestao | null>(null);
  /** true = operador editou o fator; não sobrescrever com auto. */
  const [fatorManual, setFatorManual] = useState(!isNew);
  const [loading, setLoading] = useState(!isNew || Boolean(fromId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [modeloOrigemCodigo, setModeloOrigemCodigo] = useState<string | null>(null);
  const [modeloOrigemNomes, setModeloOrigemNomes] = useState<{
    comercial: string;
    fiscal: string;
  } | null>(null);
  const [autoria, setAutoria] = useState<RegistroAutoria | null>(null);
  const [fornecedorCodigos, setFornecedorCodigos] = useState<ProdutoFornecedorCodigo[]>([]);
  const [atributosExtras, setAtributosExtras] = useState<Record<string, unknown>>({});
  const [avancadoOpen, setAvancadoOpen] = useState(false);
  const [deParaDraft, setDeParaDraft] = useState({
    fornecedor_id: '',
    c_prod: '',
    x_prod: '',
  });
  const [fornecedoresDraft, setFornecedoresDraft] = useState<
    Array<{ id: number; codigo: string; razao_social: string; nome_fantasia: string | null }>
  >([]);
  useEffect(() => {
    void (async () => {
      try {
        const [o, t, u] = await Promise.all([
          fiscalConsulta.origens(),
          fiscalConsulta.tiposItemSped(),
          fiscalConsulta.unidades(),
        ]);
        setOrigens(o.data);
        setTiposSped(t.data);
        if (u.data.length) setUnidades(u.data);
      } catch {
        /* selects ainda funcionam com fallback mínimo */
      }
    })();
  }, []);

  useEffect(() => {
    if (!isNew) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get<{
          data: Array<{
            id: number;
            codigo: string;
            razao_social: string;
            nome_fantasia: string | null;
            papel_fornecedor?: boolean;
          }>;
        }>('/parceiros?papel=fornecedor');
        if (!cancelled) {
          setFornecedoresDraft(
            res.data
              .filter((p) => p.papel_fornecedor !== false)
              .map((p) => ({
                id: p.id,
                codigo: p.codigo,
                razao_social: p.razao_social,
                nome_fantasia: p.nome_fantasia,
              })),
          );
        }
      } catch {
        if (!cancelled) setFornecedoresDraft([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isNew]);


  useEffect(() => {
    let cancelled = false;
    const familia = form.familia;
    void (async () => {
      try {
        const res = await fiscalConsulta.produtoGrupos(familia);
        if (!cancelled) setGrupos(res.data);
      } catch {
        if (!cancelled) setGrupos([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.familia]);

  useEffect(() => {
    if (isNew) return;
    void (async () => {
      try {
        const res = await api.get<{ data: Produto }>(`/produtos/${id}`);
        const loaded = fromProduto(res.data);
        setForm(loaded);
        setAtributosExtras(atributosExtrasFromProduto(res.data.atributos));
        setFornecedorCodigos(res.data.fornecedor_codigos ?? []);
        setAvancadoOpen(templateAvancadoOpen(loaded));
        setAutoria({
          criado_por: res.data.criado_por,
          atualizado_por: res.data.atualizado_por,
          created_at: res.data.created_at,
          updated_at: res.data.updated_at,
        });
        setFatorManual(true);
      } catch {
        setError('Produto não encontrado.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew]);

  // Novo a partir de modelo (?from=id): preenche formulário sem gravar.
  useEffect(() => {
    if (!isNew || !fromId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get<{ data: Produto }>(`/produtos/${fromId}`);
        if (cancelled) return;
        const loaded = fromProdutoTemplate(res.data);
        setForm(loaded);
        setAtributosExtras({});
        setFornecedorCodigos([]);
        setDeParaDraft({ fornecedor_id: '', c_prod: '', x_prod: '' });
        setAvancadoOpen(templateAvancadoOpen(loaded));
        setFatorManual(true);
        setModeloOrigemCodigo(res.data.codigo);
        setModeloOrigemNomes({
          comercial: (res.data.descricao_comercial ?? '').trim(),
          fiscal: (res.data.descricao_fiscal ?? '').trim(),
        });
        setMessage('');
      } catch {
        if (!cancelled) {
          setModeloOrigemCodigo(null);
          setModeloOrigemNomes(null);
          setError('Produto de origem não encontrado. Continuando com formulário em branco.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isNew, fromId]);

  // Novo produto: escolhe automaticamente o grupo canônico padrão da família.
  // Só considera grupos da família atual — evita race com lista stale (ex.: PA
  // ainda carregada ao trocar para MP), que puxava familia de volta via applyGrupoDefaults.
  // Com ?from=, o template já traz grupo_id — este efeito não sobrescreve.
  useEffect(() => {
    if (!isNew || form.grupo_id) return;
    const daFamilia = grupos.filter((g) => g.familia === form.familia);
    if (!daFamilia.length) return;
    const preferred =
      daFamilia.find((g) => DEFAULT_GRUPO_BY_FAMILIA[form.familia] === g.codigo) ?? daFamilia[0];
    setForm((prev) => {
      if (prev.familia !== form.familia || prev.grupo_id) return prev;
      return applyGrupoDefaults(prev, preferred, true);
    });
    setFatorManual(false);
  }, [isNew, grupos, form.familia, form.grupo_id]);

  // Sugestão dinâmica de fator (domínio 32) — nunca inventa; só preenche se não for manual.
  useEffect(() => {
    let cancelled = false;
    const de = form.unidade_comercial.trim();
    const para = form.unidade_interna.trim();

    if (!de && !para) {
      setFatorSugestao(null);
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fiscalConsulta.fatorConversao({
            de: de || undefined,
            para: para || undefined,
            largura_mm: form.largura_mm || undefined,
            comprimento_m: form.comprimento_m || undefined,
            gramatura_g_m2: form.gramatura_g_m2 || undefined,
          });
          if (cancelled) return;
          const s = res.data;
          setFatorSugestao(s);
          if (
            !fatorManual &&
            (s.status === 'sugerido' || s.status === 'igual') &&
            s.fator != null &&
            s.fator !== ''
          ) {
            setForm((prev) =>
              prev.fator_conversao === s.fator ? prev : { ...prev, fator_conversao: s.fator as string }
            );
          }
        } catch {
          if (!cancelled) setFatorSugestao(null);
        }
      })();
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    form.unidade_comercial,
    form.unidade_interna,
    form.largura_mm,
    form.comprimento_m,
    form.gramatura_g_m2,
    fatorManual,
  ]);

  const selectedGrupo = useMemo(
    () => grupos.find((g) => String(g.id) === form.grupo_id) ?? null,
    [grupos, form.grupo_id]
  );


  const unitsDiffer = useMemo(
    () => unidadesDiferem(form.unidade_comercial, form.unidade_interna),
    [form.unidade_comercial, form.unidade_interna]
  );

  const unidadesUi = useMemo(
    () =>
      decideUnidadesConversaoUi({
        unidadeComercial: form.unidade_comercial,
        unidadeInterna: form.unidade_interna,
      }),
    [form.unidade_comercial, form.unidade_interna]
  );

  const showDimensoes = useMemo(
    () =>
      decideBobinaDimensoesUi({
        exigeDimensaoSku: Boolean(selectedGrupo?.exige_dimensao_sku),
        larguraMm: form.largura_mm,
        comprimentoM: form.comprimento_m,
        gramaturaGm2: form.gramatura_g_m2,
        faltando: fatorSugestao?.faltando,
      }),
    [
      selectedGrupo?.exige_dimensao_sku,
      form.largura_mm,
      form.comprimento_m,
      form.gramatura_g_m2,
      fatorSugestao?.faltando,
    ]
  );

  const faltandoAttrs = useMemo(
    () => new Set(fatorSugestao?.faltando ?? []),
    [fatorSugestao?.faltando]
  );

  const equacaoFator = useMemo(() => {
    const de = form.unidade_comercial.trim().toUpperCase() || '?';
    const para = (form.unidade_interna.trim() || form.unidade_comercial.trim()).toUpperCase() || '?';
    const fator = form.fator_conversao.trim() || '…';
    return `1 ${de} = ${fator} × ${para}`;
  }, [form.unidade_comercial, form.unidade_interna, form.fator_conversao]);

  const fromModelo = Boolean(isNew && fromId && modeloOrigemCodigo);
  const modeloBanner = useMemo(
    () => (modeloOrigemCodigo ? decideModeloOrigemBanner(modeloOrigemCodigo) : null),
    [modeloOrigemCodigo],
  );
  const nomesIguaisAoModelo = useMemo(
    () =>
      fromModelo
        ? nomesAindaIguaisAoModelo({
            descricaoComercial: form.descricao_comercial,
            descricaoFiscal: form.descricao_fiscal,
            origemComercial: modeloOrigemNomes?.comercial,
            origemFiscal: modeloOrigemNomes?.fiscal,
          })
        : false,
    [
      fromModelo,
      form.descricao_comercial,
      form.descricao_fiscal,
      modeloOrigemNomes?.comercial,
      modeloOrigemNomes?.fiscal,
    ],
  );

  const orientacao = useMemo(() => {
    const base = decideCadastroOrientacao({
      familia: form.familia,
      grupoCodigo: selectedGrupo?.codigo ?? form.grupo,
      exigeDimensaoSku: Boolean(selectedGrupo?.exige_dimensao_sku),
      unidadeComercial: form.unidade_comercial,
      unidadeInterna: form.unidade_interna,
      programaCompra: form.programa_compra,
    });
    if (!fromModelo) return base;
    return {
      ...base,
      lead: `A partir do modelo ${modeloOrigemCodigo}: ajuste nome no estoque e descrição fiscal. O restante do perfil técnico já veio preenchido — só altere se a identidade for distinta.`,
    };
  }, [
    form.familia,
    form.grupo,
    form.unidade_comercial,
    form.unidade_interna,
    form.programa_compra,
    selectedGrupo?.codigo,
    selectedGrupo?.exige_dimensao_sku,
    fromModelo,
    modeloOrigemCodigo,
  ]);

  const checklist = useMemo(
    () =>
      buildCadastroChecklist({
        familia: form.familia,
        descricaoComercial: form.descricao_comercial,
        descricaoFiscal: form.descricao_fiscal,
        ncm: form.ncm,
        tipoItemSped: form.tipo_item_sped,
        unidadeComercial: form.unidade_comercial,
        unidadeInterna: form.unidade_interna,
        fatorConversao: form.fator_conversao,
        fatorStatus: fatorSugestao?.status,
        gramaturaGm2: form.gramatura_g_m2,
        programaCompra: form.programa_compra,
        exigeDimensaoSku: Boolean(selectedGrupo?.exige_dimensao_sku),
        deParaCount: fornecedorCodigos.length,
        isNew,
        deParaDraftOk: Boolean(deParaDraft.fornecedor_id && deParaDraft.c_prod.trim()),
        fromModelo,
        nomesIguaisAoModelo,
      }),
    [
      form.familia,
      form.descricao_comercial,
      form.descricao_fiscal,
      form.ncm,
      form.tipo_item_sped,
      form.unidade_comercial,
      form.unidade_interna,
      form.fator_conversao,
      form.gramatura_g_m2,
      form.programa_compra,
      fatorSugestao?.status,
      selectedGrupo?.exige_dimensao_sku,
      fornecedorCodigos.length,
      isNew,
      deParaDraft.fornecedor_id,
      deParaDraft.c_prod,
      fromModelo,
      nomesIguaisAoModelo,
    ],
  );

  const sugestaoAplicavel =
    fatorSugestao != null &&
    (fatorSugestao.status === 'sugerido' || fatorSugestao.status === 'igual') &&
    fatorSugestao.fator != null &&
    fatorSugestao.fator !== form.fator_conversao;

  const unitOptions = useMemo(() => {
    const codes = new Set(unidades.map((u) => u.codigo));
    const extras: Array<{ codigo: string; descricao: string; uso?: string }> = [];
    for (const value of [form.unidade_comercial, form.unidade_interna]) {
      const code = value.trim().toUpperCase();
      if (code && !codes.has(code)) {
        extras.push({ codigo: code, descricao: 'valor legado — escolha uma unidade oficial' });
        codes.add(code);
      }
    }
    return [...unidades, ...extras];
  }, [unidades, form.unidade_comercial, form.unidade_interna]);

  const update = (patch: Partial<ProdutoFormData>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const searchNcm = useCallback(async (q: string) => {
    const res = await fiscalConsulta.ncm(q);
    return mapFiscalOptions(res.data);
  }, []);

  const searchCest = useCallback(
    async (q: string) => {
      const res = await fiscalConsulta.cest(q, form.ncm);
      return mapFiscalOptions(res.data);
    },
    [form.ncm]
  );

  const searchCsosn = useCallback(async (q: string) => {
    const res = await fiscalConsulta.csosn(q);
    return mapFiscalOptions(res.data);
  }, []);

  const searchCfopSaida = useCallback(async (q: string) => {
    const res = await fiscalConsulta.cfop(q, 'SAIDA');
    return mapFiscalOptions(res.data);
  }, []);

  const searchCfopEntrada = useCallback(async (q: string) => {
    const res = await fiscalConsulta.cfop(q, 'ENTRADA');
    return mapFiscalOptions(res.data);
  }, []);

  const searchCstIcms = useCallback(async (q: string) => {
    const res = await fiscalConsulta.cstIcms(q);
    return mapFiscalOptions(res.data);
  }, []);

  const searchCstPis = useCallback(async (q: string) => {
    const res = await fiscalConsulta.cstPisCofins(q);
    return mapFiscalOptions(res.data);
  }, []);

  const searchCstCbs = useCallback(async (q: string) => {
    const res = await fiscalConsulta.cstCbs(q);
    return mapFiscalOptions(res.data);
  }, []);

  const searchCClassTrib = useCallback(async (q: string) => {
    const res = await fiscalConsulta.cClassTrib(q);
    return mapFiscalOptions(res.data);
  }, []);

  const handleFamiliaChange = (familia: string) => {
    // Limpa grupos imediatamente para o efeito de default não aplicar catálogo da família anterior.
    setGrupos([]);
    setFatorManual(false);
    setForm((prev) => ({
      ...emptyForm(),
      familia,
      situacao: prev.situacao,
      codigo: isNew ? '' : prev.codigo,
      tipo_item_sped: FAMILIA_SPED_DEFAULT[familia] || '',
      cfop_saida_padrao:
        familia === 'PA' || familia === 'FAC' ? '5101' : familia === 'REV' ? '5102' : '',
      grupo_id: '',
      grupo: '',
    }));
  };

  const handleGrupoChange = (grupoId: string) => {
    const grupo = grupos.find((g) => String(g.id) === grupoId);
    if (!grupo) {
      update({ grupo_id: '', grupo: '' });
      return;
    }
    setFatorManual(false);
    setForm((prev) => {
      const next = applyGrupoDefaults(prev, grupo, isNew);
      const alinhado = {
        ...next,
        grupo_estoque: alinharLinhaEstoque(next.grupo_estoque, grupo),
      };
      // Saiu de grupo de bobina → limpa dimensões (não carregar “Dados da bobina” por resíduo).
      if (!grupo.exige_dimensao_sku) {
        return {
          ...alinhado,
          largura_mm: '',
          comprimento_m: '',
          gramatura_g_m2: '',
          programa_compra: '',
        };
      }
      return alinhado;
    });
  };

  const handleSave = async () => {
    if (!canWrite && !canFiscal) return;
    if (!form.grupo_id) {
      setError('Selecione o grupo canônico do produto.');
      setTab('comercial');
      return;
    }
    const linhasEstoque = selectedGrupo?.grupos_estoque ?? [];
    if (linhasEstoque.length > 1 && !form.grupo_estoque) {
      setError('Selecione a linha de estoque do material (ex.: couché, fosco, térmico).');
      setTab('comercial');
      return;
    }
    if (
      linhasEstoque.length > 0 &&
      form.grupo_estoque &&
      !linhasEstoque.some((l) => l.codigo === form.grupo_estoque)
    ) {
      setError('A linha de estoque não pertence ao grupo canônico selecionado.');
      setTab('comercial');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = toPayload(form, atributosExtras);
      if (isNew) {
        const res = await api.post<{ data: Produto }>('/produtos', payload);
        const createdId = res.data.id;
        if (deParaDraft.fornecedor_id && deParaDraft.c_prod.trim()) {
          try {
            await api.post(`/produtos/${createdId}/fornecedor-codigos`, {
              fornecedor_id: Number(deParaDraft.fornecedor_id),
              c_prod: deParaDraft.c_prod.trim(),
              x_prod: deParaDraft.x_prod.trim() || null,
            });
          } catch (deParaErr) {
            navigate(`/produtos/${createdId}`);
            setError(
              deParaErr instanceof Error
                ? `SKU criado, mas o de-para falhou: ${deParaErr.message}`
                : 'SKU criado, mas o de-para falhou — vincule na ficha.',
            );
            return;
          }
        }
        navigate(`/produtos/${createdId}`);
      } else {
        const res = await api.put<{ data: Produto }>(`/produtos/${id}`, payload);
        setForm(fromProduto(res.data));
        setAtributosExtras(atributosExtrasFromProduto(res.data.atributos));
        setFornecedorCodigos(res.data.fornecedor_codigos ?? []);
        setAutoria({
          criado_por: res.data.criado_por,
          atualizado_por: res.data.atualizado_por,
          created_at: res.data.created_at,
          updated_at: res.data.updated_at,
        });
        setMessage('Produto salvo com sucesso.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Carregando produto…</div>;

  const readOnly = !canWrite && !canFiscal;
  const fiscalLocked = !canFiscal;

  return (
    <>
      <PageHeader
        title={
          isNew
            ? fromModelo
              ? 'Novo produto a partir do modelo'
              : 'Novo produto'
            : form.codigo
        }
        description={
          isNew
            ? fromModelo && modeloOrigemCodigo
              ? `Modelo ${modeloOrigemCodigo}. Foque em nome no estoque e descrição fiscal; o restante já veio do perfil técnico.`
              : 'Padrão compra (MP). Família → grupo → descrição → unidade. De-para pode ir junto. Atalho: Do XML.'
            : form.descricao_comercial?.trim() || form.descricao_fiscal
        }
        actions={
          <>
            {isNew ? (
              <>
                <Link to="/produtos/do-xml" className="btn btn-primary">
                  Do XML
                </Link>
                <Link to="/como-cadastra#produto-passos" className="btn btn-secondary">
                  Como cadastra
                </Link>
              </>
            ) : null}
            {!isNew && id && canWrite ? (
              <Link
                to={`/produtos/novo?from=${id}`}
                className="btn btn-secondary"
                title="Novo SKU com o mesmo perfil técnico"
              >
                Novo a partir deste
              </Link>
            ) : null}
            {!isNew && id && (
              <a
                href={`/produtos/${id}/ficha`}
                className="btn btn-secondary"
                onClick={(e) => onAbrirFichaClick(e, `/produtos/${id}/ficha`)}
              >
                Imprimir ficha
              </a>
            )}
            <Link to="/produtos" className="btn btn-secondary">
              Voltar
            </Link>
          </>
        }
      />

      {fromModelo && modeloBanner ? (
        <div className="alert alert-info produto-modelo-banner" role="status">
          <strong>{modeloBanner.title}</strong>
          <p>{modeloBanner.lead}</p>
          <ul>
            {modeloBanner.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-body">
          {!isNew ? <RegistroMetaStrip registro={autoria} /> : null}
          <div className="tabs tabs-produto">
            <button
              type="button"
              className={`tab${tab === 'comercial' ? ' active' : ''}`}
              onClick={() => setTab('comercial')}
            >
              Comercial
            </button>
            <button
              type="button"
              className={`tab${tab === 'fiscal' ? ' active' : ''}`}
              onClick={() => setTab('fiscal')}
            >
              Fiscal
            </button>
          </div>

          {tab === 'comercial' && (
            <div className="form-grid">
              <div className="produto-orientacao span-2">
                <p className="produto-orientacao-lead">{orientacao.lead}</p>
                <ul className="produto-checklist" aria-label="Checklist do cadastro">
                  {checklist.items.map((item) => (
                    <li
                      key={item.id}
                      className={
                        item.ok
                          ? 'produto-checklist-ok'
                          : item.required
                            ? 'produto-checklist-pendente'
                            : 'produto-checklist-opcional'
                      }
                    >
                      <span className="produto-checklist-mark" aria-hidden>
                        {item.ok ? '✓' : item.required ? '!' : '·'}
                      </span>
                      {item.label}
                    </li>
                  ))}
                </ul>
                <p className="form-hint produto-checklist-resumo">
                  {checklist.ready
                    ? 'Cadastro pronto para uso operacional (entrada/estoque).'
                    : `${checklist.pendingRequired} item(ns) obrigatório(s) pendente(s).`}
                </p>
              </div>

              <div className="form-group">
                <label>Família</label>
                <select
                  value={form.familia}
                  disabled={readOnly}
                  onChange={(e) => handleFamiliaChange(e.target.value)}
                >
                  {FAMILIAS.map((f) => (
                    <option key={f} value={f}>
                      {f} — {familiaLabel(f)}
                    </option>
                  ))}
                </select>
              </div>
              <div className={`form-group${fromModelo ? ' produto-campo-foco' : ''}`}>
                <label>Código</label>
                <input
                  value={form.codigo}
                  disabled={!isNew || readOnly}
                  placeholder={
                    selectedGrupo
                      ? `Gerado como ${selectedGrupo.codigo}-…`
                      : 'Gerado automaticamente se vazio'
                  }
                  onChange={(e) => update({ codigo: e.target.value })}
                />
                {fromModelo ? (
                  <span className="form-hint">
                    Deixe vazio para o próximo código do grupo, ou informe um código novo único nesta
                    EMP.
                  </span>
                ) : null}
              </div>
              <div className="form-group span-2">
                <label>Grupo</label>
                <select
                  value={form.grupo_id}
                  disabled={readOnly || grupos.length === 0}
                  onChange={(e) => handleGrupoChange(e.target.value)}
                  required
                >
                  <option value="">Selecione o grupo canônico…</option>
                  {grupos.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.codigo} — {g.nome}
                    </option>
                  ))}
                </select>
                {selectedGrupo ? (
                  <span className="form-hint">
                    {naturezaGrupoLabel(selectedGrupo.natureza)}
                    {selectedGrupo.ncm_padrao
                      ? ` · NCM padrão ${formatNcmHint(selectedGrupo.ncm_padrao)}`
                      : ' · NCM a confirmar'}
                    {!selectedGrupo.ncm_confirmado ? ' (pendente contador)' : ''}
                    {selectedGrupo.exige_dimensao_sku
                      ? ' · dimensões nominais (bobina real = volume na entrada)'
                      : ''}
                    {selectedGrupo.grupos_estoque?.length === 1
                      ? ` · linha de estoque ${linhaEstoqueLabel(
                          selectedGrupo.grupos_estoque[0].codigo,
                          selectedGrupo.grupos_estoque,
                        )}`
                      : !selectedGrupo.grupos_estoque?.length && selectedGrupo.grupo_estoque_padrao
                        ? ` · linha de estoque ${selectedGrupo.grupo_estoque_padrao}`
                        : ''}
                    {selectedGrupo.observacao ? ` — ${selectedGrupo.observacao}` : ''}
                  </span>
                ) : (
                  <span className="form-hint">
                    Catálogo fixo do domínio RLP (MP-PAP, PA-ETQ, REV-RIB…). Define prefixo do
                    código, SPED, NCM e CFOP padrão.
                  </span>
                )}
              </div>
              {selectedGrupo?.grupos_estoque && selectedGrupo.grupos_estoque.length > 1 && (
                <div className="form-group span-2">
                  <label>Linha de estoque</label>
                  <select
                    value={form.grupo_estoque}
                    disabled={readOnly}
                    required
                    onChange={(e) => update({ grupo_estoque: e.target.value })}
                  >
                    <option value="">Selecione a linha…</option>
                    {selectedGrupo.grupos_estoque.map((l) => (
                      <option key={l.codigo} value={l.codigo}>
                        {l.codigo} — {l.nome}
                      </option>
                    ))}
                  </select>
                  <span className="form-hint">
                    Subclasse do material no almoxarifado (ex.: couché, fosco, térmico). O código
                    do SKU continua {selectedGrupo.codigo}-nnn — a linha não muda o prefixo
                    fiscal. Dimensão física da bobina não entra no SKU.
                  </span>
                </div>
              )}
              <div className={`form-group span-2${fromModelo ? ' produto-campo-foco' : ''}`}>
                <label>Nome no estoque</label>
                <input
                  value={form.descricao_comercial}
                  disabled={readOnly}
                  placeholder="Ex.: ECOPRINT / S2045N / SCK 60"
                  style={{ textTransform: 'uppercase' }}
                  autoCapitalize="characters"
                  onChange={(e) => update({ descricao_comercial: e.target.value.toUpperCase() })}
                />
                <span className="form-hint">
                  {fromModelo
                    ? nomesIguaisAoModelo
                      ? 'Copiado do modelo — altere se este for um SKU com identidade distinta no almoxarifado.'
                      : 'Como a empresa chama o item no almoxarifado e nas listagens. Sempre em maiúsculas.'
                    : 'Como a empresa chama o item no almoxarifado e nas listagens. Pode diferir do texto fiscal do fornecedor. Sempre em maiúsculas.'}
                </span>
              </div>
              <div className={`form-group span-2${fromModelo ? ' produto-campo-foco' : ''}`}>
                <label>Descrição fiscal</label>
                <input
                  value={form.descricao_fiscal}
                  disabled={readOnly}
                  placeholder="Ex.: FASSON ECOPRINT/S2045N/60G - EXACT 1000"
                  style={{ textTransform: 'uppercase' }}
                  autoCapitalize="characters"
                  onChange={(e) => update({ descricao_fiscal: e.target.value.toUpperCase() })}
                  required
                />
                <span className="form-hint">
                  {fromModelo
                    ? nomesIguaisAoModelo
                      ? 'Copiada do modelo — revise o texto estável para NF-e / SPED se a identidade fiscal for outra.'
                      : 'Texto estável para NF-e / SPED (0200), em maiúsculas. O de-para guarda o xProd exato de cada fornecedor.'
                    : 'Texto estável para NF-e / SPED (0200), em maiúsculas. O de-para guarda o xProd exato de cada fornecedor.'}
                </span>
              </div>

              <div className="fiscal-section-title span-2">{unidadesUi.sectionTitle}</div>
              <p className="form-hint span-2 produto-unidades-lead">
                {unidadesUi.mode === 'conversao' ? (
                  <>
                    Unidade do documento × unidade oficial de estoque. Largura, comprimento e
                    gramatura alimentam a fórmula — não são unidades. Convenção do fator:{' '}
                    <strong>{equacaoFator}</strong>
                  </>
                ) : orientacao.preferM2Igual ? (
                  <>
                    Exact / substrato faturado em M²: deixe comercial e estoque em{' '}
                    <strong>M2</strong> (fator 1). Bobinas físicas entram como volumes na
                    conferência da NF — o saldo oficial continua em M².
                  </>
                ) : (
                  <>
                    Unidade da NF / faturamento. Estoque vazio = mesma unidade (fator 1). Escolha
                    outra unidade de estoque somente se a nota e o saldo falarem línguas
                    diferentes.
                  </>
                )}
              </p>

              <div className="form-group">
                <label>Unidade comercial</label>
                <select
                  value={form.unidade_comercial}
                  disabled={readOnly}
                  onChange={(e) => {
                    setFatorManual(false);
                    update({ unidade_comercial: e.target.value });
                  }}
                >
                  <option value="">— selecione —</option>
                  {unitOptions.map((u) => (
                    <option key={`uc-${u.codigo}`} value={u.codigo} title={u.uso}>
                      {u.codigo} — {u.descricao}
                    </option>
                  ))}
                </select>
                <span className="form-hint">
                  Unidade da NF / faturamento (fornecedor ou cliente). Padrão do grupo:{' '}
                  {selectedGrupo?.unidade_comercial_padrao ?? '—'}.
                </span>
              </div>
              <div className="form-group">
                <label>Unidade de estoque</label>
                <select
                  value={form.unidade_interna}
                  disabled={readOnly}
                  onChange={(e) => {
                    setFatorManual(false);
                    update({ unidade_interna: e.target.value });
                  }}
                >
                  <option value="">— mesma da comercial —</option>
                  {unitOptions.map((u) => (
                    <option key={`ui-${u.codigo}`} value={u.codigo} title={u.uso}>
                      {u.codigo} — {u.descricao}
                    </option>
                  ))}
                </select>
                <span className="form-hint">
                  Unidade oficial do saldo (interna). Vazia = igual à comercial. Padrão do grupo:{' '}
                  {selectedGrupo?.unidade_interna_padrao ?? '—'}.
                </span>
              </div>

              {showDimensoes.showSection && (
                <>
                  <div className="fiscal-section-title span-2">{showDimensoes.title}</div>
                  {showDimensoes.mode === 'grupo' && (
                    <div className="form-group span-2">
                      <label>Programa de compra</label>
                      <input
                        value={form.programa_compra}
                        disabled={readOnly}
                        placeholder="Ex.: EXACT 1000 · EXACT 1500 · VERTEX 5030"
                        maxLength={40}
                        onChange={(e) => update({ programa_compra: e.target.value })}
                      />
                      <span className="form-hint">
                        Identifica o programa comercial no SKU (não a bobina). Exact 1000 e Exact
                        1500 são SKUs distintos — larguras variáveis ficam no volume.
                      </span>
                    </div>
                  )}
                  {showDimensoes.showLargura && (
                    <div className={`form-group${faltandoAttrs.has('largura_mm') ? ' is-required-hint' : ''}`}>
                      <label>
                        Largura (mm)
                        {faltandoAttrs.has('largura_mm') ? ' *' : ''}
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder={decimalStep(DECIMAL_SCALE.dim)}
                        value={form.largura_mm}
                        disabled={readOnly}
                        onChange={(e) => update({ largura_mm: e.target.value })}
                      />
                      <span className="form-hint">
                        Nominal / típica de compra. Bobina real confere-se no volume (entrada).
                      </span>
                    </div>
                  )}
                  {showDimensoes.showComprimento && (
                    <div className={`form-group${faltandoAttrs.has('comprimento_m') ? ' is-required-hint' : ''}`}>
                      <label>
                        Comprimento (m)
                        {faltandoAttrs.has('comprimento_m') ? ' *' : ''}
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder={decimalStep(DECIMAL_SCALE.dim)}
                        value={form.comprimento_m}
                        disabled={readOnly}
                        onChange={(e) => update({ comprimento_m: e.target.value })}
                      />
                      <span className="form-hint">
                        Nominal do programa (ex. EXACT 1000). Variação por bobina = volume.
                      </span>
                    </div>
                  )}
                  {showDimensoes.showGramatura && (
                    <div className={`form-group${faltandoAttrs.has('gramatura_g_m2') ? ' is-required-hint' : ''}`}>
                      <label>
                        Gramatura total (g/m²)
                        {faltandoAttrs.has('gramatura_g_m2') ? ' *' : ''}
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder={decimalStep(DECIMAL_SCALE.gramatura)}
                        value={form.gramatura_g_m2}
                        disabled={readOnly}
                        onChange={(e) => update({ gramatura_g_m2: e.target.value })}
                      />
                      <span className="form-hint">
                        Soma frontal + adesivo + liner. Ponte M2 ↔ KG quando a NF é em KG.
                      </span>
                    </div>
                  )}
                </>
              )}

              {unidadesUi.showFator && (
                <div className="form-group">
                  <label>
                    Fator conversão
                    {unitsDiffer && fatorSugestao?.status !== 'igual' ? ' *' : ''}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder={decimalStep(DECIMAL_SCALE.factor)}
                    value={form.fator_conversao}
                    disabled={readOnly}
                    required={unitsDiffer}
                    onChange={(e) => {
                      setFatorManual(true);
                      update({ fator_conversao: e.target.value });
                    }}
                  />
                  <span className="form-hint">
                    {fatorSugestao?.status === 'sugerido' && fatorSugestao.fator && (
                      <>
                        Sugerido: {fatorSugestao.fator}
                        {fatorSugestao.formula ? ` (${fatorSugestao.formula})` : ''}.{' '}
                        {equacaoFator}.
                        {fatorManual && sugestaoAplicavel && !readOnly && (
                          <>
                            {' '}
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{
                                display: 'inline',
                                padding: '0.1rem 0.45rem',
                                marginLeft: '0.35rem',
                                fontSize: '0.85em',
                                verticalAlign: 'baseline',
                              }}
                              onClick={() => {
                                setFatorManual(false);
                                update({ fator_conversao: fatorSugestao.fator as string });
                              }}
                            >
                              Aplicar sugestão
                            </button>
                          </>
                        )}
                      </>
                    )}
                    {fatorSugestao?.status === 'incompleto' && (
                      <>
                        {fatorSugestao.mensagem ?? 'Cadastro incompleto para calcular o fator.'}
                        {fatorSugestao.faltando.length
                          ? ` Faltando: ${fatorSugestao.faltando.join(', ')}.`
                          : ''}
                      </>
                    )}
                    {fatorSugestao?.status === 'sem_formula' && (
                      <>
                        {fatorSugestao.mensagem ??
                          'Sem fórmula automática — informe o fator manualmente.'}
                      </>
                    )}
                    {!fatorSugestao && (
                      <>
                        Até {DECIMAL_SCALE.factor} casas (NUMERIC 19,10). Necessário quando as
                        unidades diferem.
                      </>
                    )}
                  </span>
                </div>
              )}

              {!isNew && id && (
                <ProdutoFornecedorCodigosPanel
                  produtoId={Number(id)}
                  canWrite={canWrite}
                  initialRows={fornecedorCodigos}
                />
              )}
              {isNew &&
                (form.familia === 'MP' || form.familia === 'EMB' || form.familia === 'REV') && (
                  <div className="produto-depara span-2">
                    <div className="fiscal-section-title">De-para da NF (opcional agora)</div>
                    <p className="form-hint" style={{ marginTop: 0 }}>
                      Se já tiver o cProd do fornecedor, grave junto com o SKU. Atalho ainda mais
                      rápido: <Link to="/produtos/do-xml">Do XML</Link>.
                    </p>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Fornecedor</label>
                        <select
                          value={deParaDraft.fornecedor_id}
                          disabled={readOnly}
                          onChange={(e) =>
                            setDeParaDraft((d) => ({ ...d, fornecedor_id: e.target.value }))
                          }
                        >
                          <option value="">— depois —</option>
                          {fornecedoresDraft.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.codigo} — {f.nome_fantasia || f.razao_social}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>cProd</label>
                        <input
                          value={deParaDraft.c_prod}
                          disabled={readOnly}
                          placeholder="Código na NF do fornecedor"
                          onChange={(e) =>
                            setDeParaDraft((d) => ({ ...d, c_prod: e.target.value }))
                          }
                        />
                      </div>
                      <div className="form-group span-2">
                        <label>xProd (amostra)</label>
                        <input
                          value={deParaDraft.x_prod}
                          disabled={readOnly}
                          placeholder="Descrição como veio na nota"
                          onChange={(e) =>
                            setDeParaDraft((d) => ({ ...d, x_prod: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

              <details
                className="produto-avancado span-2"
                open={avancadoOpen}
                onToggle={(e) => setAvancadoOpen((e.target as HTMLDetailsElement).open)}
              >
                <summary>Estoque, lote e operação</summary>
                <div className="form-grid produto-avancado-grid">
                  <div className="fiscal-section-title span-2">Comercial / operação</div>

                  <div className="form-group">
                    <label>Preço tabela</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={decimalStep(DECIMAL_SCALE.unitPrice)}
                      value={form.preco_tabela}
                      disabled={readOnly}
                      onChange={(e) => update({ preco_tabela: e.target.value })}
                    />
                    <span className="form-hint">Unitário: {DECIMAL_SCALE.unitPrice} casas (NUMERIC 19,6).</span>
                  </div>
                  <div className="form-group">
                    <label>Estoque mínimo</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={decimalStep(DECIMAL_SCALE.qty)}
                      value={form.estoque_minimo}
                      disabled={readOnly}
                      onChange={(e) => update({ estoque_minimo: e.target.value })}
                    />
                    <span className="form-hint">Quantidade: {DECIMAL_SCALE.qty} casas (NUMERIC 15,4).</span>
                  </div>
                  <div className="form-group">
                    <label>Lead time (dias)</label>
                    <input
                      type="number"
                      value={form.lead_time_dias}
                      disabled={readOnly}
                      onChange={(e) => update({ lead_time_dias: e.target.value })}
                    />
                  </div>

                  <div className="fiscal-section-title span-2">Rastreabilidade</div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={form.controla_lote}
                        disabled={readOnly}
                        onChange={(e) => {
                          const on = e.target.checked;
                          update({
                            controla_lote: on,
                            controla_validade: on ? form.controla_validade : false,
                            prazo_validade_dias: on ? form.prazo_validade_dias : '',
                          });
                        }}
                      />{' '}
                      Controla lote
                    </label>
                    <span className="form-hint">
                      Substratos e tintas: sim. Tubete, caixa e ribbon: não.
                    </span>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={form.controla_validade}
                        disabled={readOnly || !form.controla_lote}
                        onChange={(e) =>
                          update({
                            controla_validade: e.target.checked,
                            controla_lote: e.target.checked ? true : form.controla_lote,
                          })
                        }
                      />{' '}
                      Controla validade
                    </label>
                    <span className="form-hint">Adesivos, tintas e foils — FEFO na saída.</span>
                  </div>
                  <div className="form-group">
                    <label>Prazo de validade (dias)</label>
                    <input
                      type="number"
                      min={1}
                      value={form.prazo_validade_dias}
                      disabled={readOnly || !form.controla_lote}
                      onChange={(e) => update({ prazo_validade_dias: e.target.value })}
                    />
                    <span className="form-hint">Sugere o vencimento na entrada (12–24 meses típicos).</span>
                  </div>

                  <div className="form-group">
                    <label>GTIN</label>
                    <input
                      value={form.gtin}
                      disabled={readOnly}
                      placeholder="SEM GTIN"
                      onChange={(e) => update({ gtin: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Situação</label>
                    <select
                      value={form.situacao}
                      disabled={readOnly}
                      onChange={(e) => update({ situacao: e.target.value })}
                    >
                      <option value="ATIVO">Ativo</option>
                      <option value="INATIVO">Inativo</option>
                    </select>
                  </div>
                </div>
              </details>
            </div>
          )}

          {tab === 'fiscal' && (
            <>
              {!canFiscal && (
                <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
                  Campos fiscais exigem permissão <strong>produto.fiscal</strong>.
                </div>
              )}

              <div className="fiscal-section-title">Classificação</div>
              <div className="form-grid">
                <FiscalCombobox
                  className="span-2"
                  label="NCM"
                  value={form.ncm}
                  disabled={fiscalLocked}
                  digitsOnly
                  maxLength={8}
                  formatCodigo={formatNcm}
                  placeholder="Buscar NCM por código ou descrição…"
                  hint={
                    selectedGrupo?.ncm_padrao
                      ? `Padrão do grupo ${selectedGrupo.codigo}: ${formatNcmHint(selectedGrupo.ncm_padrao)}. Obrigatório para emitir NF-e.`
                      : 'Catálogo local RLP + complemento BrasilAPI. Obrigatório para emitir NF-e.'
                  }
                  search={searchNcm}
                  onChange={(codigo) => {
                    if (codigo !== form.ncm) {
                      update({ ncm: codigo, cest: '' });
                    } else {
                      update({ ncm: codigo });
                    }
                  }}
                />

                <FiscalCombobox
                  className="span-2"
                  label="CEST"
                  value={form.cest}
                  disabled={fiscalLocked}
                  digitsOnly
                  maxLength={7}
                  allowEmpty
                  emptyLabel="Sem CEST"
                  formatCodigo={formatCest}
                  placeholder="Buscar CEST (filtrado pelo NCM)…"
                  hint="Deixe vazio se não houver ST aplicável. Para 3919 (etiquetas), o estudo recomenda sem CEST."
                  search={searchCest}
                  onChange={(codigo) => update({ cest: codigo })}
                />

                <div className="form-group span-2">
                  <label>Origem da mercadoria</label>
                  <select
                    value={form.origem}
                    disabled={fiscalLocked}
                    onChange={(e) => update({ origem: e.target.value })}
                  >
                    {(origens.length ? origens : Array.from({ length: 9 }, (_, i) => ({
                      codigo: String(i),
                      descricao: String(i),
                    }))).map((o) => (
                      <option key={o.codigo} value={o.codigo}>
                        {o.codigo} — {o.descricao}
                      </option>
                    ))}
                  </select>
                  <span className="form-hint">
                    Impacta alíquota interestadual (4%/7%/12%) e antecipação ICMS-MG no Simples.
                  </span>
                </div>

                <div className="form-group span-2">
                  <label>Tipo item SPED (Reg. 0200)</label>
                  <select
                    value={form.tipo_item_sped}
                    disabled={fiscalLocked}
                    onChange={(e) => update({ tipo_item_sped: e.target.value })}
                  >
                    <option value="">—</option>
                    {(tiposSped.length
                      ? tiposSped
                      : [
                          { codigo: '00', descricao: 'Mercadoria para revenda' },
                          { codigo: '01', descricao: 'Matéria-prima' },
                          { codigo: '02', descricao: 'Embalagem' },
                          { codigo: '04', descricao: 'Produto acabado' },
                          { codigo: '07', descricao: 'Uso e consumo' },
                          { codigo: '09', descricao: 'Serviços' },
                        ]
                    ).map((t) => (
                      <option key={t.codigo} value={t.codigo}>
                        {t.codigo} — {t.descricao}
                      </option>
                    ))}
                  </select>
                  <span className="form-hint">
                    Herdado do grupo ({selectedGrupo?.tipo_item_sped ?? '—'}). PA=04, MP=01, EMB=02,
                    REV=00, MUC=07, SVC=09.
                  </span>
                </div>
              </div>

              <div className="fiscal-section-title">Simples Nacional</div>
              <div className="form-grid">
                <FiscalCombobox
                  className="span-2"
                  label="CSOSN (saída)"
                  value={form.csosn}
                  disabled={fiscalLocked}
                  digitsOnly
                  maxLength={3}
                  placeholder="Buscar CSOSN…"
                  hint="Padrão RLP nas NF-e atuais: 102. Use 101 apenas se houver política de crédito ao cliente."
                  search={searchCsosn}
                  onChange={(codigo) => update({ csosn: codigo })}
                />
              </div>

              <div className="fiscal-section-title">CFOP padrão</div>
              <div className="form-grid">
                <FiscalCombobox
                  className="span-2"
                  label="CFOP saída padrão"
                  value={form.cfop_saida_padrao}
                  disabled={fiscalLocked}
                  digitsOnly
                  maxLength={4}
                  placeholder="Ex.: 5101 produção · 5102 revenda"
                  hint="PA/produção → 5101/6101. Revenda → 5102/6102. NF-e atuais com 5102 em etiquetas fabricadas é risco identificado no estudo."
                  search={searchCfopSaida}
                  onChange={(codigo) => update({ cfop_saida_padrao: codigo })}
                />
                <FiscalCombobox
                  className="span-2"
                  label="CFOP entrada padrão"
                  value={form.cfop_entrada_padrao}
                  disabled={fiscalLocked}
                  digitsOnly
                  maxLength={4}
                  placeholder="Ex.: 1101 industrialização · 1102 comercialização"
                  hint="MP: 1101/2101 · Revenda: 1102/2102 · Uso/consumo: 1556/2556."
                  search={searchCfopEntrada}
                  onChange={(codigo) => update({ cfop_entrada_padrao: codigo })}
                />
              </div>

              <div className="fiscal-section-title">
                Regime normal (preparação Lucro Real)
              </div>
              <p className="form-hint" style={{ marginBottom: '0.85rem' }}>
                Campos para parametrizar agora e ativar na saída do Simples — CST ICMS / PIS / COFINS.
              </p>
              <div className="form-grid">
                <FiscalCombobox
                  label="CST ICMS"
                  value={form.cst_icms}
                  disabled={fiscalLocked}
                  digitsOnly
                  maxLength={3}
                  placeholder="Ex.: 00"
                  search={searchCstIcms}
                  onChange={(codigo) => update({ cst_icms: codigo })}
                />
                <FiscalCombobox
                  label="CST PIS"
                  value={form.cst_pis}
                  disabled={fiscalLocked}
                  digitsOnly
                  maxLength={2}
                  placeholder="Saída 01 · Entrada 50"
                  search={searchCstPis}
                  onChange={(codigo) => update({ cst_pis: codigo })}
                />
                <FiscalCombobox
                  label="CST COFINS"
                  value={form.cst_cofins}
                  disabled={fiscalLocked}
                  digitsOnly
                  maxLength={2}
                  placeholder="Saída 01 · Entrada 50"
                  search={searchCstPis}
                  onChange={(codigo) => update({ cst_cofins: codigo })}
                />
              </div>

              <div className="fiscal-section-title">
                Reforma tributária — CBS
              </div>
              <p className="form-hint" style={{ marginBottom: '0.85rem' }}>
                Contribuição sobre Bens e Serviços (EC 132/23 · LC 214/2025). 2026 é ano-teste —
                parametrizar no cadastro sem alterar PIS/COFINS atuais. Validar CST e cClassTrib com o
                contador (IT NF-e 2025.002).
              </p>
              <div className="form-grid">
                <FiscalCombobox
                  label="CST IBS/CBS"
                  value={form.cst_cbs}
                  disabled={fiscalLocked}
                  digitsOnly
                  maxLength={3}
                  placeholder="Ex.: 000 tributação integral"
                  hint="Código compartilhado IBS+CBS no grupo UB da NF-e."
                  search={searchCstCbs}
                  onChange={(codigo) => update({ cst_cbs: codigo })}
                />
                <FiscalCombobox
                  className="span-2"
                  label="cClassTrib"
                  value={form.cclass_trib}
                  disabled={fiscalLocked}
                  digitsOnly
                  maxLength={6}
                  placeholder="Ex.: 000001 tributação integral"
                  hint="Os 3 primeiros dígitos correspondem ao CST. Preenche o CST automaticamente."
                  search={searchCClassTrib}
                  onChange={(codigo) => {
                    const next: Partial<ProdutoFormData> = { cclass_trib: codigo };
                    if (codigo.length >= 3) {
                      next.cst_cbs = codigo.slice(0, 3);
                    }
                    update(next);
                  }}
                />
                <div className="form-group">
                  <label>Alíquota CBS (%)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder={decimalStep(DECIMAL_SCALE.percent)}
                    value={form.aliquota_cbs}
                    disabled={fiscalLocked}
                    onChange={(e) => update({ aliquota_cbs: e.target.value })}
                  />
                  <span className="form-hint">
                    Padrão ano-teste 2026: 0,9000%. NUMERIC(7,4) — sem float (estudo PADRAO_DECIMAL).
                  </span>
                </div>
              </div>
            </>
          )}

          {!readOnly && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: '1.5rem' }}
              disabled={saving}
              onClick={handleSave}
            >
              {saving
                ? 'Salvando…'
                : isNew
                  ? fromModelo
                    ? 'Criar novo SKU'
                    : 'Criar produto'
                  : 'Salvar alterações'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
