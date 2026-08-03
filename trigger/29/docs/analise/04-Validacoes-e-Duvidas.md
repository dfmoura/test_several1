# Validações e dúvidas

## Já respondidas pelo negócio (travadas)

| ID | Pergunta | Resposta | Onde aplicar |
|----|----------|----------|--------------|
| D1 | +1 h é setup fixo? | **Sim** | R3 |
| D2 | 5ª faixa diferente de propósito? | Orçamento tem **1..N** qtdes | Generalizar R1–R19; ignorar anomalia E17/G17 |
| D3 | Troca produto só com troca bobina? | **Planilha NÃO restringe** — hora/valor sempre calculados (E13×taxa). Indicação oral D3 divergia do Excel; motor segue a planilha. | R5 |
| D4 | Qual tabela oficial? | **Dinâmica** + readequação | Catálogo versionado + snapshot |
| D5 | Tubete 1" 1/2? | **Não existe** → usar 1" | Cadastro + validação |
| D6 | Caixa sempre × 7? | **Sim** (hardcoded K21:K25) | Parâmetro default 7 |
| D7 | Estoque no MVP? | **Depois** | Fora do escopo inicial |
| D8 | Matriz em todas as faixas? | **Sim, em todas as faixas do orçamento** (igual Excel I28:I32). Entre pedidos: só cobra no **1º pedido** da mesma matriz (chave D16). Na proposta (CONSOLIDADO) o valor aparece **1×** aparte. | R19 + histórico de matrizes cobradas |
| D9 | Prazo / validade / ±20% | **Editáveis** (defaults 12 dias úteis / 7 dias / ±20%) | Proposta consolidada |
| D10 | Vendedor obrigatório? | **Irrelevante por enquanto** | Campo opcional / fora do MVP |
| D11 | Cores `4V`? | **Sim, manter** | Catálogo de cores distinto de `4` |
| D12 | Descartar F10 “máquina roda serviço”? | **Não** — manter no sistema | Campo do orçamento (não entra no preço) |

## Dúvidas remanescentes (não inventar)

| ID | Tema | Evidência | Classificação | Pergunta ao negócio |
|----|------|-----------|---------------|---------------------|
| D13 | Macro VBA ATUALIZAR | Strings VBA sem código legível completo | `[Baixa]` | O que a macro faz no dia a dia? |
| D14 | Mapeamento estoque ↔ papel | Nomes não 1:1 | `[Confirmada]` | Fase 2: quem define o de-para? |
| D15 | Preço caixa estoque ≠ 7 | Estoque tem 2,33–6,40; orçamento cobra 7 | `[Confirmada]` | 7 muda algum dia por tipo de caixa? |
| D16 | Identidade da “mesma matriz” | **Decidido:** `cliente + medida_faca + Z + cores + largura_cm + colunas` | `[Validação usuário]` | Recomendação adotada — alinha com inputs da fórmula R20 |

## Anomalias Excel (não portar como regra)

1. **E17 / G17** — 5ª faixa usa fórmulas diferentes (troca produto ligada a F17; metragem × col_reb). Negócio pediu 1..N uniforme → usar padrão das linhas 13–16.
2. **VERNIZ** — aba órfã; não alimentar preço.
3. **`_xleta.*` named ranges** — stubs quebrados (#NAME?); irrelevantes.
4. **HORA MÁQUINA agrupada** — Excel junta BETA/160/250/ETIRAMA num bloco; o sistema mantém as 6 máquinas separadas (mesmas taxas do grupo).
5. **ORÇAMENTO 260728 (revisão)** — cabeçalhos J/K (“PERDA ACERTO PRODUTO” / “PERDA ACABAMENTO”) e algumas fórmulas de valor (ex.: G21 copiando troca de bobina; I21 com `SUM` incompleto) estão desalinhados após edição na planilha. O motor segue as regras oficiais R7/R7b/R10b/R13 já validadas (não replica bugs de cópia).
6. **`MAPA_DE_FACAS`** — pivot/seleção do job; catálogo completo vem de **`MAPA DE FACAS 20260715 ATUAL`**.

## Checklist

- [x] Inventário e comparação dos orçamentos
- [x] Mapa de abas e fluxo
- [x] Regras R1–R20
- [x] Padronização de máquinas + mapa ATUAL
- [x] TINTA / ACABAMENTOS / CAIXAS sincronizados
- [x] Decisões D1–D12 + D16
