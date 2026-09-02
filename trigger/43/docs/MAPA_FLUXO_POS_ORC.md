# Mapa — continuidade pós-ORC (instalação 43)

**Status:** Canônico nesta instalação  
**Data:** 2026-09-02  
**Norma de domínio:** `../32` (`INDICE_FLUXO_OPERACIONAL.txt`, `GERACAO_PEDIDO.txt`, `PRODUCAO_OPERACIONAL_GERENCIAL.txt`, `ESTOQUE_FLUXO_SAIDA_RETORNO_PA.txt`, `CONCLUSAO_PRODUCAO.txt`, `CADASTRO_PRODUTOS_VENDA.txt`)  
**ADR motor:** [`ADR_PRODUCAO_PED_OP_ESTOQUE.md`](ADR_PRODUCAO_PED_OP_ESTOQUE.md) (herdado de `../39`)  
**Superfície:** [`ADR_TRANSICAO_FLEXORC_FLEXOERP.md`](ADR_TRANSICAO_FLEXORC_FLEXOERP.md) · `.cursor/rules/flexorc-superficie.mdc`

---

## Decisão

O motor operacional **já existe** (PED → OP/OS → MOV → FAT → ENT). Nesta instalação a continuidade comercial→chão é:

1. Aceite ≠ liberação ≠ pedido.  
2. PED nasce só com ORC `APROVADO` + `financeiro_status=LIBERADO` (`PedidoService::garantirDeOrcamentoLiberado`).  
3. UX do ORC liberado aponta para o PED; o PED mostra andamento com códigos.  
4. OP/OS só a partir do PED — nunca direto do ORC.  
5. Cadastro SKU (`/produtos`) permanece **fora do menu** até gate de implantação.

---

## Espinha (happy path)

```
ORC (enviado → APROVADO)
  ├─ exige sinal → AGUARDA_ADIANTAMENTO → BX/PIX → LIBERADO
  └─ crédito/política OK → LIBERADO
       → PED- (1:1 ORC; snapshot travado; 1 item fase 1)
            ├─ PRODUCAO → OP- (empenho leve → requisitar SAIDA_PRODUCAO
            │                 → concluir: ENTRADA_SOBRA / perda / ENTRADA_PA ±tol)
            ├─ SERVICO  → OS- (concluir sem ENTRADA_PA)
            └─ REVENDA  → separação (sem OP)
       → item/PED PRODUZIDO → FAT → ENT → BX → ENCERRADO
```

| Prefixo | Papel |
|---------|--------|
| `ORC-` | Proposta comercial + aceite |
| `PED-` | Contrato operacional |
| `OP-` / `OS-` | Chão (produção / serviço) |
| `MOV-` | Única escrita de saldo |
| `FAT-` / `ENT-` / `TIT-` / `BX-` | Saída comercial e financeiro |

### Status (fase 1)

- **ORC financeiro:** `AGUARDA_ADIANTAMENTO` \| `LIBERADO`
- **PED:** `LIBERADO` → `EM_PRODUCAO` → `PRODUZIDO` → `FATURADO` → `EM_ENTREGA` → `ENTREGUE` → `ENCERRADO`
- **OP/OS:** `ABERTA` → `EM_ANDAMENTO` → `CONCLUIDA` (+ `CANCELADA` sem MOV)

---

## Estoque em paralelo

| Caminho | Fluxo |
|---------|--------|
| Compra | OC → receber → `ENTRADA_COMPRA` → TIT pagar |
| Legado / virada | AJU motivo A03 (saldo inicial); sem reconstruir histórico |
| Produção | `SAIDA_PRODUCAO` · `ENTRADA_SOBRA` · `ENTRADA_PA` |
| Venda | `SAIDA_VENDA` só com NF-e autorizada |
| Reposição | mínimo → “A repor” → OC DIRETA |

Saldo **somente** via `EstoqueSaldoWriter` + MOV. Isolamento `empresa_id`.

---

## Superfície × esqueleto (43)

| Visível no menu | Esqueleto (código mantido, menu gated) |
|-----------------|----------------------------------------|
| Pedidos, OP, Estoque, Compras, **Produtos (SKU)**, FAT, ENT, carteira | Hub Rastreio, comissões, NEC/COT, fluxo de caixa pleno |

**Produtos/SKU (F5_PRODUTOS):** MP/EMB/REV operacionais no menu Cadastros. Preço comercial da etiqueta sob medida = **catálogo ORC**. PA sob encomenda = família `PA-ETQ-*` + spec no PED (anti-explosão do estudo 32).

**NF-e de entrada (F5_NFE_ENT):** XML + conferência na **OC** (`receber`); Estoque lista MOV/espelho e aponta para a OC. Virada/legado = AJU A03. Sem entrada sem OC.

**Fatia `ate_envio_link`:** sem sinal/financeiro na UX; PED não é disparado no aceite — não exibir CTA “Ver pedido” fantasma.

---

## UX de continuidade (obrigatória)

| Tela | Sinal |
|------|--------|
| ORC `AGUARDA_ADIANTAMENTO` | Copy: pedido operacional após confirmação do sinal (sem CTA PED) |
| ORC `LIBERADO` + PED | CTA **Ver pedido `PED-…`** + status do PED |
| PED detalhe | **Andamento operacional** com códigos ORC → PED → OP/OS → materiais/produção → FAT/ENT |
| OP detalhe | **Passos da ordem**: separar → produzir → concluir (retorno/perda/PA) → pedido; resultado após `CONCLUIDA` |
| Estoque | Card **Entrada e documentos** → OC (NF-e) · ajustes/virada · produtos |
| Produtos | Papel no fluxo (compra/estoque/OP) + links Estoque/OC |
| Painel | Filas/KPI de ação apenas (`ADR_PAINEL_COCKPIT`) |

Norma UX do estudo 32: timeline do PED com códigos dos documentos — não dashboard paralelo.

---

## Proibido

1. Gerar OP/OS direto do ORC.  
2. Abrir OP com ORC em `AGUARDA_ADIANTAMENTO`.  
3. Criar PED manual “porque o botão sumiu” — motor idempotente é o dono.  
4. Explodir PA sob medida em milhares de SKU; entrada de NF sem OC.  
5. Segundo escritor de saldo / planilha mestre de PCP.  
6. Empilhar aging, histórico ou módulo esqueleto no Painel.

---

## Referências

- Motor: [`ADR_PRODUCAO_PED_OP_ESTOQUE.md`](ADR_PRODUCAO_PED_OP_ESTOQUE.md)  
- Sinal: [`ADR_ORC_ADIANTAMENTO_PIX.md`](ADR_ORC_ADIANTAMENTO_PIX.md)  
- Guia ORC: [`ADR_ORC_GUIA_PRODUCAO.md`](ADR_ORC_GUIA_PRODUCAO.md)  
- Compras→estoque: [`ADR_COMPRAS_ATE_ESTOQUE.md`](ADR_COMPRAS_ATE_ESTOQUE.md)  
- Inventário/legado: [`ADR_ESTOQUE_INVENTARIO_AJUSTE.md`](ADR_ESTOQUE_INVENTARIO_AJUSTE.md)  
- Saída: [`ADR_OPERACOES_SAIDA.md`](ADR_OPERACOES_SAIDA.md) · [`ADR_FATURAMENTO_COBRANCA.md`](ADR_FATURAMENTO_COBRANCA.md) · [`ADR_ENTREGA_EXPEDICAO.md`](ADR_ENTREGA_EXPEDICAO.md)
