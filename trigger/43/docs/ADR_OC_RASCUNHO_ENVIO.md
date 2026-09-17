# ADR — OC rascunho → envio ao fornecedor

**Status:** Aceito · **Data:** 2026-09-06  
**Norma:** `ADR_COMPRAS_ATE_ESTOQUE.md` · `ADR_ESTOQUE_REPOSICAO_AJUSTE.md` · espelho `ADR_ORC_LINK_APROVACAO.md` / `ADR_ORC_EMAIL_PROPOSTA.md`  
**Escopo:** ciclo comercial da OC antes do recebimento (editar/excluir até enviar; e-mail detalhado ao fornecedor).  
**Fora:** NEC/COT no menu; WhatsApp Business; SMTP por EMP; PDF anexo obrigatório; auto-receber.

## Contexto

A OC nascia já em `ABERTA` (“Emitir”), sem edição/exclusão na UI e sem canal formal ao fornecedor. O operacional precisa ajustar qtde/preço/condição **antes** de comprometer trânsito e o pedido ao PAR.

## Decisão

Espelhar o ORC: documento editável só enquanto rascunho; envio formaliza e trava o bloco comercial.

```
criar (DIRETA | A repor | COT)
  → RASCUNHO   (editável · excluível · NÃO conta em trânsito)
       │
       ├─ PUT atualizar / DELETE soft-delete
       ├─ POST cancelar → CANCELADA
       └─ POST enviar → ABERTA + enviado_em
              │         (+ e-mail fail-soft ao fornecedor)
              ├─ receber → PARCIAL | RECEBIDA
              └─ cancelar (sem recebimento) → CANCELADA
```

| Escolha | Motivo |
|---------|--------|
| Status `RASCUNHO` | Separar preparação de compromisso; trânsito / receber só em `ABERTA\|PARCIAL`. |
| `enviado_em` | Auditoria do momento em que a OC foi formalizada. |
| E-mail = canal do envio | Mesmo motor `MAIL_*` da instalação; Reply-To = `empresas.email`; destino = `parceiros.email` (cadastro). |
| Fail-soft | Falha de SMTP **não** desfaz `ABERTA` / `enviado_em` — resposta expõe `email_enviado`. |
| Soft-delete só em rascunho | Histórico: OC enviada cancela por status (não apaga). |
| Ficha + e-mail detalhados | EMP + fornecedor (CNPJ, contato, endereço) + itens + condição + previsão + obs. |
| IPI / ICMS / frete comerciais | Alíquotas por item → `valor_ipi`/`valor_icms` calculados (half-up); modalidade `mod_frete` CIF/FOB + `transportador_id` (PAR). `valor_total` = **só mercadoria** (custo MOV). `valor_previsto` = mercadoria + IPI. ICMS = **destaque** (não soma). NF na entrada prevalece no fiscal. |
| Auto IPI/ICMS | Sem alíquota informada: última NF fornecedor+SKU → última NF SKU → tabela ICMS UF×UF. IPI sem histórico fica vazio. API `POST /ordens-compra/estimar-impostos`. Override manual permitido. |
| Ficha detalhada OC | `/compras/ordens/:id/ficha` — EMP + fornecedor + transportador, operação interna/interestadual, NCM/origem, IPI/ICMS/modalidade/previsto. |

## Emenda 2026-09-17 — Ficha e e-mail = pedido de compra

Vocabulário **ao fornecedor** (ficha imprimível + e-mail): **Pedido de compra** (código OC). Entidade, API, menu e mensagens internas permanecem **Ordem de compra (OC)**.

| Escolha | Motivo |
|---------|--------|
| Documento enxuto | Partes compactas (razão, CNPJ/IE, endereço, contato); condições uma vez; itens + totais sem faixa/resumo repetidos. |
| Sem campos internos na ficha | CRT, regime, CFOP, ind. IE, finalidade e autoria ficam na tela operacional — não no PDF ao fornecedor. |
| E-mail alinhado à ficha | Assunto e corpo usam “pedido de compra”; payload/itens inalterados. |

## Emenda 2026-09-08 — IPI · ICMS · frete na OC

