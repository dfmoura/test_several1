# ADR-039-EST-003 — Inventário profissional + ajuste (INV → AJU)

**Status:** Aceito  
**Data:** 2026-08-12  
**Contexto 39:** BL-042  
**Norma:** `../32` — `AJUSTE_ESTOQUE_INVENTARIO.txt` · `CONTROLE_ESTOQUE_PROFISSIONAL.txt` · `CASOS_USO_M04_ESTOQUE.txt`  
**Estende:** `ADR_ESTOQUE_REPOSICAO_AJUSTE.md` (BL-036) · preserva `ADR_COMPRAS_ATE_ESTOQUE.md`

---

## Decisão

Completar o fluxo canônico do estudo 32 **ao redor** do AJU já existente, sem segundo caminho de saldo:

```
INV- (cego 1ª → confrontação → 2ª por outra pessoa)
  → checklist → AJU- PENDENTE (origem INV_*|VIRADA)
    → alçada por valor → MOV AJUSTE → EstoqueSaldoWriter
```

Contagem avulsa (`CONTAGEM_AVULSA`) permanece para divergência pontual autorizada, com as mesmas regras de SoD, checklist, alçada e congelamento.

### Extrato (kardex leve)

`GET /estoque/produtos/{id}/extrato` — movimentos do SKU na EMP + saldo atual. Auditoria operacional; não é SPED/Bloco H.

### Alçadas (valores iniciais do estudo; parametrizáveis depois)

| Valor |Δ| × CM | Aprovação |
|-------------------|-----------|
| ≤ R$ 500 | `estoque.aprovar` |
| R$ 500,01–5.000 | + `estoque.aprovar_gestor` |
| > R$ 5.000 ou INV GERAL/VIRADA | gestor + ciência diretoria e contabilidade no AJU |

Divergência relevante (> R$ 1.000, > 5% do saldo, ou 3º AJU/SKU/6 meses) exige `causa_raiz` antes de aprovar.

### Congelamento

SKU com item de INV em contagem ativa: bloqueia `receber()` e novo AJU avulso na mesma EMP.

### Fiscal (fronteira)

AJU não emite NF-e. Motivos A04/A06/A09: aviso de possível NF-e de baixa (CFOP 5.927) — validar com contabilidade; sem Focus nesta fatia. Devolução ao fornecedor nunca é ajuste.

---

### Cancelar solicitação (PENDENTE)

Enquanto o AJU está `PENDENTE` (sem MOV), o solicitante ou quem tem `estoque.aprovar` pode **cancelar** → status `CANCELADO`.  
Não é exclusão física: o documento permanece no histórico. Aprovado/rejeitado não cancela.  
Se veio de INV, o item volta a `RECONTADO` para eventual novo AJU.

---

## RBAC

| Permissão | Uso |
|-----------|-----|
| `estoque.ler` | Ver INV / extrato / AJU |
| `estoque.escrever` | Abrir INV, contar, gerar AJU, solicitar avulsa |
| `estoque.aprovar` | Aprovar/rejeitar AJU (faixa baixa) |
| `estoque.aprovar_gestor` | Faixas médias/altas e ciência GERAL/VIRADA |

SoD: quem solicitou ≠ quem aprova; quem contou o item do INV ≠ quem aprova o AJU gerado.

---

## Proibido

1. Editar `estoque_saldos` fora de `EstoqueSaldoWriter`.
2. AJU sem contagem / checklist / motivo A01–A11.
3. Mostrar saldo do sistema na UI/API de contagem cega.
4. Aprovar o próprio AJU ou AJU contado por si no INV.
5. Entrada OC ou AJU avulso em SKU congelado por inventário.
6. Emitir NF-e / SPED a partir do AJU.

---

## Fora de escopo

- Saídas OP / sobra / PA / REM  
- Endereço / lote na contagem  
- ABC automático / agenda cíclica  
- Focus / NF-e 5.927  
- Bloco H / SPED  
- Anexos binários (foto/BO)
