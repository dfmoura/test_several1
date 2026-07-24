import { env } from "../lib/env.js";
import { FakeBillingAdapter } from "./fake-billing.adapter.js";
import { FakeNfeAdapter } from "./fake-nfe.adapter.js";
import type { BillingPort, NfePort } from "./billing.port.js";

let billingInstance: BillingPort | null = null;
let nfeInstance: NfePort | null = null;

export function getBillingAdapter(): BillingPort {
  if (!billingInstance) {
    switch (env.billingProvider) {
      case "fake":
      default:
        billingInstance = new FakeBillingAdapter();
    }
  }
  return billingInstance;
}

export function getNfeAdapter(): NfePort {
  if (!nfeInstance) {
    switch (env.nfeProvider) {
      case "fake":
      default:
        nfeInstance = new FakeNfeAdapter();
    }
  }
  return nfeInstance;
}

export { lookupCnpj } from "./cnpj.adapter.js";
export { lookupCep } from "./cep.adapter.js";
