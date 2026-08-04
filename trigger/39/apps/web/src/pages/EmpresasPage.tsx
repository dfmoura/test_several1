import { useEffect, useRef, useState } from 'react';
import { CnaeAtividadesPanel } from '../components/CnaeAtividadesPanel';
import { CnpjConsultaMetaStrip } from '../components/CnpjConsultaMetaStrip';
import { PageHeader } from '../components/PageHeader';
import { QsaSociosPanel } from '../components/QsaSociosPanel';
import { StatusPill } from '../components/StatusPill';
import {
  api,
  type CepConsulta,
  type CnpjConsulta,
  type Empresa,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  allowedCrtsForRegime,
  crtLabel,
  defaultCrtForRegime,
  IE_STATUSES,
  isValidCnpj,
  syncCrtForForm,
} from '../lib/empresaFiscal';
import {
  formatCep,
  formatCnpj,
  formatDate,
  formatPhone,
  onlyDigits,
} from '../lib/format';
import { ieStatusLabel } from '../lib/parceiroFiscal';

type EmpresaForm = {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  ie: string;
  ie_status: string;
  im: string;
  iest: string;
  regime: string;
  crt: number;
  regime_desde: string;
  cnae: string;
  email: string;
  telefone: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  ibge: string;
  venda_ativa: boolean;
  estoque_ativo: boolean;
  situacao: string;
  motivo_vigencia_fiscal: string;
};

const TABS = [
  'Identificação',
  'Atividades',
  'Endereço',
  'Contato',
  'Sócios',
  'Histórico',
  'Operação',
] as const;
type Tab = (typeof TABS)[number];

const REGIMES = [
  { value: 'SIMPLES_NACIONAL', label: 'Simples Nacional' },
  { value: 'LUCRO_PRESUMIDO', label: 'Lucro Presumido' },
  { value: 'LUCRO_REAL', label: 'Lucro Real' },
  { value: 'MEI', label: 'MEI' },
] as const;

function toForm(emp: Empresa): EmpresaForm {
  const regime = emp.regime ?? 'SIMPLES_NACIONAL';
  return {
    cnpj: emp.cnpj ?? '',
    razao_social: emp.razao_social,
    nome_fantasia: emp.nome_fantasia ?? '',
    ie: emp.ie ?? '',
    ie_status: emp.ie_status ?? 'NAO_VERIFICADA',
    im: emp.im ?? '',
    iest: emp.iest ?? '',
    regime,
    crt: emp.crt ?? defaultCrtForRegime(regime),
    regime_desde: emp.regime_desde ? emp.regime_desde.slice(0, 10) : '',
    cnae: emp.cnae ?? '',
    email: emp.email ?? '',
    telefone: emp.telefone ?? '',
    logradouro: emp.logradouro ?? '',
    numero: emp.numero ?? '',
    complemento: emp.complemento ?? '',
    bairro: emp.bairro ?? '',
    municipio: emp.municipio ?? '',
    uf: emp.uf ?? '',
    cep: emp.cep ?? '',
    ibge: emp.ibge ?? '',
    venda_ativa: emp.venda_ativa,
    estoque_ativo: emp.estoque_ativo,
    situacao: emp.situacao,
    motivo_vigencia_fiscal: '',
  };
}

function applyCnpjToForm(form: EmpresaForm, d: CnpjConsulta): EmpresaForm {
  const cnae =
    d.cnae ??
    (d.cnae_fiscal != null ? String(d.cnae_fiscal).padStart(7, '0') : form.cnae);
  const telefone = d.telefone ?? d.ddd_telefone_1 ?? form.telefone;
  const ibge =
    d.ibge ??
    (d.codigo_municipio_ibge != null ? String(d.codigo_municipio_ibge) : form.ibge);

  const regime = d.regime_sugerido ?? form.regime;
  return {
    ...form,
    razao_social: d.razao_social ?? form.razao_social,
    nome_fantasia: d.nome_fantasia ?? form.nome_fantasia,
    regime,
    crt: syncCrtForForm(regime, form.crt, form.regime),
    cnae,
    logradouro: d.logradouro ?? form.logradouro,
    numero: d.numero ?? form.numero,
    complemento: d.complemento ?? form.complemento,
    bairro: d.bairro ?? form.bairro,
    municipio: d.municipio ?? form.municipio,
    uf: d.uf ?? form.uf,
    cep: d.cep ? onlyDigits(d.cep) : form.cep,
    ibge,
    telefone: telefone ? onlyDigits(telefone) : form.telefone,
    email: d.email ?? form.email,
  };
}

