import { randomBytes } from "node:crypto";
import type { BillingPort, ChargeEmitInput, ChargeEmitResult } from "./billing.port.js";

export class FakeBillingAdapter implements BillingPort {
  async emitCharge(input: ChargeEmitInput): Promise<ChargeEmitResult> {
    const suffix = randomBytes(4).toString("hex");
    return {
      ourNumber: `FAKE${Date.now()}${suffix}`.slice(0, 20),
      pixTxid: `PIX${randomBytes(16).toString("hex").toUpperCase()}`.slice(0, 32),
      pdfObjectKey: `charges/fake/${input.invoiceId}/${input.idempotencyKey}.pdf`,
      providerPayload: {
        provider: "fake",
        idempotencyKey: input.idempotencyKey,
        amount: input.amount,
        dueDate: input.dueDate,
        customerName: input.customerName,
      },
    };
  }
}
