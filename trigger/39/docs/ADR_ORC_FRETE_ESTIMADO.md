# ADR-039-ORC-005 — Frete estimado no ORC (catálogo de faixas × fechamento)

**Status:** Aceito  
**Data:** 2026-08-13  
**Contexto 39:** comercial · BL-057 + BL-058  
**Norma:** `../32` — `GERACAO_ORCAMENTO.txt` §1.1–1.3 / §1.5–1.6 / §4.11 / §6 · `FRETE_TRANSPORTADORAS.txt` · `FLEXIBILIDADE_LIMITES_CUSTOMIZACAO_ORCAMENTO.txt` · `GORDURA_ORCAMENTO_COMPENSA_OU_NAO.txt` · `ADR_ORC_PARAMETROS_ESCALARES.md`

---

## Decisão

Frete no ORC é **estimado no fechamento**, nunca no motor R1–R20 e nunca diluído no papel/hora-máquina.

```
Catálogo ORC · aba Frete          PAR (BL-056)              Wizard
  faixas kg (R$/km, mínimo)   +   km EMP→destino     +   Retirar | Entregar
  peso_caixa_kg                   (gravado, sem ORS)        default = Retirar
                    ↓
         fechamento: máx(mínimo, R$/km × km)  ↑ centavos
                    ↓
         snapshot (input.modo_entrega + result.frete)
```

| Papel | Onde | Significado |
|-------|------|-------------|
| **Catálogo (vigente)** | `orc_catalogo_faixas_frete` + `peso_caixa_kg` | Tarifas para **novos** cálculos |
| **Km** | PAR fiscal ou entrega principal, `distancia_empresa_id` = EMP atual | Distância de carro já gravada (BL-056) |
| **Histórico do ORC** | `input_snapshot.modo_entrega` + `result_snapshot.frete` | Fotografia — catálogo novo **não** altera ORC gravado (§1.3) |

**Não** usar `parametros_empresa`. **Não** misturar faixas em `orc_catalogo_parametros` (escalar único). `peso_caixa_kg` sim é escalar nessa tabela, editado na **mesma aba Frete**.

---

## Regras

1. **Default Retirar** — não inflar a proposta. Retirar → R$ 0; km só contexto.
2. **Entregar** — peso est. = `qtde_caixas` × `peso_caixa_kg` escolhe a faixa vigente (`kg_ate` contínuo; último nulo = “acima”). Fórmula: `máximo(mínimo, preco_por_km × km)`, teto comercial **para cima em centavos** (§1.6). O múltiplo de R$ 10 continua só no serviço da etiqueta (motor).
3. **Destino** — entrega principal do PAR se houver; senão endereço fiscal. Sem nova chamada ORS no calcular.
4. **Peso (e portanto R$) pode diferir por faixa de quantidade.** Km é o mesmo. Frete **não** entra no unitário da etiqueta nem em `valor_total` do motor.
5. **Não inventar** — sem km da EMP, sem peso, sem faixa ativa, ou “acima”/faixa sem R$ → frete “—” (`valor_frete` nulo); Entregar não soma. ORC calcula igual hoje.
6. **CONSOLIDADO** — linha “Frete estimado” (valor, não R$/km). Interno pode mostrar faixa/tarifa. Cliente não vê composição do motor.
7. **Fora** — NF modalidade/CIF, natureza 1.01.05, TIT de frete, CUB, CT-e, transportadora, campo R$ livre no wizard, gordura.

---

## Consequências

**Agora:** comercial cadastra faixas (seed 20/50/100/200 kg + acima, R$ vazio, inativas); orçamentista escolhe Retirar/Entregar; snapshot auditável.

**Futuro (outro ADR):** TIT/natureza 1.01.05, modalidade Focus, CUB, romaneio ENT-.

## Proibido (regressão)

1. Alterar fórmulas R1–R20 por causa do frete.
2. Default Entregar.
3. Recalcular rota no ORC (ORS/OSRM).
4. Seed de preço inventado.
5. Diluir frete no papel, hora-máquina ou unitário.
6. Misturar tarifa ORC em `parametros_empresa`.

---

## Rastreio

- Model `OrcCatalogoFaixaFrete` · escalar `peso_caixa_kg` · `OrcamentoFreteEstimadoService`
- Admin `OrcamentoCatalogoAdminService` · UI aba Frete
- `OrcamentoService::enrichResult` (pós-motor) · wizard / resultado / ficha / proposta pública
- Testes: `OrcamentoCatalogoTest` (faixas) · `OrcamentoFreteEstimadoTest`
