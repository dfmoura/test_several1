import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { RegistroMetaStrip, type RegistroAutoria } from '../components/RegistroMetaStrip';
import { ApiError, api, type BemPatrimonial, type CessaoBem, type Departamento, type Parceiro } from '../lib/api';
import { ParceiroCombobox } from '../components/ParceiroCombobox';
import { useAuth } from '../lib/auth';
import { onAbrirFichaClick } from '../lib/fichaNav';
import { bemCategoriaLabel, bemStatusLabel } from '../lib/patrimonio';

type FormData = {
  descricao: string;
  categoria: string;
  marca: string;
  modelo: string;
  numero_serie: string;
  adquirido_em: string;
  valor_aquisicao: string;
  nf_numero: string;
  fornecedor_id: string;
  departamento_id: string;
  departamento_nome: string;
  responsavel: string;
  status: string;
  garantia_ate: string;
  placa: string;
  renavam: string;
  vida_util_meses: string;
  orc_catalogo_maquina_id: string;
  capitalizado: boolean;
  observacao: string;
  baixado_em: string;
  motivo_baixa: string;
};

type CatalogoMaquina = { id: number; nome: string; ativo: boolean };

type CapitalizacaoMeta = {
  valor_minimo: number;
  abaixo_do_minimo: boolean;
  mensagem: string | null;
};

const emptyForm = (): FormData => ({
  descricao: '',
  categoria: 'MAQUINA_GRAFICA',
  marca: '',
  modelo: '',
  numero_serie: '',
  adquirido_em: '',
  valor_aquisicao: '',
  nf_numero: '',
  fornecedor_id: '',
  departamento_id: '',
  departamento_nome: '',
  responsavel: '',
  status: 'ATIVO',
  garantia_ate: '',
  placa: '',
  renavam: '',
  vida_util_meses: '',
  orc_catalogo_maquina_id: '',
  capitalizado: false,
  observacao: '',
  baixado_em: '',
  motivo_baixa: '',
});

function fromBem(b: BemPatrimonial): FormData {
  return {
    descricao: b.descricao,
    categoria: b.categoria,
    marca: b.marca ?? '',
    modelo: b.modelo ?? '',
    numero_serie: b.numero_serie ?? '',
    adquirido_em: b.adquirido_em ?? '',
    valor_aquisicao: b.valor_aquisicao ?? '',
    nf_numero: b.nf_numero ?? '',
    fornecedor_id: b.fornecedor_id != null ? String(b.fornecedor_id) : '',
    departamento_id: b.departamento_id != null ? String(b.departamento_id) : '',
    departamento_nome: b.departamento?.nome ?? b.local ?? '',
    responsavel: b.responsavel ?? '',
    status: b.status,
    garantia_ate: b.garantia_ate ?? '',
    placa: b.placa ?? '',
    renavam: b.renavam ?? '',
    vida_util_meses: b.vida_util_meses != null ? String(b.vida_util_meses) : '',
    orc_catalogo_maquina_id:
      b.orc_catalogo_maquina_id != null ? String(b.orc_catalogo_maquina_id) : '',
    capitalizado: b.capitalizado,
    observacao: b.observacao ?? '',
    baixado_em: b.baixado_em ?? '',
    motivo_baixa: b.motivo_baixa ?? '',
  };
}

function toPayload(form: FormData): Record<string, unknown> {
  return {
    descricao: form.descricao.trim(),
    categoria: form.categoria,
    marca: form.marca || null,
    modelo: form.modelo || null,
    numero_serie: form.numero_serie || null,
    adquirido_em: form.adquirido_em || null,
    valor_aquisicao: form.valor_aquisicao !== '' ? form.valor_aquisicao : null,
    nf_numero: form.nf_numero || null,
    fornecedor_id: form.fornecedor_id ? parseInt(form.fornecedor_id, 10) : null,
    departamento_id: form.departamento_id ? parseInt(form.departamento_id, 10) : null,
    responsavel: form.responsavel || null,
    status: form.status,
    garantia_ate: form.garantia_ate || null,
    placa: form.placa || null,
    renavam: form.renavam || null,
    vida_util_meses: form.vida_util_meses !== '' ? parseInt(form.vida_util_meses, 10) : null,
    orc_catalogo_maquina_id:
      form.categoria === 'MAQUINA_GRAFICA' && form.orc_catalogo_maquina_id
        ? parseInt(form.orc_catalogo_maquina_id, 10)
        : null,
    capitalizado: form.capitalizado,
    observacao: form.observacao || null,
    baixado_em: form.baixado_em || null,
    motivo_baixa: form.motivo_baixa || null,
  };
}

