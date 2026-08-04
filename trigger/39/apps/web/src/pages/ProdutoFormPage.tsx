import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiscalCombobox, formatCest, formatNcm, type FiscalOption } from '../components/FiscalCombobox';
import { PageHeader } from '../components/PageHeader';
import { api, fiscalConsulta, type Produto, type ProdutoGrupo } from '../lib/api';
import { useAuth } from '../lib/auth';
import { DECIMAL_SCALE, decimalStep, familiaLabel, naturezaGrupoLabel } from '../lib/format';

const FAMILIAS = ['MP', 'EMB', 'REV', 'PA', 'SVC', 'FAC'] as const;

const FAMILIA_SPED_DEFAULT: Record<string, string> = {
  MP: '01',
  EMB: '02',
  REV: '00',
  PA: '04',
  SVC: '09',
  FAC: '04',
};

type TabId = 'comercial' | 'fiscal';

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
  cfop_saida_padrao: string;
  cfop_entrada_padrao: string;
  csosn: string;
  cst_icms: string;
  cst_pis: string;
  cst_cofins: string;
  preco_tabela: string;
  estoque_minimo: string;
  lead_time_dias: string;
  gtin: string;
  situacao: string;
};

const emptyForm = (): ProdutoFormData => ({
  familia: 'PA',
  codigo: '',
  grupo_id: '',
  grupo: '',
  descricao_fiscal: '',
  descricao_comercial: '',
  ncm: '',
  cest: '',
  origem: '0',
  tipo_item_sped: '04',
  unidade_comercial: 'UN',
  unidade_interna: '',
  fator_conversao: '',
  cfop_saida_padrao: '5101',
  cfop_entrada_padrao: '',
  csosn: '102',
  cst_icms: '',
  cst_pis: '',
  cst_cofins: '',
  preco_tabela: '',
  estoque_minimo: '',
  lead_time_dias: '',
  gtin: '',
  situacao: 'ATIVO',
});

function fromProduto(p: Produto): ProdutoFormData {
  return {
    familia: p.familia,
    codigo: p.codigo,
    grupo_id: p.grupo_id != null ? String(p.grupo_id) : '',
    grupo: p.grupo ?? p.grupo_catalogo?.codigo ?? '',
    descricao_fiscal: p.descricao_fiscal,
    descricao_comercial: p.descricao_comercial ?? '',
    ncm: p.ncm ?? '',
    cest: p.cest ?? '',
    origem: p.origem != null ? String(p.origem) : '0',
    tipo_item_sped: p.tipo_item_sped ?? FAMILIA_SPED_DEFAULT[p.familia] ?? '',
    unidade_comercial: p.unidade_comercial ?? 'UN',
    unidade_interna: p.unidade_interna ?? '',
    fator_conversao: p.fator_conversao ?? '',
    cfop_saida_padrao: p.cfop_saida_padrao ?? '',
    cfop_entrada_padrao: p.cfop_entrada_padrao ?? '',
    csosn: p.csosn ?? '',
    cst_icms: p.cst_icms ?? '',
    cst_pis: p.cst_pis ?? '',
    cst_cofins: p.cst_cofins ?? '',
    preco_tabela: p.preco_tabela ?? '',
    estoque_minimo: p.estoque_minimo ?? '',
    lead_time_dias: p.lead_time_dias != null ? String(p.lead_time_dias) : '',
    gtin: p.gtin ?? '',
    situacao: p.situacao,
  };
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
    cfop_entrada_padrao: fill(base.cfop_entrada_padrao, grupo.cfop_entrada_padrao),
    cfop_saida_padrao: fill(base.cfop_saida_padrao, grupo.cfop_saida_padrao),
  };
}

