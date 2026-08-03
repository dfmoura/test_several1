# Regras de cálculo (Pricing Engine)

Todas as fórmulas abaixo foram lidas da aba `ORÇAMENTO` dos `.xlsm`.  
Selo: `[Confirmada]` = literal da planilha; `[Validação usuário]` = ajuste consciente em relação ao Excel.

Convenções:
- `puxada` = D8 (cm)
- `largura` = C8 (cm)
- `colunas` = I8
- `modelos` = H8
- `cores` = E8
- `etiq_rolo` = J8
- `tubete` = B10
- `rpm` = C18
- `imposto_pct` = H10
- `col_reb` = J10
- `q` = quantidade da faixa (B13…)
- `troca` = tipo em C13 (propagado às faixas seguintes)

---

## R1 — Metragem linear

**Objetivo:** metros lineares de material.  
**Fórmula `[Confirmada]`:**  
`metragem = (puxada / 100) * q / colunas`  
**Exceção linha 17 Excel:** multiplica também por `col_reb` — **não generalizar** `[Validação usuário]` (usar R1 para todas as faixas).

---

## R2 — Metragem m² (produção)

**Fórmula `[Confirmada]`:**  
`m2 = CEILING( (q * largura * puxada) / 10000 , 0.1 )`

---

## R3 — Hora máquina (produção + setup)

**Fórmula `[Confirmada]`:**  
`hora_maq = (metragem / rpm) + 1`  
**`+1` = setup fixo** `[Validação usuário]`.

---

## R4 — Hora troca de bobina

**Fórmula `[Confirmada]`:**  
Se `metragem < 1000` → vazio / 0  
Senão → `((metragem/1000) - 1) * 5 / 60`  
(5 minutos por bobina além da primeira.)

---

## R5 — Hora troca de produto (automático)

**Fórmula Excel `[Confirmada]` — células E13:E16:**  
```
=IF(C13="","",VLOOKUP($C$13,'HORA PARADA'!$A:$B,2,0)*(($H$8)-1))
```

**Tradução:**  
`hora_troca_prod = tempo_h(tipo_troca) × (modelos − 1)`

| Entrada | Origem | Papel |
|---------|--------|-------|
| `tipo_troca` (C13) | Usuário escolhe uma vez | Ex.: `PRETO INTEIRO`, `SEM PARADA` |
| `tempo_h` | Automático via `HORA PARADA` | Ex.: PRETO INTEIRO = 15 min = 0,25 h |
| `modelos` (H8) | Usuário | Multiplicador `(modelos − 1)` |
| Faixas seguintes (C14…) | Automático `=C13` | Mesmo tipo propagado |

**Independente de metragem / troca de bobina.**  
Evidência BRAHVA `[Confirmada]`: q=7000, metragem≈866 &lt; 1000 → Excel ainda calcula **E13=1,5** e **valor=315**.

**Exemplo BRAHVA:** PRETO INTEIRO (0,25 h) × (7−1) = **1,5 h** → × taxa MODULAR 5 cores (210) = **R$ 315**.

> Nota histórica D3: houve indicação oral de “cobrar só com troca de bobina”.  
> A planilha **não** faz isso. Fidelidade ao Excel prevalece.

---

## R6 — Perda de acerto (papel)

**Por cores `[Confirmada]`:**

| Cores | Regra |
|------:|-------|
| 0..3 | `VLOOKUP` coluna M2 em `PERDA DE PAPEL` (4, 4, 6, 8) |
| 4 | `(largura+1)/100 * PERDA!F6` (F6=180) |
| 4V, 5 | `(largura/100) * 250` |
| 6 | `(largura/100) * 260` |
| 7 | `(largura/100) * 270` |
| 8 | `(largura/100) * 280` |

---

## R7 — Perda de acabamento

`perda_acab = VLOOKUP(acabamento, PERDA_DE_ACABAMENTO)`  

**Inalterado** na planilha oficial 260728: continua alimentando o valor de acabamento (R13).  
Não confundir com a aba nova `PERDA DE PAPEL ACERTO`.

---

## R7b — Perda papel troca produto (nova — planilha 260728)

Aba `PERDA DE PAPEL ACERTO`: metros lineares por cores (col C) × `(largura/100)` = m² (col E).

