# ADR-043-PRD-005 — Ficha da OP = etiqueta + kit (carrinho)

**Status:** Aceito  
**Data:** 2026-09-27  
**Contexto:** instalação 43 · reclamações de teste: OP incompreensível  
**Preserva:** `ADR_PRODUCAO_PED_OP_ESTOQUE.md` · `ADR_PRODUCAO_COLETA_DIRIGIDA.md` · `ADR_PRODUCAO_APONTAMENTO.md` · `ADR_PAINEL_COCKPIT.md`

---

## Contexto

O motor PED → OP → `SAIDA_PRODUCAO` → handoff → `ENTRADA_SOBRA` / `ENTRADA_PA` está certo. A superfície misturava PCP, almoxarifado e chão num dossiê (empenho, requisição, complementar, MOV, FEFO). O usuário precisa da **ficha da etiqueta** e de um **kit** para buscar, entregar, produzir, devolver e repor.

## Decisão

```
OP = ficha da etiqueta (herói + jornada + kit)
  kit = materiais[] da OP (sem CART- / REQ-)
    Momento A  ver o que pegar + onde          (empenho leve)
    Momento B  lista de retirada no estoque    (SAIDA_PRODUCAO)
    Entregar   handoff                         (sem MOV)
    Produzir   chão
    Devolver   ENTRADA_SOBRA
    Repor      nova baixa no mesmo kit
```

| Escolha | Motivo |
|---------|--------|
| **Sem entidade carrinho** | O kit já é a lista viva. Segundo ledger piora o teste. |
| **Três portas** | OP entende; Estoque busca; Produção fecha. Sem mega-tela. |
| **Um CTA** | Só a próxima ação. |
| **Avaria numa porta** | Só na lista de retirada. OP não duplica o formulário. |
| **Extra = acrescentar no kit** | Mesmo `materiais[]` + confirmação no estoque. |
| **1 kit por OP** | Pedido com N etiquetas = N fichas. Onda de separação = ADR futuro. |

### Superfície

Duas pessoas, duas telas — o motor é o mesmo.

| Porta | Quem (RBAC) | Mostra | Não mostra |
|-------|-------------|--------|------------|
| OP | PCP (`producao.ler`) | Ficha da etiqueta + **cesta**. Overlay só mostra. | Confirmar saída, receber na máquina |
| Estoque · **A buscar** | Almoxarifado (`estoque.ler`) | O que **sai da prateleira**. Marca volume e **Confirmar = saiu**. | Receber na máquina, etiquetas boas |
| Produção · **Na máquina** | Chão (`producao.ler`) | O que **já saiu**: conferir, **Confirmar: recebi**, produzir, devolver sobra | Marcar prateleira, baixa de estoque |

Menu: **A buscar** vive em Estoque (`estoque.ler`). **Na máquina** vive em Produção (`producao.ler`). Confirmar saída exige `estoque.escrever`; receber na máquina exige `producao.escrever`. O papel PRODUCAO não busca na prateleira.

**Overlay, ficha e apontamento:** quantidade da bobina = **volumes** e, ao lado, **metro linear** (volume / SKU / pista do PED). Writer e concluir ficam em m². Filtro casa o lote, não o SKU. Sem segundo saldo.

Estados do kit: **falta pegar · já saiu · sem estoque**.

### Como escolher (produto manda)

| Produto | Chão marca | Confirmar envia |
|---------|------------|-----------------|
| Bobina / papel / filme (`PAPEL`, `MP-PAP`/`MP-FLM`/`MP-LAM`, L×C) | Volumes (inteiro por padrão) | `qtde` = soma dos volumes · `volumes[]` |
| Tubete, tinta, caixa, MUC | Unidades | `qtde` informada · FEFO no writer |

Não exigir que a soma case o m²/UN planejado. O pedido da ordem continua visível; o fato oficial é o físico. Motivo só se o volume for outro que o FEFO. Invariante da coleta permanece: soma de `volumes[]` = `qtde` da saída.

Porta do estoque: os mesmos azulejos. Sem segunda caminhada e sem abas de módulo na ficha.

## Proibido

1. Documento `CART-` / `REQ-` ou segundo writer.  
2. Reservar saldo (empenho pesado) sem ADR novo.  
3. Abrir o estoque geral para montar o kit do zero.  
4. Juntar as três portas de novo na OP.  
5. Explodir SKU por arte/cliente.

Alterar esta ADR exige decisão explícita (produção + estoque + UX).
