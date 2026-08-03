export type AreaId = 'comercial' | 'financeiro' | 'producao' | 'estoque' | 'expedicao';

export interface Area {
  id: AreaId;
  label: string;
  color: string;
  y: number;
  height: number;
}

export type StepKind = 'step' | 'gateway' | 'store' | 'terminal';

export interface StepDetails {
  descricao: string;
  entradas: string[];
  saidas: string[];
  documentos: string[];
}

export interface Step {
  id: string;
  kind: StepKind;
  area: AreaId;
  title: string;
  icon: string;
  x: number;
  y: number;
  start?: boolean;
  details: StepDetails;
}

export interface Flow {
  id: string;
  source: string;
  target: string;
  sourceHandle: 'ts' | 'rs' | 'bs' | 'ls' | 'rsu' | 'lsd';
  targetHandle: 'tt' | 'rt' | 'bt' | 'lt' | 'rtd' | 'ltu';
  label?: string;
  dashed?: boolean;
}

export interface Scenario {
  id: string;
  label: string;
  description: string;
  sequence: string[];
  excludeEdges?: string[];
}

export const LANE_WIDTH = 4300;

export const AREAS: Area[] = [
  { id: 'comercial', label: 'Comercial', color: '#2563eb', y: 0, height: 210 },
  { id: 'financeiro', label: 'Financeiro', color: '#d97706', y: 220, height: 200 },
  { id: 'producao', label: 'Produção / PCP', color: '#7c3aed', y: 430, height: 200 },
  { id: 'estoque', label: 'Suprimentos / Estoque', color: '#059669', y: 640, height: 200 },
  { id: 'expedicao', label: 'Expedição', color: '#0891b2', y: 850, height: 180 },
];

const col = (n: number) => 70 + n * 305;

