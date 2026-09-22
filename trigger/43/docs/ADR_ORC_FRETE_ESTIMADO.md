# ADR-039-ORC-005 — Entrega da proposta + frete opcional (informativo)

**Status:** Aceito  
**Data:** 2026-08-13 · emenda 2026-08-15 (Calculada|Manual) · **emenda 2026-09-02** (trinca de modos; frete a definir; fim do catálogo de faixas) · **emenda 2026-09-22** (CIF/FOB + transportadora em Terceiros)  
**Contexto 39/43:** comercial  
**Norma:** `../32` — `GERACAO_ORCAMENTO.txt` §1.1–1.3 / §1.5–1.6 · `FRETE_TRANSPORTADORAS.txt` · `ADR_ORC_PARAMETROS_ESCALARES.md` · `ADR_ENTREGA_EXPEDICAO.md` · `ADR_NFE_TRANSPORTE_SAIDA.md`

---

## Decisão

Frete no ORC é **informação comercial opcional no fechamento**, nunca no motor R1–R20 e nunca diluído no papel/hora-máquina.

```
Wizard · Entrega desta proposta
  Retirar | Própria | Terceiros
       ↓
  própria → valor R$ opcional (vazio = a definir)
  terceiros → valor R$ opcional + CIF|FOB + PAR transportadora (opc.)
       ↓
  snapshot (input + result.frete) → PED → FAT (confirma / edita)
```

| Papel | Onde | Significado |
|-------|------|-------------|
| **Modo** | `input_snapshot.modo_entrega` | `RETIRAR` \| `ENTREGA_PROPRIA` \| `ENTREGA_TERCEIROS` (default Retirar) |
| **Valor** | `input.valor_frete_manual` + `result.frete` | Opcional em própria/terceiros. Vazio → **a definir** (após produção). |
| **Modalidade** | `input.mod_frete` + `result.frete.mod_frete` | Só `ENTREGA_TERCEIROS`: `0` CIF (default) \| `1` FOB — vocabulário Focus. Limpo fora de terceiros. |
| **Transportadora** | `input.transportador_id` + `transportador_nome` | Só terceiros; PAR `papel_transportadora`. Opcional no ORC (“a definir”); **obrigatória** ao faturar NF-e. |
| **Histórico** | snapshots | Fotografia — não recalcula ORC gravado (§1.3) |

**Não** há catálogo de faixas kg × R$/km. **Não** usar `parametros_empresa` para frete. **Não** somar frete em `valor_total_proposta`, adiantamento, PED, FAT ou comissão.

---

## Regras

1. **Default Retirar** — não inflar a proposta. Retirar → frete R$ 0; sem CIF/FOB nem transportadora.
2. **Entrega própria** — valor digitável; frota; sem CIF/FOB nem PAR transportadora (FAT grava `mod_frete=0` sem `transporta`).
3. **Entrega terceiros** — valor digitável + CIF|FOB (default CIF) + transportadora opcional no ORC. UI espelha OC/FAT (`ParceiroCombobox` papel transportadora).
4. **Frete nunca é somável** — não compõe total da proposta, unitário, sinal, PED nem FAT.
5. **Eco comercial** — uma frase em detalhe/resultado/ficha/proposta/PED: modo · CIF/FOB · transportadora · frete.
6. **Expedição (ENT-)** — `RETIRAR` → balcão; `ENTREGA_PROPRIA` → frota; `ENTREGA_TERCEIROS` → transportadora. Eixo logístico distinto (`ADR_ENTREGA_EXPEDICAO`).
7. **NF-e** — FAT herda `mod_frete` + `transportador_id` do snapshot; ainda editável no faturar (`ADR_NFE_TRANSPORTE_SAIDA`).
8. **Legado** — ORCs sem `mod_frete`/`transportador_*` seguem válidos; Terceiros no FAT cai em CIF até escolher FOB; transportadora continua obrigatória só na emissão.
9. **Fora** — natureza 1.01.05, TIT de frete, CUB, CT-e, gordura no motor.

---

## Consequências

**Agora:** orçamentista escolhe um dos três modos; em terceiros, CIF/FOB + transportadora (opc.); frete opcional (a definir); PED/fichas/proposta ecoam; FAT pré-preenche.

**Futuro (outro ADR):** TIT/natureza 1.01.05, CUB, romaneio com valor de frete operacional.

## Proibido (regressão)

1. Alterar fórmulas R1–R20 por causa do frete.
2. Default entrega (própria ou terceiros).
3. Recalcular rota no ORC (ORS/OSRM).
4. Reintroduzir faixas kg × R$/km no catálogo sem ADR novo.
5. Diluir frete no papel, hora-máquina, unitário, total da proposta, PED ou FAT.
6. Misturar tarifa ORC em `parametros_empresa`.
7. Exigir valor de frete **ou** transportadora para calcular/salvar ORC.
8. Expor CIF/FOB ou transportadora em Retirar / Própria.

---

## Rastreio

- `OrcamentoFreteEstimadoService` · wizard / resultado / ficha / proposta pública · `FiscalSaidaTransporte`
- Snapshot: `modo_entrega`, `valor_frete_manual`, `mod_frete`, `transportador_id`, `transportador_nome`
- Testes: `OrcamentoFreteEstimadoTest` · `EmissaoFiscalSaidaTest`