export function EmpresasPage() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('empresas.gerir');
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selected, setSelected] = useState<Empresa | null>(null);
  const [form, setForm] = useState<EmpresaForm | null>(null);
  const [consulta, setConsulta] = useState<CnpjConsulta | null>(null);
  const [tab, setTab] = useState<Tab>('Identificação');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [consulting, setConsulting] = useState<'cnpj' | 'cep' | null>(null);
  const [cnpjUnlocked, setCnpjUnlocked] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const selectedIdRef = useRef<number | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<{ data: Empresa[] }>('/empresas');
        setEmpresas(res.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const applyCnpjConsulta = async (
    digits: string,
    base: EmpresaForm,
    empresaId: number,
    silent = false,
  ) => {
    setConsulting('cnpj');
    if (!silent) {
      setError('');
      setMessage('');
    }
    try {
      const res = await api.get<{ data: CnpjConsulta }>(`/consulta/cnpj/${digits}`);
      if (selectedIdRef.current !== empresaId) return;
      const d = res.data;
      setForm(applyCnpjToForm(base, d));
      setConsulta(d);
      if (!silent) {
        setMessage('Dados do CNPJ importados da Receita (BrasilAPI). Confira IE/IM antes de salvar.');
      }
    } catch (err) {
      if (selectedIdRef.current !== empresaId) return;
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Erro na consulta CNPJ.');
      }
    } finally {
      if (selectedIdRef.current === empresaId) {
        setConsulting(null);
      }
    }
  };

  const openEdit = (emp: Empresa) => {
    selectedIdRef.current = emp.id;
    setSelected(emp);
    setForm(toForm(emp));
    setConsulta(null);
    setTab('Identificação');
    setCnpjUnlocked(!emp.cnpj);
    setMessage('');
    setError('');

    void (async () => {
      try {
        const res = await api.get<{ data: Empresa }>(`/empresas/${emp.id}`);
        if (selectedIdRef.current !== emp.id) return;
        const full = res.data;
        setSelected(full);
        const next = toForm(full);
        setForm(next);
        const digits = onlyDigits(full.cnpj ?? '');
        if (digits.length === 14) {
          void applyCnpjConsulta(digits, next, emp.id, true);
        }
      } catch {
        const next = toForm(emp);
        const digits = onlyDigits(emp.cnpj ?? '');
        if (digits.length === 14) {
          void applyCnpjConsulta(digits, next, emp.id, true);
        }
      }
    })();
  };

  const update = (patch: Partial<EmpresaForm>) => {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const consultarCnpj = async () => {
    if (!form || !selected) return;
    const digits = onlyDigits(form.cnpj);
    if (digits.length !== 14) {
      setError('Informe um CNPJ válido com 14 dígitos.');
      return;
    }
    await applyCnpjConsulta(digits, form, selected.id, false);
  };

  const consultarCep = async () => {
    if (!form) return;
    const digits = onlyDigits(form.cep);
    if (digits.length !== 8) {
      setError('Informe um CEP válido com 8 dígitos.');
      return;
    }
    setConsulting('cep');
    setError('');
    setMessage('');
    try {
      const res = await api.get<{ data: CepConsulta }>(`/consulta/cep/${digits}`);
      const d = res.data;
      update({
        logradouro: d.logradouro ?? form.logradouro,
        complemento: d.complemento ?? form.complemento,
        bairro: d.bairro ?? form.bairro,
        municipio: d.localidade ?? form.municipio,
        uf: d.uf ?? form.uf,
        ibge: d.ibge ?? form.ibge,
      });
      setMessage('Endereço importado via CEP (ViaCEP).');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na consulta CEP.');
    } finally {
      setConsulting(null);
    }
  };

  const handleSave = async () => {
    if (!selected || !form || !canEdit) return;
    const cnpjDigits = onlyDigits(form.cnpj);
    if (cnpjDigits.length === 14 && !isValidCnpj(cnpjDigits)) {
      setError('CNPJ com dígito verificador inválido.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const cnaesSec =
        consulta?.cnaes_secundarios?.map((item) => ({
          codigo: String(item.codigo),
          descricao: item.descricao ?? null,
        })) ??
        selected.cnaes_secundarios ??
        null;

      const res = await api.put<{ data: Empresa }>(`/empresas/${selected.id}`, {
        ...form,
        cnpj: cnpjDigits,
        cep: onlyDigits(form.cep),
        cnae: onlyDigits(form.cnae),
        regime_desde: form.regime_desde || null,
        iest: form.iest || null,
        cnaes_secundarios: cnaesSec,
        motivo_vigencia_fiscal: form.motivo_vigencia_fiscal || null,
      });
      setEmpresas((prev) => prev.map((e) => (e.id === res.data.id ? res.data : e)));
      setSelected(res.data);
      setForm(toForm(res.data));
      setCnpjUnlocked(false);
      setMessage('Empresa atualizada com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Carregando empresas…</div>;

  const cnpjLocked = Boolean(selected?.cnpj) && !cnpjUnlocked;
  const cnaePrincipalDesc =
    consulta?.cnae_descricao ?? consulta?.cnae_fiscal_descricao ?? '';
  const cnaesSecundarios =
    consulta?.cnaes_secundarios ??
    selected?.cnaes_secundarios?.map((item) => ({
      codigo: item.codigo,
      descricao: item.descricao ?? '',
    })) ??
    [];
  const socios = consulta?.qsa ?? [];
  const historico = selected?.fiscais_historico ?? [];
  const pendencias = selected?.fiscal_pendencias ?? [];
  const pendenciasEmissao = selected?.fiscal_pendencias_emissao ?? [];
  const fiscalCompleto = Boolean(selected?.cadastro_fiscal_completo);
  const aptoNfe = Boolean(selected?.apto_emissao_nfe);

  return (
    <>
      <PageHeader
        title="Empresas"
        description="Multi-CNPJ EMP-00001 / EMP-00002 — cadastro fiscal com consulta BrasilAPI"
      />

      <div className="card-grid" style={{ marginBottom: '1.5rem' }}>
        {empresas.map((emp) => (
          <button
            key={emp.id}
            type="button"
            className="card-link"
            style={{
              cursor: 'pointer',
              textAlign: 'left',
              border: selected?.id === emp.id ? '2px solid var(--green)' : undefined,
            }}
            onClick={() => openEdit(emp)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3>{emp.codigo}</h3>
              <StatusPill status={emp.situacao} />
            </div>
            <p>{emp.nome_fantasia ?? emp.razao_social}</p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
              {formatCnpj(emp.cnpj)} · {emp.municipio}/{emp.uf}
              {emp.crt != null ? ` · CRT ${emp.crt}` : ''}
            </p>
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {emp.venda_ativa && <StatusPill status="VENDA ATIVA" />}
              {emp.estoque_ativo && <StatusPill status="ESTOQUE ATIVO" />}
              {!emp.venda_ativa && <StatusPill status="VENDA OFF" />}
            </div>
          </button>
        ))}
      </div>

      {selected && form && (
        <div className="card">
          <div className="card-body">
            <div className="empresa-header">
              <div className="empresa-header-title">
                <h2>{selected.codigo}</h2>
                <p className="form-hint">
                  {form.razao_social}
                  {consulting === 'cnpj' ? ' · consultando Receita…' : ''}
                </p>
              </div>
              {canEdit && (
                <div className="empresa-header-actions">
                  {cnpjLocked && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setCnpjUnlocked(true)}
                    >
                      Alterar CNPJ
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={consulting === 'cnpj'}
                    onClick={consultarCnpj}
                  >
                    {consulting === 'cnpj' ? 'Consultando…' : 'Atualizar da Receita'}
                  </button>
                </div>
              )}
            </div>

            {message && <div className="alert alert-success">{message}</div>}
            {error && <div className="alert alert-error">{error}</div>}

            <div className="fiscal-status-row">
              <div className={`fiscal-status-chip${fiscalCompleto ? ' is-ok' : ' is-warn'}`}>
                {fiscalCompleto ? 'Cadastro fiscal completo' : 'Cadastro fiscal incompleto'}
              </div>
              <div className={`fiscal-status-chip${aptoNfe ? ' is-ok' : ' is-muted'}`}>
                {aptoNfe ? 'Apto para emissão NF-e' : 'Não apto para emissão NF-e'}
              </div>
            </div>

            {!fiscalCompleto && pendencias.length > 0 && (
              <div className="alert alert-warning fiscal-pendencias">
                <strong>Pendências de cadastro do emitente:</strong>
                <ul>
                  {pendencias.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {fiscalCompleto && pendenciasEmissao.length > 0 && (
              <div className="alert alert-warning fiscal-pendencias">
                <strong>Bloqueios de emissão:</strong>
                <ul>
                  {pendenciasEmissao.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {cnpjUnlocked && Boolean(selected.cnpj) && (
              <p className="form-hint" style={{ marginBottom: '0.75rem' }}>
                CNPJ desbloqueado — alterar muda a identidade jurídica desta EMP-.
              </p>
            )}

            {consulta && <CnpjConsultaMetaStrip consulta={consulta} />}

            <div className="tabs tabs-empresa">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`tab${tab === t ? ' active' : ''}`}
                  onClick={() => setTab(t)}
                >
                  {t}
                  {t === 'Atividades' && cnaesSecundarios.length > 0
                    ? ` · ${cnaesSecundarios.length}`
                    : ''}
                  {t === 'Sócios' && socios.length > 0 ? ` · ${socios.length}` : ''}
                </button>
              ))}
            </div>

            {tab === 'Identificação' && (
              <div className="form-section">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Código interno</label>
                    <input value={selected.codigo} disabled />
                  </div>
                  <div className="form-group">
                    <label>CNPJ</label>
                    <input
                      value={formatCnpj(form.cnpj) || form.cnpj}
                      disabled={!canEdit || cnpjLocked}
                      onChange={(e) =>
                        update({ cnpj: onlyDigits(e.target.value).slice(0, 14) })
                      }
                    />
                  </div>
                  <div className="form-group span-2">
                    <label>Razão social</label>
                    <input
                      value={form.razao_social}
                      disabled={!canEdit}
                      onChange={(e) => update({ razao_social: e.target.value })}
                    />
                  </div>
                  <div className="form-group span-2">
                    <label>Nome fantasia</label>
                    <input
                      value={form.nome_fantasia}
                      disabled={!canEdit}
                      onChange={(e) => update({ nome_fantasia: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Inscrição estadual (IE)</label>
                    <input
                      value={form.ie}
                      disabled={!canEdit}
                      onChange={(e) => update({ ie: e.target.value })}
                      placeholder="Informar manualmente"
                    />
                    <span className="form-hint">Não retornada pela API free — obrigatória no emit da NF-e</span>
                  </div>
                  <div className="form-group">
                    <label>Status da IE (SINTEGRA/CCC)</label>
                    <select
                      value={form.ie_status}
                      disabled={!canEdit}
                      onChange={(e) => update({ ie_status: e.target.value })}
                    >
                      {IE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {ieStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Inscrição municipal (IM)</label>
                    <input
                      value={form.im}
                      disabled={!canEdit}
                      onChange={(e) => update({ im: e.target.value })}
                      placeholder="Para NFS-e"
                    />
                    <span className="form-hint">Necessária se emitir NFS-e no município</span>
                  </div>
                  <div className="form-group">
                    <label>IEST (substituto tributário)</label>
                    <input
                      value={form.iest}
                      disabled={!canEdit}
                      onChange={(e) => update({ iest: e.target.value })}
                      placeholder="Opcional — IE ST"
                    />
                  </div>
                  <div className="form-group">
                    <label>Regime tributário</label>
                    <select
                      value={form.regime}
                      disabled={!canEdit}
                      onChange={(e) => {
                        const regime = e.target.value;
                        update({
                          regime,
                          crt: syncCrtForForm(regime, form.crt, form.regime),
                          regime_desde: form.regime_desde || new Date().toISOString().slice(0, 10),
                        });
                      }}
                    >
                      {REGIMES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    {consulta?.data_opcao_pelo_simples && (
                      <span className="form-hint">
                        Opção Simples desde {formatDate(consulta.data_opcao_pelo_simples)}
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label>CRT (NF-e emit)</label>
                    <select
                      value={form.crt}
                      disabled={!canEdit || allowedCrtsForRegime(form.regime).length === 1}
                      onChange={(e) => update({ crt: Number(e.target.value) })}
                    >
                      {allowedCrtsForRegime(form.regime).map((code) => (
                        <option key={code} value={code}>
                          {crtLabel(code)}
                        </option>
                      ))}
                    </select>
                    <span className="form-hint">
                      Obrigatório no XML da NF-e. No Simples, use CRT 2 se ultrapassar o sublimite.
                    </span>
                  </div>
                  <div className="form-group">
                    <label>Regime desde</label>
                    <input
                      type="date"
                      value={form.regime_desde}
                      disabled={!canEdit}
                      onChange={(e) => update({ regime_desde: e.target.value })}
                    />
                    <span className="form-hint">Data-corte para virada Simples → Lucro Real</span>
                  </div>
                  <div className="form-group">
                    <label>Situação no ERP</label>
                    <select
                      value={form.situacao}
                      disabled={!canEdit}
                      onChange={(e) => update({ situacao: e.target.value })}
                    >
                      <option value="ATIVA">Ativa</option>
                      <option value="INATIVA">Inativa</option>
                    </select>
                  </div>
                  {canEdit && (
                    <div className="form-group span-2">
                      <label>Motivo da vigência fiscal (opcional)</label>
                      <input
                        value={form.motivo_vigencia_fiscal}
                        onChange={(e) => update({ motivo_vigencia_fiscal: e.target.value })}
                        placeholder="Ex.: migração para Lucro Real em DD/MM/AAAA"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'Atividades' && form && (
              <CnaeAtividadesPanel
                cnae={form.cnae}
                cnaeDescricao={cnaePrincipalDesc}
                cnaesSecundarios={cnaesSecundarios}
                canEdit={canEdit}
                loading={consulting === 'cnpj' && !consulta}
                onCnaeChange={(digits) => update({ cnae: digits })}
              />
            )}

            {tab === 'Endereço' && (
              <div className="form-section">
                <div className="panel-title">
                  <h3>Endereço fiscal</h3>
                  {canEdit && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={consulting === 'cep'}
                      onClick={consultarCep}
                    >
                      {consulting === 'cep' ? 'Consultando…' : 'Buscar CEP'}
                    </button>
                  )}
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>CEP</label>
                    <input
                      value={formatCep(form.cep) || form.cep}
                      disabled={!canEdit}
                      onChange={(e) =>
                        update({ cep: onlyDigits(e.target.value).slice(0, 8) })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Código IBGE</label>
                    <input
                      value={form.ibge}
                      disabled={!canEdit}
                      onChange={(e) =>
                        update({ ibge: onlyDigits(e.target.value).slice(0, 7) })
                      }
                    />
                    <span className="form-hint">Obrigatório para NF-e (cMun)</span>
                  </div>
                  <div className="form-group span-2">
                    <label>Logradouro</label>
                    <input
                      value={form.logradouro}
                      disabled={!canEdit}
                      onChange={(e) => update({ logradouro: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Número</label>
                    <input
                      value={form.numero}
                      disabled={!canEdit}
                      onChange={(e) => update({ numero: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Complemento</label>
                    <input
                      value={form.complemento}
                      disabled={!canEdit}
                      onChange={(e) => update({ complemento: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Bairro</label>
                    <input
                      value={form.bairro}
                      disabled={!canEdit}
                      onChange={(e) => update({ bairro: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Município</label>
                    <input
                      value={form.municipio}
                      disabled={!canEdit}
                      onChange={(e) => update({ municipio: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>UF</label>
                    <input
                      value={form.uf}
                      maxLength={2}
                      disabled={!canEdit}
                      onChange={(e) =>
                        update({ uf: e.target.value.toUpperCase().slice(0, 2) })
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {tab === 'Contato' && (
              <div className="form-section">
                <div className="form-grid">
                  <div className="form-group">
                    <label>E-mail</label>
                    <input
                      type="email"
                      value={form.email}
                      disabled={!canEdit}
                      onChange={(e) => update({ email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Telefone</label>
                    <input
                      value={formatPhone(form.telefone) || form.telefone}
                      disabled={!canEdit}
                      onChange={(e) => update({ telefone: onlyDigits(e.target.value) })}
                    />
                  </div>
                  {consulta?.qualificacao_do_responsavel && (
                    <div className="form-group span-2">
                      <label>Qualificação do responsável (RFB)</label>
                      <input value={consulta.qualificacao_do_responsavel} disabled />
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'Sócios' && (
              <QsaSociosPanel
                socios={socios}
                loading={consulting === 'cnpj' && !consulta}
              />
            )}

            {tab === 'Histórico' && (
              <div className="form-section">
                <div className="panel-title">
                  <h3>Vigências fiscais do emitente</h3>
                  <span className="form-hint">IE, IM, IEST, regime e CRT</span>
                </div>
                {historico.length === 0 ? (
                  <div className="empty-panel">Nenhuma vigência registrada ainda.</div>
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Início</th>
                          <th>Fim</th>
                          <th>IE</th>
                          <th>Status IE</th>
                          <th>Regime</th>
                          <th>CRT</th>
                          <th>Motivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historico.map((h) => (
                          <tr key={h.id}>
                            <td>{formatDate(h.vigencia_inicio)}</td>
                            <td>{h.vigencia_fim ? formatDate(h.vigencia_fim) : 'atual'}</td>
                            <td>
                              <code>{h.ie ?? '—'}</code>
                            </td>
                            <td>{h.ie_status ? ieStatusLabel(h.ie_status) : '—'}</td>
                            <td>{h.regime ?? '—'}</td>
                            <td>{h.crt ?? '—'}</td>
                            <td>{h.motivo ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {tab === 'Operação' && (
              <div className="form-section">
                <p className="form-hint" style={{ marginBottom: '1rem' }}>
                  EMP-00002 permanece com venda/estoque desligados até parecer Contador +
                  Direção (MULTI_EMPRESA_CNPJS_E_LIVROS).
                </p>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Venda ativa</label>
                    <select
                      value={form.venda_ativa ? '1' : '0'}
                      disabled={!canEdit}
                      onChange={(e) => update({ venda_ativa: e.target.value === '1' })}
                    >
                      <option value="1">Sim</option>
                      <option value="0">Não</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Estoque ativo</label>
                    <select
                      value={form.estoque_ativo ? '1' : '0'}
                      disabled={!canEdit}
                      onChange={(e) => update({ estoque_ativo: e.target.value === '1' })}
                    >
                      <option value="1">Sim</option>
                      <option value="0">Não</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="form-actions">
              {canEdit ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving || consulting !== null}
                  onClick={handleSave}
                >
                  {saving ? 'Salvando…' : 'Salvar alterações'}
                </button>
              ) : (
                <p className="form-hint" style={{ margin: 0 }}>
                  Apenas administradores podem editar empresas.
                </p>
              )}
              {consulta && (
                <span className="form-hint">
                  Fonte: BrasilAPI · QSA consultivo · CNAEs secundários gravados no salvar
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
