# ADR — ORC cabeçalho × itens (proposta com 1..N jobs)

**Status:** Aceito  
**Data:** 2026-09-21  
**Contexto 43:** comercial · ORC → PED → OP → FAT  
**Norma:** estudo 32 — `GERACAO_ORCAMENTO.txt` · `GERACAO_PEDIDO.txt` · `CADASTRO_PRODUTOS_VENDA.txt`  
**Relacionadas:** `ADR_ORC_MODELOS_COMPOSICAO.md` · `ADR_ORC_FACAS_COMPOSICAO.md` (emenda) · `ADR_ORC_MOTOR_REGRAS.md` · `ADR_ORC_FRETE_ESTIMADO.md` · `ADR_ORC_GORDURA_COMERCIAL.md` · `ADR_ORC_LINK_APROVACAO.md` · `MAPA_FLUXO_POS_ORC.md` · `ADR_OPERACOES_SAIDA.md`

---

## Contexto

Jobs reais pedem **várias geometrias / specs** na **mesma proposta** ao cliente (mesmo parceiro, um link de aprovação, um frete, uma condição).

Uma tentativa anterior (`ADR_ORC_FACAS_COMPOSICAO`) modelou isso como **N facas no mesmo ORC**. Isso resolve ferramental do **mesmo** job, **não** N produtos/cálculos. O motor R1–R20 continua com **uma** geometria por passagem.

Hoje o ORC é flat: um `input_snapshot` / `result_snapshot` = um job. PED nasce **1:1** com o ORC e, na fase 1, **1 linha** de pedido.

---

## Decisão (canônica)

```
ORC  = documento comercial (cabeçalho)     → 1 código ORC- · 1 aprovação · 1 frete · 1 condição
Item = job / posição (detalhe 1..N)       → 1 passagem no motor · 1 geometria · 1 escada · 1 composição de artes
```

| Termo | Usar | Não usar |
|-------|------|----------|
| Documento | **Orçamento** / `ORC-` | — |
| Linha | **Item** · **posição** · **job** | “orçamento”, “sub-orçamento”, “faca extra como produto” |
| Artes no job | `modelos_composicao[]` | N itens só por arte |
| Ferramental do mesmo job | faca 0..1 (+ extras opcionais no item) | N geometrias via `facas[]` no documento |

**Regra de ouro:** geometrias / specs diferentes = **itens diferentes** no mesmo ORC. Artes do mesmo job = composição **dentro** do item. Facas extras = só ferramental do **mesmo** job (não substitui multi-item).

### Fronteira cabeçalho × item

| Camada | Pertence a | Exemplos |
|--------|------------|----------|
| **Cabeçalho** | Documento | `tipo_operacao` (fase 1) · parceiro/prospect · vendedor · validade · observação da proposta · entrega/frete · adiantamento/política · status · link de aprovação · totais consolidados |
| **Item** | Job | **Etiqueta:** faca · spec · escada · artes · gordura · matriz · saída da bobina · motor. **Revenda:** SKU `REV` · qtde · preço comercial — `ADR_ORC_ITEM_REVENDA.md`. |

### Tipo de operação

- **Fase 1 (travada):** `tipo_operacao` no **cabeçalho** — proposta homogênea (PA **ou** SVC). Cessão de bem permanece fora do multi-item (fluxo patrimônio).
- **Fase 2 (só com ADR/FAT):** tipo no item para proposta mista PA+SVC — alinhado a `ADR_OPERACOES_SAIDA` (um FAT, dois DFS). **Fora** da primeira entrega de código.
- **Revenda (mesmo trilho Venda de Produto):** `necessidade` no **item** (`PRODUCAO` \| `REVENDA`). Não é quarto tipo de cabeçalho. Norma: `ADR_ORC_ITEM_REVENDA.md`.

### Persistência

| Escolha | Motivo |
|---------|--------|
| Tabela `orcamento_itens` (`empresa_id`, `orcamento_id`, `ordem`, snapshots, rótulo opcional) | Auditável · espelhável em `pedido_itens` · sem JSON monolítico |
| ORC legado / fase de compat | Leitura materializa **1 item implícito** a partir dos snapshots atuais — **sem** migration destrutiva no dia 0 |
| Motor R1–R20 | **Inalterado** — N itens = N chamadas; `motor_version` por result de item |

### Totais (contrato comercial)

```
por item i:
  motor → valor_etiqueta_i (+ gordura_i) → valor_total_i
       → + matriz_i + faca_i + artes_i → valor_proposta_item_i

ORC:
  valor_total_proposta = Σ valor_proposta_item_i
  frete                = cabeçalho (informativo — nunca soma; ADR_ORC_FRETE_ESTIMADO)
  adiantamento / %     = sobre o total do documento (política vigente)
```

Proposta pública / link: **uma** decisão APROVAR|RECUSAR para o documento inteiro. Exibe posições 1..N + total geral.

**Faixa da escada (canônico):**

| Caso | Escolha | Persistência |
|------|---------|--------------|
| **N=1** / legado | Um `faixa_index` no documento — contrato histórico | `orcamentos.aceite_faixa_index` + o item único espelha |
| **N>1** | **Uma faixa por item** (escadas independentes) | `orcamento_itens.aceite_faixa_index`; cabeçalho = 1º item (compat) |

Total do documento no aceite = **Σ faixas escolhidas** (hero ao vivo no link; adiantamento/PIX na mesma base). Link antigo que manda só `faixa_index` em N>1: fallback — aplica o índice em quem tiver aquela faixa; senão a 1ª (`OrcamentoAceiteFaixas`). Sem recalcular o motor. Sem N links.