export const STEPS: Step[] = [
  // ── Comercial ────────────────────────────────────────────────
  {
    id: 'orcamento',
    kind: 'step',
    area: 'comercial',
    title: 'Orçamento',
    icon: '📄',
    x: col(0),
    y: 55,
    start: true,
    details: {
      descricao:
        'Elaboração do orçamento a partir da solicitação do cliente: especificação técnica (material, cores, medidas, quantidade), cálculo de custos, margem e prazo.',
      entradas: ['Solicitação do cliente', 'Especificação técnica / arte'],
      saidas: ['Proposta comercial enviada ao cliente'],
      documentos: ['Orçamento / Proposta comercial'],
    },
  },
  {
    id: 'gwAprovado',
    kind: 'gateway',
    area: 'comercial',
    title: 'Cliente aprovou?',
    icon: '❓',
    x: col(1),
    y: 40,
    details: {
      descricao:
        'O cliente analisa a proposta. Se aprovar, o fluxo segue. Se não aprovar, o orçamento é arquivado para histórico, follow-up e análise de motivos de perda.',
      entradas: ['Proposta comercial'],
      saidas: ['Aprovação (segue o fluxo)', 'Recusa (orçamento arquivado)'],
      documentos: ['Registro de aprovação (e-mail / assinatura)'],
    },
  },
  {
    id: 'fimPerdido',
    kind: 'terminal',
    area: 'comercial',
    title: 'Orçamento arquivado',
    icon: '🗂️',
    x: col(2) - 40,
    y: 155,
    details: {
      descricao:
        'Proposta não fechada. Mantida no histórico para follow-up futuro e análise de perdas (preço, prazo, concorrência).',
      entradas: ['Recusa do cliente'],
      saidas: ['Histórico comercial'],
      documentos: ['Registro de motivo da perda'],
    },
  },
  {
    id: 'gwPrimeiro',
    kind: 'gateway',
    area: 'comercial',
    title: '1º pedido do cliente?',
    icon: '❓',
    x: col(2) + 90,
    y: 40,
    details: {
      descricao:
        'Regra comercial: na primeira compra do cliente é exigido adiantamento de 50% do valor. O pedido só é confirmado após o pagamento do adiantamento. Clientes recorrentes seguem direto para o pedido.',
      entradas: ['Orçamento aprovado', 'Cadastro / histórico do cliente'],
      saidas: ['1º pedido → cobrança de adiantamento', 'Recorrente → pedido de venda'],
      documentos: ['Política comercial de crédito'],
    },
  },
  {
    id: 'pedido',
    kind: 'step',
    area: 'comercial',
    title: 'Pedido de venda',
    icon: '🧾',
    x: col(5),
    y: 55,
    details: {
      descricao:
        'Orçamento aprovado convertido em pedido de venda, com condições comerciais, quantidades e prazo de entrega confirmados. É o gatilho para a produção.',
      entradas: ['Orçamento aprovado', 'Adiantamento confirmado (se 1ª compra)'],
      saidas: ['Pedido confirmado para o PCP'],
      documentos: ['Pedido de venda'],
    },
  },

  // ── Financeiro ───────────────────────────────────────────────
  {
    id: 'cobAdiant',
    kind: 'step',
    area: 'financeiro',
    title: 'Cobrança de adiantamento (50%)',
    icon: '💰',
    x: col(3),
    y: 280,
    details: {
      descricao:
        'Emissão da cobrança de adiantamento de 50% do valor do pedido — política aplicada à primeira compra do cliente.',
      entradas: ['Orçamento aprovado (1ª compra)'],
      saidas: ['Cobrança enviada ao cliente'],
      documentos: ['Boleto / Pix de adiantamento'],
    },
  },
  {
    id: 'recAdiant',
    kind: 'step',
    area: 'financeiro',
    title: 'Recebimento do adiantamento',
    icon: '✅',
    x: col(4),
    y: 280,
    details: {
      descricao:
        'Confirmação do pagamento dos 50%. Libera a criação do pedido de venda e o início da produção.',
      entradas: ['Pagamento do cliente'],
      saidas: ['Pedido liberado para produção'],
      documentos: ['Comprovante / conciliação bancária'],
    },
  },
  {
    id: 'faturamento',
    kind: 'step',
    area: 'financeiro',
    title: 'Faturamento (NF-e) + cobrança do saldo',
    icon: '🧾',
    x: col(10),
    y: 280,
    details: {
      descricao:
        'Emissão da NF-e de venda e, no mesmo ato (simultâneos), geração da cobrança: do valor integral, ou do saldo restante quando houve adiantamento de 50% na 1ª compra. A condição de pagamento segue o negociado no pedido (à vista, 28 dias, parcelado).',
      entradas: ['Produto acabado conferido', 'Pedido de venda', 'Adiantamento pago (se 1ª compra)'],
      saidas: ['NF-e emitida', 'Cobrança em aberto no contas a receber (integral ou saldo restante)'],
      documentos: ['NF-e de venda', 'Boleto / Pix / Duplicata'],
    },
  },
  {
    id: 'recebimento',
    kind: 'step',
    area: 'financeiro',
    title: 'Recebimento do cliente',
    icon: '💵',
    x: col(11),
    y: 280,
    details: {
      descricao: 'Confirmação do pagamento da cobrança pelo cliente na data de vencimento.',
      entradas: ['Cobrança em aberto'],
      saidas: ['Pagamento confirmado'],
      documentos: ['Extrato / comprovante'],
    },
  },
  {
    id: 'baixa',
    kind: 'step',
    area: 'financeiro',
    title: 'Baixa da cobrança',
    icon: '🔒',
    x: col(12),
    y: 280,
    details: {
      descricao:
        'Baixa da cobrança no contas a receber (conciliação bancária). Encerramento financeiro do pedido.',
      entradas: ['Pagamento confirmado'],
      saidas: ['Pedido quitado'],
      documentos: ['Conciliação / baixa no financeiro'],
    },
  },
  {
    id: 'fim',
    kind: 'terminal',
    area: 'financeiro',
    title: 'Pedido concluído',
    icon: '🏁',
    x: col(13),
    y: 290,
    details: {
      descricao: 'Ciclo encerrado: produto entregue ao cliente e cobrança recebida e baixada.',
      entradas: ['Entrega realizada', 'Cobrança baixada'],
      saidas: ['Histórico do cliente atualizado'],
      documentos: ['—'],
    },
  },

  // ── Produção / PCP ───────────────────────────────────────────
  {
    id: 'op',
    kind: 'step',
    area: 'producao',
    title: 'Ordem de Produção (OP/OS)',
    icon: '📋',
    x: col(6),
    y: 490,
    details: {
      descricao:
        'O pedido gera a Ordem de Produção/Serviço. O PCP define roteiro, máquina, clichês, tintas e a programação na fila. A aprovação da OP gera a lista de insumos (requisição de materiais) que autoriza a saída no estoque.',
      entradas: ['Pedido de venda confirmado'],
      saidas: ['OP aprovada com lista de insumos (requisição de materiais)'],
      documentos: ['Ordem de Produção / Ordem de Serviço', 'Lista de insumos'],
    },
  },
  {
    id: 'producao',
    kind: 'step',
    area: 'producao',
    title: 'Produção flexográfica',
    icon: '🖨️',
    x: col(7),
    y: 490,
    details: {
      descricao:
        'Execução da impressão: setup/acerto de máquina, impressão flexográfica e acabamento (rebobinagem, corte e solda). Registra o consumo real dos insumos e gera duas saídas: o produto acabado e as sobras aproveitáveis, que retornam ao estoque.',
      entradas: ['Insumos com saída dada no estoque', 'OP aprovada'],
      saidas: ['Produto acabado', 'Sobras aproveitáveis → entrada no estoque'],
      documentos: ['Apontamento de produção (consumo real)'],
    },
  },
  {
    id: 'produtoAcabado',
    kind: 'step',
    area: 'producao',
    title: 'Produto acabado',
    icon: '📦',
    x: col(8),
    y: 490,
    details: {
      descricao:
        'Produto conferido (qualidade e quantidade), embalado e identificado. Pronto para faturar e expedir.',
      entradas: ['Produção finalizada'],
      saidas: ['Liberação para faturamento e entrega'],
      documentos: ['Etiqueta / romaneio de produção'],
    },
  },

  // ── Suprimentos / Estoque ────────────────────────────────────
  {
    id: 'monitorEstoque',
    kind: 'step',
    area: 'estoque',
    title: 'Monitoramento de estoque',
    icon: '📊',
    x: col(0),
    y: 700,
    start: true,
    details: {
      descricao:
        'Acompanhamento contínuo dos níveis (saldos) dos insumos: estoque mínimo, ponto de pedido e consumo previsto pelas OPs em carteira. Quando um insumo atinge o ponto de pedido, dispara a requisição de compra.',
      entradas: ['Saldos do estoque', 'Consumo previsto das OPs', 'Estoque mínimo / ponto de pedido por insumo'],
      saidas: ['Alerta de reposição → requisição de compra'],
      documentos: ['Relatório de níveis de estoque'],
    },
  },
  {
    id: 'requisicaoCompra',
    kind: 'step',
    area: 'estoque',
    title: 'Requisição de compra',
    icon: '📝',
    x: col(1),
    y: 700,
    details: {
      descricao:
        'Formalização da necessidade de reposição: itens, quantidades e prazo desejado. A requisição é aprovada e segue para a montagem do(s) pedido(s) de compra.',
      entradas: ['Alerta de reposição do monitoramento', 'Demanda de pedido específico'],
      saidas: ['Requisição aprovada para compras'],
      documentos: ['Requisição de compra'],
    },
  },
  {
    id: 'compra',
    kind: 'step',
    area: 'estoque',
    title: 'Pedido de compra (um ou mais)',
    icon: '🛒',
    x: col(2),
    y: 700,
    details: {
      descricao:
        'Montagem de um ou mais pedidos de compra a partir da requisição: cotação e escolha de fornecedores por insumo — bobinas (BOPP, PE, papel), tintas, solventes, clichês e adesivos — com negociação de preço e prazo.',
      entradas: ['Requisição de compra aprovada', 'Cotações de fornecedores'],
      saidas: ['Pedido(s) de compra enviados aos fornecedores'],
      documentos: ['Pedido de compra (por fornecedor)', 'Cotações'],
    },
  },
  {
    id: 'entradaEstoque',
    kind: 'step',
    area: 'estoque',
    title: 'Recebimento e conferência',
    icon: '📥',
    x: col(3),
    y: 700,
    details: {
      descricao:
        'Recebimento físico dos insumos, conferência contra a nota fiscal e o pedido de compra, e inspeção de qualidade antes da entrada no estoque.',
      entradas: ['Insumos entregues pelo fornecedor'],
      saidas: ['Insumos aprovados para estoque'],
      documentos: ['NF de entrada', 'Checklist de recebimento'],
    },
  },
  {
    id: 'estoque',
    kind: 'store',
    area: 'estoque',
    title: 'Estoque de insumos',
    icon: '🏬',
    x: col(4) + 60,
    y: 693,
    details: {
      descricao:
        'Estoque central de insumos. É abastecido pelas compras e pelas sobras de produção, e abastece as ordens de produção. Ponto de controle de saldo, custo e estoque mínimo.',
      entradas: ['Compras conferidas', 'Sobras devolvidas da produção'],
      saidas: ['Insumos separados para as OPs'],
      documentos: ['Ficha / saldo de estoque'],
    },
  },
  {
    id: 'separacao',
    kind: 'step',
    area: 'estoque',
    title: 'Saída de insumos (baixa no estoque)',
    icon: '📤',
    x: col(6),
    y: 700,
    details: {
      descricao:
        'Com a lista de insumos da OP aprovada, os itens (bobinas, tintas, clichês) são separados e é dada a SAÍDA (baixa) no saldo do estoque, com o consumo apontado na OP. Os insumos seguem para a máquina.',
      entradas: ['Lista de insumos da OP aprovada', 'Saldo em estoque'],
      saidas: ['Baixa no saldo do estoque', 'Insumos na produção'],
      documentos: ['Requisição de materiais', 'Movimentação de saída no estoque'],
    },
  },
  {
    id: 'retornoSobras',
    kind: 'step',
    area: 'estoque',
    title: 'Entrada de sobras (estoque)',
    icon: '♻️',
    x: col(8),
    y: 700,
    details: {
      descricao:
        'Ao fim da produção, o restante aproveitável (pontas de bobina, tintas) é pesado/medido e é dada a ENTRADA de volta no saldo do estoque, vinculada à OP. Fecha o ciclo: saída prevista − consumo real = sobra devolvida.',
      entradas: ['Sobras apontadas na produção'],
      saidas: ['Entrada no saldo do estoque'],
      documentos: ['Devolução de materiais', 'Movimentação de entrada no estoque'],
    },
  },

  // ── Expedição ────────────────────────────────────────────────
  {
    id: 'entrega',
    kind: 'step',
    area: 'expedicao',
    title: 'Entrega ao cliente',
    icon: '🚚',
    x: col(11),
    y: 905,
    details: {
      descricao:
        'Expedição e transporte do produto acabado até o cliente, acompanhado da NF-e.',
      entradas: ['Produto acabado faturado'],
      saidas: ['Produto no cliente, aguardando confirmação'],
      documentos: ['Romaneio de entrega', 'NF-e (DANFE)'],
    },
  },
  {
    id: 'confirmacaoEntrega',
    kind: 'step',
    area: 'expedicao',
    title: 'Confirmação de entrega',
    icon: '✍️',
    x: col(12),
    y: 905,
    details: {
      descricao:
        'O cliente confere a mercadoria e confirma o recebimento: canhoto da NF-e assinado ou comprovante digital. O comprovante retorna e formaliza o encerramento da entrega.',
      entradas: ['Produto entregue ao cliente'],
      saidas: ['Entrega confirmada pelo cliente'],
      documentos: ['Canhoto da NF-e assinado', 'Comprovante de entrega'],
    },
  },
];

