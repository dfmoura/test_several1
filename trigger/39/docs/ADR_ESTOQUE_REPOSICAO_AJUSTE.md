# ADR-039-EST-002 — Reposição por mínimo + ajuste de estoque (AJU)

**Status:** Aceito  
**Data:** 2026-08-11  
**Contexto 39:** BL-036  
**Norma:** `../32` — `CONTROLE_ESTOQUE_PROFISSIONAL.txt` · `AJUSTE_ESTOQUE_INVENTARIO.txt` · `COMPRAS_COTACAO_URGENCIA.txt`  
**Preserva:** `ADR_COMPRAS_ATE_ESTOQUE.md` (espinha OC→MOV→TIT→BX)

---

## Decisão

Extensão **ao redor** da espinha BL-033, sem reabrir NEC/COT no menu e sem editar saldo na tela.

### A) Reposição gerencial

```
estoque_mínimo (unidade_interna) × saldo × OC em trânsito
  → lista "A repor" (MP|EMB|REV)
  → humano confirma fornecedor/preço/qtde
  → OC DIRETA
```

- `estoque_minimo` comparado em **unidade_interna**.
- Em trânsito = pendente de OC `ABERTA|PARCIAL` convertido para interna.
- Faltante comercial = faltante interna ÷ `fator_conversao` (para a OC).
- NEC/COT continuam API-only (ADR-039-CPR-001).

### B) Ajuste (contagem avulsa)

```
Contagem → AJU- PENDENTE (motivo A01–A11 + checklist)
  → aprovação por outro usuário (estoque.aprovar)
  → MOV tipo AJUSTE → saldo via EstoqueSaldoWriter
```

- Quem solicita ≠ quem aprova (SoD).
- Motivos canônicos do estudo 32; A04/A06/A07/A09 exigem complemento.
- Sem inventário rotativo completo / recontagem cega nesta fatia (origem `CONTAGEM_AVULSA` pronta; INV_* reservados).

### Menu Compras (agora)

Ordens de compra · **A repor** · Estoque (com link **Ajustes**).

---

## RBAC

| Permissão | Uso |
|-----------|-----|
| `compras.ler` / `compras.escrever` | Ver reposição / gerar OC |
| `estoque.ler` / `estoque.escrever` | Ver/solicitar AJU |
| `estoque.aprovar` | Aprovar/rejeitar AJU (ADMIN no seed) |

---

## Fora de escopo

- Focus download / manifestação SEFAZ (XML assist = BL-037).  
- Inventário rotativo completo (cega + 2ª contagem).  
- UI NEC/COT no menu.  
- Saídas de produção / OP.  
- Alçadas por valor (faixas R$).

---

## Proibido

1. Editar `estoque_saldos` fora de `EstoqueSaldoWriter`.
2. Aprovar o próprio AJU.
3. Ajuste sem checklist / sem motivo codificado.
4. Gerar OC automática sem confirmação humana.
5. Reexibir NEC/COT no menu sem ADR nova.
