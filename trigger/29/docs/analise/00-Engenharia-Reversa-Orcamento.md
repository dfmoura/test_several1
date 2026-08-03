# Engenharia Reversa — Orçamento Flexográfico

**Status:** análise concluída (sem implementação)  
**Fonte:** `modelos/orçamento/`  
**Data da análise:** 2026-07-29  
**Classificação de evidência:** cada conclusão traz o selo `[Confirmada]`, `[Alta]`, `[Baixa]` ou `[Validação usuário]`.

---

## 1. Inventário de arquivos

| Arquivo | Tipo | Papel |
|---------|------|-------|
| `ORÇAMENTO OFICIAL 2607171006.xlsm` | Motor + caso | Template oficial / Banca do Dinei |
| `15-07 BRAHVA.xlsm` | Caso | BRAHVA — preços de tinta/papel alterados |
| `23-07 ART MOVEIS.xlsm` | Caso | Arte final móveis — 5 faixas, cores 0 |
| `23-07 PUMPKIN.xlsm` | Caso | GABRIEL — sem quantidades preenchidas |
| `23-07 rarepan .xlsm` | Caso | RAREPAN — tinta 0,6 |
| `ESTOQUE DE PAPEIS-29-7-26(1).xlsx` | Estoque | Controle físico (fora do MVP de cálculo) |
| `teste.json` | Export | Dump estrutural (fórmulas, labels, VBA) |

**Veredito estrutural `[Confirmada]`:** os 5 `.xlsm` compartilham o **mesmo motor** (19 abas idênticas, mesmas fórmulas-base). Diferenças = entradas do caso + eventuais overrides de preço em `PAPEL`/`TINTA`.

---

## 2. Finalidade de cada aba

| Aba | Finalidade | Alimenta | É alimentada por |
|-----|------------|----------|------------------|
| `MAPA DE FACAS 2026…` / `…ATUAL` | Catálogo de facas (Power Query interno) | Seleção → `MAPA_DE_FACAS` | Externo / histórico |
| `MAPA_DE_FACAS` | Facas do job (medida, puxada, Z, REP) | `ORÇAMENTO` (B8,D8,C10,D10,E10) | Catálogo → **autopreenche** |
| `ORÇAMENTO` | Entrada + motor de cálculo + preço final | `CONSOLIDADO`, `MATRIZ ` | Quase todas as tabelas |
| `CONSOLIDADO` | Proposta comercial ao cliente | Impressão / PDF | `ORÇAMENTO` |
| `PAPEL` | Preço R$/m² por material | Valor papel | Cadastro (editável) |
| `TINTA` | Preço tinta (faixa ≤30 m² vs >30) | Valor tinta | Cadastro |
| `ACABAMENTOS` | Preço acabamento + rebobinação | Valor acab. / rebob. | Cadastro |
| `PERDA DE PAPEL` | Perda de acerto por nº de cores | Perda acerto (m²) | Cadastro + fórmulas |
| `PERDA DE PAPEL ACERTO` | Perda m² por cores × modelos (troca produto) | Perda / valor papel troca produto | Cadastro (planilha 260728+) |
| `PERDA DE ACABAMENTO` | Perda m² por tipo de acabamento | Perda acabamento | Cadastro |
| `HORA MÁQUINA ` | R$/h por máquina × cores | Valor máquina / troca | Cadastro |
| `HORA PARADA` | Tempo (h) por tipo de troca de produto | Hora troca produto | Cadastro |
| `TUBETE` | Preço unitário por tamanho | Valor tubete | Cadastro |
| `MEDIDA_CAIXAS` | Medidas físicas + empacotamento (rolos/caixa por tubete) | Quant. caixas (regra CEILING) | Cadastro / estoque |
| `CAIXAS` | Tabela gerada (tubete + nº rolos → qtde) — legado Excel | Quant. caixas (VLOOKUP) | Gerada a partir de `MEDIDA_CAIXAS` |
| `MATRIZ ` | Custo da matriz (cm² × cores) | Valor matriz | `ORÇAMENTO` + R$/cm² |
| `COMISSÃO` | Lista de % possíveis | Entrada % | Cadastro (lista) |
| `IMPOSTO` | Lista de % possíveis | Entrada % | Cadastro (lista) |
| `MÁQUINAS ` | Nomes de máquina | Validação / lista | Cadastro |
| `VERNIZ` | Referência isolada | **Nada** no preço | — |

**Autopreenchimento `[Confirmada]`:** ao selecionar a **faca/medida** no mapa, geram-se automaticamente (não são entrada manual):

