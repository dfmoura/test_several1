/**
 * Famílias PA-ETQ — estudo 32.
 */

import assert from "node:assert/strict";
import {
  montarDescricaoComercialNf,
  PA_ETQ_BOPP,
  PA_ETQ_PAPEL,
  resolverFamiliaPaEtq,
} from "./familia-pa";

assert.equal(resolverFamiliaPaEtq("BOPP FOSCO COLACRIL").sku, PA_ETQ_BOPP.sku);
assert.equal(resolverFamiliaPaEtq("BOPP BRILHO").ncm, "39191090");
assert.equal(resolverFamiliaPaEtq("COUCHÊ ADESIVO").sku, PA_ETQ_PAPEL.sku);
assert.equal(resolverFamiliaPaEtq("TERMICA").ncm, "48114190");
assert.equal(resolverFamiliaPaEtq(null).sku, PA_ETQ_BOPP.sku);

const desc = montarDescricaoComercialNf({
  familia: PA_ETQ_BOPP,
  papel: "BOPP FOSCO",
  medida: "95x35 mm",
  cores: 4,
  acabamento: "verniz",
  etiqPorRolo: 1000,
  pedidoCodigo: "PED-2026-00087",
});
assert.ok(desc.includes("ETIQUETAS BOPP"));
assert.ok(desc.includes("95X35 MM") || desc.includes("95x35"));
assert.ok(desc.includes("PED-2026-00087"));

console.log("familia-pa.test.ts OK");
