# ADR-043-PRD-006 — Partida / refile de bobina na OP (largura ≥ papel)

**Status:** Aceito (norma; implementação por fases)  
**Data:** 2026-11-10  
**Contexto:** instalação 43 · kit «O que sai do estoque» · bobina mais larga que o papel do PED  
**Preserva:** `ADR_PRODUCAO_PED_OP_ESTOQUE.md` · `ADR_PRODUCAO_COLETA_DIRIGIDA.md` · `ADR_OP_FICHA_KIT.md` · `ADR_PRODUCAO_APONTAMENTO.md` · `ADR_CADASTRO_INSUMO_VOLUME.md` · `ADR_ESTOQUE_LOTE_VALIDADE.md` · `ADR_RASTREIO_INSUMOS_PRODUCAO.md` · `ADR_UNIDADES_PRODUTO.md` · `MODELO_INSTALACAO_MULTI_EMPRESA.md`

---

## Contexto

A OP já baixa bobina **inteira** (`SAIDA_PRODUCAO`) e devolve sobra de **comprimento** no **mesmo** volume/SKU (`ENTRADA_SOBRA` + `EstoqueSaldoWriter` sincroniza `comprimento_m`). A coleta filtra volumes com largura ≈ papel do PED (`largura_cm × colunas`, tolerância 0,51 mm).

No chão, muitas vezes a bobina disponível é **mais larga** que a pista. Exemplo:

| Papel | Necessidade | Bobina escolhida |
|-------|-------------|------------------|
| 15,5 cm | 300 m lineares | 18 cm × 1000 m |

Fisicamente: corta-se a faixa do papel e sobram **dois** corpos a guardar:

1. **Refile** — 2,5 cm × 1000 m (largura sobrando no comprimento inteiro do pai)  
2. **Sobra útil** — 15,5 cm × 700 m (faixa do papel após consumir 300 m)

Área (M2) conserva: `0,18×1000 = 0,155×300 + 0,025×1000 + 0,155×700`.

Hoje o sistema **impede** escolher a bobina de 18 cm. Não há nascimento de volume com geometria nova a partir da OP (só reentrada no lote da saída). MP-RET cobre retalho **sem** origem — inadequado quando o pai é conhecido.

## Decisão

```
Mesma medida do papel
  → caminho atual (FEFO · bobina inteira · ENTRADA_SOBRA no mesmo lote)

Largura do volume ≥ largura do papel (mesmo SKU, grupos M2 de bobina)
  → SAIDA_PRODUCAO do volume pai inteiro (norma intacta)
  → plano de partida (preview na escolha + no retorno)
  → ENTRADA_SOBRA cria N volumes novos (mesmo SKU) com L×C reais
  → Guardar local + etiqueta VOL: em cada sobra
```

| Escolha | Motivo |
|---------|--------|
| **Baixa continua bobina inteira** | Emenda «volume inteiro» de `ADR_CADASTRO_INSUMO_VOLUME.md`. Não baixar fração do rolo. |
| **Partida no retorno / antes do fecho** | Espelha Devolver + A buscar. Saída não inventa saldo paralelo. |
| **Mesmo SKU** | Retalho com origem conhecida permanece no material de origem — não MP-RET. |
| **Até 2 volumes novos** | Refile `(L_pai−L_papel)×C_pai` e sobra útil `L_papel×(C_pai−C_usado)`. Zero se a dimensão zerar. |
| **Medida exata = volume novo de sobra** | Emenda c: «Passa» também nasce VOL: (pai qtde 0); local + etiqueta no kit. |
| **Preferir medida do papel** | FEFO na faixa exata primeiro; larguras maiores em segunda faixa («cabíveis por partida»). |
| **Um Writer · um MOV** | `ENTRADA_SOBRA` + `VolumeGeometria`. Sem segundo saldo, sem AJU disfarçado de produção. |
| **Genealogia = MOV** | Pai saiu na OP; filhos entram com `origem_tipo=PRODUCAO` e vínculo `ordem_producao_id` no MOV. Sem FK obrigatória `lote_pai` no dia 1. |

### Escopo

| Dentro | Fora |
|--------|------|
| Grupos bobina com saldo **M2** e L×C no volume: MP-PAP, MP-FLM, MP-LAM (e equivalentes do kit que já usam `planejarBobinaInteira`) | MP-TEC / MP-CLD / MP-ADF (largura identifica SKU — outra regra) |
| Mesmo `produto_id` da linha do kit (ou SKU já escolhido no grupo) | Troca de grupo sem `motivo_grupo` |
| Partida longitudinal (refile de largura) + sobra de comprimento na faixa do papel | Corte transversal arbitrário, multi-faixa N>2, retalho anônimo → MP-RET |
| UI no kit OP + Estoque · A buscar (devolver / guardar / etiqueta) | Menu novo, hub, Painel com gráfico, segundo writer |