const CATEGORIAS = [
  'MAQUINA_GRAFICA',
  'EQUIPAMENTO',
  'INFORMATICA',
  'VEICULO',
  'MOVEL',
  'SOFTWARE',
  'OUTRO',
] as const;

const STATUSES = ['ATIVO', 'EM_MANUTENCAO', 'CEDIDO', 'BAIXADO', 'VENDIDO'] as const;

export function PatrimonioFormPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'novo';
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('patrimonio.escrever');
  const canOpenParceiro = hasPermission('parceiro.ler');
  const canOpenCatalogoOrc = hasPermission('orcamento.catalogo.gerir');

  const [form, setForm] = useState<FormData>(emptyForm);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [capitalizacao, setCapitalizacao] = useState<CapitalizacaoMeta | null>(null);
  const [fornecedores, setFornecedores] = useState<Parceiro[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [maquinasOrc, setMaquinasOrc] = useState<CatalogoMaquina[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [autoria, setAutoria] = useState<RegistroAutoria | null>(null);
  const [cessoes, setCessoes] = useState<CessaoBem[]>([]);
  const [cessaoPar, setCessaoPar] = useState<Parceiro | null>(null);
  const [cessaoObs, setCessaoObs] = useState('');
  const [cessaoPending, setCessaoPending] = useState(false);

  const update = (patch: Partial<FormData>) => setForm((prev) => ({ ...prev, ...patch }));

  const avisoCapitalizacao = useMemo(() => {
    if (!capitalizacao) return null;
    const valor = form.valor_aquisicao !== '' ? Number(form.valor_aquisicao) : null;
    if (valor === null || Number.isNaN(valor)) return null;
    if (valor < capitalizacao.valor_minimo) {
      return (
        capitalizacao.mensagem ??
        `Valor abaixo do mínimo de capitalização (R$ ${capitalizacao.valor_minimo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`
      );
    }
    return null;
  }, [form.valor_aquisicao, capitalizacao]);

  useEffect(() => {
    void (async () => {
      try {
        const [parRes, depRes, listMeta] = await Promise.all([
          api.get<{ data: Parceiro[] }>('/parceiros?papel=fornecedor'),
          api.get<{ data: Departamento[] }>('/consulta/departamentos'),
          api.get<{
            data: BemPatrimonial[];
            meta: {
              capitalizacao: CapitalizacaoMeta;
              grupos_hora_maquina: CatalogoMaquina[];
            };
          }>('/bens'),
        ]);
        setFornecedores(parRes.data);
        setDepartamentos(depRes.data);
        setCapitalizacao(listMeta.meta.capitalizacao);
        setMaquinasOrc(listMeta.meta.grupos_hora_maquina ?? []);
      } catch {
        /* ignore bootstrap errors */
      }
    })();
  }, []);

  const departamentosOptions = useMemo(() => {
    const list = [...departamentos];
    const currentId = form.departamento_id ? Number(form.departamento_id) : null;
    if (currentId && !list.some((d) => d.id === currentId)) {
      list.unshift({
        id: currentId,
        empresa_id: 0,
        codigo: '',
        nome: form.departamento_nome || 'Departamento atual',
        ativo: false,
      });
    }
    return list;
  }, [departamentos, form.departamento_id, form.departamento_nome]);

  useEffect(() => {
    if (isNew || !id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get<{ data: BemPatrimonial }>(`/bens/${id}`);
        if (cancelled) return;
        setForm(fromBem(res.data));
        setCodigo(res.data.codigo);
        setAutoria({
          criado_por: res.data.criado_por,
          atualizado_por: res.data.atualizado_por,
          created_at: res.data.created_at,
          updated_at: res.data.updated_at,
        });
        if (res.data.capitalizacao) setCapitalizacao(res.data.capitalizacao);
        const ces = await api.get<{ data: CessaoBem[] }>(`/cessoes-bem?bem_id=${id}`);
        if (!cancelled) setCessoes(ces.data);
      } catch {
        if (!cancelled) setError('Bem patrimonial não encontrado.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      const payload = toPayload(form);
      if (isNew) {
        const res = await api.post<{ data: BemPatrimonial }>('/bens', payload);
        navigate(`/patrimonio/${res.data.id}`, { replace: true });
      } else if (id) {
        const res = await api.put<{ data: BemPatrimonial }>(`/bens/${id}`, payload);
        setForm(fromBem(res.data));
        setCodigo(res.data.codigo);
        setAutoria({
          criado_por: res.data.criado_por,
          atualizado_por: res.data.atualizado_por,
          created_at: res.data.created_at,
          updated_at: res.data.updated_at,
        });
        if (res.data.capitalizacao) setCapitalizacao(res.data.capitalizacao);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.details) setFieldErrors(err.details);
      } else {
        setError('Falha ao salvar.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canWrite || isNew || !id) return;
    if (!window.confirm('Baixar e remover este bem do cadastro operacional?')) return;
    try {
      await api.delete(`/bens/${id}`);
      navigate('/patrimonio');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao remover.');
    }
  };

  if (loading) {
    return <div className="loading">Carregando…</div>;
  }

  const fieldErr = (key: string) =>
    fieldErrors[key]?.[0] ? (
      <small className="field-error">{fieldErrors[key][0]}</small>
    ) : null;

  return (
    <>
      <PageHeader
        title={isNew ? 'Novo bem patrimonial' : codigo ?? 'Bem patrimonial'}
        description="Controle gerencial do ativo — depreciação oficial permanece com o contador."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link to="/patrimonio" className="btn btn-secondary">
              Voltar
            </Link>
            {!isNew && id && (
              <a
                href={`/patrimonio/${id}/ficha`}
                className="btn btn-secondary"
                onClick={(e) => onAbrirFichaClick(e, `/patrimonio/${id}/ficha`)}
              >
                Imprimir ficha
              </a>
            )}
            {canWrite && !isNew && (
              <button type="button" className="btn btn-secondary" onClick={() => void handleDelete()}>
                Baixar / remover
              </button>
            )}
          </div>
        }
      />

      {error && <div className="alert alert-error">{error}</div>}
      {avisoCapitalizacao && <div className="alert alert-warning">{avisoCapitalizacao}</div>}

      <form onSubmit={(e) => void handleSubmit(e)}>
        {!isNew ? <RegistroMetaStrip registro={autoria} /> : null}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <div className="form-section">
              <h3>Identificação</h3>
              <div className="form-grid">
                {!isNew && (
                  <div className="form-group">
                    <label>Código</label>
                    <input value={codigo ?? ''} disabled />
                  </div>
                )}
                <div className="form-group span-2">
                  <label>Descrição</label>
                  <input
                    value={form.descricao}
                    disabled={!canWrite}
                    onChange={(e) => update({ descricao: e.target.value })}
                    required
                  />
                  {fieldErr('descricao')}
                </div>
                <div className="form-group">
                  <label>Categoria</label>
                  <select
                    value={form.categoria}
                    disabled={!canWrite}
                    onChange={(e) =>
                      update({
                        categoria: e.target.value,
                        orc_catalogo_maquina_id:
                          e.target.value === 'MAQUINA_GRAFICA' ? form.orc_catalogo_maquina_id : '',
                      })
                    }
                  >
                    {CATEGORIAS.map((c) => (
                      <option key={c} value={c}>
                        {bemCategoriaLabel(c)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={form.status}
                    disabled={!canWrite}
                    onChange={(e) => update({ status: e.target.value })}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {bemStatusLabel(s)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Marca</label>
                  <input
                    value={form.marca}
                    disabled={!canWrite}
                    onChange={(e) => update({ marca: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Modelo</label>
                  <input
                    value={form.modelo}
                    disabled={!canWrite}
                    onChange={(e) => update({ modelo: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Nº de série</label>
                  <input
                    value={form.numero_serie}
                    disabled={!canWrite}
                    onChange={(e) => update({ numero_serie: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <div className="form-section">
              <h3>Aquisição</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Data aquisição</label>
                  <input
                    type="date"
                    value={form.adquirido_em}
                    disabled={!canWrite}
                    onChange={(e) => update({ adquirido_em: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Valor aquisição (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.valor_aquisicao}
                    disabled={!canWrite}
                    onChange={(e) => update({ valor_aquisicao: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>NF / documento</label>
                  <input
                    value={form.nf_numero}
                    disabled={!canWrite}
                    onChange={(e) => update({ nf_numero: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Fornecedor</label>
                  <select
                    value={form.fornecedor_id}
                    disabled={!canWrite}
                    onChange={(e) => update({ fornecedor_id: e.target.value })}
                  >
                    <option value="">—</option>
                    {fornecedores.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo} — {p.nome_fantasia || p.razao_social}
                      </option>
                    ))}
                  </select>
                  {fieldErr('fornecedor_id')}
                  {canOpenParceiro && form.fornecedor_id ? (
                    <small style={{ display: 'block', marginTop: '0.35rem' }}>
                      <Link to={`/parceiros/${form.fornecedor_id}`} target="_blank" rel="noreferrer">
                        Abrir cadastro do fornecedor
                      </Link>
                    </small>
                  ) : null}
                </div>
                <div className="form-group">
                  <label>Garantia até</label>
                  <input
                    type="date"
                    value={form.garantia_ate}
                    disabled={!canWrite}
                    onChange={(e) => update({ garantia_ate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Vida útil (meses)</label>
                  <input
                    type="number"
                    min="1"
                    max="600"
                    value={form.vida_util_meses}
                    disabled={!canWrite}
                    onChange={(e) => update({ vida_util_meses: e.target.value })}
                    placeholder="Opcional — gerencial"
                  />
                </div>
                <div className="form-group">
                  <label>Capitalizado</label>
                  <select
                    value={form.capitalizado ? '1' : '0'}
                    disabled={!canWrite}
                    onChange={(e) => update({ capitalizado: e.target.value === '1' })}
                  >
                    <option value="1">Sim</option>
                    <option value="0">Não (despesa / abaixo do mínimo)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <div className="form-section">
              <h3>Localização</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Departamento</label>
                  <select
                    value={form.departamento_id}
                    disabled={!canWrite}
                    onChange={(e) => update({ departamento_id: e.target.value })}
                  >
                    <option value="">— Selecione —</option>
                        {departamentosOptions.map((d) => (
                          <option key={d.id} value={String(d.id)}>
                            {d.codigo ? `${d.codigo} — ${d.nome}` : d.nome}
                            {d.ativo === false ? ' (inativo)' : ''}
                          </option>
                        ))}
                  </select>
                  {canWrite ? (
                    <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.85rem' }}>
                      Local / setor do ativo = departamento da empresa.{' '}
                      <Link to="/departamentos">Cadastro de departamentos</Link>.
                    </p>
                  ) : null}
                </div>
                <div className="form-group">
                  <label>Responsável</label>
                  <input
                    value={form.responsavel}
                    disabled={!canWrite}
                    onChange={(e) => update({ responsavel: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {form.categoria === 'MAQUINA_GRAFICA' && (
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-body">
              <div className="form-section">
                <h3>Produção · grupo hora-máquina (ORC)</h3>
                <p style={{ marginTop: 0, opacity: 0.8, fontSize: '0.9rem' }}>
                  Opcional. Liga este bem físico ao grupo de tarifas do orçamento (BETA, 160…). Não
                  altera o catálogo ORC.
                  {canOpenCatalogoOrc ? (
                    <>
                      {' '}
                      <Link to="/orcamento-catalogo">Abrir Catálogo ORC · Máquina (G10)</Link>
                    </>
                  ) : null}
                </p>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Grupo hora-máquina</label>
                    <select
                      value={form.orc_catalogo_maquina_id}
                      disabled={!canWrite}
                      onChange={(e) => update({ orc_catalogo_maquina_id: e.target.value })}
                    >
                      <option value="">— sem vínculo —</option>
                      {maquinasOrc.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nome}
                        </option>
                      ))}
                    </select>
                    {fieldErr('orc_catalogo_maquina_id')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {form.categoria === 'VEICULO' && (
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-body">
              <div className="form-section">
                <h3>Veículo</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Placa</label>
                    <input
                      value={form.placa}
                      disabled={!canWrite}
                      onChange={(e) => update({ placa: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="form-group">
                    <label>RENAVAM</label>
                    <input
                      value={form.renavam}
                      disabled={!canWrite}
                      onChange={(e) => update({ renavam: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {(form.status === 'BAIXADO' || form.status === 'VENDIDO') && (
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-body">
              <div className="form-section">
                <h3>Baixa</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Data da baixa</label>
                    <input
                      type="date"
                      value={form.baixado_em}
                      disabled={!canWrite}
                      onChange={(e) => update({ baixado_em: e.target.value })}
                    />
                  </div>
                  <div className="form-group span-2">
                    <label>Motivo</label>
                    <input
                      value={form.motivo_baixa}
                      disabled={!canWrite}
                      onChange={(e) => update({ motivo_baixa: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isNew && id ? (
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="card-body">
              <div className="form-section">
                <h3>Cessão ao cliente (comodato)</h3>
                <p className="form-hint">
                  Empréstimo de impressora/equipamento. Não gera NFS-e nem NF-e. Locação cobrada
                  também não é ISS. Manutenção cobrada é orçamento de serviço.
                </p>
                {cessoes
                  .filter((c) => c.status === 'VIGENTE')
                  .map((c) => (
                    <div key={c.id} className="form-grid" style={{ marginBottom: '0.75rem' }}>
                      <div className="form-group span-2">
                        <strong>{c.codigo}</strong> · {c.parceiro?.razao_social} · desde{' '}
                        {c.iniciado_em}
                        <div className="muted">{c.aviso_fiscal}</div>
                      </div>
                      {canWrite ? (
                        <div className="form-group">
                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={cessaoPending}
                            onClick={() => {
                              const motivo = window.prompt('Motivo do encerramento (devolução)?');
                              if (!motivo || motivo.trim().length < 3) return;
                              setCessaoPending(true);
                              void api
                                .post(`/cessoes-bem/${c.id}/encerrar`, { motivo: motivo.trim() })
                                .then(() =>
                                  api.get<{ data: CessaoBem[] }>(`/cessoes-bem?bem_id=${id}`),
                                )
                                .then((r) => {
                                  setCessoes(r.data);
                                  update({ status: 'ATIVO' });
                                })
                                .catch((err) =>
                                  setError(err instanceof Error ? err.message : 'Falha ao encerrar'),
                                )
                                .finally(() => setCessaoPending(false));
                            }}
                          >
                            Encerrar cessão
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                {canWrite && !cessoes.some((c) => c.status === 'VIGENTE') ? (
                  <div className="form-grid">
                    <ParceiroCombobox
                      className="span-2"
                      label="Cliente que fica com o bem"
                      papel="orcavel"
                      value={cessaoPar}
                      onChange={setCessaoPar}
                      disabled={cessaoPending}
                    />
                    <div className="form-group span-2">
                      <label>Observação</label>
                      <input
                        value={cessaoObs}
                        onChange={(e) => setCessaoObs(e.target.value)}
                        placeholder="Termo de comodato, local, responsável…"
                      />
                    </div>
                    <div className="form-group">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={cessaoPending || !cessaoPar}
                        onClick={() => {
                          if (!cessaoPar) return;
                          setCessaoPending(true);
                          setError('');
                          void api
                            .post<{ data: CessaoBem }>('/cessoes-bem', {
                              bem_id: Number(id),
                              parceiro_id: cessaoPar.id,
                              tipo: 'COMODATO',
                              observacao: cessaoObs || null,
                            })
                            .then(() => api.get<{ data: CessaoBem[] }>(`/cessoes-bem?bem_id=${id}`))
                            .then((r) => {
                              setCessoes(r.data);
                              setCessaoPar(null);
                              setCessaoObs('');
                              update({ status: 'CEDIDO' });
                            })
                            .catch((err) =>
                              setError(err instanceof ApiError ? err.message : 'Falha ao ceder'),
                            )
                            .finally(() => setCessaoPending(false));
                        }}
                      >
                        Ceder em comodato
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <div className="form-section">
              <h3>Observações</h3>
              <div className="form-group">
                <textarea
                  rows={3}
                  value={form.observacao}
                  disabled={!canWrite}
                  onChange={(e) => update({ observacao: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {canWrite && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        )}
      </form>
    </>
  );
}
