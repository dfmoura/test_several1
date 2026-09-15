/**
 * Orientação e checklist do cadastro de produto (ADR-043-CAD-001 · ADR-039-UNID-001).
 *
 * Não muda o modelo: só deixa o formulário autoexplicativo —
 * SKU = material/programa · de-para = NF · volume = bobina na entrada.
 *
 * “Novo a partir deste” = mesmo perfil técnico, novo SKU (saldo e de-para próprios).
 * Foco operacional: Nome no estoque + Descrição fiscal (+ código). Sem variante/alias.
 */

import { unidadesDiferem } from './produtoUnidadesConversaoUi';

export type CadastroCheckItem = {
  id: string;
  label: string;
  ok: boolean;
  /** true = bloqueia “pronto para entrada”; false = recomendação. */
  required: boolean;
};

export type CadastroOrientacao = {
  /** Lead curto sob o título Identificação / unidades. */
  lead: string;
  /** Sugestão de unidade quando o grupo é substrato Exact típico. */
  preferM2Igual: boolean;
};

/** Banner do fluxo “Novo a partir deste” (?from=) — UX, sem segundo modelo de produto. */
export type ModeloOrigemBanner = {
  title: string;
  lead: string;
  bullets: string[];
};

export function decideModeloOrigemBanner(codigoOrigem: string): ModeloOrigemBanner {
  const codigo = codigoOrigem.trim() || 'modelo';
  return {
    title: `Novo SKU a partir de ${codigo}`,
    lead: 'Perfil técnico copiado. Concentre-se no que distingue a identidade: nome no estoque e descrição fiscal. Código vazio gera o próximo da sequência do grupo.',
    bullets: [
      'Novo cadastro = novo SKU e saldo separados do modelo.',
      'De-para cProd não é copiado — vincule depois ou use Do XML.',
      'Família, grupo, NCM, unidades e lote vieram do modelo; revise só se forem distintos.',
      'Mesmo material Exact / mesmo cProd? Não duplique — use o SKU existente (ou volume na entrada).',
    ],
  };
}

/** Nomes ainda idênticos ao modelo: aviso suave (não bloqueia). */
export function nomesAindaIguaisAoModelo(input: {
  descricaoComercial: string;
  descricaoFiscal: string;
  origemComercial: string | null | undefined;
  origemFiscal: string | null | undefined;
}): boolean {
  const norm = (s: string | null | undefined) => (s ?? '').trim().toUpperCase();
  const com = norm(input.descricaoComercial);
  const fis = norm(input.descricaoFiscal);
  const oCom = norm(input.origemComercial);
  const oFis = norm(input.origemFiscal);
  if (!com && !fis) return false;
  const comercialIgual = oCom !== '' && com === oCom;
  const fiscalIgual = oFis !== '' && fis === oFis;
  return comercialIgual || fiscalIgual;
}

export function decideCadastroOrientacao(input: {
  familia: string;
  grupoCodigo?: string | null;
  exigeDimensaoSku?: boolean;
  unidadeComercial?: string | null;
  unidadeInterna?: string | null;
  programaCompra?: string | null;
}): CadastroOrientacao {
  const familia = (input.familia || '').toUpperCase();
  const grupo = (input.grupoCodigo || '').toUpperCase();
  const uCom = (input.unidadeComercial || '').trim().toUpperCase();
  const uInt = (input.unidadeInterna || '').trim().toUpperCase();
  const programa = (input.programaCompra || '').trim().toUpperCase();
  const exactLike =
    programa.includes('EXACT') ||
    grupo === 'MP-PAP' ||
    grupo === 'MP-FLM';

  if (familia === 'PA' || familia === 'SVC' || familia === 'FAC') {
    return {
      lead:
        familia === 'PA'
          ? 'PA sob encomenda: família + spec no pedido — não explodir SKU por arte/cliente. Preço da etiqueta sob medida continua no catálogo ORC.'
          : 'Cadastro enxuto: identificação, unidade e fiscal. Sem bobina nem de-para de compra.',
      preferM2Igual: false,
    };
  }

  if (exactLike && input.exigeDimensaoSku) {
    const m2M2 =
      (uCom === '' || uCom === 'M2') && (uInt === '' || uInt === 'M2' || uInt === uCom);
    return {
      lead: m2M2
        ? 'Insumo de bobina: um SKU por material/programa (ex. EXACT 1000). NF e saldo em M². Cada bobina (nLote) é volume na entrada — não crie SKU por largura×comprimento.'
        : 'Insumo de bobina: prefira M² = M² quando a NF fatura em M² (Exact). Se a NF for em KG, informe gramatura e o fator. Dimensão real da bobina = volume na conferência.',
      preferM2Igual: true,
    };
  }

  if (familia === 'MUC') {
    return {
      lead: 'Uso e consumo: limpeza, escritório, EPI e afins. Compra vira despesa (não matéria-prima). Vincule o cProd do fornecedor no de-para. Sem bobina nem OP.',
      preferM2Igual: false,
    };
  }

  if (familia === 'MP' || familia === 'EMB' || familia === 'REV') {
    return {
      lead: 'SKU operacional (compra/estoque/OP). Vincule o cProd do fornecedor no de-para para a entrada por XML. Unidades: comercial (NF) ↔ estoque (saldo único).',
      preferM2Igual: false,
    };
  }

  return {
    lead: 'Cadastro do item: nome de estoque, fiscal, unidades e de-para quando houver compra.',
    preferM2Igual: false,
  };
}

