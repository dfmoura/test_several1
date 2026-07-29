/**
 * Ciclo operacional canônico — única fonte de verdade para menu, home e jornada.
 * Ordem fixa: o negócio opera nesta sequência.
 */

export type CicloEtapaId =
  | "compras"
  | "estoque"
  | "orcamento"
  | "pedido"
  | "notas"
  | "boletos"
  | "entrega"
  | "recebimento";

export type CicloEtapa = {
  id: CicloEtapaId;
  ordem: number;
  label: string;
  titulo: string;
  descricao: string;
  href: string;
  /** Hub externo associado (quando houver). */
  hub?: "focus" | "inter" | null;
};

export const CICLO_ETAPAS: readonly CicloEtapa[] = [
  {
    id: "compras",
    ordem: 1,
    label: "Comprar",
    titulo: "1. Compras",
    descricao: "Necessidades MRP → pedido de compra → NFe de entrada (Focus).",
    href: "/compras?tab=necessidades",
    hub: "focus",
  },
  {
    id: "estoque",
    ordem: 2,
    label: "Estoque",
    titulo: "2. Estoque",
    descricao: "Lançar entrada e acompanhar físico / reservado / disponível.",
    href: "/estoque",
    hub: null,
  },
  {
    id: "orcamento",
    ordem: 3,
    label: "Orçamento",
    titulo: "3. Orçamento",
    descricao: "Wizard técnico → proposta comercial → aprovação.",
    href: "/orcamentos",
    hub: null,
  },
  {
    id: "pedido",
    ordem: 4,
    label: "Pedido / OS",
    titulo: "4. Pedido e OS",
    descricao: "Confirmar pedido, reservar materiais e produzir.",
    href: "/pedidos",
    hub: null,
  },
  {
    id: "notas",
    ordem: 5,
    label: "Notas fiscais",
    titulo: "5. Notas fiscais",
    descricao: "NF-e de revenda + NFS-e de serviço (Focus NFe).",
    href: "/pedidos",
    hub: "focus",
  },
  {
    id: "boletos",
    ordem: 6,
    label: "Boletos",
    titulo: "6. Boletos",
    descricao: "Bolepix Inter (cobrança) vinculado ao título a receber.",
    href: "/financeiro?tab=receber",
    hub: "inter",
  },
  {
    id: "entrega",
    ordem: 7,
    label: "Entrega",
    titulo: "7. Entrega",
    descricao: "Registrar expedição (volumes, rolos, caixas).",
    href: "/pedidos",
    hub: null,
  },
  {
    id: "recebimento",
    ordem: 8,
    label: "Recebimento",
    titulo: "8. Recebimento",
    descricao: "Baixar título via webhook Inter, extrato ou conciliação.",
    href: "/financeiro?tab=banco",
    hub: "inter",
  },
] as const;

export const HUB_REFS = {
  focus: "https://doc.focusnfe.com.br/reference/introducao",
  interCobranca: "https://developers.inter.co/references/cobranca-bolepix",
  interExtrato: "https://developers.inter.co/references/banking#tag/Extrato",
  interSaldo: "https://developers.inter.co/references/banking#tag/Saldo",
} as const;
