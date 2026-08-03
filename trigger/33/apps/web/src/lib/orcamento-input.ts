import { z } from "zod";
import type { CoresValue, QuoteInput } from "@orcamento/pricing-engine";

export const coresSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal("4V"),
  z.literal(5),
  z.literal(6),
  z.literal(7),
  z.literal(8),
]);

export const faixaSchema = z.object({
  quantidade: z.number().positive(),
  tipoParada: z.string().min(1),
  comissaoPct: z.number().min(0).max(100).optional(),
});

export const overridesSchema = z
  .object({
    papelM2: z.number().positive().nullable().optional(),
    tintaAcimaM2: z.number().min(0).nullable().optional(),
  })
  .optional()
  .nullable();

/** Campos do motor + metadados comerciais persistidos no snapshot */
export const orcamentoBodySchema = z.object({
  clienteNome: z.string().min(1),
  clienteParceiroId: z.string().optional().nullable(),
  /** Quando true, cria/usa prospect mínimo se não houver clienteParceiroId */
  isProspect: z.boolean().optional(),
  prospectDocumento: z.string().optional().nullable(),
  prospectTelefone: z.string().optional().nullable(),
  prospectEmail: z.string().optional().nullable(),
  vendedorNome: z.string().min(1),
  vendedorParceiroId: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  larguraPapel: z.number().positive(),
  puxada: z.number().positive(),
  cores: coresSchema,
  papel: z.string().min(1),
  acabamento: z.string().min(1),
  qtdeModelos: z.number().int().positive(),
  qtdeColunas: z.number().int().positive(),
  etiqPorRolo: z.number().int().positive(),
  tubete: z.string().min(1),
  z: z.number().nullable(),
  medida: z.string().optional(),
  formatoFaca: z.string().optional(),
  repeticao: z.number().optional().nullable(),
  maquinaRoda: z.string().optional(),
  maquinaGrupo: z.string().min(1),
  impostoPct: z.number().min(0).max(100),
  matriz: z.boolean(),
  matrizJaCobrada: z.boolean().optional(),
  colunaRebobinacao: z.number().positive(),
  rpm: z.number().positive(),
  comissaoPct: z.number().min(0).max(100),
  overrides: overridesSchema,
  prazoEntrega: z.string().optional(),
  validadeProposta: z.string().optional(),
  validadeDias: z.number().int().positive().max(365).optional(),
  toleranciaQtdPct: z.number().min(0).max(100).optional(),
  faixas: z.array(faixaSchema).min(1).max(20),
});

export type OrcamentoBody = z.infer<typeof orcamentoBodySchema>;

/** Schema só do motor (POST /api/calcular) */
export const calcularBodySchema = orcamentoBodySchema.pick({
  larguraPapel: true,
  puxada: true,
  cores: true,
  papel: true,
  acabamento: true,
  qtdeModelos: true,
  qtdeColunas: true,
  etiqPorRolo: true,
  tubete: true,
  z: true,
  maquinaGrupo: true,
  impostoPct: true,
  matriz: true,
  matrizJaCobrada: true,
  colunaRebobinacao: true,
  rpm: true,
  comissaoPct: true,
  overrides: true,
  faixas: true,
});

export function toQuoteInput(body: z.infer<typeof calcularBodySchema>): QuoteInput {
  return {
    larguraPapel: body.larguraPapel,
    puxada: body.puxada,
    cores: body.cores as CoresValue,
    papel: body.papel,
    acabamento: body.acabamento,
    qtdeModelos: body.qtdeModelos,
    qtdeColunas: body.qtdeColunas,
    etiqPorRolo: body.etiqPorRolo,
    tubete: body.tubete,
    z: body.z,
    maquinaGrupo: body.maquinaGrupo,
    impostoPct: body.impostoPct,
    matriz: body.matriz,
    matrizJaCobrada: body.matrizJaCobrada ?? false,
    colunaRebobinacao: body.colunaRebobinacao,
    rpm: body.rpm,
    comissaoPct: body.comissaoPct,
    overrides: body.overrides
      ? {
          papelM2: body.overrides.papelM2 ?? null,
          tintaAcimaM2: body.overrides.tintaAcimaM2 ?? null,
        }
      : null,
    faixas: body.faixas,
  };
}

/** Extrai N dias de textos como "7 dias" / "7" */
export function parseValidadeDias(text: string | undefined | null, fallback = 7): number {
  if (!text) return fallback;
  const m = String(text).match(/(\d+)/);
  return m ? Math.max(1, Number(m[1])) : fallback;
}

export function isOrcamentoVencido(opts: {
  baseDate: Date;
  validadeDias?: number | null;
  validadeProposta?: string | null;
  agora?: Date;
}): boolean {
  const dias = opts.validadeDias ?? parseValidadeDias(opts.validadeProposta, 7);
  const lim = new Date(opts.baseDate);
  lim.setDate(lim.getDate() + dias);
  lim.setHours(23, 59, 59, 999);
  return (opts.agora ?? new Date()) > lim;
}