### Geometria canônica

Seja:

- `L_p`, `C_p` — largura (mm) e comprimento (m) do volume pai  
- `L_n`, `C_n` — largura do papel da OP e metros lineares **necessários** (pista do PED; cobertura como hoje)  
- `C_u` — metros lineares **usados** na faixa do papel (na devolução/fecho: o que não volta como sobra útil; default = `min(C_n, C_p)` ajustado por perda/avaria já existente)

Invariantes (unidade interna M2 via `VolumeGeometria`):

1. `L_p ≥ L_n` (tolerância atual 0,51 mm trata igualdade; estritamente maior abre partida).  
2. `C_p ≥ C_u` — não pode faltar metro linear na faixa do papel.  
3. Conservação:  
   `L_p×C_p = L_n×C_u + (L_p−L_n)×C_p + L_n×(C_p−C_u)`  
   (em mm/m convertidos de forma consistente; qtde oficial = área fechada).  
4. Refile com `(L_p−L_n) ≈ 0` → não nasce volume de refile.  
5. Sobra útil com `(C_p−C_u) ≈ 0` → não nasce volume de comprimento.  
6. Três valores L/C/m² contraditórios → conferência para; não escolher número em silêncio.

### Fluxo (happy path)

```
1. Kit · O que sai do estoque
     · Faixa A: volumes L ≈ L_n (FEFO) — default
     · Faixa B: volumes L > L_n, mesmo SKU, C_p ≥ C_n — «outras larguras»
     · Preview se Faixa B: «Consome L_n×C_n · volta refile · volta sobra útil»

2. Confirmar saída (OP com estoque.escrever ou A buscar)
     · SAIDA_PRODUCAO do pai inteiro (qtde = lote.qtde)
     · Marca no material/volume: partida_prevista (plano serializado; sem MOV extra)

3. Produzir

4. Devolver sobras (antes do fecho) — porta Estoque · A buscar e OP se estoque.escrever
     · ENTRADA_SOBRA (Passa e partida):
          · não restaura o pai com geometria antiga
          · pai permanece qtde 0 (partido / consumido)
          · cria 1–2 volumes novos (código sequencial PRODUCAO/OP, L×C reais, mesmo SKU)
          · usuário informa endereco_id na grade do kit (ou Guardar em seguida)
          · CTA Imprimir etiquetas → /estoque/lotes/etiquetas (faces VOL: 50×40)

5. Fechar OP
     · Se ainda houver plano de partida pendente com área a devolver → bloquear fecho
       (obrigar guardar sobras) OU, se política explícita de «usou tudo», zerar plano com motivo
     · Emenda 2026-10-09 (retorno zerado no fecho) **não** engole partida sem volumes:
       partida pendente ≠ «usou»; exige passo 4
```

### Superfície UX

| Onde | O quê |
|------|--------|
| `OpInsumosReservados` / overlay de volumes | Duas faixas; preview de sobras; sem abrir estoque geral |
| Estoque · A buscar · Já saiu | **Devolver partida** quando o volume baixado tem plano; local por sobra; imprimir etiquetas |
| Ficha impressa / ficha-chão | Dimensão do volume escolhido; se partida, nota curta «partida → refile + sobra» (sem QR novo na ficha) |
| Etiqueta de estoque | Mesma face F3 (`ADR_CADASTRO_INSUMO_VOLUME`); L×C novos na face; **sem local na face** |

Copy operacional (pt-BR, curto):

- «Medida do papel» / «Outras larguras (partida)»  
- «O que volta ao estoque» — lista das sobras calculadas  
- «Guardar e imprimir etiqueta»

### Motor (pontos de extensão — sem inventar cérebro)

| Peça | Papel |
|------|--------|
| `ProducaoColetaService::loteNaLarguraPapel` | Exato vs `≥` (flag/contexto de listagem) |
| `planejarBobinaInteira` / `assertVolumesCobremNecessidade` | Cobertura em m lineares na **largura do papel**, não na do pai |
| `volumesParaEscolha` | Duas faixas + campos de plano |
| `OrdemProducaoService::devolverMaterial` / concluir | Ramo partida → volumes novos via Writer |
| `EstoqueSaldoWriter` + `VolumeGeometria` | Única escrita; fecha L×C×m² |
| Etiquetas / Guardar | Reuso; sem canal paralelo |

Persistência mínima do plano (sugestão de implementação; não é segundo ledger):

- JSON no material ou na alocação do volume baixado:  
  `{ lote_pai_id, L_p, C_p, L_n, C_n, C_u_previsto, refile?: {L,C}, sobra?: {L,C} }`  
