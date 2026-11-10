# ADR — Ciclo de vida do produto (SKU): ATIVO · INATIVO · exclusão órfã

**Status:** Aceito  
**Data:** 2026-11-10  
**Relacionada:** guia de importação de produtos · `ADR_DEPARTAMENTOS.md` (padrão soft-delete com gate) · `ADR_ATIVACAO_EMPRESA.md` (preflight) · `ADR_CADASTRO_INSUMO_VOLUME.md` · catálogo ORC (`orc_catalogo_papeis` / `orc_catalogo_acabamentos`)

---

## Decisão

| Caminho | Quando | Efeito |
|---------|--------|--------|
| **ATIVO** | Padrão do cadastro | Aparece em pickers, catálogo ORC (espelho), compras, OP, REV. |
| **INATIVO** | SKU já usado ou aposentado no dia a dia | Some dos pickers / catálogo (situação ≠ ATIVO). **Histórico preservado.** Preferir sempre a excluir. |
| **Exclusão (soft-delete)** | Somente SKU **órfão** — nunca usado em etapa operacional | Soft-delete + `situação=INATIVO` + purge de satélites (de-para, espelho catálogo). **Código permanece reservado** (unique inclui soft-deleted). |

**Hard-delete de produto: proibido.**

---

## Gate de exclusão (preflight)

Espelho de Empresa: `GET /produtos/{id}/exclusao-preflight` → `{ pode_excluir, bloqueios[], mensagem }`.

Bloqueia se existir qualquer vínculo operacional na EMP (saldo/lote/MOV/AJU/INV, OC/cotação/necessidade, NF-e entrada, PED, OP, embalagem PA caixa, ou snapshot ORC com `produto_id` / `papel_produto_id` / `acabamento_produto_id` / `tubete_produto_id` / `caixa_produto_id`).

**Não bloqueiam** (satélites purgados na exclusão órfã):

- `produto_fornecedor_codigos`
- `orc_catalogo_papeis` / `orc_catalogo_acabamentos` (espelho 1:1 do SKU; auto-criado por `garantir*Sku`)

Mensagem canônica: *“Produto em uso. Inative (situação INATIVO) em vez de excluir.”*

---

## API / permissão

- `GET /produtos/{produto}/exclusao-preflight` — `produto.escrever`
- `DELETE /produtos/{produto}` — `produto.escrever` · revalida preflight · audit `EXCLUIR`
- Isolamento: `assertEmpresa` + `empresa_id` do contexto

---

## UX

No formulário de edição: botão **Excluir** (danger) desabilitado quando `!pode_excluir`, com hint dos bloqueios e orientação para **INATIVO**. Confirm explícito; revalidação no clique.

---

## Proibido

1. Apagar SKU com histórico (estoque, compras, ORC, PED, OP, NF-e…).  
2. Hard-delete.  
3. Liberar `codigo` após exclusão / reutilizar código de item inativo ou soft-deleted.  
4. Cascade silencioso via `nullOnDelete` no catálogo sem gate.  
5. Tratar EMP / stage como se resolvesse exclusão.

Alterar esta ADR exige decisão explícita (domínio cadastro + engenharia).

---

## Rastreio no código

- Service: `ProdutoService::avaliarExclusao` · `softDeleteSeOrfa`
- API: `ProdutoController::exclusaoPreflight` · `destroy`
- Web: `ProdutoFormPage` (botão + preflight)
- Teste: `tests/Feature/ProdutoExclusaoTest.php`