function toPayload(form: ProdutoFormData): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    familia: form.familia,
    grupo_id: form.grupo_id ? parseInt(form.grupo_id, 10) : null,
    grupo: form.grupo || null,
    descricao_fiscal: form.descricao_fiscal,
    descricao_comercial: form.descricao_comercial || null,
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
    preco_tabela: form.preco_tabela || null,
    estoque_minimo: form.estoque_minimo || null,
    lead_time_dias: form.lead_time_dias ? parseInt(form.lead_time_dias, 10) : null,
    gtin: form.gtin || null,
    situacao: form.situacao,
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
  const isNew = id === 'novo';
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('produto.escrever');
  const canFiscal = hasPermission('produto.fiscal');

  const [tab, setTab] = useState<TabId>('comercial');
  const [form, setForm] = useState<ProdutoFormData>(emptyForm());
  const [grupos, setGrupos] = useState<ProdutoGrupo[]>([]);
  const [origens, setOrigens] = useState<Array<{ codigo: string; descricao: string }>>([]);
  const [tiposSped, setTiposSped] = useState<Array<{ codigo: string; descricao: string }>>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const [o, t] = await Promise.all([fiscalConsulta.origens(), fiscalConsulta.tiposItemSped()]);
        setOrigens(o.data);
        setTiposSped(t.data);
      } catch {
        /* selects ainda funcionam com fallback mínimo */
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fiscalConsulta.produtoGrupos(form.familia);
        setGrupos(res.data);
      } catch {
        setGrupos([]);
      }
    })();
  }, [form.familia]);

  useEffect(() => {
    if (isNew) return;
    void (async () => {
      try {
        const res = await api.get<{ data: Produto }>(`/produtos/${id}`);
        setForm(fromProduto(res.data));
      } catch {
        setError('Produto não encontrado.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew]);

  // Novo produto: escolhe automaticamente o grupo canônico padrão da família.
  useEffect(() => {
    if (!isNew || !grupos.length || form.grupo_id) return;
    const preferred =
      grupos.find((g) =>
        ({ MP: 'MP-PAP', EMB: 'EMB-TUB', REV: 'REV-RIB', PA: 'PA-ETQ', SVC: 'SVC', FAC: 'FAC' } as Record<
          string,
          string
        >)[form.familia] === g.codigo
      ) ?? grupos[0];
    setForm((prev) => applyGrupoDefaults(prev, preferred, true));
  }, [isNew, grupos, form.familia, form.grupo_id]);

  const selectedGrupo = useMemo(
    () => grupos.find((g) => String(g.id) === form.grupo_id) ?? null,
    [grupos, form.grupo_id]
  );

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

  const handleFamiliaChange = (familia: string) => {
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
    setForm((prev) => applyGrupoDefaults(prev, grupo, isNew));
  };

  const handleSave = async () => {
    if (!canWrite && !canFiscal) return;
    if (!form.grupo_id) {
      setError('Selecione o grupo canônico do produto.');
      setTab('comercial');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = toPayload(form);
      if (isNew) {
        const res = await api.post<{ data: Produto }>('/produtos', payload);
        navigate(`/produtos/${res.data.id}`);
      } else {
        await api.put<{ data: Produto }>(`/produtos/${id}`, payload);
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
        title={isNew ? 'Novo produto' : form.codigo}
        description={isNew ? 'Cadastro de item' : form.descricao_fiscal}
        actions={
          <Link to="/produtos" className="btn btn-secondary">
            Voltar
          </Link>
        }
      />

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-body">
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
              <div className="form-group">
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
                      {g.grupo_estoque_padrao ? ` · estoque GG ${g.grupo_estoque_padrao}` : ''}
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
                    {selectedGrupo.exige_dimensao_sku ? ' · exige máscara de bobina no estoque' : ''}
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
                  <label>Linhas de estoque (GG)</label>
                  <div className="form-hint" style={{ marginTop: 0 }}>
                    {selectedGrupo.grupos_estoque.map((l) => (
                      <span key={l.codigo} style={{ display: 'inline-block', marginRight: '0.85rem' }}>
                        <strong>{l.codigo}</strong> {l.nome}
                      </span>
                    ))}
                    — gravadas na máscara de bobina no módulo de estoque; o código fiscal permanece{' '}
                    {selectedGrupo.codigo}-nnn.
                  </div>
                </div>
              )}
              <div className="form-group span-2">
                <label>Descrição fiscal</label>
                <input
                  value={form.descricao_fiscal}
                  disabled={readOnly}
                  onChange={(e) => update({ descricao_fiscal: e.target.value })}
                  required
                />
                <span className="form-hint">Texto estável que vai para NF-e / SPED. Marca não substitui descrição.</span>
              </div>
              <div className="form-group span-2">
                <label>Descrição comercial</label>
                <input
                  value={form.descricao_comercial}
                  disabled={readOnly}
                  onChange={(e) => update({ descricao_comercial: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Unidade comercial</label>
                <input
                  value={form.unidade_comercial}
                  disabled={readOnly}
                  onChange={(e) => update({ unidade_comercial: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="form-group">
                <label>Unidade interna</label>
                <input
                  value={form.unidade_interna}
                  disabled={readOnly}
                  onChange={(e) => update({ unidade_interna: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="form-group">
                <label>Fator conversão</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder={decimalStep(DECIMAL_SCALE.factor)}
                  value={form.fator_conversao}
                  disabled={readOnly}
                  onChange={(e) => update({ fator_conversao: e.target.value })}
                />
                <span className="form-hint">Até {DECIMAL_SCALE.factor} casas (NUMERIC 19,10). Ponto ou vírgula.</span>
              </div>
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
                    REV=00, SVC=09.
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
              {saving ? 'Salvando…' : isNew ? 'Criar produto' : 'Salvar alterações'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
