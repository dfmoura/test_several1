# ADR — Transição FLEXORC → FLEXOERP (marca única)

**Status:** Aceito · **Data:** 2026-08-24  
**Norma:** `ADR_FATIA_COMERCIAL_SAAS.md` · `ADR_IMPLANTACAO_ACEITE.md` · `IDENTIDADE_TRIGGER.md` · `MODELO_INSTALACAO_MULTI_EMPRESA.md`  
**Base de código:** `../39` (mesmo motor; mesma instalação evolui)

## Contexto

O **FLEXORC** nomeia a fatia comercial SaaS (ORC → envio → sinal) enquanto a UX esconde PED, estoque, NF e demais módulos do FLEXOERP. A matriz de implantação (`ImplantacaoCatalogo`) já distingue itens `flexorc` vs `erp` com honestidade de superfície.

A decisão de negócio é: **implantação sempre completa** — o cliente contrata o ERP inteiro, não uma fatia permanente. Nesse cenário, duas marcas de produto (FLEXORC + FLEXOERP) geram fricção em vendas, suporte, billing e identidade.

O risco de unificar **só o rótulo** (logo/nome) com o menu ainda reduzido é **promessa falsa**: FLEXOERP implica sistema operacional completo; FLEXORC comunica corretamente “orçamento comercial” enquanto a onda 1 opera.

## Decisão

| Escolha | Motivo |
|---------|--------|
| **Destino = marca única FLEXOERP** | Alinha produto, contrato e go-live; elimina “dois produtos” na conversa comercial |
| **Sequência: superfície → marca → infra** | Marca e menu andam juntos; billing/subdomínio migram por último |
| **FLEXORC permanece canônico até o gate da fase 1** | Nada quebra em runtime, ASAAS, webhooks, testes ou docs vigentes |
| **Dois modelos comerciais, um produto** | SaaS (43): herói = logo do produto. Licenciado (39): herói = logo do cliente + “Licenciado para” |
| **Matriz `flexorc`/`erp` vira fase de implantação**, não segunda marca | Códigos estáveis em `ImplantacaoCatalogo`; rótulos de superfície podem evoluir na UI |

```
Hoje (fase 0)          Gate fase 1              Destino (fase 2+)
─────────────          ───────────              ─────────────────
FLEXORC (UI)     →     Menu onda 2+ ativo  →    FLEXOERP (UI)
ORC no menu            + aceite formal           ERP completo no menu
flexorc.triggerti.com  rebrand assets            flexoerp.* (fase 3)
FLEXORC-CONTA-*        tagline evolui            IDs legado compatíveis
```

### Gate da fase 1 (rebrand na UI)

Só renomear **FLEXORC → FLEXOERP** na identidade visível (`brand.ts`, logos, PDF, proposta, `<title>`) quando **todas** as condições:

1. **Onda 2 (Pedido)** — itens `F2_*` aceitos (dev × cliente) na EMP piloto **ou** módulos equivalentes promovidos ao menu canônico desta instalação.
2. **Menu honesto** — rotas de PED (e dependências mínimas visíveis) acessíveis no AppShell; regra `flexorc-superficie.mdc` atualizada no mesmo PR.
3. **ADR de superfície** — itens antes `superficie: erp` que entram no menu referenciados; Painel (`ADR_PAINEL_COCKPIT`) revisado para KPIs da nova onda.
4. **Regressão** — `phpunit` verde; checklist §6 de `IDENTIDADE_TRIGGER.md` reescrito para FLEXOERP; nenhum texto promete módulo ainda escondido.

Até o gate: **FLEXORC continua herói da UI** — decisão consciente, não débito técnico oculto.

### Fase 2 — Identidade visual FLEXOERP

| Elemento | Decisão |
|----------|---------|
| Marca (squircle + F) | **Reutilizar** o mark FLEXORC — o **F** é de FLEXO, não de “ORC”; cartão verde = proposta comercial |
| Wordmark | Syne ExtraBold **FLEXOERP** (novo lockup SVG; mark isolada permanece) |
| Tagline | De “Orçamento comercial” → **“ERP para gráficas”** (ou variante aprovada comercialmente) |
| Paleta | Inalterada — navy `#1a3568` · verde `#7cb518` (nó do ecossistema TRIGGER) |
| Favicon / aba | Continua **TRIGGER** (IP da plataforma) — `FLEXOERP · TRIGGER` no `<title>` |
| Proposta pública | EMP herói; selo **FLEXOERP**; rodapé TRIGGER |