- Medida / tamanho (B8 ← MAPA C2 = coluna **TAMANHO** da base)
  - **REDONDA:** TAMANHO = **diâmetro (Ø)** — não é LARGURA×PUXADA
  - Retangular com “X”: usa o texto do TAMANHO (ex. `9,5X3,5`, `8,0X12,4`)
  - RETA numérica: costuma exibir LARGURA×altura
- Puxada máquina (D8 ← MAPA D5) — **pode estar vazia** na planilha (preenchimento analógico/manual)
- Z (C10 ← MAPA E5)
- Formato / faca (D10 ← MAPA C5)
- REP = **REPETIÇÃO** (E10 ← MAPA F5)

Fonte canônica do catálogo: **`MAPA DE FACAS 20260715 ATUAL`**. A aba `MAPA_DE_FACAS` é só o pivot/seleção do job.

**VBA `[Confirmada]`:** existe `vbaProject.bin`; strings apontam para macro `ATUALIZAR` e `Worksheet_SelectionChange`. Não há UDF customizada nas fórmulas (só Excel nativo + LAMBDA stubs `_xleta.*` quebrados).

**Power Query `[Confirmada]`:** conexão `Consulta - MAPA DE FACAS 2026 -27 02 xlsm` (Mashup interno ao workbook). Sem conexão com o arquivo de estoque.

**Validações de dados:** presentes no pacote OOXML, mas openpyxl não as materializa (extensão não suportada). Na prática o usuário escolhe de listas (`PAPEL`, `ACABAMENTOS`, etc.) — `[Alta]`.

---

## 3. Fluxo real do orçamento

```
1. Escolher faca no catálogo → preencher MAPA_DE_FACAS
2. Em ORÇAMENTO: cliente, papel, acabamento, cores, modelos,
   colunas, etiq/rolo, tubete, máquina, imposto, matriz SIM/NÃO,
   tipo de troca de produto, RPM, 1..N quantidades, % comissão
3. Planilha calcula, por faixa:
   metragem → m² → perdas → horas → custos unitários → soma serviço
4. Aplica comissão + imposto → CEILING(10) no preço da etiqueta
5. Soma matriz (se SIM) → valor total da faixa
6. CONSOLIDADO monta proposta (material, qtde, unitário, prazo, validade)
```

---

## 4. Campos — entrada vs calculado vs informativo

### Entrada do usuário `[Confirmada]`

| Campo | Célula | Obrigatório observado |
|-------|--------|----------------------|
| Data | A5 | Sim (casos) |
| Cliente | B5 | Sim |
| Medida (via mapa) | B8 ← MAPA | Sim — **seleção no catálogo** |
| Largura papel (cm) | C8 | Sim |
| Puxada (cm) | D8 ← MAPA | **Automático** (não digitar) |
| Cores | E8 | Sim (0..8 / 4V) |
| Papel | F8 | Sim |
| Acabamento | G8 | Sim |
| Qtde modelos | H8 | Sim (pode 0) |
| Qtde colunas | I8 | Sim |
| Etiq/rolo | J8 | Sim |
| Tubete | B10 | Sim (`1"` ou `3"`) |
| Z / Faca / REP | C10/D10/E10 ← MAPA | **Automático** (não digitar) |
| Máquina (custo) | G10 | Sim |
| Imposto % | H10 | Sim |
| Matriz SIM/NÃO | I10 | Sim |
| Coluna rebobinação | J10 | Sim |
| Tipo troca produto | C13 | Sim se houver qtde |
| Quantidades | B13..Bn | 1..N `[Validação usuário]` |
| RPM | C18 | Sim |
| % comissão | B28..Bn | Por faixa (0 permitido) |

### Calculados `[Confirmada]`

Horas máquina/troca/bobina, metragens, perdas, qtde rolos/caixas, todos os `VALOR *`, serviço, comissão, imposto, etiqueta (CEILING 10), matriz, total.

### Só informativos / não entram no preço `[Confirmada]` + `[Validação usuário]`

- `F10` “máquina roda serviço” — **manter no sistema** (não entra no cálculo; pode divergir de G10). Lista canônica: **BETA, 160, 250, ETIRAMA, BATIDA, MODULAR**.
- Máquinas do **mapa de facas** são padronizadas para os mesmos códigos:
  - BETAFLEX → **BETA**
  - REFLEXO / REFLEXO 160 → **160**
  - REFLEXO 250 → **250**
  - ETIRAMA → **ETIRAMA**
  - MODULAR SPX → **MODULAR**
  - BATIDA → **BATIDA**
