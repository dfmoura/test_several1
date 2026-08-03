/**
 * CFOP por destino (intra/interestadual) a partir da natureza de operação.
 */

import { FISCAL_DEFAULTS } from "./defaults";

export function resolverCfop(opts: {
  ufEmitente?: string | null;
  ufDestinatario?: string | null;
  cfopDentroUf?: string | null;
  cfopForaUf?: string | null;
  cfopItem?: string | null;
}): { cfop: string; localDestino: 1 | 2 } {
  const ufE = (opts.ufEmitente || "").toUpperCase().trim();
  const ufD = (opts.ufDestinatario || "").toUpperCase().trim();
  const sameUf = !ufE || !ufD || ufE === ufD;
  const localDestino: 1 | 2 = sameUf ? 1 : 2;

  if (opts.cfopItem) {
    return { cfop: opts.cfopItem, localDestino };
  }
  if (sameUf) {
    return {
      cfop: opts.cfopDentroUf || FISCAL_DEFAULTS.cfopProducao,
      localDestino,
    };
  }
  return {
    cfop: opts.cfopForaUf || FISCAL_DEFAULTS.cfopProducaoInterestadual,
    localDestino,
  };
}
