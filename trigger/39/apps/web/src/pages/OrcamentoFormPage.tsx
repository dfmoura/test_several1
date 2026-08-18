import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { FacaPicker, type FacaRecord } from '../components/FacaPicker';
import { OrcamentoResultado } from '../components/OrcamentoResultado';
import { PageHeader } from '../components/PageHeader';
import { ParceiroCombobox } from '../components/ParceiroCombobox';
import { onAbrirFichaClick } from '../lib/fichaNav';
import { ProspectRapidoPanel } from '../components/ProspectRapidoPanel';
import {
  ApiError,
  api,
  type Orcamento,
  type OrcamentoResult,
  type Parceiro,
  type ParceiroVinculo,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  CONDICOES_PAGAMENTO_SUGESTOES,
  FORMAS_PAGAMENTO,
  isFormaPagamentoCanonica,
} from '../lib/condicoesComerciais';
import {
  CORES_OPCOES,
  alocarQuantidadePorModelo,
  defaultOrcForm,
  formFromSnapshot,
  payloadFromForm,
  somaPercentualModelos,
  syncModelosComposicao,
  validarModelosComposicao,
  type OrcCatalogo,
  type OrcForm,
} from '../lib/orcamentoForm';
import {
  TIPO_CESSAO_BEM,
  TIPO_INDUSTRIALIZACAO,
  TIPO_SERVICO,
  type TipoOperacaoSaida,
  type TipoServicoSaida,
} from '../lib/operacoesSaida';
import {
  hintFreteEntregar,
  hintFreteManual,
  MODO_ENTREGAR,
  MODO_RETIRAR,
  ORIGEM_CALCULADA,
  ORIGEM_MANUAL,
} from '../lib/orcamentoFrete';

/** Reconstrói a faca a partir do snapshot — desenho visível ao editar (sem faca_id no ORC). */
function facaSelFromForm(form: OrcForm): FacaRecord | null {
  if (!form.formato_faca && !form.medida) return null;
  return {
    faca_nova: form.faca_nova,
    completa: !form.faca_nova,
    medida: form.medida,
    formato: form.formato_faca || 'RETA',
    faca: form.formato_faca || 'RETA',
    maquina_catalogo: form.maquina,
    puxada: form.puxada_cm || null,
    z: form.z === '' ? null : form.z,
    largura_faca: form.largura_cm || null,
    cliente_nota: form.faca_nova ? null : 'snapshot do ORC',
    label: form.faca_nova ? 'FACA NOVA (simulada)' : 'Faca do orçamento',
  };
}