Planejamento comercial no rascunho — **não** é escrituração nem espelho da NF.

| Campo | Onde | Regra |
|-------|------|--------|
| `aliq_ipi` / `aliq_icms` | item | % opcional; se omitido, estimativa automática; servidor calcula `valor_* = mercadoria × aliq / 100` |
| `valor_frete` | cabeçalho | Legado (sempre 0); não entra em `estoque_movimento_itens` |
| `valor_total` | cabeçalho | Σ mercadoria (inalterado para MOV) |
| `valor_previsto` | API/UI/e-mail | mercadoria + IPI |

Proibido misturar esses valores no custo médio ou recalcular imposto do XML. Sem motor TIPI/ST/Difal nesta fatia.

## Emenda 2026-09-15 — modalidade CIF/FOB + transportador

Substitui o campo comercial **Frete (R$)** no cabeçalho da OC.

| Campo | Onde | Regra |
|-------|------|--------|
| `mod_frete` | cabeçalho | `0` CIF (emitente) · `1` FOB (destinatário) — mesmo vocabulário NF-e `transp/modFrete` |
| `transportador_id` | cabeçalho | FK → `parceiros` com `papel_transportadora`; **obrigatório se FOB**; opcional se CIF |
| `valor_previsto` | API/UI/e-mail | mercadoria + IPI (sem R$ frete) |
| UI | formulário | Slot estreito = select CIF/FOB; 2ª linha = `ParceiroCombobox` transportadora + resumo read-only (razão, CNPJ, IE, endereço, município/UF) |

Omitir `mod_frete` na API (scripts/legado) → CIF. UI nova envia FOB por padrão e exige transportador. Cadastro do transportador = mesmo PAR (Caixa DF-e / parceiros). Sem segundo escritor de saldo; MOV inalterado.

## Reposição

Em trânsito continua **apenas** `ABERTA|PARCIAL`. Rascunho **não** reduz faltante em “A repor” (ainda pode ajustar antes de enviar).

## RBAC

Sem permissão nova: `compras.escrever` para criar/editar/excluir/enviar/cancelar; `estoque.escrever` para receber (inalterado).

## Proibido

1. Editar itens/fornecedor/valores após `ABERTA`.  
2. Receber OC em `RASCUNHO`.  
3. Contar `RASCUNHO` como trânsito.  
4. SMTP self-service por EMP.  
5. Auto-enviar e-mail sem ação humana de “Enviar”.  
6. Reabrir NEC/COT no menu nesta fatia.

## Emenda 2026-09-12 — composição do pedido (bobina)

O pedido ao fornecedor de substrato/Exact **não nasce** só em m². A língua comercial é **faixa**: largura × qtd. de bobinas × comprimento; o m² é derivado.

```
1 linha OC = 1 SKU (material)
  qtde_pedida (un. comercial) = BobinaAreaComercial(Σ area_m2 das faixas)
       │
       └── ordem_compra_item_composicoes (N faixas)
             largura_mm × quantidade × comprimento_m → area_m2 (físico)
```

| Escolha | Motivo |
|---------|--------|
| Tabela filha (não JSON) | Mesmo padrão tipado de `estoque_lotes` L×C; ficha/e-mail/query estáveis. |
| Composição **opcional** | Tubete/caixa/reposicao seguem `qtde_pedida` manual; bobina usa faixas. |
| `qtde_pedida` = Σ | Preço, trânsito, receber e assist XML **inalterados** — Σ em **unidade comercial** (m² físicos ÷ fator quando com≠M2). |
| Fórmula | `area = qtd × (largura_mm/1000) × comprimento_m` via `NfeExactDimensoes::areaM2`; conversão `BobinaAreaComercial`. |
| Ficha + e-mail | Detalhe das faixas ao fornecedor; não só o total em m². |

**Proibido nesta emenda:** explodir SKU por largura; várias linhas OC do mesmo material só por L×C; gravar composição no estoque no envio; segundo saldo.

## Emenda 2026-09-12 — volumes na conferência a partir da composição

Quando a NF **não** traz `rastro` / dimensão, a conferência **sugere** volumes a partir do detalhe do pedido.