Assets legados (`branding/flexorc/*`) permanecem até a fase 2; renomear diretório para `branding/flexoerp/` no mesmo PR do rebrand.

### Fase 3 — Infra e billing (compatibilidade)

Migrar **sem quebrar** integrações existentes:

| Legado | Política |
|--------|----------|
| `flexorc.triggerti.com` | **Lab/ensaio** (tunnel → notebook). Host oficial desta instalação: `flexoerp001.triggerti.com` (`ADR_HOST_INSTALACAO_FLEXOERP001`) |
| `FLEXORC-CONTA-*` / `FLEXORC_INTER_*` | **Não renomear** IDs já emitidos; novos ciclos podem usar prefixo `FLEXOERP-` |
| Env `FLEXORC_*` | Manter leitura; adicionar alias `FLEXOERP_*` opcional; deprecar em doc, não em runtime |
| Console `/plataforma` | Rótulo “Operação FLEXOERP”; entidade continua `conta_ativacoes` |
| Testes / seeds | Atualizar asserts de marca em PR dedicado após gate fase 1 |

## Hierarquia canônica (destino)

```
TRIGGER (fornecedor, atribuição discreta)
  └── FLEXOERP (produto único)
        ├── SaaS (instalação 43): herói = logo FLEXOERP · conta → mensalidade
        └── Licenciado (instalação 39): herói = logo do cliente · “Licenciado para”
              └── EMP-A / EMP-B / … (contexto, nunca marca)
```

Não confundir **licenciado** (contrato white-label no 39) com **conta SaaS** (pagador no 43). Só o **nome do produto** unifica.

## Fora de escopo

- Fork do motor ou segunda instalação por CNPJ
- Remover código esqueleto (PED, estoque, NF) “porque agora é FLEXOERP”
- Trocar favicon para logo do produto (IP TRIGGER)
- Rebrand antes do gate da fase 1
- Big-bang find-replace de `FLEXORC` em webhooks/ASAAS já em produção

## Consequências

- **Fase 0 (agora):** ADR + backlog; identidade e runtime **inalterados**
- **Comercial:** falar “FLEXOERP em implantação” ou “começa pelo comercial, evolui para ERP completo” — não vender dois produtos
- **Docs:** ADRs que citam FLEXORC como produto atual permanecem válidos até fase 1; este ADR prevalece sobre conflitos de naming
- **Implantação:** `/implantacao` continua honesta; itens `erp` deixam de ser “futuro distante” quando a onda correspondente entra no menu
- **Regressão pós-fase 1:** checklist identidade FLEXOERP + `MultiEmpresaAceiteTest` + testes de billing com IDs legado

## Checklist por fase

### Fase 0 — Norma (sem código de produto)

- [x] ADR aceito
- [x] BL-080 registrado
- [x] Comunicação interna: FLEXORC = legado · FLEXOERP = produto

### Fase 1 — Gate rebrand UI

- [x] Onda 2+ no menu (PED mínimo)
- [ ] Aceite formal EMP piloto (operacional)
- [x] `brand.ts` + `config/erp.php` → FLEXOERP
- [x] Assets `branding/flexoerp/`
- [x] `IDENTIDADE_TRIGGER.md` atualizado
- [ ] Proposta PDF + e-mail + proposta pública (selo FLEXOERP)
- [ ] PHPUnit + smoke login/shell/proposta (suite ampliada)

### Fase 2 — Infra

- [x] Prefixos billing novos (`BillingReference`) + webhooks dual-prefix
- [x] Docs deploy / alias env
- [ ] DNS `flexoerp001.triggerti.com` (oficial) · `flexorc` só lab — `ADR_HOST_INSTALACAO_FLEXOERP001`
- [ ] Console plataforma (rótulos) — parcial via BRAND

## Referências

- Fatia atual: `ADR_FATIA_COMERCIAL_SAAS.md`
- Implantação: `ADR_IMPLANTACAO_ACEITE.md` · `ImplantacaoCatalogo.php`
- Identidade vigente: `IDENTIDADE_TRIGGER.md`
- ERP licenciado: `../39/docs/IDENTIDADE_TRIGGER.md`
- Backlog: `BL-080` · `BL-081`
