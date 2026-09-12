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
| IPI / ICMS / frete comerciais | Alíquotas por item → `valor_ipi`/`valor_icms` calculados (half-up); frete informado no cabeçalho. `valor_total` = **só mercadoria** (custo MOV). `valor_previsto` = mercadoria + IPI + frete. ICMS = **destaque** (não soma). NF na entrada prevalece no fiscal. |
| Auto IPI/ICMS | Sem alíquota informada: última NF fornecedor+SKU → última NF SKU → tabela ICMS UF×UF. IPI sem histórico fica vazio. API `POST /ordens-compra/estimar-impostos`. Override manual permitido. |
| Ficha detalhada OC | `/compras/ordens/:id/ficha` — EMP + fornecedor completos, operação interna/interestadual, NCM/origem, IPI/ICMS/frete/previsto. |

## Emenda 2026-09-08 — IPI · ICMS · frete na OC

Planejamento comercial no rascunho — **não** é escrituração nem espelho da NF.

| Campo | Onde | Regra |
|-------|------|--------|
| `aliq_ipi` / `aliq_icms` | item | % opcional; se omitido, estimativa automática; servidor calcula `valor_* = mercadoria × aliq / 100` |
| `valor_frete` | cabeçalho | Informado; não entra em `estoque_movimento_itens` |
| `valor_total` | cabeçalho | Σ mercadoria (inalterado para MOV) |
| `valor_previsto` | API/UI/e-mail | mercadoria + IPI + frete |

Proibido misturar esses valores no custo médio ou recalcular imposto do XML. Sem motor TIPI/ST/Difal nesta fatia.

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

**Proibido:** auto-receber; tratar composição como estoque sem conferência; segundo writer de saldo; nLote aleatório / imitar Avery.

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