export const FLOWS: Flow[] = [
  // Suprimentos
  { id: 'f-monitor-requisicao', source: 'monitorEstoque', target: 'requisicaoCompra', sourceHandle: 'rs', targetHandle: 'lt', label: 'atingiu ponto de pedido' },
  { id: 'f-requisicao-compra', source: 'requisicaoCompra', target: 'compra', sourceHandle: 'rs', targetHandle: 'lt' },
  { id: 'f-compra-entrada', source: 'compra', target: 'entradaEstoque', sourceHandle: 'rs', targetHandle: 'lt' },
  { id: 'f-entrada-estoque', source: 'entradaEstoque', target: 'estoque', sourceHandle: 'rs', targetHandle: 'lt' },
  { id: 'f-estoque-monitor', source: 'estoque', target: 'monitorEstoque', sourceHandle: 'bs', targetHandle: 'bt', label: 'acompanha os saldos', dashed: true },
  { id: 'f-separacao-requisita', source: 'separacao', target: 'estoque', sourceHandle: 'lsd', targetHandle: 'rtd', label: 'requisição — dá baixa no saldo', dashed: true },
  { id: 'f-estoque-separacao', source: 'estoque', target: 'separacao', sourceHandle: 'rsu', targetHandle: 'ltu', label: 'insumos separados', dashed: true },

  // Comercial
  { id: 'f-orcamento-gw', source: 'orcamento', target: 'gwAprovado', sourceHandle: 'rs', targetHandle: 'lt' },
  { id: 'f-gw-primeiro', source: 'gwAprovado', target: 'gwPrimeiro', sourceHandle: 'rs', targetHandle: 'lt', label: 'Sim' },
  { id: 'f-gw-perdido', source: 'gwAprovado', target: 'fimPerdido', sourceHandle: 'bs', targetHandle: 'lt', label: 'Não' },
  { id: 'f-primeiro-adiant', source: 'gwPrimeiro', target: 'cobAdiant', sourceHandle: 'bs', targetHandle: 'lt', label: 'Sim — 1ª compra' },
  { id: 'f-adiant-rec', source: 'cobAdiant', target: 'recAdiant', sourceHandle: 'rs', targetHandle: 'lt' },
  { id: 'f-recadiant-pedido', source: 'recAdiant', target: 'pedido', sourceHandle: 'rs', targetHandle: 'bt', label: 'libera pedido' },
  { id: 'f-primeiro-pedido', source: 'gwPrimeiro', target: 'pedido', sourceHandle: 'rs', targetHandle: 'lt', label: 'Não — recorrente' },

  // Pedido → produção
  { id: 'f-pedido-op', source: 'pedido', target: 'op', sourceHandle: 'rs', targetHandle: 'lt' },
  { id: 'f-op-separacao', source: 'op', target: 'separacao', sourceHandle: 'bs', targetHandle: 'tt', label: 'OP com a lista de insumos' },
  { id: 'f-separacao-producao', source: 'separacao', target: 'producao', sourceHandle: 'rs', targetHandle: 'lt', label: 'leva os insumos p/ produção' },
  { id: 'f-producao-acabado', source: 'producao', target: 'produtoAcabado', sourceHandle: 'rs', targetHandle: 'lt' },
  { id: 'f-producao-sobras', source: 'producao', target: 'retornoSobras', sourceHandle: 'bs', targetHandle: 'tt', label: 'o que sobrou' },
  { id: 'f-sobras-estoque', source: 'retornoSobras', target: 'estoque', sourceHandle: 'bs', targetHandle: 'bt', label: 'entrada no saldo do estoque', dashed: true },

  // Faturamento, entrega e recebimento
  { id: 'f-acabado-faturamento', source: 'produtoAcabado', target: 'faturamento', sourceHandle: 'ts', targetHandle: 'lt' },
  { id: 'f-faturamento-entrega', source: 'faturamento', target: 'entrega', sourceHandle: 'bs', targetHandle: 'lt', label: 'NF-e acompanha' },
  { id: 'f-faturamento-recebimento', source: 'faturamento', target: 'recebimento', sourceHandle: 'rs', targetHandle: 'lt', label: 'aguarda vencimento' },
  { id: 'f-recebimento-baixa', source: 'recebimento', target: 'baixa', sourceHandle: 'rs', targetHandle: 'lt' },
  { id: 'f-baixa-fim', source: 'baixa', target: 'fim', sourceHandle: 'rs', targetHandle: 'lt' },
  { id: 'f-entrega-confirmacao', source: 'entrega', target: 'confirmacaoEntrega', sourceHandle: 'rs', targetHandle: 'lt' },
  { id: 'f-confirmacao-fim', source: 'confirmacaoEntrega', target: 'fim', sourceHandle: 'rs', targetHandle: 'bt', label: 'entrega confirmada' },
];

