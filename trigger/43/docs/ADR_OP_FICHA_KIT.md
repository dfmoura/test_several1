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
| OP | PCP (`producao.ler`); confirmar saída exige `estoque.escrever`; fechar exige `producao.escrever` | Cabeçalho da ficha, insumos do kit e, com material já saído, o fecho (etiquetas boas, refugo, tolerância). Depois de concluída: rolos reais e caixas. | Busca na prateleira, grade de consumo no fecho |
| Estoque · **A buscar** | Almoxarifado (`estoque.ler`) | O que **sai da prateleira**. Marca volume e **Confirmar = saiu**. Em **Já saiu**: **Devolver à prateleira** (mesmo MOV de sobra). | Etiquetas boas, rolos e caixas do PA |
| Produção | — | Sem item de menu próprio. Atalho antigo `/ordens-producao/apontamentos` abre a ordem. | — |

Menu: **A buscar** vive em Estoque (`estoque.ler`). O fecho vive em **Ordens de produção** (`producao.escrever`). O papel PRODUCAO não busca na prateleira.

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
4. Trazer a baixa de prateleira para o fecho da ordem.  
5. Explodir SKU por arte/cliente.

## Emenda 2026-10-12 — grupo da bobina e fecho com papel

Papel e acabamento com grupo de matéria-prima no catálogo nascem na OP sem SKU. A lista oferece só bobinas desse grupo, com saldo, da empresa. Bobina de outro grupo entra com motivo (mínimo 3 caracteres), gravado em `motivo_grupo` e na observação da saída. Sem grupo, o papel fica em item sem cadastro; o texto do orçamento não escolhe SKU. Acabamento sem grupo fica na guia, sem lista de bobina.

Etiqueta cujo snapshot pede papel (m² maior que zero) só conclui com linha PAPEL já saída. Sem essa saída não há entrada de produto acabado. Tinta, tubete e caixa não entram nesse fecho. Snapshot sem papel continua podendo concluir.

Ordem concluída não é recalculada. SKU já gravado e linha já saída não são reescritos.

## Emenda 2026-10-09 — fechar na ordem

A porta **Na máquina** sai do menu. O fecho (etiquetas boas, refugo, tolerância) fica na OP. A grade Material / Saiu / Rasgou / Sobra / Perda / Usou não volta para esse cartão. Sobra e rasgo continuam em Estoque · **A buscar**. Rolos reais e caixas alocadas são o passo seguinte, na mesma ordem, depois de `CONCLUIDA`.

## Emenda 2026-10-20 — fichas de chão (Impressão / Acabamento)

Satélites paisagem da ficha flexo, sem preço e sem mexer no kit. (Substituída pela emenda 2026-10-29.)

| Rota | Quem | Conteúdo |
|------|------|----------|
| `/ordens-producao/:id/ficha-impressao` | PCP / máquina (`producao.ler`) | Identidade do item + parâmetros de impressão |
| `/ordens-producao/:id/ficha-acabamento` | PCP / rebobinação (`producao.ler`) | Mesma identidade + parâmetros de rebobinação |

## Emenda 2026-10-29 — ficha de chão unificada

Um satélite paisagem A4 substitui as duas rotas acima. Toolbar: **Impressão e acabamento**.

| Rota | Quem | Conteúdo |
|------|------|----------|
| `/ordens-producao/:id/ficha-chao` | PCP / chão (`producao.ler`) | Identidade (1×) → Impressão · máquina (bloco completo) → Acabamento · rebobinação (**só exclusivos**: colunas reb., etiq/rolo, rolos, m/rolo) |

Rotas antigas `ficha-impressao` e `ficha-acabamento` redirecionam para `ficha-chao`. Sem repetir Item / metragem / acabamento / tubete / saída na banda de rebobinação (já na impressão na mesma folha). Grão = planilha do PED (`pedidoFichaPlanilha`) escopada ao **item da OP**. Sem gate de `SAIDA_PRODUCAO`. Sem alterar `/ficha` (flexo + kit).

## Emenda 2026-10-29b — três papéis (histórico)

Separava máquina / pick ticket / materiais. Substituída pela emenda 2026-10-29c (um papel).

## Emenda 2026-10-29c — um papel: máquina + retirada

Toolbar da OP: **Imprimir lista** + **Impressão e acabamento** apenas.

| Rota | Quem | Conteúdo |
|------|------|----------|
| `/ordens-producao/:id/ficha-chao` | `producao.ler` ou `estoque.ler` | Identidade → Impressão → Acabamento (exclusivos) → **Retirada · prateleira** (Levado · Local · Volume · Material · Levar · Validade) |

`ficha-materiais`, `ficha-impressao`, `ficha-acabamento` e `/estoque/retiradas/:id/ficha` redirecionam para `ficha-chao`. Confirmar saída continua só em Estoque · **A buscar** (ficha é guia; sem segundo writer). Sem prosa FEFO; tabela plana volume a volume.

Alterar esta ADR exige decisão explícita (produção + estoque + UX).
