import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { FacaPicker, type FacaRecord } from '../components/FacaPicker';
import { OrcamentoResultado } from '../components/OrcamentoResultado';
import { PageHeader } from '../components/PageHeader';
import { ProspectRapidoPanel } from '../components/ProspectRapidoPanel';
import {
  ApiError,
  api,
  type Orcamento,
  type OrcamentoResult,
  type Parceiro,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  CORES_OPCOES,
  defaultOrcForm,
  formFromSnapshot,
  payloadFromForm,
  type OrcCatalogo,
  type OrcForm,
} from '../lib/orcamentoForm';

export function OrcamentoFormPage() {
  const { id } = useParams();
  const location = useLocation();
  const isNew = location.pathname.endsWith('/novo') || id === 'novo';
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('orcamento.escrever');

  const [catalog, setCatalog] = useState<OrcCatalogo | null>(null);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [parceiroQ, setParceiroQ] = useState('');
  const [parceiroModo, setParceiroModo] = useState<'cadastrado' | 'prospect'>('cadastrado');
  const [form, setForm] = useState<OrcForm>(() => defaultOrcForm(null));
  const [facaSel, setFacaSel] = useState<FacaRecord | null>(null);
  const [calculo, setCalculo] = useState<OrcamentoResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErro(null);
      try {
        const [catRes, parRes] = await Promise.all([
          api.get<{ data: OrcCatalogo }>('/orcamentos/catalogo'),
          api.get<{ data: Parceiro[] }>('/parceiros?papel=orcavel'),
        ]);
        if (cancelled) return;
        setCatalog(catRes.data);
        setParceiros(parRes.data);

        if (!isNew && id) {
          const orc = await api.get<{ data: Orcamento }>(`/orcamentos/${id}`);
          if (cancelled) return;
          if (!orc.data.editavel) {
            navigate(`/orcamentos/${id}`, { replace: true });
            return;
          }
          const nextForm = formFromSnapshot(orc.data.input_snapshot, catRes.data);
          setForm(nextForm);
          setCalculo(orc.data.result_snapshot);
          if (nextForm.faca_nova) {
            setFacaSel({
              faca_nova: true,
              completa: false,
              medida: nextForm.medida,
              formato: nextForm.formato_faca || 'RETA',
              faca: nextForm.formato_faca || 'RETA',
              maquina_catalogo: nextForm.maquina,
              puxada: nextForm.puxada_cm || null,
              z: nextForm.z === '' ? null : nextForm.z,
              label: 'FACA NOVA (simulada)',
            });
          } else {
            setFacaSel(null);
          }
        } else {
          setForm(defaultOrcForm(catRes.data));
          setCalculo(null);
          setFacaSel(null);
        }
      } catch (e) {
        if (!cancelled) {
          setErro(e instanceof Error ? e.message : 'Falha ao carregar formulário');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew, navigate]);

  const setField = <K extends keyof OrcForm>(key: K, value: OrcForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setCalculo(null);
  };

  const aplicarFaca = (faca: FacaRecord | null) => {
    setFacaSel(faca);
    setCalculo(null);
    if (!faca) {
      setForm((prev) => ({
        ...prev,
        faca_nova: false,
        formato_faca: '',
        valor_faca_nova: 0,
        prazo_faca_dias: '',
      }));
      return;
    }

    const isNova = faca.faca_nova === true;
    const puxada = faca.puxada != null ? Number(faca.puxada) : null;
    const z = faca.z != null ? Number(faca.z) : null;
    const largura = faca.largura_faca != null ? Number(faca.largura_faca) : null;
    const maq = String(faca.maquina_catalogo || '').trim();
    const maquinas = catalog?.maquinas ?? [];
    const maquinasRoda = catalog?.maquinas_roda_servico ?? maquinas;
    const formato = String(faca.formato || faca.faca || '');

    setForm((prev) => ({
      ...prev,
      medida: String(faca.medida || prev.medida),
      puxada_cm: puxada != null && !Number.isNaN(puxada) ? puxada : isNova ? 0 : prev.puxada_cm,
      z: z != null && !Number.isNaN(z) ? z : isNova ? '' : prev.z,
      largura_cm:
        largura != null && !Number.isNaN(largura) && largura > 0 ? largura : prev.largura_cm,
      maquina: maq && maquinas.includes(maq) ? maq : prev.maquina,
      maquina_roda_servico:
        maq && maquinasRoda.includes(maq) ? maq : prev.maquina_roda_servico,
      faca_nova: isNova,
      formato_faca: formato,
      valor_faca_nova: isNova ? prev.valor_faca_nova : 0,
      prazo_faca_dias: isNova ? prev.prazo_faca_dias : '',
    }));
  };

  const facaIncompleta = facaSel != null && facaSel.completa === false;
  const facaNova = form.faca_nova || facaSel?.faca_nova === true;
  const puxadaManual = !facaSel || facaIncompleta || facaSel.puxada == null || facaNova;
  const zManual = !facaSel || facaIncompleta || facaSel.z == null || facaNova;
  const medidaManual = !facaSel || facaNova;

  const parceirosFiltrados = useMemo(() => {
    const term = parceiroQ.trim().toLowerCase();
    if (!term) return parceiros;
    return parceiros.filter((p) => {
      const blob = [
        p.codigo,
        p.razao_social,
        p.nome_fantasia,
        p.municipio,
        p.uf,
        p.whatsapp,
        p.email,
        p.cnpj_cpf,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(term);
    });
  }, [parceiros, parceiroQ]);

  const upsertParceiroLocal = (p: Parceiro) => {
    setParceiros((prev) => {
      if (prev.some((x) => x.id === p.id)) {
        return prev.map((x) => (x.id === p.id ? p : x));
      }
      return [p, ...prev];
    });
  };

  const vincularParceiro = (p: Pick<Parceiro, 'id'> & Partial<Parceiro>) => {
    const existing = parceiros.find((x) => x.id === p.id);
    if (existing) {
      setField('parceiro_id', existing.id);
    } else {
      const stub = {
        id: p.id,
        codigo: p.codigo ?? `PAR-${p.id}`,
        razao_social: p.razao_social ?? '',
        is_prospect: p.is_prospect ?? true,
        papel_cliente: p.papel_cliente ?? false,
        municipio: p.municipio ?? null,
        uf: p.uf ?? null,
        whatsapp: p.whatsapp ?? null,
        email: p.email ?? null,
        cnpj_cpf: p.cnpj_cpf ?? null,
      } as Parceiro;
      upsertParceiroLocal(stub);
      setField('parceiro_id', p.id);
    }
    setParceiroQ('');
    setParceiroModo('cadastrado');
    setErro(null);
  };

  const parceiroSelecionado = useMemo(
    () =>
      form.parceiro_id === ''
        ? null
        : (parceiros.find((p) => p.id === form.parceiro_id) ?? null),
    [form.parceiro_id, parceiros],
  );

  const setFaixa = (index: number, key: keyof OrcForm['faixas'][number], value: number) => {
    setForm((prev) => {
      const faixas = prev.faixas.map((f, i) => (i === index ? { ...f, [key]: value } : f));
      return { ...prev, faixas };
    });
    setCalculo(null);
  };

  const addFaixa = () => {
    setForm((prev) => ({
      ...prev,
      faixas: [...prev.faixas, { quantidade: 1000, comissao_pct: 0 }],
    }));
    setCalculo(null);
  };

  const removeFaixa = (index: number) => {
    setForm((prev) => ({
      ...prev,
      faixas: prev.faixas.filter((_, i) => i !== index),
    }));
    setCalculo(null);
  };

  const validateClient = (): string | null => {
    if (form.parceiro_id === '') {
      return parceiroModo === 'prospect'
        ? 'Crie o prospect (ou reutilize um cadastro parecido) antes de calcular.'
        : 'Selecione o parceiro cadastrado (texto livre de cliente é proibido).';
    }
    if (!form.medida.trim()) return 'Informe a medida.';
    if (form.largura_cm <= 0 || form.puxada_cm <= 0) return 'Largura e puxada devem ser > 0.';
    if (form.faca_nova && form.valor_faca_nova < 0) return 'Valor da faca nova inválido.';
    if (form.faixas.length === 0) return 'Inclua ao menos uma faixa de quantidade.';
    if (form.faixas.some((f) => f.quantidade <= 0)) return 'Quantidades das faixas devem ser > 0.';
    return null;
  };

  const handleCalcular = async () => {
    const v = validateClient();
    if (v) {
      setErro(v);
      return;
    }
    setPending(true);
    setErro(null);
    try {
      const res = await api.post<{ data: OrcamentoResult }>(
        '/orcamentos/calcular',
        payloadFromForm(form),
      );
      setCalculo(res.data);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Falha ao calcular');
    } finally {
      setPending(false);
    }
  };

  const handleSalvar = async () => {
    if (!canWrite) return;
    const v = validateClient();
    if (v) {
      setErro(v);
      return;
    }
    if (!calculo) {
      setErro('Calcule o orçamento antes de salvar (snapshot auditável).');
      return;
    }
    setPending(true);
    setErro(null);
    try {
      const body = payloadFromForm(form);
      const res = isNew
        ? await api.post<{ data: Orcamento }>('/orcamentos', body)
        : await api.put<{ data: Orcamento }>(`/orcamentos/${id}`, body);
      navigate(`/orcamentos/${res.data.id}`);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Falha ao salvar');
    } finally {
      setPending(false);
    }
  };

  if (loading) {
    return <p className="loading">Carregando formulário…</p>;
  }

  return (
    <>
      <PageHeader
        title={isNew ? 'Novo orçamento' : `Editar orçamento #${id}`}
        description="Wizard comercial (padrão M02 / 36) — calcular preview, salvar snapshot. Sem envio/PED."
        actions={
          <Link to={isNew ? '/orcamentos' : `/orcamentos/${id}`} className="btn btn-secondary">
            Voltar
          </Link>
        }
      />

      {erro ? <p className="form-error">{erro}</p> : null}

      <div className="card orc-wizard">
        <div className="card-body">
          {/* 1. Parceiro — modos exclusivos (ORCAMENTO_PROSPECT) */}
          <section className="orc-section">
            <h3 className="orc-section-title">1. Parceiro</h3>
            <p className="form-hint" style={{ marginTop: 0 }}>
              Todo ORC aponta para cadastro PAR (cliente ou prospect). Texto livre de cliente é
              proibido. Escolha um modo — um por vez.
            </p>

            <div className="orc-modo-tabs" role="tablist" aria-label="Origem do parceiro">
              <button
                type="button"
                role="tab"
                aria-selected={parceiroModo === 'cadastrado'}
                className={parceiroModo === 'cadastrado' ? 'active' : ''}
                disabled={!canWrite && parceiroModo !== 'cadastrado'}
                onClick={() => setParceiroModo('cadastrado')}
              >
                Parceiro cadastrado
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={parceiroModo === 'prospect'}
                className={parceiroModo === 'prospect' ? 'active' : ''}
                disabled={!canWrite}
                onClick={() => setParceiroModo('prospect')}
              >
                Novo prospect
              </button>
            </div>

            {parceiroModo === 'cadastrado' ? (
              <div className="form-grid">
                <div className="form-group">
                  <label>Filtrar na lista</label>
                  <input
                    type="search"
                    value={parceiroQ}
                    onChange={(e) => setParceiroQ(e.target.value)}
                    placeholder="Nome, código, cidade, WhatsApp…"
                    disabled={!canWrite}
                  />
                </div>
                <div className="form-group span-full">
                  <label>Parceiro cadastrado *</label>
                  <select
                    value={form.parceiro_id === '' ? '' : String(form.parceiro_id)}
                    onChange={(e) =>
                      setField('parceiro_id', e.target.value ? Number(e.target.value) : '')
                    }
                    disabled={!canWrite}
                  >
                    <option value="">Selecione…</option>
                    {parceirosFiltrados.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo} — {p.razao_social}
                        {p.is_prospect ? ' (prospect)' : ''}
                        {p.municipio ? ` · ${p.municipio}/${p.uf ?? ''}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {parceiroSelecionado ? (
                  <div className="form-group span-full">
                    <p className="parceiro-vinculo" style={{ margin: 0 }}>
                      Vinculado:{' '}
                      <strong>
                        {parceiroSelecionado.codigo} — {parceiroSelecionado.razao_social}
                      </strong>
                      {parceiroSelecionado.is_prospect ? ' · prospect' : ''}
                      {parceiroSelecionado.municipio
                        ? ` · ${parceiroSelecionado.municipio}/${parceiroSelecionado.uf ?? ''}`
                        : ''}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <ProspectRapidoPanel
                open={canWrite}
                embedded
                onClose={() => setParceiroModo('cadastrado')}
                onCreated={(p) => vincularParceiro(p)}
                onReuse={(c) => vincularParceiro(c)}
                disabled={!canWrite}
              />
            )}
          </section>

          {/* 2. Faca / dimensões — mapa oficial (padrão 36) */}
          <section className="orc-section">
            <h3 className="orc-section-title">2. Faca (mapa oficial)</h3>
            <FacaPicker
              value={facaSel}
              onChange={aplicarFaca}
              maquinasCatalogo={catalog?.maquinas ?? []}
              disabled={!canWrite}
            />
            <div className="form-grid faca-auto-fields">
              <div className={`form-group${medidaManual ? ' manual-field' : ' auto-field'}`}>
                <label>
                  Medida *{' '}
                  {!medidaManual ? (
                    <span className="field-note">do mapa</span>
                  ) : (
                    <span className="field-note">{facaNova ? 'faca nova' : 'manual'}</span>
                  )}
                </label>
                <input
                  value={form.medida}
                  onChange={(e) => setField('medida', e.target.value)}
                  placeholder="ex.: 8,0X12,4"
                  disabled={!canWrite || !medidaManual}
                  readOnly={!medidaManual}
                />
              </div>
              <div className={`form-group${facaNova ? ' manual-field' : ' auto-field'}`}>
                <label>
                  Formato{' '}
                  <span className="field-note">{facaNova ? 'faca nova' : 'do mapa'}</span>
                </label>
                {facaNova ? (
                  <select
                    value={form.formato_faca || 'RETA'}
                    onChange={(e) => {
                      const fmt = e.target.value;
                      setField('formato_faca', fmt);
                      setFacaSel((prev) =>
                        prev ? { ...prev, formato: fmt, faca: fmt, faca_nova: true } : prev,
                      );
                    }}
                    disabled={!canWrite}
                  >
                    {['RETA', 'REDONDA', 'OVAL', 'DESENHADA', 'ESPECIAL', 'LACRE'].map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={String(facaSel?.formato || facaSel?.faca || form.formato_faca || '—')}
                    disabled
                    readOnly
                  />
                )}
              </div>
              <div className={`form-group${puxadaManual ? ' manual-field' : ' auto-field'}`}>
                <label>Puxada (cm) *</label>
                <input
                  type="number"
                  step="0.00001"
                  value={form.puxada_cm || ''}
                  onChange={(e) => setField('puxada_cm', Number(e.target.value) || 0)}
                  disabled={!canWrite}
                />
              </div>
              <div className={`form-group${zManual ? ' manual-field' : ' auto-field'}`}>
                <label>
                  Z (dentes) <span className="field-note">matriz / cilindro</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.z === '' ? '' : form.z}
                  onChange={(e) =>
                    setField('z', e.target.value === '' ? '' : Number(e.target.value))
                  }
                  disabled={!canWrite}
                />
              </div>
              <div className="form-group auto-field">
                <label>
                  REP <span className="field-note">repetição</span>
                </label>
                <input
                  value={
                    facaNova
                      ? '— (faca nova)'
                      : facaSel?.repeticao != null
                        ? Number(facaSel.repeticao).toLocaleString('pt-BR', {
                            maximumFractionDigits: 6,
                          })
                        : '—'
                  }
                  disabled
                  readOnly
                />
              </div>
              <div className="form-group">
                <label>
                  Largura papel (cm) *{' '}
                  <span className="field-note">sugestão da faca — ajuste se preciso</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.largura_cm || ''}
                  onChange={(e) => setField('largura_cm', Number(e.target.value) || 0)}
                  disabled={!canWrite}
                />
              </div>
            </div>
          </section>

          {/* 3. Especificação técnica */}
          <section className="orc-section">
            <h3 className="orc-section-title">3. Especificação técnica</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Cores *</label>
                <select
                  value={form.cores}
                  onChange={(e) => setField('cores', e.target.value)}
                  disabled={!canWrite}
                >
                  {CORES_OPCOES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Papel *</label>
                <select
                  value={form.papel}
                  onChange={(e) => setField('papel', e.target.value)}
                  disabled={!canWrite}
                >
                  {(catalog?.papeis ?? []).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Acabamento *</label>
                <select
                  value={form.acabamento}
                  onChange={(e) => setField('acabamento', e.target.value)}
                  disabled={!canWrite}
                >
                  {(catalog?.acabamentos ?? []).map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Modelos</label>
                <input
                  type="number"
                  min={1}
                  value={form.modelos}
                  onChange={(e) => setField('modelos', Number(e.target.value) || 1)}
                  disabled={!canWrite}
                />
              </div>
              <div className="form-group">
                <label>Colunas</label>
                <input
                  type="number"
                  min={1}
                  value={form.colunas}
                  onChange={(e) => setField('colunas', Number(e.target.value) || 1)}
                  disabled={!canWrite}
                />
              </div>
              <div className="form-group">
                <label>Etiq. por rolo</label>
                <input
                  type="number"
                  min={1}
                  value={form.etiq_por_rolo}
                  onChange={(e) => setField('etiq_por_rolo', Number(e.target.value) || 1)}
                  disabled={!canWrite}
                />
              </div>
              <div className="form-group">
                <label>Tubete</label>
                <select
                  value={form.tubete}
                  onChange={(e) => setField('tubete', e.target.value)}
                  disabled={!canWrite}
                >
                  {(catalog?.tubetes ?? ['1"', '3"']).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Col. rebobinação</label>
                <input
                  type="number"
                  min={1}
                  value={form.coluna_rebobinacao}
                  onChange={(e) => setField('coluna_rebobinacao', Number(e.target.value) || 1)}
                  disabled={!canWrite}
                />
              </div>
            </div>
          </section>

          {/* 4. Produção / ferramental */}
          <section className="orc-section">
            <h3 className="orc-section-title">4. Produção / ferramental</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>
                  Máquina (custo G10) * <span className="field-note">define R$/h</span>
                </label>
                <select
                  value={form.maquina}
                  onChange={(e) => setField('maquina', e.target.value)}
                  disabled={!canWrite}
                >
                  {(catalog?.maquinas ?? []).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>
                  Máq. roda serviço (F10){' '}
                  <span className="field-note">operacional — não entra no preço</span>
                </label>
                <select
                  value={form.maquina_roda_servico}
                  onChange={(e) => setField('maquina_roda_servico', e.target.value)}
                  disabled={!canWrite}
                >
                  {(catalog?.maquinas_roda_servico ?? catalog?.maquinas ?? []).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Matriz</label>
                <select
                  value={form.matriz}
                  onChange={(e) => setField('matriz', e.target.value as 'SIM' | 'NAO')}
                  disabled={!canWrite}
                >
                  <option value="SIM">SIM (1º pedido)</option>
                  <option value="NAO">NÃO (já cobrada / recompra)</option>
                </select>
              </div>
              {form.faca_nova ? (
                <>
                  <div className="form-group manual-field">
                    <label>
                      Valor faca nova (R$) *{' '}
                      <span className="field-note">custo cotado — GERACAO §7.3</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.valor_faca_nova || ''}
                      onChange={(e) => setField('valor_faca_nova', Number(e.target.value) || 0)}
                      disabled={!canWrite}
                    />
                  </div>
                  <div className="form-group manual-field">
                    <label>
                      Prazo extra faca (dias){' '}
                      <span className="field-note">somar ao prazo de entrega</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.prazo_faca_dias === '' ? '' : form.prazo_faca_dias}
                      onChange={(e) =>
                        setField(
                          'prazo_faca_dias',
                          e.target.value === '' ? '' : Number(e.target.value),
                        )
                      }
                      disabled={!canWrite}
                    />
                  </div>
                </>
              ) : null}
              <div className="form-group">
                <label>
                  Imposto % <span className="field-note">estimativa — não é NF</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  max={100}
                  value={form.imposto_pct}
                  onChange={(e) => setField('imposto_pct', Number(e.target.value) || 0)}
                  disabled={!canWrite}
                />
              </div>
              <div className="form-group">
                <label>Tipo troca produto</label>
                <select
                  value={form.tipo_troca_produto}
                  onChange={(e) => setField('tipo_troca_produto', e.target.value)}
                  disabled={!canWrite}
                >
                  {(catalog?.tipos_troca_produto ?? ['SEM PARADA']).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>RPM</label>
                <input
                  type="number"
                  min={1}
                  value={form.rpm}
                  onChange={(e) => setField('rpm', Number(e.target.value) || 1000)}
                  disabled={!canWrite}
                />
              </div>
              <div className="form-group">
                <label>Prazo (d.úteis)</label>
                <input
                  type="number"
                  min={1}
                  value={form.prazo_entrega_dias}
                  onChange={(e) => setField('prazo_entrega_dias', Number(e.target.value) || 1)}
                  disabled={!canWrite}
                />
              </div>
              <div className="form-group">
                <label>Validade (dias)</label>
                <input
                  type="number"
                  min={1}
                  value={form.validade_dias}
                  onChange={(e) => setField('validade_dias', Number(e.target.value) || 1)}
                  disabled={!canWrite}
                />
              </div>
              <div className="form-group">
                <label>Tolerância qtd %</label>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  value={form.tolerancia_qtd_pct}
                  onChange={(e) => setField('tolerancia_qtd_pct', Number(e.target.value) || 0)}
                  disabled={!canWrite}
                />
              </div>
            </div>
          </section>

          {/* 5. Faixas */}
          <section className="orc-section">
            <div className="orc-section-head">
              <h3 className="orc-section-title">5. Faixas de quantidade (escada)</h3>
              {canWrite ? (
                <button type="button" className="btn btn-secondary btn-sm" onClick={addFaixa}>
                  + Faixa
                </button>
              ) : null}
            </div>
            <p className="form-hint" style={{ marginTop: 0 }}>
              N faixas no mesmo ORC — o cliente escolhe uma na aprovação (fora deste CRUD).
            </p>
            {form.faixas.map((f, i) => (
              <div key={i} className="form-grid faixa-row">
                <div className="form-group">
                  <label>Quantidade</label>
                  <input
                    type="number"
                    min={1}
                    value={f.quantidade}
                    onChange={(e) => setFaixa(i, 'quantidade', Number(e.target.value) || 0)}
                    disabled={!canWrite}
                  />
                </div>
                <div className="form-group">
                  <label>Comissão %</label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={f.comissao_pct}
                    onChange={(e) => setFaixa(i, 'comissao_pct', Number(e.target.value) || 0)}
                    disabled={!canWrite}
                  />
                </div>
                <div className="form-group faixa-remove">
                  <label>&nbsp;</label>
                  {canWrite && form.faixas.length > 1 ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => removeFaixa(i)}
                    >
                      Remover
                    </button>
                  ) : null}
                </div>
              </div>
            ))}

            <div className="form-group" style={{ marginTop: '0.75rem' }}>
              <label>Observação interna</label>
              <textarea
                rows={2}
                value={form.observacao}
                onChange={(e) => setField('observacao', e.target.value)}
                disabled={!canWrite}
              />
            </div>
          </section>

          {canWrite ? (
            <div className="btn-row" style={{ marginTop: '1.25rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={pending}
                onClick={() => void handleCalcular()}
              >
                Calcular
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={pending || !calculo}
                onClick={() => void handleSalvar()}
              >
                Salvar
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {calculo ? (
        <div style={{ marginTop: '1rem' }}>
          <OrcamentoResultado
            calculo={calculo}
            prazoEntregaDias={form.prazo_entrega_dias}
            validadeDias={form.validade_dias}
            toleranciaQtdPct={form.tolerancia_qtd_pct}
          />
        </div>
      ) : (
        <p className="form-hint" style={{ marginTop: '1rem' }}>
          Calcule para visualizar a proposta comercial e o breakdown interno (composição oculta do
          cliente).
        </p>
      )}
    </>
  );
}