**Fórmula `[Confirmada]` no caso preenchido (K13):**  
`perda_papel_troca_produto = metros_lineares(cores) * (largura/100) * modelos`  
- cores `0` → `0`  
- 1..3 → 7 / 14 / 21  
- 4..8 e `4V` → 200  

> Planilha 260728 alinhada: coluna **J** = PERDA ACERTO PRODUTO (aba `PERDA DE PAPEL ACERTO` × modelos); coluna **K** = PERDA ACABAMENTO (`VLOOKUP` R7). O motor mantém R7 e R7b como campos distintos.

---

## R8 — Perda troca bobina (m²)

Se `metragem <= 1000` → 0  
Senão → `(5 * (largura - 0.75) * colunas / 100) * (metragem / 1000)`

---

## R9 — Quantidade de rolos e caixas

`rolos = q / etiq_rolo`  

**Sistema (melhorado — sheet `MEDIDA_CAIXAS`):**  
`qtde_caixas = CEILING(rolos / rolos_por_caixa)`  

| Tubete | Caixa preferida | Rolos/caixa |
|--------|-----------------|-------------|
| `1"` (e `1" 1/2`→`1"`) | `250x200x200` | **20** |
| `3"` | `500x300x300` | **12** |

Preço comercial permanece `qtde_caixas * 7` (R16).  

**Excel legado:** `chave_caixa = CONCAT(tubete, rolos)` → `VLOOKUP` em `CAIXAS` col. E  
A sheet `CAIXAS` era tabela manual (~1500 linhas) com trechos irregulares e corrupção após ~312 rolos no tubete `3"`. O sistema passa a gerar a tabela a partir das capacidades acima.  

**Tubete `1" 1/2`:** não usar; mapear para `1"` `[Validação usuário]`.

---

## R10 — Valor papel

`(m2 + perda_acerto + perda_bobina_m2) * preco_papel_m2`

Na planilha 260728 (colunas novas): `C21 = (H13+I13+L13)*VLOOKUP(papel)`.  
**Não** inclui a perda de papel troca produto (essa vai em R10b / coluna G).

---

## R10b — Valor papel troca produto (nova — planilha 260728)

`valor_papel_troca_produto = perda_papel_troca_produto * preco_papel_m2`

Entra no `SUM` do valor serviço (R17).  

Planilha 260728 corrigida: `G21 = J13 * VLOOKUP(papel)` (J = PERDA ACERTO PRODUTO).  
Antes G21 copiava a fórmula de troca de bobina (bug de edição).

---

## R11 — Valor máquina / troca produto / troca bobina

`taxa_h = tabela HORA MÁQUINA[máquina][cores]`  

**Excel (otimizado):** 3 blocos — `BETA / 160 / 250 / ETIRAMA` | `BATIDA` | `MODULAR`.  

**Sistema (detalhado):** 6 máquinas canônicas com tabela própria:

| Código | Origem no mapa de facas | Taxa |
|--------|-------------------------|------|
| `BETA` | BETAFLEX | igual ao grupo Excel BETA/160/250/ETIRAMA |
| `160` | REFLEXO / REFLEXO 160 | idem |
| `250` | REFLEXO 250 | idem |
| `ETIRAMA` | ETIRAMA | idem |
| `BATIDA` | BATIDA | tabela própria (1–2 cores) |
| `MODULAR` | MODULAR SPX | tabela própria (0–8 cores) |

Alias legado `BETA / 160  / 250 / ETIRAMA` continua aceito e resolve para a mesma taxa do grupo.

`valor_maq = taxa_h * hora_maq`  
`valor_troca_prod = taxa_h * hora_troca_prod` (respeitar R5 validada)  
`valor_troca_bobina = taxa_h * hora_troca_bobina` (0 se metragem < 1000)

---

## R12 — Tinta

Se `(m2 + perda_acerto) <= 30` → `cores * 10`  
Senão → `(m2 + perda_acerto) * TINTA!C3`  
(`C3` dinâmico: oficial 0,4; BRAHVA 0,8; rarepan 0,6)

Planilha 260728: `H21 = IF(SUM(H13:I13)<=30, …)` — só m² + perda acerto (igual BRAHVA G21).

---

## R13 — Acabamento

`VLOOKUP(acabamento, ACABAMENTOS) * (m2 + perda_acerto + perda_acab)`

