# ADR-039-ORC-004 — Guia de produção no ORC (pós-cálculo)

**Status:** Aceito  
**Data:** 2026-08-12  
**Contexto 39:** comercial · ORC → (futuro) PED/OP  
**Norma:** `../32` — `GERACAO_ORCAMENTO.txt` §1.5 / §9.2 / §10 · `PRODUCAO_OPERACIONAL_GERENCIAL.txt` §2.2 / §2.6 · `ORDEM_SERVICO.txt` · `GERACAO_PEDIDO.txt`

---

## Contexto

Depois do cálculo, o ORC já tem proposta comercial (cliente) e breakdown interno (custos). Falta uma visão operacional de **tudo que será utilizado para produzir** — papel, perdas, tinta, acabamento, tubete, caixa, máquina, faca, tempos — sem misturar preço nem atrapalhar as abas existentes.

No estudo 32, a necessidade de materiais da OP nasce dos **componentes do orçamento (snapshot)** convertidos em SKU; produção **não** vê margem/preço de venda.

---

## Decisão

Terceira aba **somente interna** em `OrcamentoResultado`:

| Aba | Público | Conteúdo |
|-----|---------|----------|
| Proposta comercial | Comercial / cliente | Preços por faixa + composição de artes |
| Breakdown interno | Orçamentista | R$ por componente (motor R1–R20) |
| Guia de produção | Produção / PCP / orçamentista | Consumos físicos e recursos (sem R$) |

```
input_snapshot + result_snapshot.faixas[i]
        → guia (derivação pura no front)
        → sem recalcular motor · sem nova tabela SQL
```

### Regras

1. **Derivação pura** do snapshot já calculado (form no rascunho; `input_snapshot` no detalhe). Zero mudança no motor.
2. **Sem valores monetários** na guia (alinhado a perfil PRODUCAO no estudo 32).
3. **Por faixa** de quantidade (mesmo seletor do breakdown) — consumos mudam com Q.
4. Grupos canônicos do §10: ferramental · material · insumo · embalagem · máquina/processo.
5. Composição de artes (`modelos_composicao`) aparece com qtde inteira alocada — mesma regra PED/OP.
6. Proposta pública / link cliente **não** expõe a guia.

### UX

- Tab pill existente; default continua **Proposta comercial**.
- Tabela legível (item · especificação · qtde/unidade · nota).
- Hint curto: estimativa do orçamento; baixa real fica na OP futura.

---

## Consequências

**Agora:** orçamentista e produção enxergam a lista de uso sem abrir o Excel; motor e preços intactos.

**Futuro (PED/OP):** mesma lista vira empenho/BOM com SKU (`PRODUCAO` §2.2); guia do ORC permanece snapshot de origem.

## Proibido

1. Alterar fórmulas R1–R20 ou preço por causa da guia.
2. Mostrar comissão/imposto/margem na guia.
3. Expor a guia no link público / CONSOLIDADO.
4. Inventar SKU/estoque na fase 1 sem ADR de OP.
5. Segunda tela/app de PCP paralelo.

---

## Rastreio

- `apps/web/src/lib/orcamentoGuiaProducao.ts`
- `OrcamentoResultado` (aba) · `OrcamentoFormPage` · `OrcamentoDetailPage`
- BL-043
