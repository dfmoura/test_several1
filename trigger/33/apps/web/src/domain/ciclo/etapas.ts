/**
 * Fluxo operacional canônico (estudo 32 / INDICE_FLUXO_OPERACIONAL).
 *
 * Cadeia feliz comercial: ORC → PED → OP/OS → NF+TIT → ENT → BX
 * Compras/estoque são suporte (MRP), não o início da home comercial.
 */

export type CicloEtapaId =
  | "orcamento"
  | "pedido"
  | "producao"
  | "notas"
  | "entrega"
  | "recebimento"
  | "compras"
  | "estoque";

export type CicloEtapa = {
  id: CicloEtapaId;
  ordem: number;
  label: string;
  titulo: string;
  descricao: string;
  href: string;
  hub?: "focus" | "inter" | null;
  /** Etapas do fluxo feliz comercial (home). */
  comercial?: boolean;
};

/** Fluxo feliz comercial — destaques da home e jornada do pedido. */
export const CICLO_COMERCIAL: readonly CicloEtapa[] = [
  {
    id: "orcamento",
    ordem: 1,
    label: "Orçamento",
    titulo: "ORC — Orçamento",
    descricao: "Calcular → salvar → link de aprovação do cliente.",
    href: "/orcamentos",
    hub: null,
    comercial: true,
  },
  {
    id: "pedido",
    ordem: 2,
    label: "Pedido",
    titulo: "PED — Pedido",
    descricao: "Aceite do cliente → crédito/sinal → liberar.",
    href: "/pedidos",
    hub: null,
    comercial: true,
  },
  {
    id: "producao",
    ordem: 3,
    label: "Produção",
    titulo: "OP / OS — Produção",
    descricao: "Ordens de produção e serviço, estoque MP→PA.",
    href: "/producao",
    hub: null,
    comercial: true,
  },
  {
    id: "notas",
    ordem: 4,
    label: "Notas",
    titulo: "NF + TIT — Faturamento",
    descricao: "NF-e produção própria (PA-ETQ) + títulos a receber.",
    href: "/pedidos",
    hub: "focus",
    comercial: true,
  },
  {
    id: "entrega",
    ordem: 5,
    label: "Entrega",
    titulo: "ENT — Expedição",
    descricao: "Registrar volumes e confirmação do cliente.",
    href: "/pedidos",
    hub: null,
    comercial: true,
  },
  {
    id: "recebimento",
    ordem: 6,
    label: "Receber",
    titulo: "BX — Recebimento",
    descricao: "Baixa parcial/total; libera crédito e caixa.",
    href: "/financeiro?tab=receber",
    hub: "inter",
    comercial: true,
  },
] as const;

/** Suporte MRP / abastecimento (menu, não primário na home). */
export const CICLO_SUPORTE: readonly CicloEtapa[] = [
  {
    id: "compras",
    ordem: 1,
    label: "Compras",
    titulo: "Compras (suporte)",
    descricao: "Exceção: cotação/OC quando OP para por falta de material.",
    href: "/compras?tab=necessidades",
    hub: "focus",
  },
  {
    id: "estoque",
    ordem: 2,
    label: "Estoque",
    titulo: "Estoque (suporte)",
    descricao: "MP → sobra/retalho → PA. Alimenta a produção, não inicia o ciclo.",
    href: "/estoque",
    hub: null,
  },
] as const;

/** @deprecated Preferir CICLO_COMERCIAL + CICLO_SUPORTE. Mantido para imports legados. */
export const CICLO_ETAPAS: readonly CicloEtapa[] = [
  ...CICLO_COMERCIAL,
  ...CICLO_SUPORTE,
];

export const HUB_REFS = {
  focus: "https://doc.focusnfe.com.br/reference/introducao",
  interCobranca: "https://developers.inter.co/references/cobranca-bolepix",
  interExtrato: "https://developers.inter.co/references/banking#tag/Extrato",
  interSaldo: "https://developers.inter.co/references/banking#tag/Saldo",
} as const;
