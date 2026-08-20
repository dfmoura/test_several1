# ADR-039-CPR-001 — Compras até estoque (OC → MOV → TIT → BX)

**Status:** Aceito  
**Data:** 2026-08-10  
**Contexto 39:** BL-033  
**Norma:** `../32` — `COMPRAS_COTACAO_URGENCIA.txt` · `CASOS_USO_M07_COMPRAS.txt` · `CONTROLE_ESTOQUE_PROFISSIONAL.txt` · `RECEBIMENTO_BAIXA_COBRANCA.txt` · `NATUREZAS_GERENCIAIS_RECEITA_DESPESA.txt` · `CODIFICACAO_INFORMACOES_SISTEMA.txt`

---

## Decisão

Espinha **operacional** (sem burocracia de NEC/COT nesta fase):

```
OC- (sempre)
  → Entrada: NF × OC × conferência  →  MOV- (estoque + custo médio)
  → TIT- a pagar (nasce na entrada)
  → BX- (quando paga)
```

| Conceito | Prefixo | Papel |
|----------|---------|--------|
| Necessidade | `NEC-` | **Fora do dia a dia.** API/tabela preservadas; UI fora do menu. Futuro: OP / estoque mínimo. |
| Cotação | `COT-` | **Fora do dia a dia.** API/tabela preservadas; UI fora do menu. Futuro: comparativo multi-fornecedor. |
| Ordem de compra | `OC-` | Documento central do dia a dia (`origem=DIRETA`). Sem OC não entra estoque. |
| Movimento | `MOV-` | Única forma de alterar saldo; tipo `ENTRADA_COMPRA`. |
| Saldo | `estoque_saldos` | Qtde em **`unidade_interna`** apenas. |
| Título CP | `TIT-` | Contas a pagar (`tipo=PAGAR`); natureza folha obrigatória. |
| Baixa | `BX-` | Quitação contra CFIN; SoD: COMPRAS ≠ FINANCEIRO. |

**Menu Compras (agora):** Ordens de compra · Estoque.  
**Menu Financeiro:** Contas a pagar.

---

## Atalhos (anti-burocracia)

1. **Dia a dia:** OC → receber (NF×conferência) → TIT → BX.  
2. **Urgente** → flag na OC; **nunca** pula OC/NF/conferência/MOV.  
3. **Receber + confirmar** = **um ato**.  
4. **Programar pagamento** = TIT na entrada (não etapa à parte).  
5. **NEC / COT** voltam ao fluxo só com decisão explícita (OP, reposição, política de cotação).

---

## Natureza gerencial na compra de estoque

- Compra de bobina/MP/EMB/REV **entra estoque**; **não** lança custo `2.01` no TIT.  
- `2.01` = material **consumido** (futuro via OP) — ADR NAT.  
- TIT de compra de estoque usa folha **`5.06`** (`Pagamento a fornecedor de estoque`) — grupo 5 não-resultado.  
- Frete apropriado ao custo → `2.03` (quando item/frete separado).  
- Máquina/patrimônio → `4.xx` (fora deste fluxo de insumos).

---

## Unidades e custo

- OC / NF: quantidade e preço na **unidade comercial**.  
- MOV / saldo / `custo_medio`: **unidade interna** (`fator_conversao`).  
- Custo médio móvel half-up (`PADRAO_DECIMAL`).

---

## RBAC / SoD

| Permissão | Uso |
|-----------|-----|
| `compras.ler` / `compras.escrever` | OC (NEC/COT API reservadas) |
| `estoque.ler` / `estoque.escrever` | Conferência → MOV, saldos |
| `financeiro.ler` / `financeiro.escrever` | TIT, BX |

`COMPRAS`+`FINANCEIRO` no mesmo usuário permanece **proibido** (`RoleSodValidator`).

---

## Fora de escopo (esta entrega)

- Focus download automático / manifestação SEFAZ completa (XML: assistência BL-037 / ADR_ENTRADA_XML_ASSIST; chave/NF ainda podem ser manuais).  
- De-para `cProd` sem confirmação humana (persistência após receber = BL-037).  
- OP / empenho / UC-CPR-005 (OP parada).  
- Remessa de industrialização externa.  
- Entrada sem OC.  
- Contas a receber / COB.  
- Inventário rotativo completo / 2ª contagem cega (AJU contagem avulsa = BL-036).  
- UI operacional de NEC/COT (API ok; menu não).

---

## Proibido

1. Lançar saldo “no olho” sem MOV.  
2. Comprar “só no zap” sem OC.  
3. Usar `2.01` como natureza do TIT de compra de estoque.  
4. Editar `estoque_saldos.qtde` fora do serviço de MOV.  
5. Fundir NAT com `produto_grupos.natureza` ou CFIN.  
6. Reexibir NEC/COT no menu sem ADR alinhada ao estudo 32.

Alterar esta ADR exige decisão explícita alinhada ao estudo 32.