- Fato oficial de quantidade continua sendo o MOV.

### Invariantes

1. Isolamento `empresa_id` em lote, MOV, endereço, QR.  
2. Saldo e CM só via `EstoqueSaldoWriter`.  
3. Soma das áreas das sobras + área consumida = área do pai (tolerância decimal do `PadraoDecimal`).  
4. Sem explodir SKU por L×C.  
5. Sem usar `estoque_lotes` / `VOL:` para bobina de PA (`ADR_PA_EMBALAGEM_BOBINA_CAIXA.md`).  
6. Genealogia = leitura dos MOV da OP — sem ledger paralelo de insumos.  
7. Baixa de chão permanece bobina inteira.

## Proibido

1. Segundo writer / update direto em `estoque_saldos` ou `estoque_lotes.qtde`.  
2. Baixar só a faixa do papel deixando o pai «mágico» na prateleira.  
3. Mandar refile conhecido para MP-RET.  
4. Auto-devolver no sync sem local/etiqueta/humano.  
5. Misturar partida com TEC/CLD/ADF nesta ADR.  
6. Menu/hub novo ou slot no Painel.  
7. Relajar o filtro para `L < L_n` (faltar largura).

## Aceite (fases)

- [x] **F0 — Norma** · este ADR + apontadores nos irmãos  
- [x] **F1 — Motor de plano** · `PartidaBobina` · listagem `L≥L_n` · preview · asserts · testes unitários  
- [x] **F2 — Saída** · `partida_prevista` JSON · plano antes da baixa · regressão FEFO medida exata  
- [x] **F3 — Retorno** · `ENTRADA_SOBRA` cria volumes novos · bloqueio de fecho com partida pendente · «usou tudo»+motivo  
- [x] **F4 — UX kit** · `faixa`/`partida_preview` na escolha · hint de partida no kit (Guardar/etiqueta = canais já existentes)  
- [x] **F5 — Regressão** · `ProducaoColetaDirigidaTest` + `PartidaBobinaTest` (24+8)  

## Emenda 2026-11-10b — «Passa» = retorno previsto

O balanço **Precisa · Saiu · Passa** deixa de ser só indicador. Se `Passa > 0` na saída da bobina inteira:

| Caso | Plano em `partida_prevista` | Devolver |
|------|-----------------------------|----------|
| Medida do papel (`L ≈ L_n`) | `tipo=sobra_comprimento` · sobra `L_n × (C_p−C_u)` | volume novo (emenda c) |
| Largura maior | `tipo=partida` · refile + sobra | volumes novos |

- Kit: bloco **Bobinas a devolver** (grade).  
- Fecho bloqueia com plano `pendente` (salvo «usou tudo» + motivo).  
- Sem segundo writer · sem MP-RET com origem conhecida · sem engolir «Passa» no fecho.

## Emenda 2026-11-10c — 1 bobina física por largura × metro (kit)

«Passa» e partida deixam de ser só KPI/hint. No **Papel / Acabamento** («O que sai do estoque»):

| Decisão | Motivo |
|---------|--------|
| **Sempre volume novo** (também `sobra_comprimento`) | Etiqueta `VOL:` + local por bobina; pai permanece qtde 0 |
| **Grade no kit** | 1 linha = 1 bobina (`refile` e/ou `sobra`) com L × C × m² |
| **Local obrigatório no confirmar** | `locais[]` no devolver → `endereco_id` no Writer |
| **CTA Imprimir etiquetas** | Reuso `/estoque/lotes/etiquetas?ids=` após materializar |
| **Hidratação de OP antiga** | Sem `partida_prevista`: reconstitui C do pai pela área da SAIDA × L e grava o plano |

## Emenda 2026-11-10d — «O que volta» nunca some com Passa

No próprio grupo Papel/Acabamento, **após** o balanço Precisa·Saiu·Passa:

| Decisão | Motivo |
|---------|--------|
| **Bloco «O que volta ao estoque»** | Mesmo padrão de tabela do kit (medida · m² · m · **Local**) |
| **Visível se Passa > 0** | Mesmo sem JSON ainda — preview + GET/hidratação; confirmar exige plano oficial |
| **Local = coluna obrigatória** | Espelha a coluna Local do que saiu; devolver sem local bloqueia |
| **Hidratação no show e no devolver** | Writer único; sem segundo saldo |

## Emenda 2026-11-11 — Quadro das 3 partes (UX, sem 3º volume)

O exemplo de negócio (18×1000 → 15,5×300 + 2,5×1000 + 15,5×700) continua **conservação de área**. Na UI:

| Parte | No estoque? | Como aparece |
|-------|-------------|--------------|
| Produção L_n×C_u | **Não** (consumo) | Linha «Produção (consome)» no quadro |
| Refile (L_p−L_n)×C_p | **Sim** (VOL: novo) | «Volta · refile» + Local no kit |
| Sobra L_n×(C_p−C_u) | **Sim** (VOL: novo) | «Volta · sobra (Passa)» + Local no kit |

- Quadro na **escolha** (kit / overlay / pick) e no **retorno**.  
- **Sem** bobina de prateleira para a faixa de produção.  
- Etiqueta: face VOL: **sem local** (local no sistema).  
- Retorno **antes do fecho** (fecho bloqueia pendente).  
- KPI **Passa** com N>1 bobinas: copy `N bobinas · Xm²` (não um metro único enganoso).  
- Devolver no overlay: **1 linha por bobina** (refile / sobra) + local — pai na SAIDA continua 1 volume.

Invariantes intactos: um Writer · `ENTRADA_SOBRA` · mesmo SKU · isolamento `empresa_id` · sem segundo saldo.

## Emenda 2026-11-11b — N volumes na medida exata (Passa por bobina)

Quando a baixa traz **N bobinas** da medida do papel e a necessidade cabe em menos que N:

| Decisão | Motivo |
|---------|--------|
| **Alocar `C_u` na ordem dos volumes** | 1º cobre a metragem; demais com `C_u=0` voltam inteiros |
| **1 plano / 1 bobina física** | Nunca agregar Passa em `155×(soma C)` — KPI Passa soma; grade lista N linhas |
| **Sobra por residual de área** | `qtde_sobra = área_pai − área_consumida` (fecha L+C a partir do residual) — evita falha `155,0001≠155` por arredondamento L×C |
| **`C_u=0` é plano válido** | VolumeGeometria rejeita C≤0; o motor trata «inteiro volta» sem chamar fechar(C=0) no consumo |
| **Medida nos baixados** | Após SAIDA o lote tem C=0; API reconstitui C da área do MOV × L (kit não mostra `× 0 m`) |
| **Fallback FE** | Só 1 volume baixado pode inventar linha provisória; N>1 espera `partida_prevista` |

Exemplo: Precisa 264,59 m · 2× (155 mm × 1000 m) → volta `155×735,41` + `155×1000` (Passa 1.735,40 m / 268,98 m²).

## Emenda 2026-11-11c — Quadro único · hidratar plano incoerente · CTA perda

| Decisão | Motivo |
|---------|--------|
| **Um quadro Passa com N voltas** | Consumo total (`Σ C_u`) + 1 linha por bobina; sem «Produção 0 m» na bobina inteira |
| **Hidratar se `Σ C_u ≠` necessidade** | Plano stale (ex.: 707 m / 109,59 m²) é recriado no show; preserva `devolvido` |
| **Material PAPEL mantém unidade M2 do BOM** | Saída não sobrescreve com `unidade_interna` M do SKU |
| **CTA «Apontar perda»** | Botão de ação (não status); status de perda continua «Perda» na qtde |

## Emenda 2026-11-11d — C_p real · metragem ≠ m²

| Decisão | Motivo |
|---------|--------|
| **SKU M: qtde do MOV = metro** | Nunca `fechar(L, null, 1000)` como m² → C_p fantasma 6.451 m |
| **C_p do plano ≤ comprimento real do volume** | Hidrata de novo se C_p ≫ qtde (M) ou área÷L (M2) |
| **planejada ≈ metragem e faixa tem m²** | Corrige `qtde_planejada` para m² da faixa (só quando vazou metragem no campo de área) |

## Emenda 2026-11-11e — Partida em N bobinas (2 pais → 3 VOL:)

Exemplo: precisa **1.707,04 m** @ 155 mm (**264,59 m²**) · estoque 2× (180×1000):

| Decisão | Motivo |
|---------|--------|
| **`C_p ≥ C_u` por volume** | Não exigir `C_p ≥ C_n` total — a ordem pode espalhar em N bobinas |
| **Vol1 `C_u=1000`** | Consome 155×1000 · volta refile 25×1000 · sem sobra de comprimento |
| **Vol2 `C_u=707,04`** | Consome 155×707,04 · volta refile 25×1000 + sobra 155×292,96 |
| **3 VOL: no devolver** | 2 refiles + 1 sobra (consumo não vira estoque) |
| **Quadro único** | Consumo ΣC_u + cada refile/sobra como linha |

Sem segundo writer · SAIDA do pai inteiro · retorno via `ENTRADA_SOBRA`.

Alterar esta ADR exige decisão explícita (produção + estoque + UX). Sem segundo writer e sem explodir SKU.