export const SCENARIOS: Scenario[] = [
  {
    id: 'novo',
    label: '1ª compra (com adiantamento 50%)',
    description:
      'Cliente novo: após aprovar o orçamento, paga adiantamento de 50% antes do pedido seguir para produção.',
    sequence: [
      'orcamento',
      'gwAprovado',
      'gwPrimeiro',
      'cobAdiant',
      'recAdiant',
      'pedido',
      'op',
      'separacao',
      'estoque',
      'separacao',
      'producao',
      'retornoSobras',
      'estoque',
      'producao',
      'produtoAcabado',
      'faturamento',
      'entrega',
      'confirmacaoEntrega',
      'fim',
      'faturamento',
      'recebimento',
      'baixa',
      'fim',
    ],
    excludeEdges: ['f-primeiro-pedido'],
  },
  {
    id: 'recorrente',
    label: 'Cliente recorrente',
    description:
      'Cliente com histórico: orçamento aprovado vira pedido direto, sem adiantamento.',
    sequence: [
      'orcamento',
      'gwAprovado',
      'gwPrimeiro',
      'pedido',
      'op',
      'separacao',
      'estoque',
      'separacao',
      'producao',
      'retornoSobras',
      'estoque',
      'producao',
      'produtoAcabado',
      'faturamento',
      'entrega',
      'confirmacaoEntrega',
      'fim',
      'faturamento',
      'recebimento',
      'baixa',
      'fim',
    ],
  },
  {
    id: 'suprimentos',
    label: 'Reposição de insumos',
    description:
      'Ciclo de suprimentos: monitoramento dos níveis de estoque, requisição de compra, pedido(s) de compra, recebimento com conferência e entrada no estoque.',
    sequence: ['monitorEstoque', 'requisicaoCompra', 'compra', 'entradaEstoque', 'estoque'],
  },
];

export const AREA_BY_ID = Object.fromEntries(AREAS.map((a) => [a.id, a])) as Record<AreaId, Area>;
export const STEP_BY_ID = Object.fromEntries(STEPS.map((s) => [s.id, s])) as Record<string, Step>;
