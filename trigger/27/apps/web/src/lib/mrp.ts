/** Explosão de materiais (MRP/ATP) a partir do snapshot do orçamento. */

import type { OrcamentoInputSnapshot, OrcamentoResultSnapshot } from "@/lib/orcamento-comercial";
import { round4 } from "@/lib/ciclo-params";
import { prisma } from "@/lib/db";

export type NecessidadeExplodida = {
  origemChave: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  produtoId: string | null;
  catalogRef?: string;
};

export async function explodirNecessidades(opts: {
  empresaId: string;
  input: OrcamentoInputSnapshot;
  resultFaixa: NonNullable<OrcamentoResultSnapshot["faixas"]>[number] | null;
}): Promise<NecessidadeExplodida[]> {
  const { empresaId, input, resultFaixa } = opts;
  const prod = resultFaixa?.production;
  const lines: NecessidadeExplodida[] = [];

  const metragemM2 = prod?.metragemM2 ?? 0;
  const qtdeRolos = prod?.qtdeRolos ?? 0;
  const qtdeCaixas = prod?.qtdeCaixas ?? 0;

  if (input.papel && metragemM2 > 0) {
    const produto = await prisma.produto.findFirst({
      where: {
        empresaId,
        ativo: true,
        OR: [
          { papel: { nome: input.papel } },
          { descricao: { equals: input.papel, mode: "insensitive" } },
          { codigo: { equals: `PAPEL-${slug(input.papel)}`, mode: "insensitive" } },
        ],
      },
    });
    lines.push({
      origemChave: "papel",
      descricao: `Papel ${input.papel}`,
      unidade: "M2",
      quantidade: round4(metragemM2),
      produtoId: produto?.id ?? null,
      catalogRef: input.papel,
    });
  }

  if (input.acabamento && metragemM2 > 0) {
    const acab = await prisma.acabamento.findFirst({
      where: { nome: input.acabamento, ativo: true },
    });
    const perda = acab ? Number(acab.perdaM2) : 0;
    const qtd = round4(metragemM2 + perda);
    const produto = await prisma.produto.findFirst({
      where: {
        empresaId,
        ativo: true,
        OR: [
          { acabamento: { nome: input.acabamento } },
          { descricao: { equals: input.acabamento, mode: "insensitive" } },
        ],
      },
    });
    lines.push({
      origemChave: "acabamento",
      descricao: `Acabamento ${input.acabamento}`,
      unidade: "M2",
      quantidade: qtd,
      produtoId: produto?.id ?? null,
      catalogRef: input.acabamento,
    });
  }

  if (input.tubete && qtdeRolos > 0) {
    const produto = await prisma.produto.findFirst({
      where: {
        empresaId,
        ativo: true,
        OR: [
          { tubete: { tamanho: input.tubete } },
          { descricao: { contains: input.tubete, mode: "insensitive" } },
        ],
      },
    });
    lines.push({
      origemChave: "tubete",
      descricao: `Tubete ${input.tubete}`,
      unidade: "UN",
      quantidade: round4(qtdeRolos),
      produtoId: produto?.id ?? null,
      catalogRef: input.tubete,
    });
  }

  if (qtdeCaixas > 0) {
    const produto = await prisma.produto.findFirst({
      where: {
        empresaId,
        ativo: true,
        OR: [
          { codigo: { equals: "CAIXA", mode: "insensitive" } },
          { descricao: { contains: "caixa", mode: "insensitive" } },
        ],
      },
    });
    lines.push({
      origemChave: "caixa",
      descricao: "Caixa para embalagem",
      unidade: "UN",
      quantidade: round4(qtdeCaixas),
      produtoId: produto?.id ?? null,
      catalogRef: "CAIXA",
    });
  }

  return lines;
}

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase()
    .slice(0, 40);
}