export function OrcamentoFormPage() {
  const { id } = useParams();
  const location = useLocation();
  const isNew = location.pathname.endsWith('/novo') || id === 'novo';
  const navigate = useNavigate();
  const { hasPermission, empresaId } = useAuth();
  const canWrite = hasPermission('orcamento.escrever');

  const [catalog, setCatalog] = useState<OrcCatalogo | null>(null);
  const [parceiroSel, setParceiroSel] = useState<Parceiro | null>(null);
  const [vendedorSel, setVendedorSel] = useState<ParceiroVinculo | null>(null);
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
        const catRes = await api.get<{ data: OrcCatalogo }>('/orcamentos/catalogo');
        if (cancelled) return;
        setCatalog(catRes.data);

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
          // Sempre restaura o desenho (mapa ou faca nova) — antes só faca_nova tinha summary.
          setFacaSel(facaSelFromForm(nextForm));

          if (nextForm.parceiro_id !== '') {
            try {
              const par = await api.get<{ data: Parceiro }>(`/parceiros/${nextForm.parceiro_id}`);
              if (!cancelled) setParceiroSel(par.data);
            } catch {
              if (!cancelled) setParceiroSel(null);
            }
          } else if (!cancelled) {
            setParceiroSel(null);
          }
          if (nextForm.vendedor_parceiro_id !== '') {
            try {
              const vend = await api.get<{ data: Parceiro }>(
                `/parceiros/${nextForm.vendedor_parceiro_id}`,
              );
              if (!cancelled) setVendedorSel(vend.data);
            } catch {
              if (!cancelled) setVendedorSel(orc.data.vendedor ?? null);
            }
          } else if (!cancelled) {
            setVendedorSel(orc.data.vendedor ?? null);
          }
        } else {
          setForm(defaultOrcForm(catRes.data));
          setCalculo(null);
          setFacaSel(null);
          setParceiroSel(null);
          setVendedorSel(null);
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
    // Mantém o desenho no picker alinhado aos campos editáveis.
    if (
      key === 'medida' ||
      key === 'puxada_cm' ||
      key === 'z' ||
      key === 'largura_cm' ||
      key === 'formato_faca' ||
      key === 'maquina' ||
      key === 'faca_nova'
    ) {
      setFacaSel((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        if (key === 'medida') next.medida = value as string;
        if (key === 'puxada_cm') next.puxada = (value as number) || null;
        if (key === 'z') next.z = value === '' ? null : (value as number);
        if (key === 'largura_cm') next.largura_faca = (value as number) || null;
        if (key === 'formato_faca') {
          next.formato = (value as string) || 'RETA';
          next.faca = (value as string) || 'RETA';
        }
        if (key === 'maquina') next.maquina_catalogo = value as string;
        if (key === 'faca_nova') {
          next.faca_nova = value as boolean;
          next.completa = !(value as boolean);
        }
        return next;
      });
    }
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
    const formato = String(faca.formato || faca.faca || '');

    setForm((prev) => ({
      ...prev,
      medida: String(faca.medida || prev.medida),
      puxada_cm: puxada != null && !Number.isNaN(puxada) ? puxada : isNova ? 0 : prev.puxada_cm,
      z: z != null && !Number.isNaN(z) ? z : isNova ? '' : prev.z,
      largura_cm:
        largura != null && !Number.isNaN(largura) && largura > 0 ? largura : prev.largura_cm,
      maquina: maq && maquinas.includes(maq) ? maq : prev.maquina,
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

  const aplicarVendedor = (v: ParceiroVinculo | null, aplicarPct = true) => {
    setVendedorSel(v);
    const pct = v?.comissao_percentual != null ? Number(v.comissao_percentual) : null;
    setForm((prev) => ({
      ...prev,
      vendedor_parceiro_id: v ? v.id : '',
      faixas:
        aplicarPct && pct != null && Number.isFinite(pct)
          ? prev.faixas.map((f) => ({ ...f, comissao_pct: pct }))
          : prev.faixas,
    }));
    setCalculo(null);
    setErro(null);
  };

  const aplicarParceiro = (p: Parceiro | null) => {
    setParceiroSel(p);
    const vendDefault = p?.vendedor ?? null;
    setForm((prev) => ({
      ...prev,
      parceiro_id: p ? p.id : '',
      condicao_pagamento: p?.condicao_pagamento?.trim() ?? '',
      forma_pagamento: p?.forma_pagamento?.trim() ?? '',
    }));
    setCalculo(null);
    setErro(null);
    if (p?.id && !p.enderecos_entrega) {
      void api
        .get<{ data: Parceiro }>(`/parceiros/${p.id}`)
        .then((res) => {
          setParceiroSel(res.data);
          const vend = res.data.vendedor;
          if (vend && !vendedorSel) {
            aplicarVendedor(vend);
          }
        })
        .catch(() => undefined);
    } else if (vendDefault && !vendedorSel) {
      aplicarVendedor(vendDefault);
    }
  };

  const vincularParceiro = (p: Pick<Parceiro, 'id'> & Partial<Parceiro>) => {
    if (parceiroSel?.id === p.id) {
      aplicarParceiro({
        ...parceiroSel,
        ...p,
        id: p.id,
      } as Parceiro);
    } else {
      const stub = {
        id: p.id,
        codigo: p.codigo ?? `PAR-${p.id}`,
        razao_social: p.razao_social ?? '',
        nome_fantasia: p.nome_fantasia ?? null,
        is_prospect: p.is_prospect ?? true,
        papel_cliente: p.papel_cliente ?? false,
        municipio: p.municipio ?? null,
        uf: p.uf ?? null,
        whatsapp: p.whatsapp ?? null,
        email: p.email ?? null,
        cnpj_cpf: p.cnpj_cpf ?? null,
        condicao_pagamento: p.condicao_pagamento ?? null,
        forma_pagamento: p.forma_pagamento ?? null,
      } as Parceiro;
      aplicarParceiro(stub);
    }
    setParceiroModo('cadastrado');
  };

  const setFaixa = (index: number, key: keyof OrcForm['faixas'][number], value: number) => {
    setForm((prev) => {
      const faixas = prev.faixas.map((f, i) => (i === index ? { ...f, [key]: value } : f));
      return { ...prev, faixas };
    });
    setCalculo(null);
  };

  const setModelosCount = (n: number) => {
    const modelos = Math.max(1, Math.floor(n) || 1);
    setForm((prev) => ({
      ...prev,
      modelos,
      modelos_composicao: syncModelosComposicao(prev.modelos_composicao, modelos),
    }));
    setCalculo(null);
  };

  const setModeloComposicao = (
    index: number,
    key: 'nome' | 'percentual',
    value: string | number,
  ) => {
    setForm((prev) => {
      const modelos_composicao = prev.modelos_composicao.map((m, i) =>
        i === index
          ? {
              ...m,
              [key]: key === 'nome' ? String(value) : Number(value) || 0,
            }
          : m,
      );
      return { ...prev, modelos_composicao };
    });
    setCalculo(null);
  };

  const addFaixa = () => {
    setForm((prev) => ({
      ...prev,
      faixas: [
        ...prev.faixas,
        prev.tipo_operacao === TIPO_SERVICO
          ? {
              quantidade: 1,
              comissao_pct: 0,
              valor_unitario: prev.faixas[0]?.valor_unitario || 50,
            }
          : { quantidade: 1000, comissao_pct: 0 },
      ],
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

  const setTipoOperacao = (tipo: TipoOperacaoSaida) => {
    setForm((prev) => {
      const next = { ...prev, tipo_operacao: tipo };
      if (tipo === TIPO_SERVICO) {
        const cat = catalog?.tipos_servico?.find((t) => t.codigo === prev.tipo_servico);
        next.material_cliente = cat?.material_cliente_padrao ?? true;
        next.unidade_servico = cat?.unidade_padrao ?? 'RL';
        if (!next.descricao_servico && cat?.descricao_padrao) {
          next.descricao_servico = cat.descricao_padrao;
        }
        next.faixas = [
          {
            quantidade: 20,
            comissao_pct: prev.faixas[0]?.comissao_pct ?? 0,
            valor_unitario: 50,
          },
        ];
      }
      if (tipo === TIPO_INDUSTRIALIZACAO && prev.tipo_operacao === TIPO_SERVICO) {
        next.faixas = [
          { quantidade: 5000, comissao_pct: 3 },
          { quantidade: 10000, comissao_pct: 2.5 },
          { quantidade: 20000, comissao_pct: 2 },
        ];
      }
      return next;
    });
    setCalculo(null);
  };

  const validateClient = (): string | null => {
    if (form.tipo_operacao === TIPO_CESSAO_BEM) {
      return 'Cessão de equipamento não é orçamento. Cadastre no patrimônio.';
    }
    if (form.parceiro_id === '') {
      return parceiroModo === 'prospect'
        ? 'Crie o prospect (ou reutilize um cadastro parecido) antes de calcular.'
        : 'Selecione o parceiro cadastrado (texto livre de cliente é proibido).';
    }
    if (form.tipo_operacao === TIPO_SERVICO) {
      if (form.descricao_servico.trim().length < 3) return 'Descreva o serviço (mín. 3 caracteres).';
      if (form.faixas.length === 0) return 'Inclua ao menos uma quantidade.';
      if (form.faixas.some((f) => f.quantidade <= 0)) return 'Quantidades devem ser > 0.';
      if (form.faixas.some((f) => !f.valor_unitario || f.valor_unitario <= 0)) {
        return 'Informe o valor unitário do serviço em cada faixa.';
      }
      return null;
    }
    if (!form.medida.trim()) return 'Informe a medida.';
    if (form.largura_cm <= 0 || form.puxada_cm <= 0) return 'Largura e puxada devem ser > 0.';
    if (form.faca_nova && form.valor_faca_nova < 0) return 'Valor da faca nova inválido.';
    if (
      form.modo_entrega === MODO_ENTREGAR &&
      form.origem_frete === ORIGEM_MANUAL &&
      (form.valor_frete_manual === '' || Number(form.valor_frete_manual) < 0)
    ) {
      return 'Informe o valor do frete (origem Manual).';
    }
    if (form.faixas.length === 0) return 'Inclua ao menos uma faixa de quantidade.';
    if (form.faixas.some((f) => f.quantidade <= 0)) return 'Quantidades das faixas devem ser > 0.';
    const compErr = validarModelosComposicao(form.modelos, form.modelos_composicao);
    if (compErr) return compErr;
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
        description="Wizard comercial — calcular, salvar snapshot. Envio para aprovação fica no detalhe."
        actions={
          <div className="btn-row">
            <Link to="/orcamentos/como-calcula" className="btn btn-secondary">
              Como calcula
            </Link>
            {!isNew && id ? (
              <a
                href={`/orcamentos/${id}/ficha`}
                className="btn btn-secondary"
                onClick={(e) => onAbrirFichaClick(e, `/orcamentos/${id}/ficha`)}
              >
                Imprimir ficha
              </a>
            ) : null}
            <Link to={isNew ? '/orcamentos' : `/orcamentos/${id}`} className="btn btn-secondary">
              Voltar
            </Link>
          </div>
        }
      />

      {erro ? <p className="form-error">{erro}</p> : null}

      <div className="card orc-wizard">
        <div className="card-body">
          <section className="orc-section">
            <h3 className="orc-section-title">O que você está propondo?</h3>
            <p className="form-hint" style={{ marginTop: 0 }}>
              Industrialização de etiqueta, prestação de serviço e comodato de impressora não são a
              mesma operação — cada uma tem documento e caminho próprios.
            </p>
            <div className="orc-modo-tabs" role="tablist" aria-label="Tipo de operação">
              {(
                catalog?.tipos_operacao ?? [
                  {
                    codigo: TIPO_INDUSTRIALIZACAO,
                    label: 'Produção de etiquetas',
                    resumo: '',
                  },
                  { codigo: TIPO_SERVICO, label: 'Prestação de serviço', resumo: '' },
                  { codigo: TIPO_CESSAO_BEM, label: 'Cessão de equipamento', resumo: '' },
                ]
              ).map((t) => (
                <button
                  key={t.codigo}
                  type="button"
                  role="tab"
                  aria-selected={form.tipo_operacao === t.codigo}
                  className={form.tipo_operacao === t.codigo ? 'active' : ''}
                  disabled={!canWrite}
                  title={t.resumo}
                  onClick={() => setTipoOperacao(t.codigo as TipoOperacaoSaida)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {form.tipo_operacao === TIPO_CESSAO_BEM ? (
              <div className="form-hint" style={{ marginTop: '0.85rem' }}>
                <p>
                  Comodato (aluguel gratuito de impressora) <strong>não gera NFS-e nem NF-e</strong>{' '}
                  e não passa por este orçamento. Cadastre a cessão no bem patrimonial. Locação
                  cobrada também não é ISS. Se cobrar manutenção, volte aqui e escolha prestação de
                  serviço.
                </p>
                <Link to="/patrimonio" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                  Ir ao patrimônio
                </Link>
              </div>
            ) : null}
          </section>

          {form.tipo_operacao !== TIPO_CESSAO_BEM ? (
            <>
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
                <ParceiroCombobox
                  className="span-full"
                  label="Parceiro cadastrado"
                  papel="orcavel"
                  value={parceiroSel}
                  onChange={aplicarParceiro}
                  required
                  disabled={!canWrite}
                  placeholder="Buscar por nome, código, CNPJ, cidade ou WhatsApp…"
                  hint="Cliente ou prospect · busca no cadastro PAR (não lista tudo de uma vez)."
                  emptyMessage="Nenhum parceiro orçável encontrado. Ajuste o termo ou use Novo prospect."
                />
                <div className="form-group">
                  <label>Condição de pagamento</label>
                  <input
                    list="orc-condicao-pagamento-sugestoes"
                    value={form.condicao_pagamento}
                    maxLength={64}
                    placeholder="ex.: 28 DDL · prefill do PAR"
                    disabled={!canWrite}
                    onChange={(e) => setField('condicao_pagamento', e.target.value)}
                  />
                  <datalist id="orc-condicao-pagamento-sugestoes">
                    {CONDICOES_PAGAMENTO_SUGESTOES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div className="form-group">
                  <label>Forma de pagamento</label>
                  <select
                    value={form.forma_pagamento}
                    disabled={!canWrite}
                    onChange={(e) => setField('forma_pagamento', e.target.value)}
                  >
                    <option value="">Selecione…</option>
                    {form.forma_pagamento && !isFormaPagamentoCanonica(form.forma_pagamento) ? (
                      <option value={form.forma_pagamento}>
                        {form.forma_pagamento} (legado)
                      </option>
                    ) : null}
                    {FORMAS_PAGAMENTO.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <ParceiroCombobox
                  className="span-full"
                  label="Vendedor"
                  papel="vendedor"
                  value={vendedorSel}
                  onChange={(v) => aplicarVendedor(v, true)}
                  disabled={!canWrite}
                  placeholder="Buscar vendedor cadastrado…"
                  hint="Opcional. Prefill do cliente · % do cadastro preenche as faixas · a comissão só é paga após a baixa do recebimento."
                  emptyMessage="Nenhum vendedor encontrado. Cadastre o papel Vendedor no parceiro e informe a comissão %."
                />
                <div className="form-group span-full">
                  <p className="form-hint" style={{ margin: 0 }}>
                    Condições desta proposta (snapshot). Prefill ao escolher o parceiro · editáveis
                    aqui · não alteram o cálculo de preço · PED/TIT futuros usam este valor. Venda
                    direta: deixe o vendedor em branco.
                  </p>
                </div>
                <div className="form-group span-full">
                  <label>
                    Entrega desta proposta{' '}
                    <span className="field-note">fechamento · padrão Retirar</span>
                  </label>
                  <div className="orc-modo-tabs" role="radiogroup" aria-label="Modo de entrega" style={{ marginBottom: form.modo_entrega === MODO_ENTREGAR ? '0.2rem' : undefined }}>
                    <button
                      type="button"
                      className={form.modo_entrega === MODO_RETIRAR ? 'active' : ''}
                      disabled={!canWrite}
                      onClick={() => setField('modo_entrega', MODO_RETIRAR)}
                    >
                      Retirar no local
                    </button>
                    <button
                      type="button"
                      className={form.modo_entrega === MODO_ENTREGAR ? 'active' : ''}
                      disabled={!canWrite}
                      onClick={() => setField('modo_entrega', MODO_ENTREGAR)}
                    >
                      Entregar
                    </button>
                  </div>
                  {form.modo_entrega === MODO_ENTREGAR ? (
                    <>
                      <label style={{ marginTop: '0.55rem' }}>
                        Origem do frete{' '}
                        <span className="field-note">padrão Calculada</span>
                      </label>
                      <div
                        className="orc-modo-tabs orc-modo-tabs-sub"
                        role="radiogroup"
                        aria-label="Origem do frete"
                      >
                        <button
                          type="button"
                          className={form.origem_frete === ORIGEM_CALCULADA ? 'active' : ''}
                          disabled={!canWrite}
                          onClick={() => setField('origem_frete', ORIGEM_CALCULADA)}
                        >
                          Calculada
                        </button>
                        <button
                          type="button"
                          className={form.origem_frete === ORIGEM_MANUAL ? 'active' : ''}
                          disabled={!canWrite}
                          onClick={() => setField('origem_frete', ORIGEM_MANUAL)}
                        >
                          Manual
                        </button>
                      </div>
                      {form.origem_frete === ORIGEM_MANUAL ? (
                        <div className="form-group manual-field" style={{ margin: '0.65rem 0 0' }}>
                          <label>
                            Valor do frete (R$) *{' '}
                            <span className="field-note">único · todas as quantidades</span>
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            inputMode="decimal"
                            value={form.valor_frete_manual === '' ? '' : form.valor_frete_manual}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setField(
                                'valor_frete_manual',
                                raw === '' ? '' : Number(raw),
                              );
                            }}
                            disabled={!canWrite}
                            placeholder="0,00"
                          />
                        </div>
                      ) : null}
                      <p className="form-hint" style={{ margin: '0.35rem 0 0' }}>
                        {form.origem_frete === ORIGEM_MANUAL
                          ? hintFreteManual()
                          : hintFreteEntregar(parceiroSel, empresaId, catalog?.frete)}
                      </p>
                    </>
                  ) : (
                    <p className="form-hint" style={{ margin: '0.35rem 0 0' }}>
                      Retirar não cobra frete. O km do cadastro não entra no preço.
                    </p>
                  )}
                </div>
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

          {form.tipo_operacao === TIPO_INDUSTRIALIZACAO ? (
            <>
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
                  onChange={(e) => setModelosCount(Number(e.target.value) || 1)}
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

            <div className="orc-modelos-composicao">
              <div className="orc-section-head" style={{ marginTop: '0.85rem' }}>
                <h4 className="orc-subsection-title">Composição dos modelos</h4>
                <span
                  className={`orc-modelos-soma${
                    Math.abs(somaPercentualModelos(form.modelos_composicao) - 100) > 0.01
                      ? ' is-invalid'
                      : ' is-ok'
                  }`}
                >
                  Soma {somaPercentualModelos(form.modelos_composicao)}%
                </span>
              </div>
              <p className="form-hint" style={{ marginTop: 0 }}>
                Nome de cada arte e % da quantidade do serviço (soma 100%). Aparece na proposta
                ao cliente com a quantidade inteira por faixa; produção e pedido futuros seguem o
                mesmo rateio. O preço usa só a quantidade de modelos.
              </p>
              {(() => {
                const faixasQtd = form.faixas.filter((f) => f.quantidade > 0);
                const alocPorFaixa = faixasQtd.map((f) =>
                  alocarQuantidadePorModelo(f.quantidade, form.modelos_composicao),
                );
                return form.modelos_composicao.map((m, i) => {
                  const qtdsPreview = alocPorFaixa.map((aloc) =>
                    (aloc[i]?.quantidade ?? 0).toLocaleString('pt-BR'),
                  );
                  return (
                    <div key={m.ordem} className="form-grid faixa-row orc-modelo-row">
                      <div className="form-group orc-modelo-nome">
                        <label>Modelo {i + 1}</label>
                        <input
                          type="text"
                          maxLength={120}
                          placeholder="Ex.: bob esponja, maçã verde…"
                          value={m.nome}
                          onChange={(e) => setModeloComposicao(i, 'nome', e.target.value)}
                          disabled={!canWrite}
                        />
                      </div>
                      <div className="form-group orc-modelo-pct">
                        <label>% quantidade</label>
                        <input
                          type="number"
                          min={0.01}
                          max={100}
                          step={0.01}
                          value={m.percentual}
                          onChange={(e) =>
                            setModeloComposicao(i, 'percentual', Number(e.target.value) || 0)
                          }
                          disabled={!canWrite || form.modelos === 1}
                        />
                        {qtdsPreview.length > 0 ? (
                          <p className="orc-modelo-qtd-preview" title="Quantidade inteira por faixa">
                            {qtdsPreview.length === 1
                              ? `→ ${qtdsPreview[0]} un.`
                              : `→ ${qtdsPreview.join(' · ')} un./faixa`}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                });
              })()}
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
                <label>Matriz</label>
                <select
                  value={form.matriz}
                  onChange={(e) => setField('matriz', e.target.value as 'SIM' | 'NAO')}
                  disabled={!canWrite}
                >
                  <option value="SIM">SIM (1º pedido)</option>
                  <option value="NAO">NÃO (já cobrada / recompra)</option>
                </select>
                {form.matriz === 'SIM' && catalog?.matriz_cm2 != null ? (
                  <span className="field-note">
                    Tarifa vigente:{' '}
                    {Number(catalog.matriz_cm2).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6,
                    })}
                    /cm² · valor final após cálculo (arredonda ↑ R$ 1)
                  </span>
                ) : null}
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
            </>
          ) : null}

          {form.tipo_operacao === TIPO_SERVICO ? (
            <section className="orc-section">
              <h3 className="orc-section-title">2. Serviço</h3>
              <p className="form-hint" style={{ marginTop: 0 }}>
                Material do cliente, sem produto acabado próprio. Gera ordem de serviço e NFS-e
                Nacional — não NF-e de etiqueta.
              </p>
              <div className="form-grid">
                <div className="form-group">
                  <label>Tipo *</label>
                  <select
                    value={form.tipo_servico}
                    disabled={!canWrite}
                    onChange={(e) => {
                      const codigo = e.target.value as TipoServicoSaida;
                      const cat = catalog?.tipos_servico?.find((t) => t.codigo === codigo);
                      setForm((prev) => ({
                        ...prev,
                        tipo_servico: codigo,
                        unidade_servico: cat?.unidade_padrao ?? prev.unidade_servico,
                        material_cliente: cat?.material_cliente_padrao ?? prev.material_cliente,
                        descricao_servico: prev.descricao_servico.trim()
                          ? prev.descricao_servico
                          : (cat?.descricao_padrao ?? ''),
                      }));
                      setCalculo(null);
                    }}
                  >
                    {(catalog?.tipos_servico ?? []).map((t) => (
                      <option key={t.codigo} value={t.codigo}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Unidade</label>
                  <input
                    value={form.unidade_servico}
                    maxLength={8}
                    disabled={!canWrite}
                    onChange={(e) => setField('unidade_servico', e.target.value.toUpperCase())}
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
                <div className="form-group span-full">
                  <label>
                    <input
                      type="checkbox"
                      checked={form.material_cliente}
                      disabled={!canWrite}
                      onChange={(e) => setField('material_cliente', e.target.checked)}
                    />{' '}
                    Material do cliente (não entra no estoque próprio)
                  </label>
                </div>
                <div className="form-group span-full">
                  <label>Descrição do serviço *</label>
                  <textarea
                    rows={3}
                    value={form.descricao_servico}
                    disabled={!canWrite}
                    onChange={(e) => setField('descricao_servico', e.target.value)}
                  />
                </div>
              </div>
            </section>
          ) : null}

          {/* 5. Faixas */}
          <section className="orc-section">
            <div className="orc-section-head">
              <h3 className="orc-section-title">
                {form.tipo_operacao === TIPO_SERVICO
                  ? '3. Quantidade e valor'
                  : '5. Faixas de quantidade (escada)'}
              </h3>
              {canWrite ? (
                <button type="button" className="btn btn-secondary btn-sm" onClick={addFaixa}>
                  + Faixa
                </button>
              ) : null}
            </div>
            <p className="form-hint" style={{ marginTop: 0 }}>
              {form.tipo_operacao === TIPO_SERVICO
                ? 'Preço comercial informado (sem explosão de papel/faca). Teto para cima em múltiplo de R$ 10. NFS-e sai com o total da faixa escolhida.'
                : 'N faixas no mesmo ORC — o cliente escolhe uma na aprovação. Comissão % entra no preço e, com vendedor, é a alíquota paga após a baixa do cliente (não no faturar nem na entrega).'}
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
                {form.tipo_operacao === TIPO_SERVICO ? (
                  <div className="form-group">
                    <label>Valor unitário (R$)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={f.valor_unitario ?? ''}
                      onChange={(e) =>
                        setFaixa(i, 'valor_unitario', Number(e.target.value) || 0)
                      }
                      disabled={!canWrite}
                    />
                  </div>
                ) : null}
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
            </>
          ) : null}
        </div>
      </div>

      {calculo && form.tipo_operacao !== TIPO_CESSAO_BEM ? (
        <div style={{ marginTop: '1rem' }}>
          <OrcamentoResultado
            calculo={calculo}
            modoServico={form.tipo_operacao === TIPO_SERVICO}
            prazoEntregaDias={form.prazo_entrega_dias}
            validadeDias={form.validade_dias}
            toleranciaQtdPct={form.tolerancia_qtd_pct}
            modelosComposicao={
              form.tipo_operacao === TIPO_SERVICO ? null : form.modelos_composicao
            }
            echoEspecificacao={form.tipo_operacao !== TIPO_SERVICO}
            guiaEspec={
              form.tipo_operacao === TIPO_SERVICO
                ? null
                : {
              medida: form.medida,
              largura_cm: form.largura_cm,
              puxada_cm: form.puxada_cm,
              cores: form.cores,
              papel: form.papel,
              acabamento: form.acabamento,
              maquina: form.maquina,
              tubete: form.tubete,
              etiq_por_rolo: form.etiq_por_rolo,
              modelos: form.modelos,
              colunas: form.colunas,
              coluna_rebobinacao: form.coluna_rebobinacao,
              tipo_troca_produto: form.tipo_troca_produto,
              rpm: form.rpm,
              z: form.z === '' ? null : form.z,
              faca_nova: form.faca_nova,
              formato_faca: form.formato_faca,
              matriz: form.matriz,
              valor_faca_nova: form.valor_faca_nova,
            }
            }
            facaDesenho={
              form.tipo_operacao === TIPO_SERVICO
                ? null
                : {
              formato: form.formato_faca || calculo.formato_faca,
              medida: form.medida,
              larguraCm: form.largura_cm,
              puxadaCm: form.puxada_cm,
              z: form.z === '' ? null : form.z,
              maquina: form.maquina,
              facaNova: form.faca_nova,
            }
            }
          />
        </div>
      ) : (
        <p className="form-hint" style={{ marginTop: '1rem' }}>
          {form.tipo_operacao === TIPO_SERVICO
            ? 'Calcule para visualizar o total comercial do serviço (NFS-e Nacional).'
            : form.tipo_operacao === TIPO_CESSAO_BEM
              ? 'Cessão de equipamento não passa por este cálculo — use o patrimônio.'
              : 'Calcule para visualizar a proposta comercial, o breakdown interno e a guia de produção (insumos e recursos).'}
        </p>
      )}
    </>
  );
}
