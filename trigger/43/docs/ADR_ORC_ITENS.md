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
| **Item** | Job | faca (geometria) · especificação técnica · escada · `modelos` + `modelos_composicao` · gordura · matriz · saída da etiqueta · result do motor da posição |

### Tipo de operação

- **Fase 1 (travada):** `tipo_operacao` no **cabeçalho** — proposta homogênea (PA **ou** SVC). Cessão de bem permanece fora do multi-item (fluxo patrimônio).
- **Fase 2 (só com ADR/FAT):** tipo no item para proposta mista PA+SVC — alinhado a `ADR_OPERACOES_SAIDA` (um FAT, dois DFS). **Fora** da primeira entrega de código.

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
   - **N>1:** hero do **total do orçamento** (Σ 1ª faixa) + resumo por item; na Proposta, acordeão por item (faixas/artes/facas); em Composição e Guia, seletor de item (sem repetir frete/validade/condições).
6. Lista de ORCs / códigos: **sem** explosão visual — um `ORC-`; detalhe pós-salvamento e **ficha operacional** (`/orcamentos/:id/ficha`) mostram N itens (guias / seções por item). N=1: layout clássico sem chrome multi.

### Relação com multi-faca

`ADR_ORC_FACAS_COMPOSICAO` deixa de ser o caminho para **N geometrias**. Emenda:

- **N geometrias** → N **itens** neste ADR.
- **Dentro de um item:** 0..1 faca que define geometria; extras opcionais só como ferramental/add-on do **mesmo** job (não segundo motor).

### Compatibilidade e fases de implementação

| Fase | Entrega | Regressão |
|------|---------|-----------|
| **0 — Norma** | Esta ADR + BL + emendas | Zero código |
| **1 — Paridade** | Modelo/API/UI com N=1 idêntico ao flat atual | Golden BRAHVA · testes ORC/aprovação/PED 1 linha |
| **2 — Multi-item ORC** | UI N>1 · proposta · totais Σ | Link/aprovação/frete intactos no cabeçalho |
| **3 — PED N linhas** | Espelho item→`pedido_itens` · OP por linha | Sem N PEDs por ORC |

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

**Futuro (fases 2–3 — não criar além do necessário):**
- UI multi-posição · proposta Σ · `PedidoService` · `pedido_itens` · FAT por item
- BL: `BL-106` em `docs/BACKLOG.md`
