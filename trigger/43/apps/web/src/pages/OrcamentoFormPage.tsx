import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { CondicaoPagamentoInput } from '../components/CondicaoPagamentoInput';
import { FacasComposicaoEditor } from '../components/FacasComposicaoEditor';
import type { FacaRecord } from '../components/FacaPicker';
import type { FacaPosicaoCodigo } from '../lib/facaPosicao';
import { SaidaEtiquetaPicker } from '../components/SaidaEtiquetaPicker';
import type { SaidaEtiquetaCodigo } from '../lib/saidaEtiqueta';
import { OrcamentoResultado } from '../components/OrcamentoResultado';
import { buildItensResultadoUi } from '../lib/orcamentoResultadoItens';
import { PageHeader } from '../components/PageHeader';
import { ParceiroCombobox } from '../components/ParceiroCombobox';
import { FORMATOS_CANONICOS, mergeVocabulario } from '../lib/facasMapa';
import { onAbrirFichaClick } from '../lib/fichaNav';
import { ProspectRapidoPanel } from '../components/ProspectRapidoPanel';
import {
  ApiError,
  api,
  type Orcamento,
  type OrcamentoResult,
  type Parceiro,
  type ParceiroVinculo,
  type PrazoEntregaPrevisao,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  CONDICAO_SINAL_NOVO,
  FORMA_SINAL_NOVO,
  FORMAS_PAGAMENTO,
  hintPoliticaComercial,
  isFormaPagamentoCanonica,
} from '../lib/condicoesComerciais';
import { ModelosComposicaoEditor } from '../components/ModelosComposicaoEditor';
import { NumericInput } from '../components/NumericInput';
import {
  CORES_OPCOES,
  ajustarMatrizFaixaTotal,
  aplicarQuantidadeModeloMatriz,
  cloneOrcFormItem,
  defaultOrcForm,
  equalizarMatrizTodasFaixas,
  facaPrincipal,
  formFromSnapshot,
  isRevendaItem,
  calculoComItensDoOrcamento,
  matrizQuantidadesModelos,
  ORC_HEADER_KEYS,
  payloadFromFormDocumento,
  scalarsFromFacas,
  syncHeaderAcrossItens,
  somaValorFacas,
  syncModelosComposicao,
  syncModelosComposicaoQuantidades,
  syncPercentualReferencia,
  validarModelosComposicao,
  type FacaComposicaoForm,
  type OrcCatalogo,
  type OrcForm,
} from '../lib/orcamentoForm';
import { formatDate } from '../lib/format';
import {
  TIPO_CESSAO_BEM,
  TIPO_INDUSTRIALIZACAO,
  TIPO_OPERACAO_LABELS,
  TIPO_SERVICO,
  type TipoOperacaoSaida,
  type TipoServicoSaida,
} from '../lib/operacoesSaida';
import {
  MOD_FRETE_CIF,
  MOD_FRETE_FOB,
  MODO_ENTREGA_PROPRIA,
  MODO_ENTREGA_TERCEIROS,
  MODO_RETIRAR,
  modoComFrete,
} from '../lib/orcamentoFrete';

/** Reconstrói a faca a partir do snapshot — desenho visível ao editar (sem faca_id no ORC). */
function facaSelFromForm(form: OrcForm): FacaRecord | null {
  const p = facaPrincipal(form.facas);
  if (p) {
    return {
      id: p.mapa_faca_id ?? undefined,
      faca_nova: p.faca_nova,
      completa: !p.faca_nova,
      medida: p.medida || form.medida,
      formato: p.formato || form.formato_faca || 'RETA',
      faca: p.formato || form.formato_faca || 'RETA',
      maquina_catalogo: p.maquina || form.maquina,
      puxada: p.puxada_cm === '' ? form.puxada_cm || null : p.puxada_cm,
      z: p.z === '' ? (form.z === '' ? null : form.z) : p.z,
      largura_faca: p.largura_cm === '' ? form.largura_cm || null : p.largura_cm,
      n_facas: p.n_facas,
      colunas_mapa: p.colunas_mapa || null,
      posicao: p.posicao || null,
      contorno_svg: p.contorno_svg || null,
      diametro_cm: p.diametro_cm === '' ? null : p.diametro_cm,
      tamanho_raw: p.tamanho_raw || null,
      tamanho_tipo: p.tamanho_tipo || null,
      cliente_nota: p.faca_nova ? null : 'snapshot do ORC',
      label: p.label || (p.faca_nova ? 'FACA NOVA (simulada)' : 'Faca do orçamento'),
    };
  }
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
    colunas_mapa: form.faca_colunas_mapa || null,
    posicao: form.faca_posicao || null,
    contorno_svg: form.faca_contorno_svg || null,
    diametro_cm: form.faca_diametro_cm === '' ? null : form.faca_diametro_cm,
    tamanho_raw: form.faca_tamanho_raw || null,
    tamanho_tipo: form.faca_tamanho_tipo || null,
    cliente_nota: form.faca_nova ? null : 'snapshot do ORC',
    label: form.faca_nova ? 'FACA NOVA (simulada)' : 'Faca do orçamento',
  };
}

function aplicarGeometriaPrincipal(
  prev: OrcForm,
  facas: FacaComposicaoForm[],
  catalog: OrcCatalogo | null,
): OrcForm {
  const scalars = scalarsFromFacas(facas);
  const p = facaPrincipal(facas);
  if (!p) {
    return { ...prev, facas, ...scalars };
  }
  const maquinas = catalog?.maquinas ?? [];
  const maq = p.maquina.trim();
  const puxada = p.puxada_cm === '' ? null : Number(p.puxada_cm);
  const z = p.z === '' ? null : Number(p.z);
  const largura = p.largura_cm === '' ? null : Number(p.largura_cm);

  return {
    ...prev,
    facas,
    ...scalars,
    medida: p.medida || prev.medida,
    puxada_cm:
      puxada != null && !Number.isNaN(puxada) && puxada > 0
        ? puxada
        : p.faca_nova
          ? prev.puxada_cm
          : prev.puxada_cm,
    z: z != null && !Number.isNaN(z) ? z : p.faca_nova ? prev.z : prev.z,
    largura_cm:
      largura != null && !Number.isNaN(largura) && largura > 0 ? largura : prev.largura_cm,
    maquina: maq && maquinas.includes(maq) ? maq : prev.maquina,
  };
}

