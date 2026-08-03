/** Porta Focus NFe — implementação stub (homolog) ou HTTP (sandbox futuro). */

export type FocusEmitirInput = {
  empresaCnpj: string;
  tipo: 'NFE' | 'NFSE';
  naturezaOperacao: string;
  destinatario: {
    cnpjCpf: string | null;
    razaoSocial: string;
    uf: string | null;
  };
  itens: Array<{
    codigo: string | null;
    descricao: string;
    ncm: string | null;
    cfop: string | null;
    csosn: string | null;
    quantidade: string;
    unidade: string;
    valorUnitario: string;
    valorTotal: string;
  }>;
  valorTotal: string;
  idempotencyKey: string;
  referenciaInterna: string;
};

export type FocusEmitirResult =
  | {
      ok: true;
      adapter: string;
      focusRef: string;
      serie: string;
      numero: string;
      chave44: string;
      protocolo: string;
      xmlRef: string;
      pdfRef: string;
      raw: Record<string, unknown>;
    }
  | {
      ok: false;
      adapter: string;
      codigo: string;
      mensagem: string;
      raw?: Record<string, unknown>;
    };

export interface FocusNfePort {
  readonly name: string;
  emitir(input: FocusEmitirInput): Promise<FocusEmitirResult>;
  cancelar(input: FocusCancelarInput): Promise<FocusCancelarResult>;
  emitirCce(input: FocusCceInput): Promise<FocusCceResult>;
}

export type FocusCancelarInput = {
  focusRef: string;
  chave44: string;
  justificativa: string;
  idempotencyKey: string;
};

export type FocusCancelarResult =
  | {
      ok: true;
      adapter: string;
      protocoloCancelamento: string;
      raw: Record<string, unknown>;
    }
  | {
      ok: false;
      adapter: string;
      codigo: string;
      mensagem: string;
      raw?: Record<string, unknown>;
    };

export type FocusCceInput = {
  focusRef: string;
  chave44: string;
  correcao: string;
  sequencia: number;
  idempotencyKey: string;
};

export type FocusCceResult =
  | {
      ok: true;
      adapter: string;
      sequencia: number;
      protocolo: string;
      xmlRef: string;
      raw: Record<string, unknown>;
    }
  | {
      ok: false;
      adapter: string;
      codigo: string;
      mensagem: string;
      raw?: Record<string, unknown>;
    };
