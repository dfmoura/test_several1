# ADR-039-FIN-002 — Carteira operacional (aging + ficha + baixa + lançamento pontual)

**Status:** Aceito  
**Data:** 2026-08-18  
**Contexto 39:** BL-064  
**Norma:** `../32` — `CASOS_USO_M06_FINANCEIRO.txt` UC-FIN-005/006 · `RECEBIMENTO_BAIXA_COBRANCA.txt` §3–5, §7, §9 · `NATUREZAS_GERENCIAIS_RECEITA_DESPESA.txt` · `DECISAO_NAO_IMPLEMENTAR_LAI_NO_ERP.txt` · `CASOS_USO_M10_GERENCIAL.txt` UC-GER-001 (DRE = outra tela)  
**Relacionada:** `ADR_NATUREZAS_GERENCIAIS.md` · `ADR_FATURAMENTO_COBRANCA.md` · `ADR_COMPRAS_ATE_ESTOQUE.md` · `ADR_COMISSAO_VENDEDOR.md` · `ADR_ORC_ADIANTAMENTO_PIX.md`

---

## Contexto

A espinha TIT / COB / BX já existe e não deve ser reescrita: faturamento, adiantamento PIX, entrada de OC, comissão e webhook continuam gerando e baixando títulos. O Painel já mostra saldo em aberto e conta vencidos.

O que falta para o financeiro **operar o dia** (estudo Fase 1, UC-FIN-006) é a **carteira**: faixas de atraso, ficha com drill-down até PED/FAT/OC/COB/BX, baixa com forma e conta, e um caminho honesto para despesa/receita que **não nasce** de OC/FAT/CFE.

DRE gerencial (M10), régua WhatsApp, CNAB/OFX, juros/desconto/perda com alçada e estorno de BX com efeito em COM-/adiantamento **não** entram nesta entrega.

## Decisão

```
TIT (verdade) + NAT 1–5 + CFIN
  → carteira por tipo (RECEBER | PAGAR)
      aging  (a vencer / vence hoje / 1–30 / 31–60 / 61–90 / 90+)
      ficha  (documento, natureza, origem, COB, BX)
      BX     (CFIN + data + valor + forma + obs)
  → lançamento pontual (origem AVULSO) só o que não tem espinha própria
```

| Escolha | Motivo |
|---------|--------|
| **Aging no TIT, não no Painel** | UC-FIN-006 vive em Contas a receber/pagar. Painel = KPI + fila (`ADR_PAINEL_COCKPIT`); o clique aterra na faixa. |
| **Faixas 1–30 / 31–60 / 61–90 / 90+ + vence hoje** | Estudo §9 (0–30–60–90+). “Vence hoje” é ação do dia; não mistura com a vencer. |
| **Situação padrão na UI: em aberto** | Quitado/cancelado polui a operação. API sem filtro continua devolvendo todos (compatível). |
| **Previsão = TIT em aberto, caixa × caixa** | A receber − a pagar da EMP. **Não** é DRE, competência nem SPED. Label explícito. |
| **Forma da BX canônica** | PIX, boleto, TED, dinheiro, cartão, compensação, permuta (estudo §3). Campo já existia; a UI passa a usá-lo. |
| **Lançamento pontual (`origem=AVULSO`)** | Aluguel, DAS, pró-labore, juros, etc. sem inventar OC/FAT. Mesmo motor TIT→BX. |
| **NAT reservadas à espinha** | Avulso **não** usa `1.01.01–1.01.04` (FAT), `3.01.05` (COM), `5.06` (entrada OC). Impede bypass. |
| **Grupo × tipo** | RECEBER → NAT grupo 1 ou 5. PAGAR → 2, 3, 4 ou 5. Folha ativa 1–5. Zero grupo 9 / LAI. |
| **Cancelar avulso** | Só ABERTO sem BX + motivo. Não apaga. Origens FATURA/ADIANTAMENTO/OC/COMISSAO não usam este atalho. |
| **SoD** | `financeiro.escrever` baixa e lança. `financeiro.ler` consulta. Isolar `empresa_id`. |

### Faixas (`faixa_aging`)

| Código | Significado (ref. data da EMP = hoje) |
|--------|----------------------------------------|
| `A_VENCER` | vencimento > hoje |
| `VENCE_HOJE` | vencimento = hoje |
| `D_1_30` | 1 a 30 dias em atraso |
| `D_31_60` | 31 a 60 |
| `D_61_90` | 61 a 90 |
| `D_90_MAIS` | 91+ |
| `VENCIDO` | filtro virtual: vencimento < hoje (todas as faixas de atraso) |

Só títulos `ABERTO`/`PARCIAL` entram no resumo de aging.

### Formas de BX

`PIX` · `BOLETO` · `TED` · `DINHEIRO` · `CARTAO` · `COMPENSACAO` · `PERMUTA`

Nula permanece válida (legado / webhook antigo). Webhook PIX continua gravando `PIX`.

## Fora de escopo

- DRE / fluxo de caixa por competência (UC-GER-001)  
- Régua WhatsApp (UC-FIN-007)  
- Conciliação OFX/CNAB e fila de ambiguidade (UC-FIN-004)  
- Juros, desconto, perda com alçada (tipos C/D/F do estudo)  
- Estorno de BX (efeito em COM-, adiantamento, PED encerrado)  
- TIT de frete como agregado próprio (UC-FIN-009)  
- Centro de custo, de-para contador, saldo CFIN como ledger  

## Proibido

1. Reescrever TIT/COB/BX de FAT, OC, adiantamento ou comissão.  
2. Apagar título ou baixa.  
3. Lançar avulso com NAT da espinha (`1.01.01–04`, `3.01.05`, `5.06`).  
4. Grupo 9 / LAI / “caixa 2”.  
5. Apresentar a previsão operacional como DRE ou contabilidade oficial.  
6. Auto-baixa na confirmação de ENT-.  
7. Misturar EMP (`empresa_id` do contexto).  
8. Confiar só no header para acesso.

Alterar esta ADR exige decisão explícita alinhada ao estudo 32 (Direção + engenharia).

---

## Rastreio no código

- Aging: `App\Support\TituloAging`
- Service / API: `TituloService::listCarteira` · `criarAvulso` · `cancelarAvulso` · `GET|POST /titulos` · `POST /titulos/{id}/cancelar`
- UI: `TitulosCarteiraPage` (Contas a receber / a pagar)
- Teste: `tests/Feature/TituloCarteiraTest.php` · `tests/Unit/TituloAgingTest.php`
- Regra Cursor: `.cursor/rules/carteira-financeira.mdc`
