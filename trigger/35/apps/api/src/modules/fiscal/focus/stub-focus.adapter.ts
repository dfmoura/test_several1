import type {
  FocusCancelarInput,
  FocusCancelarResult,
  FocusCceInput,
  FocusCceResult,
  FocusEmitirInput,
  FocusEmitirResult,
  FocusNfePort,
} from './focus.port.js';

/** Stub homologável — simula autorização Focus sem HTTP. ERP não inventa número SEFAZ real. */
export class StubFocusNfeAdapter implements FocusNfePort {
  readonly name = 'stub';

  async emitir(input: FocusEmitirInput): Promise<FocusEmitirResult> {
    const now = Date.now();
    const numero = String((now % 900000) + 100000);
    const serie = '1';
    // Chave fictícia 44 dígitos (somente homolog/dev — não é SEFAZ)
    const base = `${input.empresaCnpj.slice(0, 14)}${serie.padStart(3, '0')}${numero.padStart(9, '0')}${now}`
      .replace(/\D/g, '')
      .padEnd(43, '0')
      .slice(0, 43);
    const chave44 = `${base}1`;

    return {
      ok: true,
      adapter: this.name,
      focusRef: `stub-${input.idempotencyKey.slice(0, 24)}`,
      serie,
      numero,
      chave44,
      protocolo: `STUB${now}`,
      xmlRef: `stub://xml/${chave44}.xml`,
      pdfRef: `stub://pdf/${chave44}.pdf`,
      raw: {
        modo: 'stub',
        referenciaInterna: input.referenciaInterna,
        tipo: input.tipo,
        valorTotal: input.valorTotal,
      },
    };
  }

  async cancelar(input: FocusCancelarInput): Promise<FocusCancelarResult> {
    const now = Date.now();
    return {
      ok: true,
      adapter: this.name,
      protocoloCancelamento: `STUB-CANC-${now}`,
      raw: {
        modo: 'stub',
        focusRef: input.focusRef,
        chave44: input.chave44,
        justificativa: input.justificativa,
      },
    };
  }

  async emitirCce(input: FocusCceInput): Promise<FocusCceResult> {
    const now = Date.now();
    return {
      ok: true,
      adapter: this.name,
      sequencia: input.sequencia,
      protocolo: `STUB-CCE-${now}`,
      xmlRef: `stub://cce/${input.chave44}-${input.sequencia}.xml`,
      raw: {
        modo: 'stub',
        correcao: input.correcao,
        sequencia: input.sequencia,
      },
    };
  }
}
