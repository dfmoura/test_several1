# ADR-039-COM-001 — Vendedor no ORC + comissão sobre o recebido (COM-)

**Status:** Aceito  
**Data:** 2026-08-16  
**Contexto 39:** BL-061  
**Norma:** `../32` — `COMISSOES_VENDEDORES_DETALHADO.txt` · `GERACAO_ORCAMENTO.txt` §3.1 · `RECEBIMENTO_BAIXA_COBRANCA.txt` · `FATURAMENTO_GERACAO_COBRANCA.txt` · `RH_PAGAMENTO_GERENCIAL.txt` · `NATUREZAS_GERENCIAIS_RECEITA_DESPESA.txt` · `CASOS_USO_M06` UC-FIN-008 · `ENTREGA_CONFIRMACAO_CLIENTE.txt`  
**Relacionada:** `ADR_ENTREGA_EXPEDICAO.md` · `ADR_FATURAMENTO_COBRANCA.md` · `ADR_CONDICOES_COMERCIAIS_PAR.md` · `ADR_NATUREZAS_GERENCIAIS.md` · `ADR_ORC_FRETE_ESTIMADO.md`

---

## Contexto

Vendedores já existem no cadastro PAR (`papel_vendedor`, `comissao_percentual`, `vendedor_parceiro_id` do cliente). O motor do ORC já usa `%` por faixa **na formação do preço** (`comissao = valor_servico × % / 100`). Falta o eixo comercial/financeiro: **quem** vendeu, **qual** alíquota travada, e **quando** nasce o direito de pagar — a partir da **baixa do recebimento do cliente**, não do faturar nem do confirmar a entrega.

O estudo recomenda base **RECEBIDO** (protege caixa). Confirmar ENT- e baixar TIT continuam eixos distintos (`docs/ADR_ENTREGA_EXPEDICAO.md`).

## Decisão

```
PAR vendedor (% cadastro) + PAR cliente (vendedor padrão)
  → ORC  (vendedor + % nas faixas; snapshot)
    → PED (herda)
      → FAT  (não gera COM- sozinho, salvo apropriação do sinal já baixado)
        → ENT-  (logística; não paga comissão)
        → BX do TIT RECEBER da venda
          → COM- PREVISTA  (% da faixa aceita × parcela das etiquetas nesta BX)
            → fechamento CFE-  → COM- LIBERADA
              → TIT PAGAR natureza 3.01.05  → BX  → COM- PAGA
```

| Escolha | Motivo |
|---------|--------|
| **Vendedor = PAR com `papel_vendedor`** | Já cadastrado; Party Pattern. Não criar cadastro paralelo nem papel USR obrigatório. |
| **FK + snapshot no ORC** | `vendedor_parceiro_id` queryável; nome/% no `input_snapshot`. Documento não relê o PAR. |
| **Prefill** | Cliente com vendedor padrão preenche o ORC. Escolher o vendedor aplica `comissao_percentual` em **todas** as faixas (operador pode diferenciar por volume). |
| **Alíquota paga = % da faixa aceita** | É o % que entrou no preço da quantidade vendida. Cadastro só sugere. |
| **Base RECEBIDO** | Estudo §3. Inadimplência não vira holerite. FATURADO fica fora desta fase. |
| **Base em R$ = etiquetas faturadas** | Motor calcula comissão sobre `valor_servico` (etiqueta). Frete, matriz/clichê e faca nova **não** entram. Rateio proporcional ao `valor_bruto` da FAT em cada BX. |
| **Sinal** | BX de adiantamento **antes** do FAT não gera COM- (ainda não é venda). No faturar, a apropriação do sinal já quitado gera COM- (evento `APROPRIACAO_SINAL`). |
| **1 vendedor : 1 ORC/PED** | Sem rateio multi-vendedor nesta fase (estudo §4 fica para depois). Venda direta = sem vendedor, sem COM-. |
| **COM- gerencial até pagar** | PREVISTA → (fechamento) LIBERADA → TIT PAGAR → BX → PAGA. Zap/planilha não substituem COM-. |
| **Natureza 3.01.05** | Folha canônica já seedada. TIT a pagar no vendedor; baixa em Contas a pagar. |
| **SoD** | `comissao.escrever` = FINANCEIRO (liberar/pagar). COMERCIAL lê. Expedição não mexe. |
| **Arredondamento** | `PadraoDecimal` dinheiro. A última BX que completa o bruto da FAT leva o centavo residual. |

### Status

| COM | Significado |
|-----|-------------|
| `PREVISTA` | Direito gerencial na BX (ou apropriação do sinal). Ainda não é pagamento. |
| `LIBERADA` | Entrou num CFE-; financeiro conferiu o lote. |
| `PAGA` | TIT PAGAR do fechamento quitado. |
| `ESTORNADA` | FAT estornado (só se ainda PREVISTA) ou estorno compensatório. Nunca apaga. |

| CFE | Significado |
|-----|-------------|
| `ABERTO` | COM- liberadas; TIT ainda não gerado. |
| `TITULO_GERADO` | Um TIT PAGAR por vendedor do lote. |
| `PAGO` | Todos os TIT do lote quitados. |
| `CANCELADO` | Só se TIT ainda aberto (sem BX); COM- voltam a PREVISTA. |

### O que não entra na base

- Frete destacado (nem está no FAT nesta fase)  
- Matriz/clichê e faca nova  
- Juros/multa (BX desta fase é valor principal)  
- Intercompany (fora de escopo)  
- Venda sem vendedor no documento  

## Fora de escopo

- Rateio multi-vendedor  
- Base FATURADO / parâmetro EMP para trocar a base  
- Meta, acelerador, comissão por família  
- Devolução DEV- / estorno automático por cancelamento de NF autorizada  
- Extrato “só o meu” para usuário-vendedor  
- Foto/anexo no CFE  

## Proibido

1. Pagar comissão no confirmar da ENT- ou no faturar (salvo apropriação do sinal já recebido).  
2. Recalcular % relendo o PAR depois do ORC travado.  
3. Incluir frete, ferramental ou juros na base.  
4. Gerar COM- sem vendedor no PED/ORC.  
5. Apagar COM-/CFE-/TIT (só estorno).  
6. FINANCEIRO confirmar entrega; EXPEDIÇÃO liberar comissão.  
7. Misturar EMP (`empresa_id` do contexto).  
8. Comissão “no zap” sem COM-.  
9. Segundo vendedor vigente no mesmo ORC nesta fase.  
10. Tratar EMP como outro cliente/contrato.

Alterar esta ADR exige alinhamento explícito ao estudo 32.