export function buildCadastroChecklist(input: {
  familia: string;
  descricaoComercial?: string | null;
  descricaoFiscal?: string | null;
  ncm?: string | null;
  tipoItemSped?: string | null;
  unidadeComercial?: string | null;
  unidadeInterna?: string | null;
  fatorConversao?: string | null;
  fatorStatus?: string | null;
  gramaturaGm2?: string | null;
  programaCompra?: string | null;
  exigeDimensaoSku?: boolean;
  deParaCount: number;
  isNew: boolean;
  /** Rascunho de de-para no formulário de criação (fornecedor + cProd). */
  deParaDraftOk?: boolean;
  /** Fluxo ?from= — recomenda revisar nomes se ainda iguais ao modelo. */
  fromModelo?: boolean;
  nomesIguaisAoModelo?: boolean;
}): { items: CadastroCheckItem[]; ready: boolean; pendingRequired: number } {
  const familia = (input.familia || '').toUpperCase();
  const compra = familia === 'MP' || familia === 'EMB' || familia === 'REV' || familia === 'MUC';
  const nomeEstoque = (input.descricaoComercial || '').trim();
  const fiscal = (input.descricaoFiscal || '').trim();
  const ncm = (input.ncm || '').replace(/\D/g, '');
  const unitsDiffer = unidadesDiferem(input.unidadeComercial, input.unidadeInterna);
  const fatorOk =
    !unitsDiffer ||
    ((input.fatorConversao || '').trim() !== '' &&
      input.fatorStatus !== 'incompleto' &&
      Number(input.fatorConversao) > 0);
  const gramaturaNeeded =
    unitsDiffer &&
    ((input.unidadeComercial || '').toUpperCase() === 'KG' ||
      (input.unidadeInterna || '').toUpperCase() === 'KG') &&
    ((input.unidadeComercial || '').toUpperCase() === 'M2' ||
      (input.unidadeInterna || '').toUpperCase() === 'M2' ||
      (input.unidadeComercial || '').toUpperCase() === 'M' ||
      (input.unidadeInterna || '').toUpperCase() === 'M');

  const items: CadastroCheckItem[] = [
    {
      id: 'nome_estoque',
      label: 'Nome no estoque (como a empresa chama o item)',
      ok: nomeEstoque.length > 0,
      required: compra,
    },
    {
      id: 'fiscal',
      label: 'Descrição fiscal (NF-e / SPED)',
      ok: fiscal.length > 0,
      required: true,
    },
  ];

  if (input.fromModelo) {
    items.push({
      id: 'nomes_modelo',
      label: input.nomesIguaisAoModelo
        ? 'Nomes ainda iguais ao modelo — confirme se a identidade é distinta'
        : 'Nomes revisados em relação ao modelo',
      ok: !input.nomesIguaisAoModelo,
      required: false,
    });
  }

  items.push(
    {
      id: 'ncm',
      label: 'NCM (8 dígitos)',
      ok: ncm.length === 8,
      required: true,
    },
    {
      id: 'sped',
      label: 'Tipo de item SPED',
      ok: (input.tipoItemSped || '').trim().length > 0,
      required: true,
    },
    {
      id: 'unidades',
      label: unitsDiffer
        ? 'Unidades e fator de conversão'
        : 'Unidade comercial / estoque',
      ok: (input.unidadeComercial || '').trim().length > 0 && fatorOk,
      required: true,
    },
  );

  if (gramaturaNeeded) {
    items.push({
      id: 'gramatura',
      label: 'Gramatura total (ponte KG ↔ M²/M)',
      ok: (input.gramaturaGm2 || '').trim() !== '',
      required: true,
    });
  }

  if (input.exigeDimensaoSku) {
    items.push({
      id: 'programa',
      label: 'Programa de compra (ex. EXACT 1000) — recomendado',
      ok: (input.programaCompra || '').trim().length > 0,
      required: false,
    });
  }

  if (compra) {
    const draftOk = Boolean(input.deParaDraftOk);
    items.push({
      id: 'depara',
      label: input.isNew
        ? draftOk
          ? 'De-para cProd preenchido (grava junto)'
          : 'De-para cProd (recomendado — ou use Do XML)'
        : 'De-para cProd do fornecedor',
      ok: input.isNew ? draftOk : input.deParaCount > 0,
      required: !input.isNew,
    });
  }

  const pendingRequired = items.filter((i) => i.required && !i.ok).length;
  return {
    items,
    ready: pendingRequired === 0,
    pendingRequired,
  };
}
