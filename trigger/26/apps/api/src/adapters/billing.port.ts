export type ChargeEmitInput = {
  invoiceId: string;
  amount: number;
  dueDate: string;
  customerName: string;
  idempotencyKey: string;
};

export type ChargeEmitResult = {
  ourNumber: string;
  pixTxid: string;
  pdfObjectKey: string;
  providerPayload: Record<string, unknown>;
};

export interface BillingPort {
  emitCharge(input: ChargeEmitInput): Promise<ChargeEmitResult>;
}

export type NfeAuthorizeInput = {
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  customerDocument?: string;
};

export type NfeAuthorizeResult = {
  accessKey: string;
  protocol: string;
  hubProvider: string;
  hubRef: string;
  xmlObjectKey: string;
  pdfObjectKey: string;
  payload: Record<string, unknown>;
};

export interface NfePort {
  authorize(input: NfeAuthorizeInput): Promise<NfeAuthorizeResult>;
}

export type CnpjLookupResult = {
  cnpj: string;
  legalName: string;
  tradeName?: string;
  email?: string;
  phone?: string;
  address?: {
    zipCode?: string;
    street?: string;
    number?: string;
    complement?: string;
    district?: string;
    city?: string;
    state?: string;
  };
  source: "brasilapi" | "mock";
};

export type CepLookupResult = {
  zipCode: string;
  street?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
  ibgeCode?: string;
  source: "viacep" | "mock";
};
