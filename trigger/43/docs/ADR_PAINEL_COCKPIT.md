# ADR — Painel como cockpit de ação (orçamento de viewport)

**Status:** Aceito · **Data:** 2026-08-24  
**Norma:** `ADR_FATIA_COMERCIAL_SAAS.md` · isolamento: `MODELO_INSTALACAO_MULTI_EMPRESA.md` · identidade: `IDENTIDADE_TRIGGER.md`  
**Relacionada:** `ADR_ATIVACAO_EMPRESA.md` · `ADR_CARTEIRA_FINANCEIRA.md` · `ADR_IMPLANTACAO_ACEITE.md`

## Contexto

O Painel é a home da EMP ativa. À medida que a instalação ganha módulos, indicadores e filas, a tela tende a virar mural (scroll longo, KPIs sem ação, duplicata do que já está no shell). Isso limita o crescimento: ou o scroll explode, ou alguém “congela” o Painel e empurra informação crítica para fora.

A superfície FLEXORC nesta pasta é orçamento → envio → sinal/PIX + cadastros. O motor pode crescer; o Painel **não** deve crescer em altura na mesma proporção.

## Decisão

| Escolha | Motivo |
|---------|--------|
| Painel = **cockpit de ação** da EMP ativa | Acima da dobra: o que pede decisão **hoje**. Exploração e relatório ficam nas telas do domínio. |
| Ordem canônica: **Atenção (filas) → Em curso (KPIs) → atalhos** | Filas com `count > 0` são o protagonista. KPIs são faixa secundária de status + salto. |
| Orçamento de viewport (~1 tela) para usuário maduro | Ativação / mensalidade pendente / cortesia = bloco **efêmero** no topo; some quando resolvido. |
| Contrato único: `GET /painel` via `PainelService` | UI não inventa bloco. Novo indicador entra como card/fila no DTO, com RBAC + `empresa_id`. |
| Teto de densidade: ~**6 KPIs** visíveis | Prioridade FLEXORC (ORC, sinal, a receber, patrimônio se alerta). Excesso → lista do módulo, não seção nova. |
| Filas só com `count ≥ 1` | Já é o contrato. Zero fila + operação ok → empty state com 1–2 CTAs (novo cliente / novo ORC). |
| Sem duplicar EMP / marca no corpo | Shell mostra EMP ativa e seletor. Painel não repete banner de contexto. |
| Fora do Painel por norma | Aging completo, DRE, histórico, “últimos N”, implantação (`/implantacao`), módulos esqueleto (PED/OP/estoque/NF) |

```
Shell (EMP + marca)
  └── Painel
        [efêmero] ativação / aviso de conta     ← some ao concluir
        [1] Atenção — filas com ação
        [2] Em curso — faixa compacta de KPIs (≤6)
        [3] Atalhos — só se não houver pendência (ou linha fina)
```

### Teste de admissão (toda feature nova)

1. Gera **fila de ação** nesta EMP? → pode entrar em `filas`.  
2. É só **status / atalho**? → candidato a KPI (se couber no teto e no RBAC).  
3. É relatório, aging, histórico ou admin? → **tela do domínio**, nunca Painel.  
4. É módulo fora da superfície FLEXORC? → motor/FK ok; **UI canônica não promove** no Painel.

### Crescimento sem limitar o produto

O sistema escala nas **listas e nos módulos**. O Painel escala em **precisão do slot** (quais filas/KPIs o perfil vê), não em seções empilhadas. Papel (RBAC) limita *ações*; EMP limita *dados* — o Painel herda os dois.

## Fora de escopo

- Dashboard BI / gráficos densos
- Widgets arrastáveis ou “personalizar painel” no dia 1
- Abas “Visão geral / Financeiro / Comercial” no Painel (fragmenta o cockpit)
- Promover PED/OP/estoque/NF na home desta fatia

## Consequências

- UI: `DashboardPage` prioriza filas; KPIs compactos (hint no `title`, não em parágrafo).
- API: contrato `cadeia` + `filas` + `ativacao` permanece; sem breaking change.
- Carteira: aging continua em Contas a receber/pagar (`ADR_CARTEIRA_FINANCEIRA`); Painel só saldo/alerta + fila vencido.
- Implantação: matriz de go-live em `/implantacao` (`ADR_IMPLANTACAO_ACEITE`), não no Painel.
- Aceite multi-empresa: Painel continua escopo da EMP do header (`X-Empresa-Id` + vínculo).
- Regressão: `php vendor/bin/phpunit --filter PainelTest`.