Ficha-cliente A4: opções por posição, **sem** rádio — a escolha é no `/p/:token`.

### Downstream

| Documento | Regra |
|-----------|--------|
| **Aprovação / Zap / e-mail / PIX** | Continuam **1 por ORC** (documento) |
| **PED** | Continua **1:1 ORC**; passa a ter **N `pedido_itens`** espelhando os itens do ORC (substitui “1 item fase 1”) |
| **OP/OS** | Continuam a partir do **PED** — nunca direto do ORC; tipicamente 1 OP/OS por linha de PED quando fizer sentido operacional |
| **FAT** | Linhas de etiqueta / faca / arte **por item** (mesmo padrão atual, N vezes) |
| **Comissão** | Base = etiquetas faturadas (Σ itens); faca/arte/frete fora — `ADR_COMISSAO_VENDEDOR` |

### UX

1. Wizard: **Tipo de operação** + **Cadastro** = cabeçalho fixo.
2. Bloco **Itens deste orçamento**: default **1** item (comportamento idêntico ao ORC de hoje).
3. Dentro de cada item: seções atuais **Faca → Especificação técnica → Quantidades (escada e artes)**.
4. Ações: adicionar · duplicar · remover (mín. 1) · reordenar.
5. Resultado (3 abas) — hierarquia documento × item:
   - **N=1:** zero chrome multi — Proposta / Composição / Guia iguais ao fluxo clássico.
   - **N>1:** hero do **total do orçamento** (Σ faixas **selecionadas** no link; Σ 1ª faixa na ficha/prévia) + resumo por item; na Proposta, acordeão por item com **seletor de faixa em cada posição**; em Composição e Guia, seletor de item (sem repetir frete/validade/condições).
6. Lista de ORCs / códigos: **sem** explosão visual — um `ORC-`; detalhe pós-salvamento e **ficha operacional** (`/orcamentos/:id/ficha`) mostram N itens (guias / seções por item). N=1: layout clássico sem chrome multi.

### Relação com multi-faca

`ADR_ORC_FACAS_COMPOSICAO` deixa de ser o caminho para **N geometrias**. Emenda:

- **N geometrias** → N **itens** neste ADR.
- **Dentro de um item (etiqueta):** **uma** faca (mapa ou nova). Extras só em ORC legado (leitura; não cresce). Outra geometria = outro item.

### Compatibilidade e fases de implementação

| Fase | Entrega | Regressão |
|------|---------|-----------|
| **0 — Norma** | Esta ADR + BL + emendas | Zero código |
| **1 — Paridade** | Modelo/API/UI com N=1 idêntico ao flat atual | Golden BRAHVA · testes ORC/aprovação/PED 1 linha |
| **2 — Multi-item ORC** | UI N>1 · proposta · totais Σ | Link/aprovação/frete intactos no cabeçalho |
| **3a — PED N linhas (comercial)** | Espelho item→`pedido_itens` com faixa e modelos da posição | Sem N PEDs · OP por linha fica 3b |
| **3b — OP por linha** | Abrir OP/OS a partir da linha | Sem N PEDs por ORC |

---

## Proibido

1. Chamar item de “orçamento” na UI, API ou código de domínio.
2. N motores / N geometrias num único item “porque tem N facas”.
3. SKU por arte ou por faca (estudo 32 / superfície FLEXOERP).
4. N links de aprovação ou N fretes por item na fase 1–2.
5. N PEDs gerados a partir de um ORC (explode andamento/FAT).
6. Alterar álgebra R1–R20 / `motor_version` por causa desta fatia.
7. Apagar `FacasComposicao` / testes legado sem caminho de leitura N=1.
8. Proposta mista PA+SVC no dia 1 sem fase 2 + ADR fiscal.
9. Segundo escritor de saldo / entrada sem OC (fora deste tema, mas não abrir atalho).

---

## Consequências

**Agora (fase 0):** decisão travada; implementação só via BL fatiada; runtime intacto.

**Depois:** comercial cotação dinâmica (1..N jobs) sem fragmentar a proposta; motor e isolamento `empresa_id` preservados; cadeia ORC→PED permanece 1 documento → 1 contrato com N linhas.

## Rastreio

**Fase 1 (paridade N=1):**
- Migration `2026_09_21_120000_create_orcamento_itens_table`
- Model `OrcamentoItem` · `Orcamento::itens()` · `App\Support\OrcamentoItens`
- Dual-write em `OrcamentoService::create` / `update` · `itens` no `show` (não na listagem)
- Testes: `OrcamentoItensTest` · asserts em `OrcamentoTest`

**Aceite por item (emenda 2026-09-25):**
- `orcamento_itens.aceite_faixa_index` · `App\Support\OrcamentoAceiteFaixas`
- API: `faixas_itens[]` no decidir; N=1 continua `faixa_index`
- UI: seletor por posição no `/p/:token` · total ao vivo · resumo no aceite
- Adiantamento: Σ escolhas quando N>1
- Testes: `OrcamentoAceiteFaixasTest` · asserts em `OrcamentoAprovacaoTest`

**Fase 3a (espelho comercial):**
- `PedidoService` cria N `pedido_itens` (etiqueta, revenda ou misto)
- Spec do item: faixa aprovada, modelos e matriz da posição
- Snapshot do cabeçalho permanece o 1º item (compat)
- Tela/ficha do PED: tabela hierárquica item → modelos da faixa contratada
- FAT lê preço/ferramental/artes por item quando a spec tem faixa; legado N=1 intacto

**Futuro (fase 3b — OP por linha):**
- OP/OS a partir da linha · sem N PEDs
- BL: `BL-106` em `docs/BACKLOG.md`
