export type AreaId =
  | 'cadastros'
  | 'comercial'
  | 'producao'
  | 'estoque'
  | 'compras'
  | 'fiscal_fin'
  | 'expedicao'
  | 'posvenda'
  | 'integracoes';

export interface Area {
  id: AreaId;
  label: string;
  color: string;
  glow: string;
  y: number;
  height: number;
}

export type StepKind = 'step' | 'gateway' | 'store' | 'terminal' | 'module';

export interface StepDetails {
  descricao: string;
  entradas: string[];
  saidas: string[];
  documentos: string[];
  prefixo?: string;
  modulo?: string;
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

export const LANE_WIDTH = 5600;

export const AREAS: Area[] = [
  { id: 'cadastros', label: 'Cadastros (M01)', color: '#94a3b8', glow: '#94a3b866', y: 0, height: 175 },
  { id: 'comercial', label: 'Comercial (M02)', color: '#60a5fa', glow: '#60a5fa66', y: 190, height: 230 },
  { id: 'producao', label: 'Produção / PCP (M03)', color: '#c084fc', glow: '#c084fc66', y: 435, height: 200 },
  { id: 'estoque', label: 'Estoque (M04)', color: '#34d399', glow: '#34d39966', y: 650, height: 200 },
  { id: 'compras', label: 'Compras (M07)', color: '#2dd4bf', glow: '#2dd4bf66', y: 865, height: 175 },
  { id: 'fiscal_fin', label: 'Fiscal + Financeiro (M05/M06)', color: '#fbbf24', glow: '#fbbf2466', y: 1055, height: 220 },
  { id: 'expedicao', label: 'Expedição', color: '#38bdf8', glow: '#38bdf866', y: 1290, height: 170 },
  { id: 'posvenda', label: 'Pós-venda (M08)', color: '#f472b6', glow: '#f472b666', y: 1475, height: 200 },
  { id: 'integracoes', label: 'Integrações + Gerencial (M09/M10)', color: '#a78bfa', glow: '#a78bfa66', y: 1690, height: 200 },
];

const col = (n: number) => 90 + n * 310;

export const STEPS: Step[] = [
  // ── Cadastros ────────────────────────────────────────────────
  {
    id: 'empresa',
    kind: 'module',
    area: 'cadastros',
    title: 'Empresa / multi-CNPJ',
    icon: '🏢',
    x: col(0),
    y: 45,
    start: true,
    details: {
      descricao:
        'Contexto multi-empresa: EMP-00001 (principal, ativo) e EMP-00002 (venda desligada até escopo). Todo documento carrega empresa_id. Credenciais e livros isolados por CNPJ. LAI / livro paralelo NÃO entra no ERP.',
      entradas: ['CNPJs oficiais', 'Parâmetros TAB- da empresa'],
      saidas: ['empresa_id em todos os documentos', 'isolamento de credenciais'],
      documentos: ['EMP-', 'PARAMETROS_EMPRESA_OFICIAIS', 'MULTI_EMPRESA_CNPJS_E_LIVROS'],
      prefixo: 'EMP-',
      modulo: 'M01',
    },
  },
  {
    id: 'parceiro',
    kind: 'step',
    area: 'cadastros',
    title: 'Parceiro (PAR)',
    icon: '👤',
    x: col(1),
    y: 50,
    details: {
      descricao:
        'Cadastro único de parceiro com papéis (cliente, fornecedor, transportadora, colaborador). Prospect pode orçar; só vira PED com cadastro completo. Consultas de CNPJ/endereço com cadência de APIs free.',
      entradas: ['Dados cadastrais / CNPJ', 'Papel(éis) do parceiro'],
      saidas: ['PAR- utilizável em ORC/PED/OC'],
      documentos: ['PAR-', 'CADASTRO_PARCEIROS'],
      prefixo: 'PAR-',
      modulo: 'M01',
    },
  },
  {
    id: 'produto',
    kind: 'step',
    area: 'cadastros',
    title: 'Produtos (MP/EMB/REV/PA/SVC)',
    icon: '🏷️',
    x: col(2),
    y: 50,
    details: {
      descricao:
        'Cadastro fiscal e operacional de famílias: matéria-prima (bobinas), embalagem, revenda, produto acabado e serviço. Inclui NCM, conversões de unidade, faca/ferramental (FAC-) e padrão decimal sem float binário.',
      entradas: ['NCM / classificação', 'Unidades e conversões'],
      saidas: ['SKU disponível para ORC, OP, OC e estoque'],
      documentos: ['CADASTRO_PRODUTOS_COMPRA', 'CADASTRO_PRODUTOS_VENDA', 'CONVERSOES_UNIDADES_MEDIDA'],
      modulo: 'M01',
    },
  },
  {
    id: 'usuarios',
    kind: 'step',
    area: 'cadastros',
    title: 'Usuários e perfis RBAC',
    icon: '🔐',
    x: col(3),
    y: 50,
    details: {
      descricao:
        'Login corporativo individual (USR-) com perfil RBAC (PER-): ADMIN, FISCAL, FINANCEIRO, COMERCIAL, PRODUCAO, COMPRAS, EXPEDICAO, CONSULTA. Segregação de funções (SoD) em aprovações sensíveis.',
      entradas: ['Identidade corporativa', 'Papel operacional'],
      saidas: ['Sessão autenticada com empresa_id e perfil'],
      documentos: ['USR-', 'PER-', 'ORGANIZACAO_USUARIOS_PERFIS_ACESSO'],
      prefixo: 'USR-',
      modulo: 'M01 / M11',
    },
  },

  // ── Comercial ────────────────────────────────────────────────
  {
    id: 'orcamento',
    kind: 'step',
    area: 'comercial',
    title: 'Orçamento (ORC)',
    icon: '📄',
    x: col(1),
    y: 250,
    start: true,
    details: {
      descricao:
        'Proposta versionada com especificação técnica, cenários, gordura, imposto (MG/Simples) e prazo. Aceita prospect sem cadastro completo. “Combinado no zap” NÃO gera PED — só aceite formal via link.',
      entradas: ['Solicitação do cliente / prospect', 'SKU / spec / quantidade', 'Tabela de imposto'],
      saidas: ['ORC- versionado enviado ao cliente', 'Link de aceite'],
      documentos: ['ORC-', 'GERACAO_ORCAMENTO', 'VERIFICACAO_IMPOSTO_ORCAMENTO', 'MOBILIDADE_SIMULACAO_CENARIOS_ORCAMENTO'],
      prefixo: 'ORC-',
      modulo: 'M02',
    },
  },
  {
    id: 'gwAceite',
    kind: 'gateway',
    area: 'comercial',
    title: 'Cliente aceitou (link)?',
    icon: '❓',
    x: col(2) + 20,
    y: 240,
    details: {
      descricao:
        'Aceite formal do cliente via link. Se não aceitar, o ORC fica arquivado para follow-up e análise de perda. Snapshot do ORC aprovado trava preço/spec/qtde/prazo/condição no PED.',
      entradas: ['ORC enviado', 'Resposta do cliente no link'],
      saidas: ['Aceite → segue crédito', 'Recusa → ORC arquivado'],
      documentos: ['APROVACAO_ORCAMENTO_CLIENTE', 'Registro de aceite / motivo de perda'],
      modulo: 'M02',
    },
  },
  {
    id: 'orcArquivado',
    kind: 'terminal',
    area: 'comercial',
    title: 'ORC arquivado',
    icon: '🗂️',
    x: col(3) - 20,
    y: 340,
    details: {
      descricao: 'Proposta não fechada. Mantida no histórico comercial para follow-up e análise (preço, prazo, concorrência).',
      entradas: ['Recusa ou expiração do ORC'],
      saidas: ['Histórico comercial'],
      documentos: ['Motivo da perda'],
      modulo: 'M02',
    },
  },
  {
    id: 'credito',
    kind: 'step',
    area: 'comercial',
    title: 'Crédito / liberação (CRT)',
    icon: '🔓',
    x: col(3) + 80,
    y: 250,
    details: {
      descricao:
        'Checagem de limite de crédito do cliente. Na 1ª compra pode exigir adiantamento (sinal). Liberação de produção exige crédito OK ou adiantamento baixado (BX).',
      entradas: ['ORC aceito', 'Histórico / limite do PAR-', 'Política comercial'],
      saidas: ['Crédito OK', 'Cobrança de adiantamento', 'Bloqueio com aprovação'],
      documentos: ['CRT-', 'INCLUSAO_LIBERACAO_LIMITE_CREDITO_CLIENTE'],
      prefixo: 'CRT-',
      modulo: 'M02 / M06',
    },
  },
  {
    id: 'gwCredito',
    kind: 'gateway',
    area: 'comercial',
    title: 'Crédito / sinal OK?',
    icon: '❓',
    x: col(5),
    y: 240,
    details: {
      descricao:
        'Se crédito OK (recorrente) ou adiantamento baixado (1ª compra), o PED é gerado e liberado. Caso contrário, aguarda BX do sinal ou aprovação extraordinária.',
      entradas: ['Status CRT-', 'BX de adiantamento (se houver)'],
      saidas: ['PED liberado', 'Aguarda pagamento / aprovação'],
      documentos: ['Política de crédito', 'Comprovante de sinal'],
      modulo: 'M02',
    },
  },
  {
    id: 'pedido',
    kind: 'step',
    area: 'comercial',
    title: 'Pedido (PED) — mestre',
    icon: '🧾',
    x: col(6) + 40,
    y: 250,
    details: {
      descricao:
        'Documento-mestre operacional. Snapshot do ORC aprovado trava condições. Itens tipados: PRODUCAO | SERVICO | REVENDA. Todo o restante (OP, OS, NF, TIT, ENT, RMA…) aponta para o PED.',
      entradas: ['ORC aceito + crédito/sinal OK', 'PAR- completo', 'Snapshot do ORC'],
      saidas: ['PED- confirmado', 'Disparo por tipo de item'],
      documentos: ['PED-', 'GERACAO_PEDIDO'],
      prefixo: 'PED-',
      modulo: 'M02',
    },
  },
  {
    id: 'gwTipoItem',
    kind: 'gateway',
    area: 'comercial',
    title: 'Tipo do item?',
    icon: '❓',
    x: col(7) + 60,
    y: 240,
    details: {
      descricao:
        'Ramificação por tipo: PRODUCAO gera OP; SERVICO gera OS; REVENDA gera separação de estoque. Um PED pode ter vários itens de tipos distintos.',
      entradas: ['Itens do PED-'],
      saidas: ['OP (produção)', 'OS (serviço)', 'Separação (revenda)'],
      documentos: ['Item do pedido tipado'],
      modulo: 'M02',
    },
  },
  {
    id: 'comissao',
    kind: 'step',
    area: 'comercial',
    title: 'Comissão (COM)',
    icon: '💼',
    x: col(13),
    y: 250,
    details: {
      descricao:
        'Comissão de vendedor gerada no ERP a partir do pedido/faturamento — não em planilha nem WhatsApp pessoal. Apuração e pagamento gerencial rastreáveis.',
      entradas: ['PED / NF faturados', 'Regras do vendedor'],
      saidas: ['COM- apurada'],
      documentos: ['COM-', 'COMISSOES_VENDEDORES_DETALHADO'],
      prefixo: 'COM-',
      modulo: 'M02 / M10',
    },
  },

  // ── Produção / PCP ───────────────────────────────────────────
  {
    id: 'op',
    kind: 'step',
    area: 'producao',
    title: 'Ordem de Produção (OP)',
    icon: '📋',
    x: col(8) + 40,
    y: 495,
    details: {
      descricao:
        'Execução industrial do item PRODUCAO. PCP define roteiro, máquina, clichês/tintas e fila. Aprova a lista de insumos que autoriza saída no estoque. Não existe “sistema de produção” paralelo ao ERP.',
      entradas: ['PED- item PRODUCAO liberado', 'Capacidade / máquina'],
      saidas: ['OP- aprovada', 'Lista de insumos (requisição)'],
      documentos: ['OP-', 'PRODUCAO_OPERACIONAL_GERENCIAL'],
      prefixo: 'OP-',
      modulo: 'M03',
    },
  },
  {
    id: 'os',
    kind: 'step',
    area: 'producao',
    title: 'Ordem de Serviço (OS)',
    icon: '🛠️',
    x: col(8) + 40,
    y: 560,
    details: {
      descricao:
        'Execução do item SERVICO (rebobinação, acerto etc.). Segue até conclusão e libera faturamento sem fluxo de MP típico de OP.',
      entradas: ['PED- item SERVICO'],
      saidas: ['OS- concluída → faturamento'],
      documentos: ['OS-', 'ORDEM_SERVICO'],
      prefixo: 'OS-',
      modulo: 'M03',
    },
  },
  {
    id: 'apontamento',
    kind: 'step',
    area: 'producao',
    title: 'Apontamento / produção',
    icon: '🖨️',
    x: col(9) + 40,
    y: 495,
    details: {
      descricao:
        'Execução flexográfica: setup, impressão, acabamento. Registra consumo real, gera PA e sobras aproveitáveis (bobina/retalho) que retornam ao estoque.',
      entradas: ['Insumos baixados no estoque', 'OP aprovada'],
      saidas: ['Produto acabado', 'Sobra / retalho para retorno'],
      documentos: ['Apontamento', 'TRATAMENTO_SOBRA_BOBINA_RETALHO'],
      modulo: 'M03',
    },
  },
  {
    id: 'conclusao',
    kind: 'step',
    area: 'producao',
    title: 'Conclusão OP/OS',
    icon: '✅',
    x: col(10) + 40,
    y: 495,
    details: {
      descricao:
        'Encerra OP/OS, confere qualidade/quantidade, embalagem e identificadores. Libera PA para faturamento e expedição.',
      entradas: ['Produção / serviço finalizado', 'Conferência CQ'],
      saidas: ['PA liberado', 'Gatilho de faturamento'],
      documentos: ['CONCLUSAO_PRODUCAO', 'QUALIDADE_AMOSTRAGEM_CERTIFICADOS'],
      modulo: 'M03',
    },
  },
  {
    id: 'manutencao',
    kind: 'step',
    area: 'producao',
    title: 'Manutenção BEM-',
    icon: '⚙️',
    x: col(0),
    y: 510,
    details: {
      descricao:
        'Plano de manutenção preventiva vinculado ao bem patrimonial (máquina). Paralelo ao fluxo de venda — não bloqueia o PED, mas protege capacidade.',
      entradas: ['Cadastro BEM-', 'Plano preventivo'],
      saidas: ['Ordens de manutenção', 'Disponibilidade de máquina'],
      documentos: ['BEM-', 'MANUTENCAO_PREVENTIVA_MAQUINAS', 'PATRIMONIO_CONTROLE'],
      prefixo: 'BEM-',
      modulo: 'M03 / M10',
    },
  },

  // ── Estoque ──────────────────────────────────────────────────
  {
    id: 'estoque',
    kind: 'store',
    area: 'estoque',
    title: 'Estoque (MOV)',
    icon: '🏬',
    x: col(7),
    y: 705,
    details: {
      descricao:
        'Estoque central com custo médio: MP, EMB, REV, PA e sobras. Alimentado por compras/XML e retornos; alimenta OP (saída) e separação de revenda. Inventário (INV-) e ajuste (AJU-) com aprovação segregada.',
      entradas: ['Entrada XML / OC', 'Sobra da produção', 'Ajustes aprovados'],
      saidas: ['Saída para OP', 'Separação REVENDA', 'PA disponível'],
      documentos: ['MOV-', 'CONTROLE_ESTOQUE_PROFISSIONAL', 'AJUSTE_ESTOQUE_INVENTARIO'],
      prefixo: 'MOV-',
      modulo: 'M04',
    },
  },
  {
    id: 'saidaMp',
    kind: 'step',
    area: 'estoque',
    title: 'Saída MP / insumos',
    icon: '📤',
    x: col(8) + 40,
    y: 710,
    details: {
      descricao:
        'Com a lista de insumos da OP, dá baixa (MOV saída) no saldo e leva materiais à produção. Fecha o ciclo com retorno de sobra.',
      entradas: ['Lista de insumos da OP', 'Saldo em estoque'],
      saidas: ['Baixa no saldo', 'Insumos na produção'],
      documentos: ['ESTOQUE_FLUXO_SAIDA_RETORNO_PA', 'MOV- saída'],
      modulo: 'M04',
    },
  },
  {
    id: 'retornoSobra',
    kind: 'step',
    area: 'estoque',
    title: 'Retorno sobra / PA',
    icon: '♻️',
    x: col(10) + 40,
    y: 710,
    details: {
      descricao:
        'Ao fim da OP: entrada de sobra aproveitável e entrada de PA no estoque, vinculados à OP. Saída prevista − consumo real = sobra devolvida.',
      entradas: ['Apontamento de sobra e PA'],
      saidas: ['Entrada MOV no estoque'],
      documentos: ['MOV- entrada', 'TRATAMENTO_SOBRA_BOBINA_RETALHO'],
      modulo: 'M04',
    },
  },
  {
    id: 'separacaoRev',
    kind: 'step',
    area: 'estoque',
    title: 'Separação REVENDA',
    icon: '📦',
    x: col(8) + 40,
    y: 775,
    details: {
      descricao:
        'Para item REVENDA: reserva/baixa de REV no estoque sem OP. Segue direto para faturamento e expedição.',
      entradas: ['PED- item REVENDA', 'Saldo REV'],
      saidas: ['Item separado → faturamento'],
      documentos: ['MOV- saída REV'],
      modulo: 'M04',
    },
  },
  {
    id: 'remessa',
    kind: 'step',
    area: 'estoque',
    title: 'Remessa industrial (REM)',
    icon: '🏭',
    x: col(5),
    y: 710,
    details: {
      descricao:
        'Industrialização externa / poder de terceiros: remessa de material, controle em poder de 3ºs e retorno. Complementa a cadeia sem criar pedido paralelo.',
      entradas: ['Necessidade de processo externo', 'Saldo MP'],
      saidas: ['REM- aberta / retornada'],
      documentos: ['REM-', 'INDUSTRIALIZACAO_EXTERNA_REMESSA'],
      prefixo: 'REM-',
      modulo: 'M04',
    },
  },

  // ── Compras ──────────────────────────────────────────────────
  {
    id: 'monitorEstoque',
    kind: 'step',
    area: 'compras',
    title: 'Monitor / ponto de pedido',
    icon: '📊',
    x: col(0),
    y: 920,
    start: true,
    details: {
      descricao:
        'Acompanha saldos, mínimo e demanda das OPs. Quando atinge ponto de pedido (ou OP parada por falta), dispara cotação/urgência.',
      entradas: ['Saldos MOV', 'Carteira de OPs', 'Estoque mínimo'],
      saidas: ['Alerta → COT-/urgência'],
      documentos: ['Relatório de níveis', 'COMPRAS_COTACAO_URGENCIA'],
      modulo: 'M07',
    },
  },
  {
    id: 'cotacao',
    kind: 'step',
    area: 'compras',
    title: 'Cotação (COT)',
    icon: '📝',
    x: col(1),
    y: 920,
    details: {
      descricao:
        'Cotação a fornecedores (bobinas, tintas, clichês…). Pode marcar urgência quando OP está parada. Escolha por preço/prazo/qualidade.',
      entradas: ['Alerta de reposição', 'Cadastro de fornecedores'],
      saidas: ['COT- com proposta vencedora'],
      documentos: ['COT-', 'COMPRAS_COTACAO_URGENCIA'],
      prefixo: 'COT-',
      modulo: 'M07',
    },
  },
  {
    id: 'oc',
    kind: 'step',
    area: 'compras',
    title: 'Ordem de Compra (OC)',
    icon: '🛒',
    x: col(2),
    y: 920,
    details: {
      descricao: 'Compra formalmente pedida ao fornecedor a partir da cotação aprovada.',
      entradas: ['COT- aprovada'],
      saidas: ['OC- enviada ao fornecedor'],
      documentos: ['OC-'],
      prefixo: 'OC-',
      modulo: 'M07',
    },
  },
  {
    id: 'entradaXml',
    kind: 'step',
    area: 'compras',
    title: 'Recebimento / XML NF',
    icon: '📥',
    x: col(3),
    y: 920,
    details: {
      descricao:
        'Recebimento físico com conferência vs OC e XML da NF de compra; inspeção e entrada no estoque com custo.',
      entradas: ['Mercadoria + XML NF fornecedor', 'OC-'],
      saidas: ['Entrada no estoque', 'Título a pagar (quando couber)'],
      documentos: ['NF entrada', 'Checklist de recebimento'],
      modulo: 'M07',
    },
  },

  // ── Fiscal + Financeiro ──────────────────────────────────────
  {
    id: 'adiantamento',
    kind: 'step',
    area: 'fiscal_fin',
    title: 'Adiantamento (sinal)',
    icon: '💰',
    x: col(4),
    y: 1120,
    details: {
      descricao:
        'Na 1ª compra (ou política de crédito), emite cobrança de sinal. BX do adiantamento libera o PED/produção. Dinheiro e NF são idempotentes (webhook/job/retry).',
      entradas: ['ORC aceito + política 1ª compra'],
      saidas: ['TIT/COB de sinal', 'BX libera PED'],
      documentos: ['TIT-/COB-/BX- de adiantamento'],
      modulo: 'M06',
    },
  },
  {
    id: 'faturamento',
    kind: 'step',
    area: 'fiscal_fin',
    title: 'Faturamento NF + TIT',
    icon: '🧾',
    x: col(11) + 20,
    y: 1120,
    details: {
      descricao:
        'Emissão da NF-e/NFS-e via Focus e, no mesmo ato, nascimento do título (TIT). Documento fiscal ≠ título financeiro — conceitos distintos que nascem juntos. Sem fechamento fiscal oficial no ERP.',
      entradas: ['PA/OS/REV prontos', 'PED-', 'Adiantamento baixado (se houver)'],
      saidas: ['NF autorizada (Focus)', 'TIT- a receber'],
      documentos: ['NF-e/NFS-e', 'TIT-', 'FATURAMENTO_GERACAO_COBRANCA', 'MAPA_FATURAMENTO_EXPLICADO'],
      prefixo: 'NF- / TIT-',
      modulo: 'M05 / M06',
    },
  },
  {
    id: 'cobranca',
    kind: 'step',
    area: 'fiscal_fin',
    title: 'Cobrança (COB)',
    icon: '🏦',
    x: col(12) + 20,
    y: 1120,
    details: {
      descricao:
        'Emissão bancária vinculada ao TIT via BankProvider (adapter multi-provider; Inter sandbox / Sicoob alvo). Valor integral ou saldo após sinal.',
      entradas: ['TIT- em aberto'],
      saidas: ['COB- emitida (boleto/Pix)'],
      documentos: ['COB-', 'INTEGRACAO_BANCARIA_MULTI_PROVIDER'],
      prefixo: 'COB-',
      modulo: 'M06 / M09',
    },
  },
  {
    id: 'baixa',
    kind: 'step',
    area: 'fiscal_fin',
    title: 'Baixa (BX)',
    icon: '🔒',
    x: col(13) + 20,
    y: 1120,
    details: {
      descricao:
        'Quitação do título via webhook, extrato ou CNAB — idempotente. Encerra o ciclo financeiro do pedido (ou do sinal).',
      entradas: ['Pagamento confirmado pelo banco'],
      saidas: ['TIT quitado', 'Caixa / crédito atualizado'],
      documentos: ['BX-', 'RECEBIMENTO_BAIXA_COBRANCA'],
      prefixo: 'BX-',
      modulo: 'M06',
    },
  },
  {
    id: 'fim',
    kind: 'terminal',
    area: 'fiscal_fin',
    title: 'Ciclo encerrado',
    icon: '🏁',
    x: col(14) + 20,
    y: 1130,
    details: {
      descricao:
        'Produto/serviço entregue e cobrança baixada. Histórico do cliente atualizado. Exceções posteriores (RMA/DEV) não apagam o fluxo — estornam com trilha.',
      entradas: ['Entrega confirmada', 'BX-'],
      saidas: ['Histórico + indicadores'],
      documentos: ['—'],
      modulo: 'M06',
    },
  },

  // ── Expedição ────────────────────────────────────────────────
  {
    id: 'entrega',
    kind: 'step',
    area: 'expedicao',
    title: 'Entrega (ENT)',
    icon: '🚚',
    x: col(12) + 20,
    y: 1340,
    details: {
      descricao:
        'Romaneio de entrega com NF. Frete receita×despesa e transportadora (API CT-e fase 2 no backlog). Status notificado via WhatsApp oficial.',
      entradas: ['NF emitida', 'PA separado'],
      saidas: ['ENT- em trânsito', 'MSG de status'],
      documentos: ['ENT-', 'ENTREGA_CONFIRMACAO_CLIENTE', 'FRETE_TRANSPORTADORAS'],
      prefixo: 'ENT-',
      modulo: 'Expedição',
    },
  },
  {
    id: 'confirmacao',
    kind: 'step',
    area: 'expedicao',
    title: 'Confirmação do cliente',
    icon: '✍️',
    x: col(13) + 20,
    y: 1340,
    details: {
      descricao:
        'Cliente confere e confirma recebimento (canhoto / comprovante). Assinatura eletrônica de canhoto é opcional pós go-live.',
      entradas: ['Mercadoria no cliente'],
      saidas: ['ENT- confirmada'],
      documentos: ['Canhoto / comprovante'],
      modulo: 'Expedição',
    },
  },

  // ── Pós-venda ────────────────────────────────────────────────
  {
    id: 'rma',
    kind: 'step',
    area: 'posvenda',
    title: 'RMA / reclamação',
    icon: '🆘',
    x: col(10),
    y: 1535,
    details: {
      descricao:
        'Pós-venda / garantia: abre RMA a partir do PED/NF, analisa CQ e decide reposição, crédito ou devolução. Complementa o fluxo feliz — não o apaga.',
      entradas: ['Reclamação do cliente', 'PED-/NF de origem'],
      saidas: ['RMA- com decisão CQ'],
      documentos: ['RMA-', 'POS_VENDA_RMA_GARANTIA'],
      prefixo: 'RMA-',
      modulo: 'M08',
    },
  },
  {
    id: 'gwRma',
    kind: 'gateway',
    area: 'posvenda',
    title: 'Decisão CQ?',
    icon: '❓',
    x: col(11) + 20,
    y: 1525,
    details: {
      descricao:
        'CQ decide: reposição (nova OP/separação), crédito financeiro, ou devolução ponta a ponta (DEV fiscal+estoque+financeiro).',
      entradas: ['Laudo CQ do RMA'],
      saidas: ['Reposição', 'Crédito', 'DEV-'],
      documentos: ['Laudo CQ'],
      modulo: 'M08',
    },
  },
  {
    id: 'devolucao',
    kind: 'step',
    area: 'posvenda',
    title: 'Devolução (DEV)',
    icon: '↩️',
    x: col(12) + 40,
    y: 1535,
    details: {
      descricao:
        'Estorno ponta a ponta: fiscal (NF devolução), estoque e financeiro, com trilha auditável. Documento não se apaga — estorna/compensa.',
      entradas: ['Decisão DEV do RMA'],
      saidas: ['DEV- fiscal+est+fin'],
      documentos: ['DEV-', 'DEVOLUCAO_VENDA_PONTA_A_PONTA'],
      prefixo: 'DEV-',
      modulo: 'M08',
    },
  },
  {
    id: 'amostra',
    kind: 'step',
    area: 'posvenda',
    title: 'Amostra / protótipo',
    icon: '🧪',
    x: col(8),
    y: 1535,
    details: {
      descricao:
        'Política de custo e NF de amostra/protótipo — não mistura com venda regular sem trilha.',
      entradas: ['Solicitação comercial / CQ'],
      saidas: ['Amostra emitida com política de custo'],
      documentos: ['AMOSTRAS_PROTOTIPOS'],
      modulo: 'M08',
    },
  },

  // ── Integrações + Gerencial ──────────────────────────────────
  {
    id: 'focus',
    kind: 'module',
    area: 'integracoes',
    title: 'Focus NFe (adapter)',
    icon: '📡',
    x: col(11) + 20,
    y: 1745,
    details: {
      descricao:
        'Hub de NF-e/NFS-e. ERP envia payload, recebe autorização/rejeição, XML/PDF. Operação fiscal no ERP; fechamento SPED fica com o contador.',
      entradas: ['Payload de faturamento'],
      saidas: ['NF autorizada / rejeitada', 'XML/PDF armazenados'],
      documentos: ['Adapter Focus', 'CONTABILIDADE_FISCAL_SEM_FECHAMENTO'],
      modulo: 'M09 / M05',
    },
  },
  {
    id: 'banco',
    kind: 'module',
    area: 'integracoes',
    title: 'BankProvider',
    icon: '🏛️',
    x: col(12) + 20,
    y: 1745,
    details: {
      descricao:
        'Adapter multi-provider de cobrança e conciliação. Inter em sandbox; Sicoob como alvo de produção. Webhooks/CNAB idempotentes.',
      entradas: ['TIT- / instruções de cobrança'],
      saidas: ['COB emitida', 'Eventos de BX'],
      documentos: ['INTEGRACAO_BANCARIA_MULTI_PROVIDER'],
      modulo: 'M09',
    },
  },
  {
    id: 'whatsapp',
    kind: 'module',
    area: 'integracoes',
    title: 'WhatsApp Meta API',
    icon: '💬',
    x: col(13) + 20,
    y: 1745,
    details: {
      descricao:
        'Canal oficial via Meta Cloud API (nunca conta pessoal / Baileys). Registra MSG- de status (ORC, PED, ENT, cobrança).',
      entradas: ['Eventos de negócio', 'Templates aprovados'],
      saidas: ['MSG- enviadas / recebidas'],
      documentos: ['MSG-', 'INTEGRACAO_WHATSAPP_BUSINESS_API'],
      prefixo: 'MSG-',
      modulo: 'M09',
    },
  },
  {
    id: 'gerencial',
    kind: 'module',
    area: 'integracoes',
    title: 'DRE / Export contador',
    icon: '📈',
    x: col(1),
    y: 1745,
    details: {
      descricao:
        'Naturezas gerenciais 1–5 (DRE/caixa interno). Grupo 9.xx / LAI proibidos. Export mensal ao contador + import de folha; RH só pagamento gerencial.',
      entradas: ['Movimentos com NAT-', 'Folha importada'],
      saidas: ['DRE interno', 'Pacote export contador'],
      documentos: ['NAT-', 'NATUREZAS_GERENCIAIS', 'EXPORT_CONTADOR_FOLHA_LAYOUT', 'RH_PAGAMENTO_GERENCIAL'],
      prefixo: 'NAT-',
      modulo: 'M10',
    },
  },
];

export const FLOWS: Flow[] = [
  // Cadastros → comercial
  { id: 'f-emp-par', source: 'empresa', target: 'parceiro', sourceHandle: 'rs', targetHandle: 'lt' },
  { id: 'f-par-prod', source: 'parceiro', target: 'produto', sourceHandle: 'rs', targetHandle: 'lt' },
  { id: 'f-prod-usr', source: 'produto', target: 'usuarios', sourceHandle: 'rs', targetHandle: 'lt' },
  { id: 'f-par-orc', source: 'parceiro', target: 'orcamento', sourceHandle: 'bs', targetHandle: 'tt', label: 'cliente / prospect', dashed: true },
  { id: 'f-prod-orc', source: 'produto', target: 'orcamento', sourceHandle: 'bs', targetHandle: 'tt', label: 'SKU / spec', dashed: true },

  // Comercial
  { id: 'f-orc-aceite', source: 'orcamento', target: 'gwAceite', sourceHandle: 'rs', targetHandle: 'lt' },
  { id: 'f-aceite-arq', source: 'gwAceite', target: 'orcArquivado', sourceHandle: 'bs', targetHandle: 'lt', label: 'Não' },
  { id: 'f-aceite-cred', source: 'gwAceite', target: 'credito', sourceHandle: 'rs', targetHandle: 'lt', label: 'Sim' },
  { id: 'f-cred-gw', source: 'credito', target: 'gwCredito', sourceHandle: 'rs', targetHandle: 'lt' },
  { id: 'f-cred-adiant', source: 'gwCredito', target: 'adiantamento', sourceHandle: 'bs', targetHandle: 'tt', label: 'Exige sinal' },
  { id: 'f-adiant-baixa', source: 'adiantamento', target: 'baixa', sourceHandle: 'rs', targetHandle: 'lt', label: 'BX do sinal', dashed: true },
  { id: 'f-baixa-credito', source: 'baixa', target: 'gwCredito', sourceHandle: 'ts', targetHandle: 'bt', label: 'libera', dashed: true },
  { id: 'f-cred-ped', source: 'gwCredito', target: 'pedido', sourceHandle: 'rs', targetHandle: 'lt', label: 'OK' },
  { id: 'f-ped-tipo', source: 'pedido', target: 'gwTipoItem', sourceHandle: 'rs', targetHandle: 'lt' },
  { id: 'f-ped-com', source: 'pedido', target: 'comissao', sourceHandle: 'ts', targetHandle: 'lt', label: 'após faturar', dashed: true },

  // Tipo item → execução
  { id: 'f-tipo-op', source: 'gwTipoItem', target: 'op', sourceHandle: 'rs', targetHandle: 'lt', label: 'PRODUCAO' },
  { id: 'f-tipo-os', source: 'gwTipoItem', target: 'os', sourceHandle: 'bs', targetHandle: 'lt', label: 'SERVICO' },
  { id: 'f-tipo-rev', source: 'gwTipoItem', target: 'separacaoRev', sourceHandle: 'bs', targetHandle: 'tt', label: 'REVENDA' },

  // Produção ↔ estoque
  { id: 'f-op-saida', source: 'op', target: 'saidaMp', sourceHandle: 'bs', targetHandle: 'tt', label: 'lista de insumos' },
  { id: 'f-saida-est', source: 'saidaMp', target: 'estoque', sourceHandle: 'lsd', targetHandle: 'rtd', label: 'baixa MOV', dashed: true },
  { id: 'f-est-saida', source: 'estoque', target: 'saidaMp', sourceHandle: 'rsu', targetHandle: 'ltu', label: 'insumos', dashed: true },
  { id: 'f-saida-apt', source: 'saidaMp', target: 'apontamento', sourceHandle: 'rs', targetHandle: 'lt' },
  { id: 'f-op-apt', source: 'op', target: 'apontamento', sourceHandle: 'rs', targetHandle: 'lt' },
  { id: 'f-apt-conc', source: 'apontamento', target: 'conclusao', sourceHandle: 'rs', targetHandle: 'lt' },
  { id: 'f-apt-sobra', source: 'apontamento', target: 'retornoSobra', sourceHandle: 'bs', targetHandle: 'tt', label: 'sobra + PA' },
  { id: 'f-sobra-est', source: 'retornoSobra', target: 'estoque', sourceHandle: 'ls', targetHandle: 'rt', label: 'entrada MOV', dashed: true },
  { id: 'f-os-conc', source: 'os', target: 'conclusao', sourceHandle: 'rs', targetHandle: 'bt', label: 'serviço ok' },
  { id: 'f-rev-fat', source: 'separacaoRev', target: 'faturamento', sourceHandle: 'rs', targetHandle: 'lt', label: 'revenda pronta' },
  { id: 'f-rev-est', source: 'separacaoRev', target: 'estoque', sourceHandle: 'ls', targetHandle: 'rt', label: 'baixa REV', dashed: true },
  { id: 'f-rem-est', source: 'remessa', target: 'estoque', sourceHandle: 'rs', targetHandle: 'lt', label: 'poder 3ºs', dashed: true },
  { id: 'f-manut-op', source: 'manutencao', target: 'op', sourceHandle: 'rs', targetHandle: 'lt', label: 'capacidade', dashed: true },

  // Compras → estoque
  { id: 'f-mon-cot', source: 'monitorEstoque', target: 'cotacao', sourceHandle: 'rs', targetHandle: 'lt', label: 'ponto de pedido' },
  { id: 'f-cot-oc', source: 'cotacao', target: 'oc', sourceHandle: 'rs', targetHandle: 'lt' },
  { id: 'f-oc-xml', source: 'oc', target: 'entradaXml', sourceHandle: 'rs', targetHandle: 'lt' },
  { id: 'f-xml-est', source: 'entradaXml', target: 'estoque', sourceHandle: 'rs', targetHandle: 'lt', label: 'entrada' },
  { id: 'f-est-mon', source: 'estoque', target: 'monitorEstoque', sourceHandle: 'bs', targetHandle: 'tt', label: 'acompanha saldos', dashed: true },

  // Conclusão → faturamento → cobrança → baixa / entrega
  { id: 'f-conc-fat', source: 'conclusao', target: 'faturamento', sourceHandle: 'rs', targetHandle: 'lt' },
  { id: 'f-fat-cob', source: 'faturamento', target: 'cobranca', sourceHandle: 'rs', targetHandle: 'lt' },
  { id: 'f-cob-bx', source: 'cobranca', target: 'baixa', sourceHandle: 'rs', targetHandle: 'lt' },
  { id: 'f-bx-fim', source: 'baixa', target: 'fim', sourceHandle: 'rs', targetHandle: 'lt' },
  { id: 'f-fat-ent', source: 'faturamento', target: 'entrega', sourceHandle: 'bs', targetHandle: 'tt', label: 'NF acompanha' },
  { id: 'f-ent-conf', source: 'entrega', target: 'confirmacao', sourceHandle: 'rs', targetHandle: 'lt' },
  { id: 'f-conf-fim', source: 'confirmacao', target: 'fim', sourceHandle: 'rs', targetHandle: 'bt', label: 'entrega ok' },

  // Pós-venda
  { id: 'f-fat-rma', source: 'faturamento', target: 'rma', sourceHandle: 'bs', targetHandle: 'tt', label: 'reclamação', dashed: true },
  { id: 'f-rma-gw', source: 'rma', target: 'gwRma', sourceHandle: 'rs', targetHandle: 'lt' },
  { id: 'f-rma-dev', source: 'gwRma', target: 'devolucao', sourceHandle: 'rs', targetHandle: 'lt', label: 'DEV' },
  { id: 'f-rma-rep', source: 'gwRma', target: 'op', sourceHandle: 'ts', targetHandle: 'bt', label: 'reposição', dashed: true },
  { id: 'f-dev-est', source: 'devolucao', target: 'estoque', sourceHandle: 'ts', targetHandle: 'bs', label: 'retorno est.', dashed: true },
  { id: 'f-amostra-orc', source: 'amostra', target: 'orcamento', sourceHandle: 'ts', targetHandle: 'bs', label: 'pode virar ORC', dashed: true },

  // Integrações
  { id: 'f-fat-focus', source: 'faturamento', target: 'focus', sourceHandle: 'bs', targetHandle: 'tt', dashed: true },
  { id: 'f-cob-banco', source: 'cobranca', target: 'banco', sourceHandle: 'bs', targetHandle: 'tt', dashed: true },
  { id: 'f-ent-wa', source: 'entrega', target: 'whatsapp', sourceHandle: 'bs', targetHandle: 'tt', label: 'status MSG', dashed: true },
  { id: 'f-orc-wa', source: 'orcamento', target: 'whatsapp', sourceHandle: 'bs', targetHandle: 'lt', label: 'link / status', dashed: true },
  { id: 'f-bx-banco', source: 'banco', target: 'baixa', sourceHandle: 'ts', targetHandle: 'bs', label: 'webhook/CNAB', dashed: true },
  { id: 'f-bx-ger', source: 'baixa', target: 'gerencial', sourceHandle: 'bs', targetHandle: 'rt', label: 'NAT / DRE', dashed: true },
];

export const SCENARIOS: Scenario[] = [
  {
    id: 'feliz-producao',
    label: 'Fluxo feliz — produção',
    description:
      'Cliente recorrente com crédito OK: ORC→aceite→PED→OP→estoque→PA→NF+TIT→COB→ENT→BX.',
    sequence: [
      'orcamento',
      'gwAceite',
      'credito',
      'gwCredito',
      'pedido',
      'gwTipoItem',
      'op',
      'saidaMp',
      'estoque',
      'saidaMp',
      'apontamento',
      'retornoSobra',
      'estoque',
      'apontamento',
      'conclusao',
      'faturamento',
      'focus',
      'faturamento',
      'cobranca',
      'banco',
      'entrega',
      'whatsapp',
      'confirmacao',
      'faturamento',
      'cobranca',
      'baixa',
      'fim',
    ],
    excludeEdges: ['f-aceite-arq', 'f-cred-adiant', 'f-tipo-os', 'f-tipo-rev'],
  },
  {
    id: 'primeira-compra',
    label: '1ª compra (com sinal)',
    description:
      'Exige adiantamento: após aceite, gera cobrança de sinal; BX libera PED e produção.',
    sequence: [
      'orcamento',
      'gwAceite',
      'credito',
      'gwCredito',
      'adiantamento',
      'baixa',
      'gwCredito',
      'pedido',
      'gwTipoItem',
      'op',
      'saidaMp',
      'apontamento',
      'conclusao',
      'faturamento',
      'cobranca',
      'entrega',
      'confirmacao',
      'baixa',
      'fim',
    ],
    excludeEdges: ['f-cred-ped', 'f-tipo-os', 'f-tipo-rev'],
  },
  {
    id: 'servico',
    label: 'Item serviço (OS)',
    description: 'PED com item SERVICO: gera OS, conclusão e faturamento sem fluxo típico de MP.',
    sequence: [
      'orcamento',
      'gwAceite',
      'credito',
      'gwCredito',
      'pedido',
      'gwTipoItem',
      'os',
      'conclusao',
      'faturamento',
      'cobranca',
      'entrega',
      'confirmacao',
      'baixa',
      'fim',
    ],
    excludeEdges: ['f-tipo-op', 'f-tipo-rev', 'f-cred-adiant'],
  },
  {
    id: 'revenda',
    label: 'Item revenda',
    description: 'PED com item REVENDA: separação no estoque e faturamento direto.',
    sequence: [
      'orcamento',
      'gwAceite',
      'credito',
      'gwCredito',
      'pedido',
      'gwTipoItem',
      'separacaoRev',
      'estoque',
      'separacaoRev',
      'faturamento',
      'cobranca',
      'entrega',
      'confirmacao',
      'baixa',
      'fim',
    ],
    excludeEdges: ['f-tipo-op', 'f-tipo-os', 'f-cred-adiant'],
  },
  {
    id: 'compras',
    label: 'Reposição / compras',
    description: 'Monitor → COT → OC → recebimento XML → entrada no estoque.',
    sequence: ['monitorEstoque', 'cotacao', 'oc', 'entradaXml', 'estoque'],
  },
  {
    id: 'posvenda',
    label: 'Pós-venda RMA → DEV',
    description: 'Após faturamento, reclamação abre RMA; CQ decide devolução ponta a ponta.',
    sequence: [
      'faturamento',
      'rma',
      'gwRma',
      'devolucao',
      'estoque',
    ],
  },
];

export const AREA_BY_ID = Object.fromEntries(AREAS.map((a) => [a.id, a])) as Record<AreaId, Area>;
export const STEP_BY_ID = Object.fromEntries(STEPS.map((s) => [s.id, s])) as Record<string, Step>;