Planilha 260728 corrigida: `I21 = preço * (H13+I13+K13)`  
(K = PERDA ACABAMENTO). **Não** inclui a coluna J (perda acerto produto).  
Bugs anteriores na planilha (`SUM(H13+K13)` / `SUM(H:K)`) foram alinhados a esta regra.

---

## R14 — Rebobinação

`((metragem * colunas) / col_reb / 1000) * ACABAMENTOS!B6`  
(B6 = 17 no oficial)

---

## R15 — Tubete

`(q / etiq_rolo) * VLOOKUP(tubete, TUBETE)`  
Preços oficiais: `1"`=0,5 | `1" 1/2`=0,6 (obsoleto) | `3"`=0,7

---

## R16 — Caixa

`qtde_caixas * 7`  
`7` é constante hardcoded em K21:K25 `[Confirmada]` + `[Validação usuário]`.  
No software: parâmetro `preco_caixa_unitario` (default 7).

---

## R17 — Valor serviço

`SUM(papel + maquina + troca_prod + troca_bobina + papel_troca_produto + tinta + acab + rebob + tubete + caixa)`

---

## R18 — Comissão e imposto

`comissao = valor_servico * comissao_pct / 100`  
`imposto = valor_servico * imposto_pct / 100`  
`base = valor_servico + comissao + imposto`

---

## R19 — Preço etiqueta e total

`valor_etiqueta = CEILING(base, 10)`  

**Matriz `[Validação usuário]`:**  
Excel soma matriz em **todas** as faixas de quantidade `[Confirmada]` (I28:I32 = mesmo `CEILING(N13,1)`; J = H+I). No sistema:

1. Calcular `matriz_calc` (R20) se `matriz=SIM`.
2. Cobrar matriz **somente no primeiro pedido** que utilizar a **mesma matriz** (chave D16).
3. Pedidos seguintes com a mesma matriz → `valor_matriz = 0` em todas as faixas.
4. Dentro do mesmo orçamento: o **mesmo** `valor_matriz` entra em **cada** faixa (são alternativas de qtde; o cliente escolhe uma).
5. No CONSOLIDADO / proposta: TOTAL das linhas = valor da etiqueta; **VALOR DA MATRIZ** aparece **1×** aparte (como Excel E15 ← I28).

`valor_matriz = CEILING(matriz_calc, 1)` se cobrável; senão 0.  
`valor_total_faixa = valor_etiqueta + valor_matriz` (espelha J28:J32).

**Identidade da “mesma matriz” `[Validação usuário]` D16:**  
`cliente + medida_faca + Z + cores + largura_cm + colunas`  
(alinha com os inputs de R20; mudança em qualquer parte = nova matriz cobrável.)

---

## R20 — Matriz

Em `MATRIZ!E3`:  
`Z = C10`, `largura_matriz = C8 * I8`, `cores = E8`, `valor_cm2 = 0,28`  
Se Z ≥ 1:  
`((((Z * 3.175)/10) + 4) * (largura_matriz + 4) * cores) * valor_cm2`

---

## Ordem de avaliação

```
entradas → R1 metragem → R3/R4/R5 horas → R2/R6/R7/R7b/R8 áreas
→ R9 rolos/caixas → R10/R10b..R16 custos → R17 serviço → R18 → R19
→ R20 matriz (se SIM) → CONSOLIDADO
```

---

## Parâmetros configuráveis (catálogo dinâmico)

| Parâmetro | Origem Excel | Default observado |
|-----------|--------------|-------------------|
| Preços papel | `PAPEL` | ver oficial |
| Tinta ≤30 / >30 | `TINTA` | 10 / 0,4 |
| Acabamentos + rebob | `ACABAMENTOS` | verniz 0,3; rebob 17 |
| Hora máquina | `HORA MÁQUINA ` | por máquina/cor |
| Hora parada | `HORA PARADA` | minutos→horas |
| Tubete | `TUBETE` | 0,5 / 0,7 |
| Preço caixa | hardcoded | **7** |
| Valor cm² matriz | `MATRIZ!D3` | 0,28 |
| Setup horas | `+1` | 1 |
| Limite troca bobina | 1000 m | 1000 |
| Arredondamento etiqueta | CEILING 10 | 10 |
