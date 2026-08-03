# Interface futura (substitui o Excel)

Organização pelo fluxo natural — **não** espelhar abas.

## Tela 1 — Cabeçalho do orçamento
- Data, cliente (vendedor fora do MVP)
- Seleção de faca (busca no catálogo → preenche medida, puxada, Z, REP)
- Largura papel, cores (0–8 e **4V**), papel, acabamento
- Modelos, colunas, etiq/rolo, tubete (`1"` | `3"`)
- Máquina **custo** G10 (lista HORA MÁQUINA: MODULAR / BATIDA / BETA…) + **máquina roda serviço** F10 (lista MÁQUINAS!A: BETA, 160, 250, ETIRAMA, BATIDA, MODULAR — operacional, **não** vem do mapa de facas)
- Imposto %, matriz SIM/NÃO, coluna rebobinação
- Tipo de troca de produto, RPM
- Indicador: “matriz já cobrada em pedido anterior?” / “será cobrada neste pedido”

## Tela 2 — Quantidades (1..N)
- Lista dinâmica: quantidade + % comissão por faixa
- Botão “adicionar faixa”
- Preview imediato do breakdown (opcional colapsável)

## Tela 3 — Preços / readequação
- Mostra preços do catálogo vigentes usados neste orçamento
- Permite override (papel, tinta, acabamento…) com motivo
- Guarda snapshot (reprodutibilidade histórica)

## Tela 4 — Resultado
Por faixa:
- Breakdown: papel, máquina, trocas, tinta, acabamento, rebobinação, tubete, caixa
- Serviço, comissão, imposto, etiqueta (já arredondada), matriz, total
- Alerta se metragem < 1000 (sem cobrança de troca bobina/produto)

## Tela 5 — Proposta (ex-CONSOLIDADO)
- Tabela comercial: material, acabamento, etiq/rolo, rolos, qtde, total, unitário, valor/rolo
- Valor matriz (mesmo valor em todas as faixas do cálculo; na proposta aparece 1× se 1º pedido desta matriz)
- Prazo, validade e tolerância % — **campos editáveis** (defaults 12 dias úteis / 7 dias / 20%)
- Export PDF / compartilhar

## Fora do MVP
- Estoque / disponibilidade de bobina
- Integração NFe / pedidos

## Princípios UX
- Um fluxo linear (não dashboard)
- Campos obrigatórios claros (equivalente à legenda “TEM QUE PREENCHER”)
- Cálculo desacoplado da UI (mesmo motor da API)
