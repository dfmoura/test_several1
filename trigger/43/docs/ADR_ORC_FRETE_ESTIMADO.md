# ADR-039-ORC-005 — Entrega da proposta + frete opcional (informativo)

**Status:** Aceito  
**Data:** 2026-08-13 · emenda 2026-08-15 (Calculada|Manual) · **emenda 2026-09-02** (trinca de modos; frete a definir; fim do catálogo de faixas)  
**Contexto 39/43:** comercial  
**Norma:** `../32` — `GERACAO_ORCAMENTO.txt` §1.1–1.3 / §1.5–1.6 · `FRETE_TRANSPORTADORAS.txt` · `ADR_ORC_PARAMETROS_ESCALARES.md` · `ADR_ENTREGA_EXPEDICAO.md`

---

## Decisão

Frete no ORC é **informação comercial opcional no fechamento**, nunca no motor R1–R20 e nunca diluído no papel/hora-máquina.

```
Wizard · Entrega desta proposta
  Retirar no local | Entrega própria | Entrega terceiros
       ↓
  própria / terceiros → valor R$ opcional (vazio = a definir)
       ↓
  snapshot (input.modo_entrega + valor_frete_manual + result.frete)
```

| Papel | Onde | Significado |
|-------|------|-------------|
| **Modo** | `input_snapshot.modo_entrega` | `RETIRAR` \| `ENTREGA_PROPRIA` \| `ENTREGA_TERCEIROS` (default Retirar) |
| **Valor** | `input.valor_frete_manual` + `result.frete` | Opcional em própria/terceiros. Vazio → **a definir** (após produção). |
| **Histórico** | snapshots | Fotografia — não recalcula ORC gravado (§1.3) |

**Não** há catálogo de faixas kg × R$/km. **Não** usar `parametros_empresa` para frete. **Não** somar frete em `valor_total_proposta`, adiantamento, PED, FAT ou comissão.

---

## Regras

1. **Default Retirar** — não inflar a proposta. Retirar → frete R$ 0.
2. **Entrega própria / terceiros** — valor digitável a qualquer momento do fechamento; se omitido, UI e proposta mostram **a definir**. R$ 0 informado = sem cobrança.
3. **Frete nunca é somável** — não compõe total da proposta, unitário, sinal, PED nem FAT. Informação para o comercial e para a proposta ao cliente.
4. **Destino / km** — contexto opcional no snapshot (PAR); não gera R$. Sem ORS no calcular.
5. **Expedição (ENT-)** — `RETIRAR` → balcão; `ENTREGA_PROPRIA` (e legado `ENTREGAR`) → frota; `ENTREGA_TERCEIROS` → transportadora. Eixo logístico distinto (`ADR_ENTREGA_EXPEDICAO`).
6. **Legado** — ORCs com `ENTREGAR` + Calculada/Manual: ao reeditar, normalizam para `ENTREGA_PROPRIA`; fotografia antiga de `valor_total_proposta` permanece.
7. **Fora** — NF modalidade/CIF, natureza 1.01.05, TIT de frete, CUB, CT-e, gordura no motor.

---

## Consequências

**Agora:** orçamentista escolhe um dos três modos; em entrega, frete opcional (a definir); catálogo ORC sem aba Frete; tabela `orc_catalogo_faixas_frete` removida.

**Futuro (outro ADR):** TIT/natureza 1.01.05, modalidade Focus, CUB, romaneio com valor de frete operacional.

## Proibido (regressão)

1. Alterar fórmulas R1–R20 por causa do frete.
2. Default entrega (própria ou terceiros).
3. Recalcular rota no ORC (ORS/OSRM).
4. Reintroduzir faixas kg × R$/km no catálogo sem ADR novo.
5. Diluir frete no papel, hora-máquina, unitário, total da proposta, PED ou FAT.
6. Misturar tarifa ORC em `parametros_empresa`.
7. Exigir valor de frete para calcular/salvar ORC.

---

## Rastreio

- `OrcamentoFreteEstimadoService` · wizard / resultado / ficha / proposta pública
- Snapshot: `modo_entrega`, `valor_frete_manual` (opcional)
- Testes: `OrcamentoFreteEstimadoTest`
