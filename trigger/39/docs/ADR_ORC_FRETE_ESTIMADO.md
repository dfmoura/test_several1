# ADR-039-ORC-005 — Frete estimado no ORC (catálogo de faixas × fechamento)

**Status:** Aceito  
**Data:** 2026-08-13 · emenda 2026-08-15 (origem Calculada | Manual)  
**Contexto 39:** comercial · BL-057 + BL-058  
**Norma:** `../32` — `GERACAO_ORCAMENTO.txt` §1.1–1.3 / §1.5–1.6 / §4.11 / §6 · `FRETE_TRANSPORTADORAS.txt` · `FLEXIBILIDADE_LIMITES_CUSTOMIZACAO_ORCAMENTO.txt` · `GORDURA_ORCAMENTO_COMPENSA_OU_NAO.txt` · `ADR_ORC_PARAMETROS_ESCALARES.md`

---

## Decisão

Frete no ORC é **estimado no fechamento**, nunca no motor R1–R20 e nunca diluído no papel/hora-máquina.

```
Catálogo ORC · aba Frete          PAR (BL-056)              Wizard
  faixas kg (R$/km, mínimo)   +   km EMP→destino     +   Retirar | Entregar
  peso_caixa_kg                   (gravado, sem ORS)        default = Retirar
                                                         Entregar → Calculada | Manual
                    ↓                                         (padrão Calculada)
         fechamento
           Calculada: máx(mínimo, R$/km × km)  ↑ centavos
           Manual:    R$ informado (único, todas as qtd) ↑ centavos
                    ↓
         snapshot (input.modo_entrega + origem_frete + result.frete)
```

| Papel | Onde | Significado |
|-------|------|-------------|
| **Catálogo (vigente)** | `orc_catalogo_faixas_frete` + `peso_caixa_kg` | Tarifas para **novos** cálculos **Calculada** |
| **Km** | PAR fiscal ou entrega principal, `distancia_empresa_id` = EMP atual | Distância de carro já gravada (BL-056) — só Calculada |
| **Manual** | `input.origem_frete` + `valor_frete_manual` | Exceção formal do fechamento (análoga à faca nova cotada) — não inventa tarifa de catálogo |
| **Histórico do ORC** | `input_snapshot.modo_entrega` + `origem_frete` + `result_snapshot.frete` | Fotografia — catálogo novo **não** altera ORC gravado (§1.3) |

**Não** usar `parametros_empresa`. **Não** misturar faixas em `orc_catalogo_parametros` (escalar único). `peso_caixa_kg` sim é escalar nessa tabela, editado na **mesma aba Frete**.

---

## Regras

1. **Default Retirar** — não inflar a proposta. Retirar → R$ 0; km só contexto. Origem de frete não se aplica.
2. **Entregar · Calculada (padrão)** — peso est. = `qtde_caixas` × `peso_caixa_kg` escolhe a faixa vigente (`kg_ate` contínuo; último nulo = “acima”). Fórmula: `máximo(mínimo, preco_por_km × km)`, teto comercial **para cima em centavos** (§1.6). O múltiplo de R$ 10 continua só no serviço da etiqueta (motor).
3. **Entregar · Manual** — orçamentista informa **um** R$ da proposta (cotação de transportadora, cortesia, acordo). Mesmo valor em **todas** as faixas de quantidade. Não exige km, peso nem faixa. Teto para cima em centavos. R$ 0 informado = entrega sem cobrança (não infla). Ausente/vazio = 422. Analogia: `valor_faca_nova` — número cotado no fechamento, não no motor (§1.1).
4. **Destino** — entrega principal do PAR se houver; senão endereço fiscal. Sem nova chamada ORS no calcular. Km/destino continuam contexto no snapshot mesmo em Manual (não geram R$).
5. **Peso (e portanto R$ Calculada) pode diferir por faixa de quantidade.** Km é o mesmo. Manual não varia por faixa. Frete **não** entra no unitário da etiqueta nem em `valor_total` do motor (R1–R20 intacto).
6. **Não inventar (Calculada)** — sem km da EMP, sem peso, sem faixa ativa, ou “acima”/faixa sem R$ → frete “—” (`valor_frete` nulo); Entregar não soma. ORC calcula igual hoje. Manual **não** usa essa trava: o valor informado é a fotografia.
7. **Total da proposta** — quando o frete é levantado (`frete_somavel`), **compõe** `valor_total_proposta` no fechamento: motor (+ faca nova) + frete. Mesma regra para **cliente e prospect** (estudo 32 · ORCAMENTO_PROSPECT §4.1). Calculada sem km, “a combinar” — não infla.
8. **CONSOLIDADO** — Total já inclui o frete somável; linha de valor, não R$/km nem “calculada/manual”. Interno pode mostrar origem, faixa e tarifa. Cliente não vê composição do motor (§1.5).
9. **Fora** — NF modalidade/CIF, natureza 1.01.05, TIT de frete, CUB, CT-e, transportadora, gordura, R$ avulso no motor, Manual sem origem explícita.

---

## Consequências

**Agora:** comercial cadastra faixas (seed 20/50/100/200 kg + acima, R$ vazio, inativas); orçamentista escolhe Retirar/Entregar; em Entregar, Calculada (catálogo) ou Manual (R$ da proposta); snapshot auditável.

**Futuro (outro ADR):** TIT/natureza 1.01.05, modalidade Focus, CUB, romaneio ENT-.

## Proibido (regressão)

1. Alterar fórmulas R1–R20 por causa do frete.
2. Default Entregar.
3. Recalcular rota no ORC (ORS/OSRM).
4. Seed de preço inventado.
5. Diluir frete no papel, hora-máquina ou unitário.
6. Misturar tarifa ORC em `parametros_empresa`.
7. Campo R$ solto no wizard **sem** origem Manual explícita (isso viraria override do motor).
8. Vazamento de “Calculada/Manual” na proposta ao cliente.

---

## Rastreio

- Model `OrcCatalogoFaixaFrete` · escalar `peso_caixa_kg` · `OrcamentoFreteEstimadoService`
- Admin `OrcamentoCatalogoAdminService` · UI aba Frete
- `OrcamentoService::enrichResult` (pós-motor) · wizard / resultado / ficha / proposta pública
- Snapshot: `modo_entrega`, `origem_frete` (`CALCULADA`|`MANUAL`), `valor_frete_manual`
- Testes: `OrcamentoCatalogoTest` (faixas) · `OrcamentoFreteEstimadoTest`