- Fonte do catálogo de facas: sheet **`MAPA DE FACAS 20260715 ATUAL`** (a aba `MAPA_DE_FACAS` é só o pivot/seleção do job).
- Aba `VERNIZ` inteira
- Textos de `CONSOLIDADO` (prazo, validade, tolerância ±20%) — **editáveis** no sistema (defaults do Excel)

---

## 5. Comparação entre arquivos

| Aspecto | Padrão | Exceções |
|---------|--------|----------|
| Estrutura de abas | Idêntica | — |
| Fórmulas ORÇAMENTO | Idênticas | Linha 17 (5ª faixa) diverge em E17/G17 |
| Preço papel | Oficial | BRAHVA: `BOPP PRATA BXT` 8,5→8,0 |
| Preço tinta C3 | 0,4 | BRAHVA 0,8; rarepan 0,6 |
| Nº faixas | 1..5 no Excel | PUMPKIN sem qtde; ART com 5; demais 3–4 |
| Máquina | MODULAR ou BETA… | rarepan: G10=BETA mas F10=MODULAR |
| Imposto | 16% | rarepan 18% |
| Cores 0 | — | ART e PUMPKIN (sem impressão) |

**Regra de produto `[Validação usuário]`:** preços são **dinâmicos**; cada orçamento pode readequar (snapshot/override) sem alterar o cadastro global.

---

## 6. Estoque (`ESTOQUE DE PAPEIS-29-7-26`)

**Papel no sistema `[Confirmada]`:** controle operacional paralelo (bobinas por família: FOSCO, COUCHE, BOPP, TÉRMICO, TAG, TECIDOS, DUPLA FACE + Tubetes, Caixas, Cold, Laminação, Tintas, OS).

**Relação com orçamento `[Confirmada]`:** **nenhuma fórmula** do `.xlsm` referencia o estoque. Preço vem só de `PAPEL`.

**Nomes `[Confirmada]`:** não batem 1:1 (ex.: estoque `BOPP BRILHO COLACRIL BXT` vs orçamento `BOPP BRILHO BXT`).

**MVP `[Validação usuário]`:** estoque **depois** do motor de orçamento.

**Observação estoque caixas `[Confirmada]`:** preços reais de caixa no estoque variam (ex. 2,33–6,40). No orçamento o preço cobrado é **sempre R$ 7** hardcoded — regra de precificação comercial, não custo de estoque `[Validação usuário]`.

---

## 7. Decisões já validadas pelo negócio

| # | Tema | Decisão | Impacto no software |
|---|------|--------|---------------------|
| 1 | `+1` em hora máquina | Setup fixo | Sempre somar 1 h na produção |
| 2 | 5ª faixa diferente | Orçamento tem **1..N** qtdes | Generalizar regra das linhas 13–16; **não** copiar anomalia E17 |
| 3 | Troca produto | Excel sempre calcula hora = tempo×(modelos−1) | R5 automático; **não** depende de metragem |
| 4 | Tabela oficial | Dinâmica + readequação | Catálogo versionado + override por orçamento |
| 5 | Tubete `1" 1/2` | Não existe → usar `1"` | Cadastro: só `1"` e `3"` |
| 6 | Caixa × 7 | Sim | Parâmetro `preco_caixa = 7` |
| 7 | Estoque | Fora do MVP | Módulo futuro |
| 8 | Matriz | Em **todas** as faixas do orçamento; entre pedidos só no **1º** da mesma matriz | Chave D16: `cliente+medida+Z+cores+largura+colunas`; na proposta (CONSOLIDADO) o valor aparece 1× aparte |
| 9 | Prazo / validade / ±20% | Editáveis | Defaults: 12 dias úteis / 7 dias / ±20% |
| 10 | Vendedor | Irrelevante por agora | Fora do MVP |
| 11 | Cores `4V` | Manter | Opção distinta de `4` |
| 12 | Máquina roda serviço (F10) | Manter | Lista MÁQUINAS!A; operacional; **não** autopreencher pelo mapa de facas |

---

## 8. Critérios de sucesso da análise

| Critério | Status |
|----------|--------|
| Reproduzir qualquer orçamento existente | Possível com motor + snapshot de preços do arquivo |
| Origem de todos os valores relevantes | Mapeada (seções 2–4 + doc de cálculos) |
| Regras de negócio | Documentadas + validadas (D1–D12) |
| Processo completo | Fluxo na seção 3 |
| Eliminar dependência do Excel | Arquitetura proposta (Docker) |
| Dev implementar só com a doc | Objetivo desta pasta `docs/` |

**Próximo passo após aceite:** implementar Pricing Engine + API + UI em Docker (estoque fora).
