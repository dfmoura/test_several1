import type {
  BankEmitirCobrancaInput,
  BankEmitirCobrancaResult,
  BankProviderPort,
} from './bank.port.js';

/**
 * Esqueleto HTTP — provider real (Inter/Sicoob) fica para CNAB/sandbox posterior.
 * Sem BANK_BASE_URL+TOKEN o factory não usa esta classe.
 */
export class HttpBankProvider implements BankProviderPort {
  readonly name = 'http';

  constructor(
    private readonly cfg: { baseUrl: string; token: string },
  ) {}

  async emitirCobranca(
    input: BankEmitirCobrancaInput,
  ): Promise<BankEmitirCobrancaResult> {
    const base = this.cfg.baseUrl.replace(/\/+$/, '');
    const url = `${base}/cobrancas`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.cfg.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Idempotency-Key': input.idempotencyKey,
        },
        body: JSON.stringify({
          empresaCnpj: input.empresaCnpj,
          tituloCodigo: input.tituloCodigo,
          valor: input.valor,
          vencimentoEm: input.vencimentoEm,
          pagador: input.pagador,
        }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'falha de rede';
      return {
        ok: false,
        adapter: this.name,
        codigo: 'BANK_REDE',
        mensagem: `Falha ao contatar BankProvider: ${msg}`,
      };
    }

    let raw: Record<string, unknown> = {};
    try {
      raw = (await response.json()) as Record<string, unknown>;
    } catch {
      raw = {};
    }

    if (!response.ok) {
      return {
        ok: false,
        adapter: this.name,
        codigo: String(raw.codigo ?? `BANK_HTTP_${response.status}`),
        mensagem: String(raw.mensagem ?? `Bank HTTP ${response.status}`),
      };
    }

    const nossoNumero = String(raw.nossoNumero ?? raw.nosso_numero ?? '');
    const linhaDigitavel = String(raw.linhaDigitavel ?? raw.linha_digitavel ?? '');
    if (!nossoNumero || !linhaDigitavel) {
      return {
        ok: false,
        adapter: this.name,
        codigo: 'BANK_RESPOSTA_INCOMPLETA',
        mensagem: 'Resposta bancária sem nossoNumero/linhaDigitavel',
      };
    }

    return {
      ok: true,
      adapter: this.name,
      nossoNumero,
      linhaDigitavel,
      pdfRef: String(raw.pdfRef ?? raw.pdf_url ?? `bank://boleto/${input.tituloCodigo}`),
      raw,
    };
  }
}
