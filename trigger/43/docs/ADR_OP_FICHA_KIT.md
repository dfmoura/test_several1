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
    Devolver   ENTRADA_SOBRA  (antes de concluir OU na conclusão)
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
| **Devolver “Já saiu”** | Antes de concluir: `POST /estoque/retiradas/{op}/devolver` → mesmo `ENTRADA_SOBRA` + `EstoqueSaldoWriter`, reduz `qtde_requisitada`, zera `saida_movimento_id` se voltar tudo. UI na porta estoque **e** na OP se o usuário tem `estoque.escrever` (mesmo motor; sem formulário duplicado para quem só tem produção). Sem estorno inventado, sem segundo writer. Avaria da separação é limitada ao que ainda está fora. |

### Superfície

Duas pessoas, duas telas — o motor é o mesmo.

| Porta | Quem (RBAC) | Mostra | Não mostra |
|-------|-------------|--------|------------|
| OP | PCP (`producao.ler`); confirmar exige `estoque.escrever` | Cabeçalho da ficha do item + insumos do kit no formulário de faixa. | Busca no estoque, montar kit do catálogo, receber na máquina |
| Estoque · **A buscar** | Almoxarifado (`estoque.ler`) | O que **sai da prateleira**. Marca volume e **Confirmar = saiu**. Em **Já saiu**: **Devolver à prateleira** (mesmo MOV de sobra). | Receber na máquina, etiquetas boas |
| Produção · **Na máquina** | Chão (`producao.ler`) | O que **já saiu**: conferir, **Confirmar: recebi**, produzir, devolver sobra na conclusão | Marcar prateleira, baixa de estoque |

Menu: **A buscar** vive em Estoque (`estoque.ler`). **Na máquina** vive em Produção (`producao.ler`). Confirmar saída exige `estoque.escrever`; receber na máquina exige `producao.escrever`. O papel PRODUCAO não busca na prateleira.

**Kit (lista):** cada material mostra **quanto a OP precisa** (`qtde_planejada`) e a sugestão FEFO. Bobina: **metro linear da pista do PED** **e** m². Writer e concluir ficam em m². Sem segundo saldo.

Estados do kit: **falta pegar · já saiu · sem estoque**.

### Happy path (obrigatório na UX)

| Passo | Ação |
|-------|------|
| OP | Cabeçalho da ficha do item (formulário + modelos e valores) e, em seguida, os insumos do kit. Acrescenta ou remove volume/unidade **já conhecidos** do estoque, no formulário de faixa do orçamento. Sem busca. Quem tem `estoque.escrever` confirma a saída no mesmo `POST …/confirmar`; quem só lê segue para A buscar. |
| Estoque · A buscar | Por linha: **Saiu** (FEFO/qtde). Rodapé: **Confirmar saída sugerida (N)** → `POST …/confirmar-pendentes`. |
| Overlay | Só **Outro volume** (motivo) ou **Devolver**. Não é o caminho feliz. |

Ficha impressa: link na toolbar. Sem segunda lista embutida na página do chão.

### Como escolher (produto manda)

| Produto | Happy path | Exceção (overlay) |
|---------|------------|-------------------|
| Bobina / papel / filme | FEFO automático | Marca outro volume + motivo |
| Tubete, caixa | Igual ao papel quando o SKU controla volume; senão, qtde | Outro volume do mesmo SKU + motivo |
| Tinta, MUC | qtde planejada · FEFO no writer | Ajusta qtde no overlay |

Não exigir que a soma case o m²/UN planejado. Motivo só se o volume for outro que o FEFO. Invariante: soma de `volumes[]` = `qtde` da saída.

### Ficha impressa

`/ordens-producao/:id/ficha` é a ordem de flexografia, retrato A4, sem preço. Leitura: ordem (produto, quantidade, máquina, cliente) → impressão (substrato, medida, bobina, faca, saída, tubete, artes) → quanto rodar (etiquetas, metragem, área, acerto, rolos, caixas da faixa travada, cada um com rótulo) → material. A seção Material é uma tabela por grupo. O saldo da bobina (Precisa, Escolhido ou Saiu, Falta, Passa ou Coberto) é uma linha da tabela, com a mesma conta da tela. Situação é a última coluna. Sem item escolhido, a linha ainda sai: nome de origem, quantidade planejada e situação. A escolha do SKU de papel ou acabamento grava `produto_id` no material, sem movimento de estoque. Confirmar saída continua a única baixa. Volume marcado fora do FEFO só entra na ficha depois dessa baixa. O apontado no orçamento entra no grupo, com o Precisa na quantidade. Sem campo editável e sem saldo vivo de prateleira. A tela da ordem repete a impressão numa linha. Sem anilox, clichê, rpm, hora de troca. `faca_posicao` e `coluna_rebobinacao` viajam na especificação do item do PED.

## Proibido

1. Documento `CART-` / `REQ-` ou segundo writer.  
2. Reservar saldo (empenho pesado) sem ADR novo.  
3. Abrir o estoque geral para montar o kit do zero.  
4. Juntar as três portas de novo na OP.  
5. Explodir SKU por arte/cliente.

Alterar esta ADR exige decisão explícita (produção + estoque + UX).
