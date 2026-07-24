import { randomBytes } from "node:crypto";
import type { NfeAuthorizeInput, NfeAuthorizeResult, NfePort } from "./billing.port.js";

function fakeAccessKey(): string {
  let key = "";
  while (key.length < 44) {
    key += Math.floor(Math.random() * 10).toString();
  }
  return key.slice(0, 44);
}

export class FakeNfeAdapter implements NfePort {
  async authorize(input: NfeAuthorizeInput): Promise<NfeAuthorizeResult> {
    const ref = randomBytes(8).toString("hex");
    return {
      accessKey: fakeAccessKey(),
      protocol: `FAKE${Date.now()}`,
      hubProvider: "fake",
      hubRef: ref,
      xmlObjectKey: `nfe/fake/${input.invoiceId}/${ref}.xml`,
      pdfObjectKey: `nfe/fake/${input.invoiceId}/${ref}.pdf`,
      payload: {
        invoiceNumber: input.invoiceNumber,
        totalAmount: input.totalAmount,
        customerDocument: input.customerDocument,
      },
    };
  }
}
