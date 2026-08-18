# ADR-039-EXP-001 — Expedição e confirmação de entrega (ENT-)

**Status:** Aceito  
**Data:** 2026-08-16  
**Contexto 39:** BL-060  
**Norma:** `../32` — `ENTREGA_CONFIRMACAO_CLIENTE.txt` · `FRETE_TRANSPORTADORAS.txt` · `GERACAO_PEDIDO.txt` §4 · `RECEBIMENTO_BAIXA_COBRANCA.txt` §5 · `MAPA_FATURAMENTO_EXPLICADO.txt` · `CASOS_USO_M06` UC-FIN-010 · `DECISAO_MODELO_DOMINIO` §5.1 · `PARAMETROS_EMPRESA_OFICIAIS.txt` (`politica_nf_antes_expedir`)  
**Relacionada:** `ADR_FATURAMENTO_COBRANCA.md` · `ADR_EMISSAO_NFE_NFSE.md` · `ADR_ORC_FRETE_ESTIMADO.md` · `ADR_PRODUCAO_PED_OP_ESTOQUE.md`

---

## Contexto

PED `FATURADO` já tem FAT vigente, TIT/COB do saldo e nota planejada (prévia ou Focus). Falta o eixo **logístico**: o produto acabado na expedição sai no **balcão** (cliente retira) ou no **transporte**, com confirmação auditável — e só então o financeiro segue a baixa **conforme a condição já negociada**.

O estudo distingue os eixos. Confirmar entrega **não** quita título. Receber **não** marca entregue.

## Decisão

```
PED FATURADO (FAT + TIT/COB; NF prévia ou autorizada)
  → fila de expedição (humano confere volumes)
  → ENT-  (1 vigente por PED nesta fase)
       ├─ modo RETIRAR  → tipo BALCAO  → AGUARDA_RETIRADA  → confirma no balcão
       └─ modo ENTREGAR → FROTA | TRANSPORTADORA | OUTRO
                          → EM_TRANSITO → confirma a entrega
  → PED ENTREGUE  (ciclo logístico)
  → TIT intactos → BX no Contas a receber, na forma/prazo do snapshot
  → PED ENCERRADO quando entrega ok + nenhum TIT RECEBER em aberto
```

| Escolha | Motivo |
|---------|--------|
| **Agregado `ENT-` em `expedicao/`** | Estudo §5.1: romaneio **não** mora no TIT. Financeiro só observa. |
| **Modo do snapshot ORC/PED** | `RETIRAR` × `ENTREGAR` já travados no ORC (BL-058). Não reinventar CIF/FOB. |
| **Dois passos, não TMS** | Fase 1: expedir (documento + destino) → confirmar (prova). Sem rota, CT-e, app de motorista. |
| **NF antes de expedir = SIM** | Parâmetro `politica_nf_antes_expedir`. Sem hub: FAT + prévia basta (BL-052). Com hub apto: exige NF autorizada. `PROCESSANDO` bloqueia. |
| **1 ENT vigente : 1 PED** | Alinhado a 1 PED : 1 item. Recusa/cancelamento libera novo ENT. Nunca apagar. |
| **Prova mínima** | Balcão: nome de quem retirou. Transporte: canhoto, rastreio ou observação. Sem foto nesta fase (campo texto). |
| **SoD** | `expedicao.escrever` ≠ `financeiro.escrever`. FINANCEIRO consulta; não confirma entrega. PRODUÇÃO pode expedir (fábrica pequena). |
| **Baixa não automática** | À vista no balcão: CTA para Contas a receber. 28 DDL: títulos seguem o vencimento. Sinal já apropriado no FAT. |
| **Estoque PA intacto** | Continua só na NF autorizada (ADR faturamento). ENT não gera MOV. |

### Status

| PED | Significado |
|-----|-------------|
| `FATURADO` | Fila de expedição (eixo financeiro já nasceu). |
| `EM_ENTREGA` | ENT vigente: aguarda retirada **ou** está em trânsito. Label de UX conforme o modo. |
| `ENTREGUE` | Confirmação registrada. TIT podem continuar abertos. |
| `ENCERRADO` | Entrega ok **e** nenhum TIT a receber do PED em aberto/parcial. |

| ENT | Significado |
|-----|-------------|
| `AGUARDA_RETIRADA` | Pronto no balcão. |
| `EM_TRANSITO` | Saiu (frota / transportadora / outro). |
| `ENTREGUE` | Prova registrada. |
| `RECUSADA` | Não baixou como entregue; PED volta a `FATURADO`. |
| `CANCELADA` | Romaneio desfeito antes da confirmação (motivo). PED volta a `FATURADO`. |

### Política NF

```
expedir exige FAT CONFIRMADO
  + se politica_nf_antes_expedir = SIM (default):
       DFS PROCESSANDO → bloqueia
       hub emissão habilitada e nenhuma NF AUTORIZADA → bloqueia
       sem hub / só prévia PLANEJADO → libera (é a nota operacional do 39)
```

### Encerramento

Chamado na confirmação da ENT **e** na BX do TIT RECEBER. Não reabre. Não exige que a baixa espere a entrega (PIX à vista pode entrar antes da retirada).

## Fora de escopo

- TMS, CT-e, API de transportadora, WhatsApp de status  
- Entrega parcial / N ENT vigentes no mesmo PED  
- Foto/anexo de canhoto (prova é texto nesta fase)  
- Devolução DEV- / retorno de estoque na recusa  
- Baixa de PA no ENT  
- Cancelamento Focus / estorno FAT após expedir  

## Proibido

1. Fazer do TIT o dono do romaneio.  
2. Confirmar entrega só no WhatsApp, sem gravar ENT-.  
3. Expedir sem FAT vigente.  
4. Expedir com hub apto e NF ainda não autorizada (quando a política é SIM).  
5. Baixar TIT automaticamente na confirmação.  
6. FINANCEIRO confirmar entrega.  
7. Apagar ENT/PED.  
8. Estornar FAT com ENT vigente ou PED já `EM_ENTREGA` / `ENTREGUE` / `ENCERRADO`.  
9. Misturar EMP (`empresa_id` do contexto).  
10. Criar app de logística desconectado do `pedido_id`.

Alterar esta ADR exige alinhamento explícito ao estudo 32.
