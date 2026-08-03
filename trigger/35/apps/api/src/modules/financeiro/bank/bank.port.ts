export type BankEmitirCobrancaInput = {
  empresaCnpj: string;
  tituloCodigo: string;
  valor: string;
  vencimentoEm: string;
  pagador: { nome: string; cnpjCpf: string | null };
  idempotencyKey: string;
};

export type BankEmitirCobrancaResult =
  | {
      ok: true;
      adapter: string;
      nossoNumero: string;
      linhaDigitavel: string;
      pdfRef: string;
      raw: Record<string, unknown>;
    }
  | {
      ok: false;
      adapter: string;
      codigo: string;
      mensagem: string;
    };

export interface BankProviderPort {
  readonly name: string;
  emitirCobranca(input: BankEmitirCobrancaInput): Promise<BankEmitirCobrancaResult>;
}
