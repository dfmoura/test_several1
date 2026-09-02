# ADR-039-PRD-001 — PED → OP/OS → estoque (saída / retorno / PA) → ±tolerância

**Status:** Aceito  
**Data:** 2026-08-12  
**Contexto 39:** BL-044  
**Norma:** `../32` — `GERACAO_PEDIDO.txt` · `PRODUCAO_OPERACIONAL_GERENCIAL.txt` · `CASOS_USO_M03_PRODUCAO.txt` · `ESTOQUE_FLUXO_SAIDA_RETORNO_PA.txt` · `CONCLUSAO_PRODUCAO.txt` · `ORDEM_SERVICO.txt` · `CADASTRO_PRODUTOS_VENDA.txt`  
**Mapa instalação 43:** [`MAPA_FLUXO_POS_ORC.md`](MAPA_FLUXO_POS_ORC.md) (continuidade UX ORC→PED→andamento; superfície × esqueleto)

---

## Contexto

ORC aprovado (direto ou após BX do adiantamento) deixa `financeiro_status=LIBERADO`. Falta o ciclo operacional: pedido → ordem → consumo de MP → retorno de sobra → PA → readequação de quantidade (± tolerância do ORC, tipicamente 20%).

## Decisão

```
ORC APROVADO + LIBERADO
  → PED- (snapshot travado; 1 item na fase 1)
       ├─ necessidade PRODUCAO → OP-
       └─ necessidade SERVICO  → OS-
  → MOV SAIDA_PRODUCAO (MP/EMB → OP)
  → conclusão OP:
       MOV ENTRADA_SOBRA (retorno)
       MOV ENTRADA_PA (família PA-ETQ + spec no PED)
       PED item PRODUZIDO · qtde faturável = qtde boa (±tol)
```

| Conceito | Prefixo | Papel |
|----------|---------|--------|
| Pedido | `PED-AAAA-NNNNN` | Contrato operacional. Só nasce com ORC APROVADO + `LIBERADO`. Idempotente. |
| Ordem de produção | `OP-AAAA-NNNNN` | Chão de fábrica. Só de PED LIBERADO / EM_PRODUCAO. |
| Ordem de serviço | `OS-AAAA-NNNNN` | Espelho leve para item SERVICO (sem ENTRADA_PA). |
| Movimento | `MOV-` | Única escrita de saldo; tipos novos abaixo. |

### Tipos de MOV (produção)

| Tipo | Efeito | Origem |
|------|--------|--------|
| `SAIDA_PRODUCAO` | − saldo MP/EMB | `ordem_producao_id` |
| `ENTRADA_SOBRA` | + saldo mesmo SKU | retorno obrigatório na conclusão |
| `ENTRADA_PA` | + saldo família PA | qtde boa liberada |
| `SAIDA_VENDA` | − saldo PA/REV | NF-e Focus autorizada (`documento_fiscal_saida_id`) — não a OP |

Saldo só via `EstoqueSaldoWriter` (nunca update direto).

### Tolerância ±N%

Herdada de `orcamentos.tolerancia_qtd_pct` (default 20) para o PED.  
Na conclusão: `qtde_boa` dentro de `[pedida×(1−t), pedida×(1+t)]` → readequa `qtde_produzida` / `qtde_faturavel`.  
Fora da faixa → bloqueio, salvo override com motivo (`producao.escrever` + flag explícita).

### Gatilho PED

`PedidoService::garantirDeOrcamentoLiberado` no momento em que o ORC fica `LIBERADO` (aceite sem sinal **ou** BX do adiantamento). Não substitui o aceite comercial.

### Escopo fase 1 (anti-burocracia)

1. 1 PED : 1 ORC : 1 item (faixa aprovada).  
2. Empenho “leve” = linhas de material na OP **pré-preenchidas do snapshot** (papel/tubete/caixa → SKU) sem baixar saldo; saída sob confirmação.  
3. PA sob encomenda → SKU família `PA-ETQ-*` + especificação no item do PED (não explode cadastro).  
4. Painel Produção no mesmo ERP (lista PED/OP/OS) — sem app paralelo.  
5. Perfil PRODUCAO sem preço/margem do ORC nas telas de chão.

### Devolver OP ao PED (sem saída)

OP aberta **sem** MOV de produção (`SAIDA_PRODUCAO` / `ENTRADA_SOBRA` / `ENTRADA_PA`) pode voltar ao pedido:

```
OP ABERTA, zero requisição
  → CANCELADA (motivo + quem + quando; código OP- preservado)
  → item do PED → PENDENTE
  → PED → LIBERADO se não restar outra OP/OS aberta
  → nova OP permitida (UC-PRD-001: item sem OP ativa)
```

Não apaga a OP. Não mexe em saldo. Não cancela o PED comercial.

Com qualquer saída já requisitada → bloqueio. Estorno de estoque / retrabalho permanece fora de escopo (estudo 32: primeiro encerra/estorna OP, depois o PED).

### Rastreio de insumos (genealogia)

Após qualquer `SAIDA_PRODUCAO`, a OP (e o PED) expõem a genealogia dos insumos: lote + NF + fornecedor + OC, composta dos MOV já gravados. Ver `ADR_RASTREIO_INSUMOS_PRODUCAO.md`. Não cria saldo, lote de PA nem RMA.

## Fora de escopo (esta entrega)

- Empenho com saldo `empenhado` separado / FIFO de lote  
- CQ checklist completo / quarentena  
- Faturamento Focus / romaneio / ENT-  
- Motor CRT `AGUARDA_CREDITO`  
- NEC automática a partir de falta de material  
- Retrabalho / reabertura de OP **com estorno de estoque**  
- OS de manutenção de BEM  
- Devolver OS ao PED (espelho futuro, mesmo critério)  

## Proibido

1. Abrir OP/OS com ORC em `AGUARDA_ADIANTAMENTO`.  
2. Gerar OP direto do ORC (pula PED).  
3. Alterar `estoque_saldos` fora do writer / MOV.  
4. Criar milhares de PA-ETQ por arte/cliente.  
5. Segundo sistema de PCP / planilha mestre.  
6. Misturar EMP (sempre `empresa_id` do contexto).

Alterar esta ADR exige alinhamento explícito ao estudo 32.
