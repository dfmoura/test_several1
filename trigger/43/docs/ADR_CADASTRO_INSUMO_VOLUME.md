# ADR-043-CAD-001 — Cadastro de insumo (SKU material) × volume (bobina)

**Status:** Aceito  
**Data:** 2026-09-05  
**Contexto:** instalação 43 · evidência NF-e Avery Exact + amostragem `/Downloads/notas_entrada` (112 XML)  
**Norma herdada:** `../32` — `CADASTRO_PRODUTOS_COMPRA.txt` · `LISTAGEM_PRODUTOS_CADASTRO.txt` (Camada A) · `CONTROLE_ESTOQUE_PROFISSIONAL.txt`  
**Preserva:** `ADR_UNIDADES_PRODUTO.md` · `ADR_ESTOQUE_LOTE_VALIDADE.md` · `ADR_ENTRADA_XML_ASSIST.md` · `ADR_COMPRAS_ATE_ESTOQUE.md` · `ADR_PRODUCAO_PED_OP_ESTOQUE.md` · `ADR_RASTREIO_INSUMOS_PRODUCAO.md`

---

## Contexto

O cadastro de insumos de bobina (papel/filme Exact, Colacril, etc.) mistura três identidades se mal modelado:

1. **O que se compra** (código/descrição do fornecedor → SKU interno)  
2. **O que se manuseia** (cada bobina / `nLote` / volume físico)  
3. **Onde se guarda** (prateleira / coluna / vão)

Evidência Avery NF 889523 (`AAS029-EX4` FASSON ECOPRINT/S2045N/60G – EXACT 1000):

- 1 `cProd` → várias linhas de item e **dezenas de `rastro`**
- `qLote` em M² (ex.: 210,000 e 214,200) bate com bobinas 210 mm × 1000 m e 210 mm × 1020 m
- **Largura × comprimento não vêm no XML** — só M² por lote; dimensão é conferência humana
- O mesmo `cProd` aparece com **muitos** m² por bobina ao longo das notas (programa Exact)

Portanto a regra antiga do estudo 32 §2.1 / §12.2 (“largura e comprimento fazem parte do SKU”) **não serve para Exact/variável**: explodiria o cadastro e quebraria o de-para `cProd` → SKU.

---

## Decisão (canônica)

```
SKU (material / programa comercial)
  + produto_fornecedor_codigos (cProd + descrição fornecedor — REGRA)
       │
       ▼
OC / NF falam a língua do SKU (qtde comercial M2/KG/…)
       │
       ▼
Conferência cria N VOLUMES (1 rastro ≈ 1 bobina quando nLote é unitário)
  · codigo = nLote (ou etiqueta interna)
  · qtde = qLote (unidade do saldo)
  · largura_mm / comprimento_m reais (conferidos)
       │
       ▼
(depois) QR volume ↔ QR localização (WMS leve do almoxarifado)
```

| Camada | Onde vive | Papel |
|--------|-----------|--------|
| **SKU** | `produtos` | Identidade do **material** + programa de compra (EXACT 1000, face/adesivo/liner/gramatura/marca). Saldo oficial + custo médio. |
| **De-para** | `produto_fornecedor_codigos` | `cProd` + descrição do fornecedor **obrigatórios** — sem isso não há entrada assistida. |
| **Dimensão nominal** | `produtos.atributos` | `largura_mm` / `comprimento_m` / `gramatura_g_m2` / `programa_compra` = **referência** de OC/conversão — **não** chave do SKU. |
| **Volume / bobina** | `estoque_lotes` (+ payload futuro) | Unidade física manuseável; para Avery, 1 `nLote` = 1 volume. Dimensão **real** na entrada. |
| **Localização** | futuro (`estoque_enderecos`) | 6 prateleiras × 4 colunas × 4 vãos (1,50 × 0,60 × 1,00 m). Fora do cadastro de produto. |

### Unidades (inalteradas — ADR-039-UNID-001)

- Dual: `unidade_comercial` (NF) ↔ `unidade_interna` (saldo único).  
- Substrato Exact típico: **M2 = M2** (fator 1) — saldo bate com NF/`qLote`.  
- Papel faturado em KG: comercial KG → interna M2 **só** com gramatura (e fator derivado).  
- Proibido segundo saldo e “unidades alternativas” Sankhya.

### Lote (emenda à ADR-039-EST-003)

- `controla_lote` continua por grupo (Camada A §6.2).  
- Para substratos com `rastro` unitário: **lote = volume**.  
- Mesmo código no mesmo SKU/EMP **acumula** (batch de tinta); em Avery cada código é único → 1 linha por bobina.  
- Custeio permanece no SKU (custo médio).  
- Multi-`rastro` na entrada: **N volumes** na conferência (fase F2) — hoje o assist só pré-preenche o 1º rastro; isso é lacuna conhecida, não modelo errado.

### Semântica de `exige_dimensao_sku`

**Antes (leitura perigosa):** “SKU dimensional — largura×comprimento obrigatórios na identidade.”  
**Agora (canônico):** “Grupo de bobina **oferece** seção de dimensões **nominais** (conversão/OC).”  

- Importação: dimensão ausente → **warning**, não erro bloqueante (Camada A / Exact).  
- Fator: se comercial ≠ interna e faltar atributo da fórmula → incompleto (já existente) — sem inventar.  
- Dimensão **real** da bobina → volume na entrada, não cadastro.

### O que NÃO muda

- Entrada só via OC → assist → `receber()` / `EstoqueSaldoWriter`.  
- Isolamento `empresa_id`.  
- PA sob encomenda = família + spec (anti-explosão).  
- Sem Focus no fluxo de entrada DF-e.  
- Sem auto-receber.