export function OrcamentoFormPage() {
  const { id } = useParams();
  const location = useLocation();
  const isNew = location.pathname.endsWith('/novo') || id === 'novo';
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('orcamento.escrever');

  const [catalog, setCatalog] = useState<OrcCatalogo | null>(null);
  const [parceiroSel, setParceiroSel] = useState<Parceiro | null>(null);
  const [vendedorSel, setVendedorSel] = useState<ParceiroVinculo | null>(null);
  const [transportadorSel, setTransportadorSel] = useState<Parceiro | null>(null);
  const [parceiroModo, setParceiroModo] = useState<'cadastrado' | 'prospect'>('cadastrado');
  const [itens, setItens] = useState<OrcForm[]>(() => [defaultOrcForm(null)]);
  const [rotulos, setRotulos] = useState<(string | null)[]>([null]);
  const [ativo, setAtivo] = useState(0);
  const form = itens[Math.min(ativo, Math.max(0, itens.length - 1))] ?? itens[0];
  const modoPrecoComercial = form.tipo_operacao === TIPO_SERVICO || isRevendaItem(form);

  const setForm = (updater: OrcForm | ((prev: OrcForm) => OrcForm)) => {
    setItens((prevItens) => {
      const next = [...prevItens];
      const idx = Math.min(ativo, next.length - 1);
      next[idx] =
        typeof updater === 'function'
          ? (updater as (prev: OrcForm) => OrcForm)(next[idx])
          : updater;
      return next;
    });
    setCalculo(null);
  };

  const setFormAll = (updater: (prev: OrcForm) => OrcForm) => {
    setItens((prevItens) => prevItens.map(updater));
    setCalculo(null);
  };

  const [facaSel, setFacaSel] = useState<FacaRecord | null>(null);
  const [calculo, setCalculo] = useState<OrcamentoResult | null>(null);
  const [previsaoEntrega, setPrevisaoEntrega] = useState<PrazoEntregaPrevisao | null>(null);
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
          const apiItens = orc.data.itens;
          let nextForm: OrcForm;
          if (apiItens && apiItens.length >= 1) {
            const loaded = apiItens.map((item) =>
              formFromSnapshot(item.input_snapshot, catRes.data),
            );
            nextForm = loaded[0];
            setItens(syncHeaderAcrossItens(loaded, nextForm));
            setRotulos(apiItens.map((item) => item.rotulo ?? null));
            setAtivo(0);
            setFacaSel(facaSelFromForm(nextForm));
          } else {
            nextForm = formFromSnapshot(orc.data.input_snapshot, catRes.data);
            setItens([nextForm]);
            setRotulos([null]);
            setAtivo(0);
            setFacaSel(facaSelFromForm(nextForm));
          }
          setCalculo(
            calculoComItensDoOrcamento(orc.data.result_snapshot, orc.data.itens),
          );

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
          if (
            nextForm.modo_entrega === MODO_ENTREGA_TERCEIROS &&
            nextForm.transportador_id !== ''
          ) {
            try {
              const transp = await api.get<{ data: Parceiro }>(
                `/parceiros/${nextForm.transportador_id}`,
              );
              if (!cancelled) setTransportadorSel(transp.data);
            } catch {
              if (!cancelled) setTransportadorSel(null);
            }
          } else if (!cancelled) {
            setTransportadorSel(null);
          }
        } else {
          setItens([defaultOrcForm(catRes.data)]);
          setRotulos([null]);
          setAtivo(0);
          setCalculo(null);
          setFacaSel(null);
          setParceiroSel(null);
          setVendedorSel(null);
          setTransportadorSel(null);
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

  const selecionarPosicao = (index: number) => {
    setAtivo(index);
    const item = itens[index];
    if (item) setFacaSel(facaSelFromForm(item));
  };

  const adicionarPosicao = () => {
    if (itens.length >= 20) return;
    const novo = cloneOrcFormItem(form, catalog);
    setItens((prev) => [...prev, novo]);
    setRotulos((prev) => [...prev, null]);
    setAtivo(itens.length);
    setFacaSel(facaSelFromForm(novo));
    setCalculo(null);
  };

  const duplicarPosicao = () => {
    if (itens.length >= 20) return;
    const novo = cloneOrcFormItem(form, catalog);
    setItens((prev) => [...prev, novo]);
    setRotulos((prev) => [...prev, rotulos[ativo] ? `${rotulos[ativo]} (cópia)` : null]);
    setAtivo(itens.length);
    setFacaSel(facaSelFromForm(novo));
    setCalculo(null);
  };

  const removerPosicao = () => {
    if (itens.length <= 1) return;
    const remaining = itens.filter((_, i) => i !== ativo);
    const nextIdx = Math.min(ativo, remaining.length - 1);
    setItens(remaining);
    setRotulos((prev) => prev.filter((_, i) => i !== ativo));
    setAtivo(nextIdx);
    setFacaSel(facaSelFromForm(remaining[nextIdx]));
    setCalculo(null);
  };

  const setRotuloAtivo = (rotulo: string) => {
    setRotulos((prev) => {
      const next = [...prev];
      next[ativo] = rotulo.trim() || null;
      return next;
    });
  };

  const setField = <K extends keyof OrcForm>(key: K, value: OrcForm[K]) => {
    const patchItem = (prev: OrcForm) => {
      const next = { ...prev, [key]: value };
      // Mantém a faca principal alinhada aos campos editáveis da geometria.
      const geoKeys = new Set([
        'medida',
        'puxada_cm',
        'z',
        'largura_cm',
        'formato_faca',
        'maquina',
        'faca_nova',
        'faca_colunas_mapa',
        'faca_posicao',
        'faca_contorno_svg',
        'faca_diametro_cm',
        'faca_tamanho_raw',
        'faca_tamanho_tipo',
      ]);
      if (geoKeys.has(key as string) && next.facas.length > 0) {
        next.facas = next.facas.map((f) => {
          if (!f.principal) return f;
          const patched = { ...f };
          if (key === 'medida') patched.medida = value as string;
          if (key === 'puxada_cm') patched.puxada_cm = (value as number) || '';
          if (key === 'z') patched.z = value as number | '';
          if (key === 'largura_cm') patched.largura_cm = (value as number) || '';
          if (key === 'formato_faca') patched.formato = value as string;
          if (key === 'maquina') patched.maquina = value as string;
          if (key === 'faca_nova') patched.faca_nova = value as boolean;
          if (key === 'faca_colunas_mapa') patched.colunas_mapa = value as string;
          if (key === 'faca_posicao') patched.posicao = value as FacaPosicaoCodigo | '';
          if (key === 'faca_contorno_svg') patched.contorno_svg = value as string;
          if (key === 'faca_diametro_cm') patched.diametro_cm = value as number | '';
          if (key === 'faca_tamanho_raw') patched.tamanho_raw = value as string;
          if (key === 'faca_tamanho_tipo') patched.tamanho_tipo = value as string;
          return patched;
        });
        Object.assign(next, scalarsFromFacas(next.facas));
      }
      return next;
    };

    if ((ORC_HEADER_KEYS as readonly string[]).includes(key as string)) {
      setFormAll((prev) => patchItem(prev));
    } else {
      setForm((prev) => patchItem(prev));
    }
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

  const aplicarFacas = (nextFacas: FacaComposicaoForm[]) => {
    setCalculo(null);
    setForm((prev) => {
      const merged = aplicarGeometriaPrincipal(prev, nextFacas, catalog);
      setFacaSel(facaSelFromForm(merged));
      return merged;
    });
  };

  const facaIncompleta = facaSel != null && facaSel.completa === false;
  const facaNova = form.faca_nova || facaSel?.faca_nova === true;
  const puxadaManual = !facaSel || facaIncompleta || facaSel.puxada == null || facaNova;
  const zManual = !facaSel || facaIncompleta || facaSel.z == null || facaNova;
  const medidaManual = !facaSel || facaNova;
  /** Campos já no card do picker — só abrem quando o operador precisa editar. */
  const showMedidaField = Boolean(facaSel) && medidaManual;
  const showFormatoField = Boolean(facaSel) && facaNova;
  const showPuxadaField = Boolean(facaSel) && puxadaManual;
  const showZField = Boolean(facaSel) && zManual;

  useEffect(() => {
    const prazoFaca =
      form.prazo_faca_dias === '' || form.prazo_faca_dias == null
        ? 0
        : Number(form.prazo_faca_dias) || 0;
    const params = new URLSearchParams({
      dias: String(form.prazo_entrega_dias || 0),
      faca_nova: form.faca_nova ? '1' : '0',
      prazo_faca_dias: String(prazoFaca),
    });
    const timer = window.setTimeout(() => {
      void api
        .get<{ data: PrazoEntregaPrevisao }>(`/calendario/previsao-entrega?${params}`)
        .then((res) => setPrevisaoEntrega(res.data))
        .catch(() => setPrevisaoEntrega(null));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [form.prazo_entrega_dias, form.prazo_faca_dias, form.faca_nova]);

  const aplicarVendedor = (v: ParceiroVinculo | null, aplicarPct = true) => {
    setVendedorSel(v);
    const pct = v?.comissao_percentual != null ? Number(v.comissao_percentual) : null;
    setFormAll((prev) => ({
      ...prev,
      vendedor_parceiro_id: v ? v.id : '',
      faixas:
        aplicarPct && pct != null && Number.isFinite(pct)
          ? prev.faixas.map((f) => ({ ...f, comissao_pct: pct }))
          : prev.faixas,
    }));
    setErro(null);
  };

  const aplicarParceiro = (p: Parceiro | null) => {
    setParceiroSel(p);
    const vendDefault = p?.vendedor ?? null;
    const pol = p?.politica_comercial;
    let condicao = p?.condicao_pagamento?.trim() ?? '';
    let forma = p?.forma_pagamento?.trim() ?? '';
    // Cliente novo sem defaults no PAR: sugere sinal 50% + PIX (editável; snapshot no ORC).
    if (p && pol?.perfil === 'NOVO') {
      if (!condicao) condicao = CONDICAO_SINAL_NOVO;
      if (!forma) forma = FORMA_SINAL_NOVO;
    }
    setFormAll((prev) => ({
      ...prev,
      parceiro_id: p ? p.id : '',
      condicao_pagamento: condicao,
      forma_pagamento: forma,
    }));
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
          const polFull = res.data.politica_comercial;
          if (polFull?.perfil === 'NOVO') {
            setFormAll((prev) => ({
              ...prev,
              condicao_pagamento:
                prev.condicao_pagamento.trim() ||
                res.data.condicao_pagamento?.trim() ||
                CONDICAO_SINAL_NOVO,
              forma_pagamento:
                prev.forma_pagamento.trim() ||
                res.data.forma_pagamento?.trim() ||
                FORMA_SINAL_NOVO,
            }));
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
      const modelos_composicao_quantidades =
        key === 'quantidade'
          ? ajustarMatrizFaixaTotal(
              prev.modelos_composicao_quantidades,
              faixas,
              index,
              prev.modelos,
            )
          : prev.modelos_composicao_quantidades;
      return { ...prev, faixas, modelos_composicao_quantidades };
    });
    setCalculo(null);
  };

  const setModelosCount = (n: number) => {
    const modelos = Math.max(1, Math.floor(n) || 1);
    setForm((prev) => {
      const modelos_composicao = syncModelosComposicao(prev.modelos_composicao, modelos);
      return {
        ...prev,
        modelos,
        modelos_composicao,
        modelos_composicao_quantidades: syncModelosComposicaoQuantidades(
          prev.modelos_composicao_quantidades,
          prev.faixas,
          modelos,
          modelos_composicao,
        ),
      };
    });
    setCalculo(null);
  };

  const setModeloComposicaoNome = (index: number, nome: string) => {
    setForm((prev) => ({
      ...prev,
      modelos_composicao: prev.modelos_composicao.map((m, i) =>
        i === index ? { ...m, nome } : m,
      ),
    }));
    setCalculo(null);
  };

  const setModeloValorArte = (index: number, valorArte: number) => {
    setForm((prev) => ({
      ...prev,
      modelos_composicao: prev.modelos_composicao.map((m, i) =>
        i === index ? { ...m, valor_arte: Math.max(0, valorArte) } : m,
      ),
    }));
    setCalculo(null);
  };

  const setModeloArteUrl = (index: number, arteUrl: string | null) => {
    setForm((prev) => ({
      ...prev,
      modelos_composicao: prev.modelos_composicao.map((m, i) =>
        i === index ? { ...m, arte_url: arteUrl } : m,
      ),
    }));
  };

  const setModeloTintas = (index: number, tintas: string[]) => {
    setForm((prev) => ({
      ...prev,
      modelos_composicao: prev.modelos_composicao.map((m, i) =>
        i === index ? { ...m, tintas } : m,
      ),
    }));
  };

  const setModeloQuantidadeFaixa = (faixaIdx: number, modeloIdx: number, qtd: number) => {
    setForm((prev) => {
      const modelos_composicao_quantidades = aplicarQuantidadeModeloMatriz(
        prev.modelos_composicao_quantidades,
        prev.faixas,
        faixaIdx,
        modeloIdx,
        qtd,
        prev.modelos,
      );
      return {
        ...prev,
        modelos_composicao_quantidades,
        modelos_composicao: syncPercentualReferencia(
          prev.modelos_composicao,
          prev.faixas,
          modelos_composicao_quantidades,
        ),
      };
    });
    setCalculo(null);
  };

  const equalizarModelosComposicao = () => {
    setForm((prev) => {
      const modelos_composicao_quantidades = equalizarMatrizTodasFaixas(
        prev.faixas,
        prev.modelos,
      );
      return {
        ...prev,
        modelos_composicao_quantidades,
        modelos_composicao: syncPercentualReferencia(
          prev.modelos_composicao,
          prev.faixas,
          modelos_composicao_quantidades,
        ),
      };
    });
    setCalculo(null);
  };

  const addFaixa = () => {
    setForm((prev) => {
      const faixas = [
        ...prev.faixas,
        prev.tipo_operacao === TIPO_SERVICO
          ? {
              quantidade: 1,
              comissao_pct: 0,
              valor_unitario: prev.faixas[0]?.valor_unitario || 50,
            }
          : { quantidade: 0, comissao_pct: 0 },
      ];
      return {
        ...prev,
        faixas,
        modelos_composicao_quantidades: syncModelosComposicaoQuantidades(
          prev.modelos_composicao_quantidades,
          faixas,
          prev.modelos,
          prev.modelos_composicao,
        ),
      };
    });
    setCalculo(null);
  };

  const removeFaixa = (index: number) => {
    setForm((prev) => {
      const faixas = prev.faixas.filter((_, i) => i !== index);
      const matriz = prev.modelos_composicao_quantidades.filter((_, i) => i !== index);
      return {
        ...prev,
        faixas,
        modelos_composicao_quantidades: syncModelosComposicaoQuantidades(
          matriz,
          faixas,
          prev.modelos,
          prev.modelos_composicao,
        ),
      };
    });
    setCalculo(null);
  };

  const setTipoOperacao = (tipo: TipoOperacaoSaida) => {
    setFormAll((prev) => {
      const next = { ...prev, tipo_operacao: tipo };
      if (tipo === TIPO_INDUSTRIALIZACAO) {
        next.necessidade = prev.necessidade === 'REVENDA' ? 'REVENDA' : 'PRODUCAO';
      }
      if (tipo === TIPO_SERVICO) {
        next.necessidade = 'SERVICO';
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
        next.faixas = [{ quantidade: 0, comissao_pct: 0 }];
      }
      return next;
    });
  };

  const validateItem = (item: OrcForm, index: number): string | null => {
    const prefix = itens.length > 1 ? `Item ${index + 1}: ` : '';
    if (item.tipo_operacao === TIPO_SERVICO) {
      if (item.descricao_servico.trim().length < 3) {
        return `${prefix}Descreva o serviço (mín. 3 caracteres).`;
      }
      if (item.faixas.length === 0) return `${prefix}Inclua ao menos uma quantidade.`;
      if (item.faixas.some((f) => f.quantidade <= 0)) return `${prefix}Quantidades devem ser > 0.`;
      if (item.faixas.some((f) => !f.valor_unitario || f.valor_unitario <= 0)) {
        return `${prefix}Informe o valor unitário do serviço em cada faixa.`;
      }
      return null;
    }
    if (isRevendaItem(item)) {
      if (item.produto_revenda_id === '') {
        return `${prefix}Selecione o produto de revenda.`;
      }
      if (item.faixas.length === 0) return `${prefix}Inclua ao menos uma quantidade.`;
      if (item.faixas.some((f) => f.quantidade <= 0)) return `${prefix}Quantidades devem ser > 0.`;
      if (item.faixas.some((f) => !f.valor_unitario || f.valor_unitario <= 0)) {
        return `${prefix}Informe o valor unitário da revenda.`;
      }
      return null;
    }
    if (!item.medida.trim()) return `${prefix}Informe a medida.`;
    if (item.largura_cm <= 0 || item.puxada_cm <= 0) {
      return `${prefix}Largura e puxada devem ser > 0.`;
    }
    if (somaValorFacas(item.facas) < 0) return `${prefix}Valor de ferramental inválido.`;
    if (item.faixas.length === 0) return `${prefix}Inclua ao menos uma faixa de quantidade.`;
    if (item.faixas.some((f) => f.quantidade <= 0)) {
      return `${prefix}Quantidades das faixas devem ser > 0.`;
    }
    const compErr = validarModelosComposicao(
      item.modelos,
      item.modelos_composicao,
      item.faixas,
      item.modelos_composicao_quantidades,
    );
    if (compErr) return `${prefix}${compErr}`;
    return null;
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
    if (
      modoComFrete(form.modo_entrega) &&
      form.valor_frete_manual !== '' &&
      Number(form.valor_frete_manual) < 0
    ) {
      return 'Valor do frete inválido.';
    }
    for (let i = 0; i < itens.length; i++) {
      const err = validateItem(itens[i], i);
      if (err) return err;
    }
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
        payloadFromFormDocumento(itens, rotulos),
      );
      setCalculo(res.data);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Falha ao calcular');
    } finally {
      setPending(false);
    }
  };

  const handleAplicarParametros = async (a: {
    overrides: OrcForm['overrides'];
    imposto_pct: number;
    comissao_pct: number;
    faixaIndex: number;
    comissaoPctByFaixa?: number[];
  }) => {
    const nextForm: OrcForm = {
      ...form,
      overrides: a.overrides,
      imposto_pct: a.imposto_pct,
      faixas: form.faixas.map((f, i) => ({
        ...f,
        comissao_pct:
          a.comissaoPctByFaixa?.[i] ??
          (i === a.faixaIndex ? a.comissao_pct : f.comissao_pct),
      })),
    };
    const nextItens = itens.map((item, i) => (i === ativo ? nextForm : item));
    setItens(nextItens);
    setPending(true);
    setErro(null);
    try {
      const res = await api.post<{ data: OrcamentoResult }>(
        '/orcamentos/calcular',
        payloadFromFormDocumento(nextItens, rotulos),
      );
      setCalculo(res.data);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : 'Falha ao recalcular com ajustes');
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
      const body = payloadFromFormDocumento(itens, rotulos);
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
            <label className="orc-section-label">Tipo de operação</label>
            <div className="orc-modo-tabs orc-modo-tabs-tipo-op" role="tablist" aria-label="Tipo de operação">
              {(
                catalog?.tipos_operacao ?? [
                  {
                    codigo: TIPO_INDUSTRIALIZACAO,
                    label: TIPO_OPERACAO_LABELS[TIPO_INDUSTRIALIZACAO],
                    resumo: '',
                  },
                  { codigo: TIPO_SERVICO, label: TIPO_OPERACAO_LABELS[TIPO_SERVICO], resumo: '' },
                  { codigo: TIPO_CESSAO_BEM, label: TIPO_OPERACAO_LABELS[TIPO_CESSAO_BEM], resumo: '' },
                ]
              ).map((t) => {
                const codigo = t.codigo as TipoOperacaoSaida;
                const label = TIPO_OPERACAO_LABELS[codigo] ?? t.label;
                return (
                <button
                  key={t.codigo}
                  type="button"
                  role="tab"
                  aria-selected={form.tipo_operacao === t.codigo}
                  className={form.tipo_operacao === t.codigo ? 'active' : ''}
                  disabled={!canWrite}
                  title={t.resumo}
                  onClick={() => setTipoOperacao(codigo)}
                >
                  {label}
                </button>
                );
              })}
            </div>
            {form.tipo_operacao === TIPO_CESSAO_BEM ? (
              <div className="orc-cessao-aviso">
                <p>Comodato não gera NFS-e/NF-e — cadastre no patrimônio.</p>
                <Link to="/patrimonio" className="btn btn-primary btn-sm">
                  Ir ao patrimônio
                </Link>
              </div>
            ) : null}
          </section>

          {form.tipo_operacao !== TIPO_CESSAO_BEM ? (
            <>
          {/* 1. Cadastro — modos exclusivos (ORCAMENTO_PROSPECT) */}
          <section className="orc-section">
            <div className="orc-section-head">
              <label className="orc-section-label" style={{ margin: 0 }}>Cadastro</label>
              <div className="orc-modo-tabs orc-modo-tabs-sub" style={{ margin: 0 }}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={parceiroModo === 'cadastrado'}
                  className={parceiroModo === 'cadastrado' ? 'active' : ''}
                  disabled={!canWrite && parceiroModo !== 'cadastrado'}
                  onClick={() => setParceiroModo('cadastrado')}
                >
                  Cadastrado
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
            </div>

            {parceiroModo === 'cadastrado' ? (
              <div className="form-grid">
                <ParceiroCombobox
                  className="span-full"
                  label="Parceiro *"
                  papel="orcavel"
                  value={parceiroSel}
                  onChange={aplicarParceiro}
                  required
                  disabled={!canWrite}
                  placeholder="Nome, código, CNPJ, cidade ou WhatsApp…"
                  emptyMessage="Nenhum parceiro orçável encontrado. Ajuste o termo ou use Novo prospect."
                />
                <div className="form-group">
                  <label>Condição pgto.</label>
                  <CondicaoPagamentoInput
                    value={form.condicao_pagamento}
                    maxLength={64}
                    placeholder="ex.: 28 DDL"
                    disabled={!canWrite}
                    onChange={(v) => setField('condicao_pagamento', v)}
                    showHint={false}
                  />
                </div>
                <div className="form-group">
                  <label>Forma pgto.</label>
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
                {parceiroSel?.politica_comercial ? (
                  <div className="form-group span-full">
                    <p className="form-hint" style={{ margin: 0 }}>
                      {hintPoliticaComercial(parceiroSel.politica_comercial)}
                    </p>
                  </div>
                ) : null}
                <div className="form-group">
                  <label>Entrega</label>
                  <div
                    className="orc-modo-tabs orc-modo-tabs-entrega"
                    role="radiogroup"
                    aria-label="Modo de entrega"
                    style={{ margin: 0 }}
                  >
                    <button
                      type="button"
                      className={form.modo_entrega === MODO_RETIRAR ? 'active' : ''}
                      disabled={!canWrite}
                      onClick={() => {
                        setFormAll((prev) => ({
                          ...prev,
                          modo_entrega: MODO_RETIRAR,
                          valor_frete_manual: '',
                          mod_frete: '',
                          transportador_id: '',
                        }));
                        setTransportadorSel(null);
                      }}
                    >
                      Retirar
                    </button>
                    <button
                      type="button"
                      className={form.modo_entrega === MODO_ENTREGA_PROPRIA ? 'active' : ''}
                      disabled={!canWrite}
                      onClick={() => {
                        setFormAll((prev) => ({
                          ...prev,
                          modo_entrega: MODO_ENTREGA_PROPRIA,
                          mod_frete: '',
                          transportador_id: '',
                        }));
                        setTransportadorSel(null);
                      }}
                    >
                      Própria
                    </button>
                    <button
                      type="button"
                      className={form.modo_entrega === MODO_ENTREGA_TERCEIROS ? 'active' : ''}
                      disabled={!canWrite}
                      onClick={() => {
                        setFormAll((prev) => ({
                          ...prev,
                          modo_entrega: MODO_ENTREGA_TERCEIROS,
                          mod_frete: prev.mod_frete || MOD_FRETE_CIF,
                        }));
                      }}
                    >
                      Terceiros
                    </button>
                  </div>
                </div>
                {modoComFrete(form.modo_entrega) ? (
                  <div className="form-group">
                    <label>
                      Frete (R$) <span className="field-note">opc.</span>
                    </label>
                    <NumericInput
                      min={0}
                      step="0.01"
                      value={form.valor_frete_manual}
                      emptyCommit=""
                      blankZero
                      onCommit={(v) => setField('valor_frete_manual', v === '' ? '' : Math.max(0, v))}
                      disabled={!canWrite}
                      placeholder="A definir"
                    />
                  </div>
                ) : null}
                {form.modo_entrega === MODO_ENTREGA_TERCEIROS ? (
                  <div className="form-group">
                    <label>Modalidade</label>
                    <div
                      className="orc-modo-tabs orc-modo-tabs-entrega"
                      role="radiogroup"
                      aria-label="Modalidade de frete"
                      style={{ margin: 0 }}
                    >
                      <button
                        type="button"
                        className={
                          (form.mod_frete || MOD_FRETE_CIF) === MOD_FRETE_CIF ? 'active' : ''
                        }
                        disabled={!canWrite}
                        onClick={() => setField('mod_frete', MOD_FRETE_CIF)}
                      >
                        CIF
                      </button>
                      <button
                        type="button"
                        className={form.mod_frete === MOD_FRETE_FOB ? 'active' : ''}
                        disabled={!canWrite}
                        onClick={() => setField('mod_frete', MOD_FRETE_FOB)}
                      >
                        FOB
                      </button>
                    </div>
                  </div>
                ) : null}
                {form.modo_entrega === MODO_ENTREGA_TERCEIROS ? (
                  <ParceiroCombobox
                    className="span-full"
                    label="Transportadora (opc.)"
                    papel="transportadora"
                    value={transportadorSel}
                    onChange={(p) => {
                      setTransportadorSel(p);
                      setFormAll((prev) => ({
                        ...prev,
                        transportador_id: p ? p.id : '',
                      }));
                    }}
                    disabled={!canWrite}
                    placeholder="Buscar transportadora…"
                    emptyMessage="Nenhuma transportadora. Cadastre o parceiro com papel transportadora."
                  />
                ) : null}
                <div className="form-group">
                  <label>Prazo (d.úteis)</label>
                  <NumericInput
                    integer
                    min={1}
                    value={form.prazo_entrega_dias}
                    emptyCommit={1}
                    onCommit={(v) => setField('prazo_entrega_dias', v === '' ? 1 : v)}
                    disabled={!canWrite}
                  />
                  {previsaoEntrega?.data_entrega_prevista ? (
                    <span className="field-note">
                      Entrega prevista (hoje):{' '}
                      <strong>{formatDate(previsaoEntrega.data_entrega_prevista)}</strong>
                      {previsaoEntrega.prazo_efetivo_dias !== form.prazo_entrega_dias
                        ? ` · ${previsaoEntrega.prazo_efetivo_dias} d.úteis efetivos`
                        : null}
                    </span>
                  ) : null}
                </div>
                <div className="form-group">
                  <label>Validade (dias)</label>
                  <NumericInput
                    integer
                    min={1}
                    value={form.validade_dias}
                    emptyCommit={1}
                    onCommit={(v) => setField('validade_dias', v === '' ? 1 : v)}
                    disabled={!canWrite}
                  />
                </div>
                <div className="form-group">
                  <label>Tolerância qtd %</label>
                  <NumericInput
                    step="0.1"
                    min={0}
                    value={form.tolerancia_qtd_pct}
                    emptyCommit={0}
                    blankZero
                    onCommit={(v) => setField('tolerancia_qtd_pct', v === '' ? 0 : v)}
                    disabled={!canWrite}
                  />
                </div>
                {form.tipo_operacao === TIPO_INDUSTRIALIZACAO ? (
                  <div className="form-group">
                    <label>
                      Imposto % <span className="field-note">estimativa — não é NF</span>
                    </label>
                    <NumericInput
                      step="0.1"
                      min={0}
                      max={100}
                      value={form.imposto_pct}
                      emptyCommit={0}
                      blankZero
                      onCommit={(v) => setField('imposto_pct', v === '' ? 0 : v)}
                      disabled={!canWrite}
                    />
                  </div>
                ) : null}
                <ParceiroCombobox
                  className="span-full"
                  label="Vendedor"
                  papel="vendedor"
                  value={vendedorSel}
                  onChange={(v) => aplicarVendedor(v, true)}
                  disabled={!canWrite}
                  placeholder="Buscar vendedor…"
                  hint="Opcional · define comissão %."
                  emptyMessage="Nenhum vendedor encontrado. Cadastre a classificação Vendedor no parceiro."
                />
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
          <section className="orc-section orc-itens-bar">
            <div className="orc-section-head">
              <div>
                <h3 className="orc-section-title" style={{ margin: 0 }}>
                  Itens deste orçamento
                </h3>
                <p className="field-note" style={{ margin: '0.35rem 0 0', maxWidth: '42rem' }}>
                  Depois do cadastro: um ou mais itens. Cada item é etiqueta sob medida ou produto
                  de revenda do cadastro. O cadastro acima vale para o orçamento inteiro.
                </p>
              </div>
              <div className="btn-row">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={!canWrite || itens.length >= 20}
                  onClick={adicionarPosicao}
                >
                  Adicionar item
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={!canWrite || itens.length >= 20}
                  onClick={duplicarPosicao}
                >
                  Duplicar
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={!canWrite || itens.length <= 1}
                  onClick={removerPosicao}
                  title={itens.length <= 1 ? 'O orçamento precisa de ao menos 1 item' : undefined}
                >
                  Remover
                </button>
              </div>
            </div>
            <div
              className="orc-modo-tabs orc-modo-tabs-sub"
              role="tablist"
              aria-label="Itens do orçamento"
              style={{ marginTop: '0.75rem' }}
            >
              {itens.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={ativo === i}
                  className={ativo === i ? 'active' : ''}
                  disabled={!canWrite && ativo !== i}
                  onClick={() => selecionarPosicao(i)}
                >
                  Item {i + 1}
                  {rotulos[i] ? ` · ${rotulos[i]}` : ''}
                </button>
              ))}
            </div>
            <div className="form-group" style={{ marginTop: '0.75rem' }}>
              <label>Nome deste item (opcional)</label>
              <input
                value={rotulos[ativo] ?? ''}
                onChange={(e) => setRotuloAtivo(e.target.value)}
                placeholder={
                  isRevendaItem(form) ? 'ex.: Ribbon cera 110×300' : 'ex.: Etiqueta frente · 50×30'
                }
                disabled={!canWrite}
                maxLength={120}
              />
            </div>
            <div className="orc-modo-tabs orc-modo-tabs-sub" role="tablist" aria-label="Tipo do item" style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                role="tab"
                aria-selected={!isRevendaItem(form)}
                className={!isRevendaItem(form) ? 'active' : ''}
                disabled={!canWrite}
                onClick={() => {
                  if (!isRevendaItem(form)) return;
                  setForm((prev) => ({
                    ...prev,
                    necessidade: 'PRODUCAO',
                    faixas: [{ quantidade: 0, comissao_pct: prev.faixas[0]?.comissao_pct ?? 0 }],
                  }));
                }}
              >
                Etiqueta sob medida
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isRevendaItem(form)}
                className={isRevendaItem(form) ? 'active' : ''}
                disabled={!canWrite}
                onClick={() => {
                  if (isRevendaItem(form)) return;
                  setForm((prev) => ({
                    ...prev,
                    necessidade: 'REVENDA',
                    faixas: [
                      {
                        quantidade: 1,
                        comissao_pct: prev.faixas[0]?.comissao_pct ?? 0,
                        valor_unitario: prev.faixas[0]?.valor_unitario ?? 0,
                      },
                    ],
                  }));
                }}
              >
                Produto de revenda
              </button>
            </div>
          </section>

          {isRevendaItem(form) ? (
            <section className="orc-section">
              <h3 className="orc-section-title">
                2. Produto de revenda
                <span className="field-note" style={{ fontWeight: 400, marginLeft: '0.5rem' }}>
                  · item {ativo + 1}
                  {rotulos[ativo] ? ` (${rotulos[ativo]})` : ''}
                </span>
              </h3>
              <p className="form-hint" style={{ marginTop: 0 }}>
                SKU já cadastrado (família REV). Preço comercial — sem motor de etiqueta, sem
                ordem de produção.
              </p>
              {(catalog?.produtos_revenda ?? []).length === 0 ? (
                <p className="form-hint">
                  Nenhum SKU de revenda ativo.{' '}
                  <Link to="/produtos/novo">Cadastre um produto família REV</Link> e recarregue
                  o formulário.
                </p>
              ) : (
                <div className="form-grid">
                  <div className="form-group span-full">
                    <label>Produto *</label>
                    <select
                      value={form.produto_revenda_id === '' ? '' : String(form.produto_revenda_id)}
                      disabled={!canWrite}
                      onChange={(e) => {
                        const id = e.target.value === '' ? '' : Number(e.target.value);
                        const sku = (catalog?.produtos_revenda ?? []).find((p) => p.id === id);
                        setForm((prev) => ({
                          ...prev,
                          produto_revenda_id: id,
                          produto_revenda_codigo: sku?.codigo ?? '',
                          produto_revenda_descricao: sku?.descricao ?? '',
                          unidade_revenda: sku?.unidade ?? 'UN',
                          faixas: prev.faixas.map((f, i) =>
                            i === 0 && sku?.preco_tabela
                              ? { ...f, valor_unitario: Number(sku.preco_tabela) || f.valor_unitario }
                              : f,
                          ),
                        }));
                      }}
                    >
                      <option value="">Selecione o SKU</option>
                      {(catalog?.produtos_revenda ?? []).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.codigo} — {p.descricao}
                          {p.unidade ? ` · ${p.unidade}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Unidade</label>
                    <input
                      value={form.unidade_revenda}
                      maxLength={8}
                      disabled={!canWrite}
                      onChange={(e) => setField('unidade_revenda', e.target.value.toUpperCase())}
                    />
                  </div>
                  <div className="form-group span-full">
                    <label>Descrição comercial</label>
                    <input
                      value={form.produto_revenda_descricao}
                      maxLength={255}
                      disabled={!canWrite}
                      onChange={(e) => setField('produto_revenda_descricao', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      Gordura <span className="field-note">interno — cliente não vê</span>
                    </label>
                    <NumericInput
                      step="0.01"
                      min={0}
                      value={form.valor_gordura}
                      emptyCommit={0}
                      blankZero
                      onCommit={(v) => setField('valor_gordura', v === '' ? 0 : Math.max(0, v))}
                      disabled={!canWrite}
                      placeholder="0,00"
                    />
                  </div>
                </div>
              )}
            </section>
          ) : (
            <>
          <section className="orc-section">
            <h3 className="orc-section-title">
              2. Faca
              <span className="field-note" style={{ fontWeight: 400, marginLeft: '0.5rem' }}>
                · item {ativo + 1}
                {rotulos[ativo] ? ` (${rotulos[ativo]})` : ''}
              </span>
            </h3>
            <p className="form-hint" style={{ marginTop: 0 }}>
              Cada faca deste item entra com o seu valor; a soma entra no total do item.
            </p>
            <FacasComposicaoEditor
              facas={form.facas}
              onChange={aplicarFacas}
              maquinasCatalogo={catalog?.maquinas ?? []}
              canWrite={canWrite}
            />
            <div className="form-grid faca-auto-fields">
              {showMedidaField ? (
                <div className="form-group manual-field">
                  <label>
                    Medida *{' '}
                    <span className="field-note">{facaNova ? 'faca nova' : 'manual'}</span>
                  </label>
                  <input
                    value={form.medida}
                    onChange={(e) => setField('medida', e.target.value)}
                    placeholder="ex.: 8,0X12,4"
                    disabled={!canWrite}
                  />
                </div>
              ) : null}
              {showFormatoField ? (
                <div className="form-group manual-field">
                  <label>
                    Formato <span className="field-note">faca nova</span>
                  </label>
                  <input
                    list="orc-formatos-faca"
                    value={form.formato_faca || 'RETA'}
                    onChange={(e) => {
                      const fmt = e.target.value.toUpperCase();
                      setField('formato_faca', fmt);
                      setFacaSel((prev) =>
                        prev ? { ...prev, formato: fmt, faca: fmt, faca_nova: true } : prev,
                      );
                    }}
                    disabled={!canWrite}
                  />
                  <datalist id="orc-formatos-faca">
                    {mergeVocabulario(
                      FORMATOS_CANONICOS,
                      form.formato_faca ? [form.formato_faca] : [],
                    ).map((f) => (
                      <option key={f} value={f} />
                    ))}
                  </datalist>
                </div>
              ) : null}
              {showPuxadaField ? (
                <div className="form-group manual-field">
                  <label>Puxada (cm) *</label>
                  <NumericInput
                    step="0.00001"
                    value={form.puxada_cm}
                    emptyCommit={0}
                    blankZero
                    onCommit={(v) => setField('puxada_cm', v === '' ? 0 : v)}
                    disabled={!canWrite}
                  />
                </div>
              ) : null}
              {showZField ? (
                <div className="form-group manual-field">
                  <label>
                    Z (dentes) <span className="field-note">matriz / cilindro</span>
                  </label>
                  <NumericInput
                    step="0.1"
                    value={form.z}
                    emptyCommit=""
                    onCommit={(v) => setField('z', v)}
                    disabled={!canWrite}
                  />
                </div>
              ) : null}
              <div className="form-group">
                <label>
                  Largura papel (cm) *{' '}
                  <span className="field-note">sugestão da faca — ajuste se preciso</span>
                </label>
                <NumericInput
                  step="0.01"
                  value={form.largura_cm}
                  emptyCommit={0}
                  blankZero
                  onCommit={(v) => setField('largura_cm', v === '' ? 0 : v)}
                  disabled={!canWrite}
                />
              </div>
            </div>
          </section>

          {/* 3. Especificação técnica — máquina → material → setup → ferramental → pad interno */}
          <section className="orc-section">
            <h3 className="orc-section-title">
              3. Especificação técnica
              <span className="field-note" style={{ fontWeight: 400, marginLeft: '0.5rem' }}>
                · item {ativo + 1}
              </span>
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label>
                  Máquina (hora) * <span className="field-note">define R$/h</span>
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
                <label>Colunas</label>
                <NumericInput
                  integer
                  min={1}
                  value={form.colunas}
                  emptyCommit={1}
                  onCommit={(v) => setField('colunas', v === '' ? 1 : v)}
                  disabled={!canWrite}
                />
              </div>
              <div className="form-group">
                <label>Modelos</label>
                <NumericInput
                  integer
                  min={1}
                  value={form.modelos}
                  emptyCommit={1}
                  onCommit={(v) => setModelosCount(v === '' ? 1 : v)}
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
                <label>Etiq. por rolo</label>
                <NumericInput
                  integer
                  min={1}
                  value={form.etiq_por_rolo}
                  emptyCommit={1}
                  onCommit={(v) => setField('etiq_por_rolo', v === '' ? 1 : v)}
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
                <NumericInput
                  integer
                  min={1}
                  value={form.coluna_rebobinacao}
                  emptyCommit={1}
                  onCommit={(v) => setField('coluna_rebobinacao', v === '' ? 1 : v)}
                  disabled={!canWrite}
                />
              </div>
              <div className="form-group">
                <label>RPM</label>
                <NumericInput
                  integer
                  min={1}
                  value={form.rpm}
                  emptyCommit={1000}
                  onCommit={(v) => setField('rpm', v === '' ? 1000 : v)}
                  disabled={!canWrite}
                />
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
              <div className="form-group">
                <label>
                  Gordura <span className="field-note">interno — cliente não vê</span>
                </label>
                <NumericInput
                  step="0.01"
                  min={0}
                  value={form.valor_gordura}
                  emptyCommit={0}
                  blankZero
                  onCommit={(v) => setField('valor_gordura', v === '' ? 0 : Math.max(0, v))}
                  disabled={!canWrite}
                  placeholder="0,00"
                />
              </div>
              <div className="form-group span-full orc-saida-etiqueta-campo" id="saida-etiqueta-bobina">
                <label id="saida-etiqueta-label">
                  Saída na bobina{' '}
                  <span className="field-note">opcional · proposta / ficha / produção</span>
                </label>
                <SaidaEtiquetaPicker
                  id="saida-etiqueta"
                  variante="compacta"
                  value={form.saida_etiqueta ?? ''}
                  onChange={(v) => setField('saida_etiqueta', v as SaidaEtiquetaCodigo | '')}
                  disabled={!canWrite}
                />
              </div>
            </div>
          </section>
            </>
          )}
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
                <div className="form-group">
                  <label>
                    Gordura <span className="field-note">interno — cliente não vê</span>
                  </label>
                  <NumericInput
                    step="0.01"
                    min={0}
                    value={form.valor_gordura}
                    emptyCommit={0}
                    blankZero
                    onCommit={(v) => setField('valor_gordura', v === '' ? 0 : Math.max(0, v))}
                    disabled={!canWrite}
                    placeholder="0,00"
                  />
                </div>
              </div>
            </section>
          ) : null}

          {/* 4. Quantidades — escada comercial + composição das artes (mesmo bloco UX; payloads distintos) */}
          <section className="orc-section">
            <div className="orc-section-head">
              <h3 className="orc-section-title">
                {modoPrecoComercial
                  ? '3. Quantidade e valor'
                  : '4. Quantidades (escada e artes)'}
                {form.tipo_operacao !== TIPO_SERVICO ? (
                  <span className="field-note" style={{ fontWeight: 400, marginLeft: '0.5rem' }}>
                    · item {ativo + 1}
                  </span>
                ) : null}
              </h3>
            </div>
            {!modoPrecoComercial ? (
              <p className="form-hint" style={{ marginTop: 0 }}>
                Escada comercial e composição dos modelos deste item — quantidade por modelo
                (arte).
              </p>
            ) : null}

            <div className="orc-faixas-bloco">
              <div className="orc-section-head">
                <h4 className="orc-subsection-title">
                  {modoPrecoComercial ? 'Quantidade' : 'Escada comercial'}
                </h4>
                {canWrite ? (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addFaixa}>
                    + Faixa
                  </button>
                ) : null}
              </div>
              <p className="form-hint" style={{ marginTop: 0 }}>
                {form.tipo_operacao === TIPO_SERVICO
                  ? 'Preço comercial informado (sem explosão de papel/faca). Teto para cima em múltiplo de R$ 10. NFS-e sai com o total da faixa escolhida.'
                  : isRevendaItem(form)
                    ? 'Preço comercial do SKU (tabela sugere; o comercial confirma). Sem ordem de produção. NF-e de mercadoria.'
                    : 'N faixas no mesmo ORC. Comissão % entra no preço e, com vendedor, é a alíquota paga após a baixa do cliente (não no faturar nem na entrega).'}
              </p>
              {form.faixas.map((f, i) => (
                <div key={i} className="form-grid faixa-row">
                  <div className="form-group">
                    <label>Quantidade</label>
                    <NumericInput
                      integer
                      min={0}
                      value={f.quantidade}
                      emptyCommit={0}
                      blankZero
                      onCommit={(v) => setFaixa(i, 'quantidade', v === '' ? 0 : v)}
                      disabled={!canWrite}
                    />
                  </div>
                  {modoPrecoComercial ? (
                    <div className="form-group">
                      <label>Valor unitário (R$)</label>
                      <NumericInput
                        min={0}
                        step="0.01"
                        value={f.valor_unitario ?? ''}
                        emptyCommit={0}
                        blankZero
                        onCommit={(v) => setFaixa(i, 'valor_unitario', v === '' ? 0 : v)}
                        disabled={!canWrite}
                      />
                    </div>
                  ) : null}
                  <div className="form-group">
                    <label>Comissão %</label>
                    <NumericInput
                      step="0.1"
                      min={0}
                      value={f.comissao_pct}
                      emptyCommit={0}
                      blankZero
                      onCommit={(v) => setFaixa(i, 'comissao_pct', v === '' ? 0 : v)}
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
            </div>

            {!modoPrecoComercial ? (
              <div className="orc-modelos-composicao">
                <div className="orc-section-head">
                  <h4 className="orc-subsection-title">Composição dos modelos</h4>
                  {(() => {
                    const faixasOk = form.faixas.filter((f) => f.quantidade > 0);
                    const matriz = matrizQuantidadesModelos(
                      faixasOk,
                      form.modelos_composicao,
                      form.modelos_composicao_quantidades,
                    );
                    const allOk =
                      faixasOk.length === 0 ||
                      matriz.every(
                        (row, fi) =>
                          row.reduce((s, q) => s + q, 0) ===
                            Math.floor(faixasOk[fi].quantidade) &&
                          row.every((q) => q > 0),
                      );
                    return faixasOk.length > 0 ? (
                      <span className={`orc-modelos-soma${allOk ? ' is-ok' : ' is-invalid'}`}>
                        {allOk ? 'Rateio fechado' : 'Ajuste o rateio'}
                      </span>
                    ) : null;
                  })()}
                </div>
                <p className="form-hint" style={{ marginTop: 0 }}>
                  Distribua a quantidade de cada faixa entre as artes — cada coluna é
                  independente. Digite nas artes editáveis; o último modelo recebe o
                  restante da própria faixa. Cores da arte, Vlr. Arte e Fig. são
                  opcionais; a soma do Vlr. Arte entra no total. O preço de produção
                  (setup/perda) continua usando só a quantidade de modelos.
                </p>
                <ModelosComposicaoEditor
                  modelos={form.modelos_composicao}
                  faixas={form.faixas}
                  quantidades={form.modelos_composicao_quantidades}
                  canWrite={canWrite}
                  onNomeChange={setModeloComposicaoNome}
                  onValorArteChange={setModeloValorArte}
                  onArteUrlChange={setModeloArteUrl}
                  onTintasChange={setModeloTintas}
                  onQuantidadeChange={setModeloQuantidadeFaixa}
                  onEqualizar={equalizarModelosComposicao}
                  medida={form.medida}
                  saidaEtiqueta={form.saida_etiqueta || null}
                />
              </div>
            ) : null}

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
            modoServico={modoPrecoComercial}
            prazoEntregaDias={form.prazo_entrega_dias}
            validadeDias={form.validade_dias}
            toleranciaQtdPct={isRevendaItem(form) ? 0 : form.tolerancia_qtd_pct}
            itemEdicaoOrdem={ativo + 1}
            itensUi={
              modoPrecoComercial
                ? null
                : buildItensResultadoUi(
                    calculo,
                    itens.map((itemForm, i) => ({
                      ordem: i + 1,
                      rotulo: rotulos[i] ?? null,
                      modelosComposicao: itemForm.modelos_composicao,
                      input_snapshot: {
                        modelos_composicao_quantidades: itemForm.modelos_composicao_quantidades,
                      },
                      guiaEspec: {
                        medida: itemForm.medida,
                        largura_cm: itemForm.largura_cm,
                        puxada_cm: itemForm.puxada_cm,
                        cores: itemForm.cores,
                        papel: itemForm.papel,
                        acabamento: itemForm.acabamento,
                        maquina: itemForm.maquina,
                        tubete: itemForm.tubete,
                        etiq_por_rolo: itemForm.etiq_por_rolo,
                        modelos: itemForm.modelos,
                        colunas: itemForm.colunas,
                        coluna_rebobinacao: itemForm.coluna_rebobinacao,
                        saida_etiqueta: itemForm.saida_etiqueta || null,
                        tipo_troca_produto: itemForm.tipo_troca_produto,
                        rpm: itemForm.rpm,
                        z: itemForm.z === '' ? null : itemForm.z,
                        faca_nova: itemForm.faca_nova,
                        faca_posicao: itemForm.faca_posicao || null,
                        formato_faca: itemForm.formato_faca,
                        matriz: itemForm.matriz,
                        valor_faca_nova: itemForm.valor_faca_nova,
                      },
                    })),
                  )
            }
            modelosComposicao={
              modoPrecoComercial ? null : form.modelos_composicao
            }
            modelosComposicaoQuantidades={
              modoPrecoComercial
                ? null
                : form.modelos_composicao_quantidades
            }
            echoEspecificacao={!modoPrecoComercial}
            parametrosAjuste={
              modoPrecoComercial || !canWrite
                ? null
                : {
                    papel: form.papel,
                    acabamento: form.acabamento,
                    maquina: form.maquina,
                    cores: String(form.cores),
                    tubete: form.tubete,
                    tipoTroca: form.tipo_troca_produto,
                    impostoPct: form.imposto_pct,
                    comissaoPct: form.faixas[0]?.comissao_pct ?? 0,
                    comissaoPctByFaixa: form.faixas.map((f) => f.comissao_pct),
                    overrides: form.overrides,
                  }
            }
            onAplicarParametros={
              modoPrecoComercial || !canWrite
                ? undefined
                : handleAplicarParametros
            }
            aplicandoParametros={pending}
            guiaEspec={
              modoPrecoComercial
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
                    saida_etiqueta: form.saida_etiqueta || null,
                    tipo_troca_produto: form.tipo_troca_produto,
                    rpm: form.rpm,
                    z: form.z === '' ? null : form.z,
                    faca_nova: form.faca_nova,
                    faca_posicao: form.faca_posicao || null,
                    formato_faca: form.formato_faca,
                    matriz: form.matriz,
                    valor_faca_nova: form.valor_faca_nova,
                  }
            }
          />
        </div>
      ) : (
        <p className="form-hint" style={{ marginTop: '1rem' }}>
          {form.tipo_operacao === TIPO_SERVICO
            ? 'Calcule para visualizar o total comercial do serviço (NFS-e Nacional).'
            : isRevendaItem(form)
              ? 'Calcule para visualizar o total comercial da revenda (NF-e, sem produção).'
            : form.tipo_operacao === TIPO_CESSAO_BEM
              ? 'Cessão de equipamento não passa por este cálculo — use o patrimônio.'
              : 'Calcule para visualizar a proposta comercial, a composição do custo e a guia de produção.'}
        </p>
      )}
    </>
  );
}
