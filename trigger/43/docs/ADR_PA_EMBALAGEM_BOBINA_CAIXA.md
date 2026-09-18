# ADR-043-PRD-002 — Embalagem do PA (bobina → caixa → NF/ENT)

**Status:** Aceito  
**Data:** 2026-09-18  
**Contexto 43:** produção · faturamento · expedição  
**Norma relacionada:** `ADR_PRODUCAO_PED_OP_ESTOQUE.md` · `ADR_CADASTRO_INSUMO_VOLUME.md` · `ADR_ORC_SAIDA_ETIQUETA.md` · `ADR_FATURAMENTO_COBRANCA.md` · `ADR_EMISSAO_NFE_NFSE.md` · `ADR_ENTREGA_EXPEDICAO.md` · `ADR_ORC_GUIA_PRODUCAO.md`

---

## Contexto

O cliente compra **etiquetas** (ex.: 132.000 UN). A fábrica entrega **N bobinas** (tubete) em **M caixas**, com etiqueta de identificação, prontas para faturar e expedir.

Hoje:

| Camada | Situação |
|--------|----------|
| ORC | Já estima `rolos`, `qtde_caixas`, `rolos_por_caixa`, `etiq_por_rolo`, tubete |
| OP conclusão | `ENTRADA_PA` flat em etiquetas — correto para saldo |
| Volume `estoque_lotes` | Bobina de **insumo** (MP) — não é bobina de PA |
| FAT / NF | `qCom` = etiquetas; sem detalhe físico nem `qVol` |
| ENT | Campo escalar `volumes` sem vínculo com embalagem real |

Misturar bobina de PA com lote de MP, ou faturar “por caixa”, quebraria o eixo comercial e o FEFO de insumos.

---

## Decisão

Três grandezas distintas — **nunca fundir**:

```
Comercial / FAT / item NF … etiquetas (UN)     ← qtde_faturavel
Físico fábrica …………… bobina de PA (tubete)  ← volume manuseável
Logística / ENT / transp NF … caixa            ← volume de transporte
```

### Agregado `pa_embalagens` (paralelo ao saldo)

```
OP CONCLUIDA (ENTRADA_PA intacta)
  → sugerir embalagem do snapshot ORC (etiq/rolo × rolos/caixa)
  → humano confirma (pode ajustar bobinas; Σ = qtde_boa)
  → grava bobinas + caixas + QR (BOB: / CX:)
  → eco em FAT preview · NF (infAd + volumes) · ENT (volumes default)
```

| Escolha | Motivo |
|---------|--------|
| **Tabela própria** (não `estoque_lotes`) | Evita `controla_lote` no PA-ETQ e contamina FEFO/SAIDA_VENDA de MP |
| **Saldo PA continua flat** | Writer único; Σ bobinas = `qtde_boa`; sem segundo escritor |
| **Pós-conclusão** (não no `concluir`) | Não quebra testes/fluxo atual; embalagem é passo explícito |
| **Sugestão do snapshot** | ORC já calculou; real confirmado no chão |
| **FAT sem hard-block** | Legado e jobs sem caixa seguem; UI recomenda embalar |
| **NF: qCom = etiquetas** | Preço e fiscal de mercadoria; caixas em transporte + texto |
| **ENT: volumes = caixas** | Romaneio logístico; sem MOV |
| **QR `BOB:` / `CX:`** | Distintos de `VOL:` (MP) e `END:` (vão); mesma mídia Elgin 50×40 |

### Hierarquia

```
pa_embalagens (1 vigente : 1 OP)
  ├─ pa_embalagem_bobinas  (N)  — qtde etiquetas · tubete · BOB:…
  └─ pa_embalagem_caixas   (M)  — agrupa bobinas · CX:… (etiqueta ID)
```

### Sugestão (canônica)

```
etiq_por_rolo ← snapshot.input (fallback 1000)
n_bobinas     ← CEILING(qtde_boa ÷ etiq_por_rolo)
              (últimas bobinas absorvem resto; Σ = qtde_boa)
rolos_por_caixa ← snapshot.faixa (fallback catálogo)
n_caixas      ← CEILING(n_bobinas ÷ rolos_por_caixa)
tubete / caixa_medida / saida_etiqueta ← snapshot
```

### Onde cada quantidade aparece

| Documento | Etiquetas | Bobinas | Caixas |
|-----------|-----------|---------|--------|
| PED / FAT item | sim (`qtde`) | eco | eco |
| NF-e item (`qCom`) | sim | `infAdProd` | — |
| NF-e transporte | — | — | `volumes` / espécie CAIXA |
| ENT | qtde faturável | — | `volumes` |
| Etiqueta física | na face | BOB | CX (ID) |

### Superfície UX

- Bloco **Embalagem PA** na OP concluída (sem menu novo / sem gate de implantação nesta fase).
- Impressão bobinas e caixas (browser print, canal Elgin existente).
- FAT / Expedição só **ecoam** o confirmado.

---

## Fora de escopo

- Ligar `controla_lote` em PA-ETQ / FEFO de acabado  
- WMS de picking de PA / endereçar bobina PA no almoxarifado  
- Peso real por caixa / CUB / CT-e  
- Hard-block de faturar sem embalagem  
- Entrega parcial / N ENT  
- Explodir SKU por bobina ou caixa  

## Proibido

1. Alterar `qtde_faturavel` / preço por causa da embalagem.  
2. Usar `estoque_lotes` / `VOL:` para bobina de PA.  
3. Segundo escritor de saldo ou MOV na embalagem / ENT.  
4. Faturar o item em CX ou BOB no lugar de etiquetas.  
5. Inventar milhares de PA-ETQ.  
6. Misturar EMP (`empresa_id` do contexto).  
7. Apagar embalagem confirmada com NF autorizada (só histórico / nova se OP permitir — fase 1: 1 vigente, reconfirma substitui se NF ainda pendente).

---

## Consequências

**Agora:** chão confirma bobinas/caixas; NF e expedição falam a língua física sem mentir a quantidade comercial.

**Depois (outro ADR):** gate de implantação se virar hub; peso/CUB; quarentena de PA por caixa.

## Rastreio

- Models: `PaEmbalagem` · `PaEmbalagemBobina` · `PaEmbalagemCaixa`  
- `PaEmbalagemService` · `PaEmbalagemController`  
- Eco: `FocusPayloadBuilder` · `EntregaService` · `FaturamentoService` · OP show  
- UI: bloco OP · etiquetas BOB/CX  
- Testes: `PaEmbalagemTest`