---

## Refinamento explícito do estudo 32

| Trecho 32 | Novo entendimento |
|-----------|-------------------|
| §2.1 / §12.2 — L×C no SKU | **Revogado para Exact/variável.** Válido só se o fornecedor vender código **fixido** por dimensão estável. |
| Camada A → Camada B | Camada A = SKU operacional. “Camada B” vira **volume**, não milhares de SKU. |
| Estoque em RL qualificado no SKU | Preferir saldo em **M2** (ou M com largura no volume). RL nominal só se o fornecedor faturar assim. |
| Etiqueta + endereço §6 | Mantidos — fases F3–F4; não poluem o cadastro. |

---

## Plano até a conclusão (fases)

Ordem travada. Cada fase fecha aceite antes da próxima. **Não pular.**

### F0 — Norma + cadastro (esta entrega)

- ADR aceita + emendas + regra Cursor.  
- UX/import: dimensões = nominais; sem bloqueio Camada A.  
- Operação: cadastrar insumos MP pelo **material/programa** + de-para `cProd`.

**Aceite F0**

- [x] ADR neste arquivo  
- [x] Emendas UNID / LOTE / ASSIST / backlog  
- [x] Import não bloqueia sem L×C  
- [x] Copy UX sem “máscara de bobina = identidade do SKU”

### F1 — Cadastro operacional + virada de saldo

- Completar SKUs Camada A (lista 32 + Exact Avery) + de-para `cProd`.  
- Inventário/ajuste (AJU) alinhado à ADR de inventário — saldo por SKU; lotes de abertura se `controla_lote`.  
- Pontos de pedido dos itens A.

**Aceite F1**

- [x] SKUs Exact (MP-PAP-013…015, MP-FLM-015) + seed  
- [x] De-para Avery canônico (quando CNPJ + SKU existem)  
- [ ] Contagem física / AJU na EMP (operação humana)

### F2 — Entrada multi-volume (rastro → N lotes)

- Assist/receber: **cada** `rastro` → um `estoque_lotes` (qtde = `qLote`).  
- UI de conferência: informar/confirmar `largura_mm` + derivar `comprimento_m`.  
- Soma dos volumes = qtde da linha OC/NF.  
- Humano confirma; sem auto-receber.

**Aceite F2**

- [x] Preview sugere `lotes[]` com todos os rastros  
- [x] UI volumes na OC + `receber()` com N lotes  
- [x] Dimensão real no lote (derivação comprimento)  
- [x] PHPUnit `EstoqueVolumeMultiTest`

### F3 — Etiqueta / QR do volume

- Etiqueta interna: SKU, descrição, L×C real, `nLote`, NF, data, QR do volume.  
- Rota `/estoque/lotes/:id/etiqueta`.

**Aceite F3**

- [x] API etiqueta + QR payload  
- [x] Página de impressão + link na listagem de lotes

### F4 — Localização (WMS leve)

- Modelo: 6 prateleiras × 4 colunas × 4 vãos (1,50 × 0,60 × 1,00 m).  
- QR do vão; vínculo volume ↔ endereço.  
- Comando `erp:seed-estoque-enderecos`.

**Aceite F4**

- [x] Tabela `estoque_enderecos` + seed 96 vãos  
- [x] Vincular lote → vão na etiqueta  
- [x] PHPUnit gabarito + vínculo

### F5 — Reposição → OC → ciclo fechado

- Necessidade a partir do saldo/ponto de pedido (`/compras/reposicao`).  
- OC reflete pedido ao fornecedor; NF amarra OC; F2–F4 fecham o ciclo físico.

**Aceite F5**

- [x] Reposição existente intacta (mínimo → OC)  
- [x] Ciclo documentado nesta ADR (cadastro Exact + multi-volume + etiqueta + vão)  
- [ ] Operação: ajustar mínimos + primeira virada na EMP

---

## Atributos JSON permitidos (SKU)

| Chave | Uso |
|-------|-----|
| `largura_mm` | Nominal / fórmula (opcional na Camada A) |
| `comprimento_m` | Nominal do programa (ex. EXACT 1000) |
| `gramatura_g_m2` | Ponte KG↔M2 |
| `programa_compra` | Texto curto: `EXACT 1000`, `EXACT 1500`… |
| `camada_cadastro` | `A` (já usado no seed) |
| `grupo_estoque` | GG da máscara de estoque (já usado) |

Dimensão **real** do volume: campos no lote/payload (F2) — não misturar no SKU como identidade.

---

## Proibido (regressão)

1. Explodir SKU por cada L×C do Exact.  
2. Tratar dimensão nominal do cadastro como estoque físico da bobina.  
3. Entrada sem OC / segundo writer de saldo.  
4. Auto-receber por causa de `rastro`.  
5. Endereço ou QR no cadastro de produto.  
6. Custeio FIFO no lote.  
7. Remover `cProd`/descrição fornecedor do de-para.

---

## Rastreio no código / docs

- Unidades: `ADR_UNIDADES_PRODUTO.md` · `ProdutoBobinaDimensoes` · `produtoBobinaDimensoesUi.ts`  
- Lote: `ADR_ESTOQUE_LOTE_VALIDADE.md` · `ProdutoLotePolitica` · `estoque_lotes`  
- Entrada: `ADR_ENTRADA_XML_ASSIST.md` · `EstoqueEntradaXmlService` (hoje: 1º rastro)  
- Regra Cursor: `.cursor/rules/produto-insumo-volume.mdc`  
- Backlog: BL-094… (fases F1–F5)

Alterar esta ADR exige decisão explícita (Direção + domínio industrial + engenharia).