```
XML / rastro / Exact  →  prevalece
        │
        ▼ se volumes vazios
Composição OC (faixas)  →  N volumes (1 bobina inteira = 1 volume; L×C + qtde m²)
        │
        ▼
Humano informa nLote / confere  →  receber()
```

| Escolha | Motivo |
|---------|--------|
| Fallback só | Não sobrescreve assist XML. |
| Expandir bobinas | Alinha Avery/Exact (1 bobina ≈ 1 volume). |
| nLote `INT-{OC}-I{nn}-{LxC}-{seq}` | Interno provisório **determinístico** (não aleatório); prefixo `INT` denuncia origem; editável. |
| Botão **Do pedido** | Reaplica sugestão se o operador limpou os volumes. |
| Warning `VOLUME_OC_COMPOSICAO` | Transparência no preview. |
| Confronto pedido × NF × conferido | Contagem + Σ m²; parse `N RLS X L MM X C M`; alerta `PEDIDO_VS_NF_VOLUMES`. |
| Confronto só com detalhe físico | Sem faixas e sem rastro/Exact/RLS → não monta bloco (ribbon/tubete com ou sem lote). |

**Proibido:** auto-receber; tratar composição como estoque sem conferência; segundo writer de saldo; nLote aleatório / imitar Avery; abrir confronto de bobinas só porque existe `qCom`.

## Emenda 2026-09-12 — desfecho de divergência · un. comercial · alinhar NF

Quando pedido × NF × conferido divergem, o receber **não inventa** volumes: registra desfecho humano e segue o físico/NF.

| Escolha | Motivo |
|---------|--------|
| Desfechos `RECEBER_CONFORME_NF` / `RECEBER_PARCIAL_FISICO` / `AGUARDAR_FORNECEDOR` | Linguagem operacional; último **não** confirma entrada. |
| Param EMP `compras.divergencia_volumes` = `EXIGIR_DESFECHO` (default) \| `ALERTA` | Gate auditável; onboarding/seed já cria. |
| Obs + prefixo `[Divergência volumes]` no MOV | Rastreio sem segundo writer. |
| Botão **Alinhar à NF** | Copia rastro/Exact para conferência + sync qtde a receber. |
| `qtde_pedida` / qtde do volume = **un. comercial** | Faixas são m² físicos; SKU KG/M2 converte via `fator_conversao` (`BobinaAreaComercial`). Confronto Σ m² usa L×C, não a qtde comercial. |

**Proibido:** bloquear NF por divergência sem desfecho quando política = ALERTA; auto-receber; explodir SKU por L×C; gravar m² como qtde comercial quando o SKU é KG.

## Emenda 2026-09-14 — detalhe do pedido por família (não só bobina)

A composição L × bobinas × m é a língua comercial do **substrato/Exact**, não de todo SKU comprável.

```
1 linha OC = 1 SKU + qtde_pedida (un. comercial) + preço
                 │
                 ├── grupo com exige_dimensao_sku (MP-PAP/FLM/…)
                 │     → UX: “Detalhe do pedido” (faixas) opcional → Σ m² → qtde
                 │
                 └── demais (MP-TIN, EMB-TUB/CX, REV-RIB, …)
                       → só qtde comercial na linha; sem painel de faixas
```

| Escolha | Motivo |
|---------|--------|
| Gate = `exige_dimensao_sku` (+ lista canônica de grupos) | Mesma fonte do cadastro (`ProdutoBobinaDimensoes` / `ocPedidoDetalheUi`). |
| Uma OC, detalhe polimórfico | Não criar “OC de bobina” vs “OC genérica”. |
| A repor / Nova OC | Mesma regra; botão Detalhar só quando o SKU permite. Painel = faixas físicas; rodapé Σ m² → qtde comercial (KG/M2). |
| Ficha / e-mail | Já condicionais a `composicao[]` — inalterados. |
| API aceita composição | Contrato existente; UI não oferece faixas onde não cabem. Legado com faixas continua editável. |

**Proibido nesta emenda:** abrir faixas por heurística de unidade (KG/M2/UN); explodir SKU por L×C; segundo modelo de item OC; auto-receber.

