import type {
  BankEmitirCobrancaInput,
  BankEmitirCobrancaResult,
  BankProviderPort,
} from './bank.port.js';

/** Stub bancário homologável — linha digitável e PDF fictícios. */
export class StubBankProvider implements BankProviderPort {
  readonly name = 'stub';

  async emitirCobranca(input: BankEmitirCobrancaInput): Promise<BankEmitirCobrancaResult> {
    const nn = `${Date.now()}`.slice(-10);
    const valorDigits = input.valor.replace(/\D/g, '').padStart(10, '0');
    const linha = `23793.${nn.slice(0, 5)} ${nn.slice(5)}00000.000000 00000.000000 ${valorDigits}`;
    return {
      ok: true,
      adapter: this.name,
      nossoNumero: nn,
      linhaDigitavel: linha.slice(0, 54),
      pdfRef: `stub://boleto/${input.tituloCodigo}-${nn}.pdf`,
      raw: {
        modo: 'stub',
        tituloCodigo: input.tituloCodigo,
        idempotencyKey: input.idempotencyKey,
      },
    };
  }
}
