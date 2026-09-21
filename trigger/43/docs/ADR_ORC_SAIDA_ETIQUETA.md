# ADR-039-ORC-005 — Sentido de saída da etiqueta na bobina

**Status:** Aceito  
**Data:** 2026-09-14  
**Contexto 39/43:** comercial · ORC → PED/OP · proposta  
**Norma relacionada:** `ADR_ORC_MODELOS_COMPOSICAO.md` · `FacaPosicao` (posição da faca ≠ saída da bobina)

---

## Contexto

Na industrialização de etiqueta sob medida, o cliente e a fábrica precisam acordar **como a etiqueta sai na bobina entregue**. As referências operacionais são quatro figuras fechadas:

| Figura | Código |
|--------|--------|
| Saída à esquerda | `ESQUERDA` |
| Saída à direita | `DIREITA` |
| Saída deitada | `DEITADA` |
| Saída de pé | `PE` |

Isso **não** é `faca_posicao` (montagem no cilindro: CIMA/BAIXO/ESQUERDA/DIREITA) nem trilho de `ADR_OPERACOES_SAIDA` (PRODUCAO/SERVICO/…).

---

## Decisão

| Campo | Onde | Papel |
|-------|------|--------|
| `saida_etiqueta` | `input_snapshot` | Enum fechado · **fora** de R1–R20 |
| — | — | Sem tabela SQL nova |

```
ORC (picker visual) → input_snapshot.saida_etiqueta
  → ficha / guia / proposta / link público
  → PED.snapshot.input (cópia integral)
  → OP / ficha de produção
```

### Regras

1. Códigos canônicos: `ESQUERDA` | `DIREITA` | `DEITADA` | `PE`.
2. Nullable — ORCs legados e rascunhos sem escolha permanecem válidos.
3. Só faz sentido em industrialização; UI oculta em serviço.
4. Não altera preço, faca, artes, frete, comissão nem SKU.
5. Uma escolha mútua exclusiva (não dois eixos lado × orientação).
6. Helper `App\Support\SaidaEtiqueta` + espelho TS `saidaEtiqueta.ts`.

### UX

- Seletor visual compacto com as quatro figuras no formulário do ORC (seção Faca, sob largura do papel).
- Eco com o mesmo badge (miniatura + rótulo) em: detalhe ORC, ficha operacional ORC, proposta/link/ficha-cliente, guia de produção, confirmação PED, fichas PED/OP.
- Lista de orçamentos **não** inclui coluna (ruído).

### Superfícies de eco

| Superfície | Forma |
|------------|--------|
| Form ORC | `SaidaEtiquetaPicker` |
| Detalhe / proposta / confirmação PED | `SaidaEtiquetaBadge` dense/thumb no tile ou dl |
| Ficha ORC | célula da tabela com badge dense (sem bloco titulado) |
| Fichas PED/OP | KV na espec. + `FichaSaidaEtiquetaSection` |
| Guia (resultado ORC) | texto na linha Rebobinação (sem bloco dedicado) |

---

## Consequências

**Agora:** especificação auditável na cadeia ORC→PED→OP sem mexer no motor.

**Futuro:** se a operação exigir combinação (ex.: deitada + esquerda), novo ADR — não expandir o enum ad hoc.

## Proibido

1. Fundir com `faca_posicao` ou guardar só em `observacao`.
2. Alterar R1–R20 / totais por causa da saída.
3. Explodir SKU/PA por tipo de saída.
4. Confundir com `ADR_OPERACOES_SAIDA` ou stage/EMP.
5. Aceitar string livre fora do enum.

---

## Rastreio

- `App\Support\SaidaEtiqueta` · `OrcamentoValidationRules` · `OrcamentoService::persistableInput` · `OrcamentoAprovacaoService::dtoComercial`
- UI: `saidaEtiqueta.ts` · `SaidaEtiquetaPicker` · `SaidaEtiquetaBadge` · `orcamentoForm` · `OrcamentoFormPage` · `OrcamentoDetailPage` · `OrcamentoFichaSheet` · `OrcamentoPropostaView` · `OrcamentoResultado` · `orcamentoGuiaProducao` · `PedidoConfirmacaoSheet` · `ProducaoFichaBlocks` (`FichaSaidaEtiquetaSection`) · `PedidoFichaSheet` · `OrdemProducaoFichaSheet`
- Assets: `apps/web/public/orcamento/saida-etiqueta/*.svg`
- Testes: `OrcamentoTest` (persistência sem alterar preço)
