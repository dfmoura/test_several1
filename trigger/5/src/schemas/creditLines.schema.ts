import { z } from "zod";

const cpfDigits = z
  .string()
  .min(11)
  .max(14)
  .refine(
    (s) => {
      const digits = s.replace(/\D/g, "");
      return digits.length === 11;
    },
    { message: "CPF deve conter 11 dígitos" },
  )
  .transform((s) => s.replace(/\D/g, ""));

export const creditLinesRequestSchema = z.object({
  cpf: cpfDigits,
  consentId: z.string().uuid({ message: "consentId deve ser um UUID válido" }),
});

export type CreditLinesRequest = z.infer<typeof creditLinesRequestSchema>;

export const creditOfferSchema = z.object({
  institution: z.string(),
  type: z.string(),
  interestRate: z.number(),
  maxAmount: z.number(),
  minAmount: z.number(),
  term: z.number(),
});

export const creditLinesResponseSchema = z.object({
  offers: z.array(creditOfferSchema),
});

export type CreditOffer = z.infer<typeof creditOfferSchema>;
