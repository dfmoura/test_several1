# Diagnóstico técnico e plano de correção — retaetiquetas.com.br

**Data da varredura:** 21 de julho de 2026  
**Escopo:** links de orçamento quebrados + auditoria de infraestrutura, stack e dados  
**Restrição explícita:** **não alterar layout, design visual, tipografia ou composição** — apenas corrigir comportamento funcional, DNS, formulários e engenharia de dados por trás do fluxo de orçamento.

---

## 1. Resumo executivo

O site institucional/e-commerce está **online e funcional** no domínio principal (`https://retaetiquetas.com.br`). Os problemas relatados em `teste.txt` **não são de layout**: são falhas de **integração de plugin**, **DNS** e **URLs desatualizadas** no conteúdo do WPBakery.

| Sintoma | Causa raiz | Severidade |
|--------|------------|------------|
| Popup `#ts-button-popup-2` / `#ts-button-popup-1` exibe `[fc id='1'][/fc]` | Shortcode do **FormCraft** não é processado (plugin inativo/quebrado) | Crítica (conversão) |
| Botões **SOLICITAR ORÇAMENTO** → `orcamento.retaetiquetas.com.br` | Subdomínio com **NXDOMAIN** (não existe no DNS) | Crítica (conversão) |
| `www.retaetiquetas.com.br` | Também **NXDOMAIN** | Alta (SEO/UX) |
| Sem registros **MX / SPF / DKIM / DMARC** | Entrega de e-mail do domínio inexistente/não configurada | Alta (leads) |
| Directory listing em `/wp-content/plugins/formcraft3/` | Autoindex habilitado | Média (segurança) |

**Veredito:** o canal de orçamento web está quebrado em dois pontos independentes. WhatsApp (api.whatsapp.com) ainda funciona em parte das seções — é o único funil de lead vivo detectado.

---

## 2. Problemas descritos em `teste.txt` — diagnóstico detalhado

### 2.1 Popup “FAZER UM ORÇAMENTO” (`#ts-button-popup-2`)

**Evidência no HTML da home:**

```html
<a href="#ts-button-popup-2" class="ts-button ts-button-2 ... ts-button-popup">
  FAZER UM ORÇAMENTO
</a>
<div id="ts-button-popup-2" style="display: none">[fc id='1'][/fc]</div>
```

O mesmo padrão aparece em páginas de categoria com `#ts-button-popup-1`.

**O que isso significa**

1. O ThemeSky (tema Gon) abre o popup corretamente (âncora `#ts-button-popup-*`).
2. Dentro do popup há um **shortcode FormCraft** (`[fc id='1']`).
3. O WordPress **não expandiu** o shortcode → o visitante vê o texto literal `[fc id='1'][/fc]`.
4. Existe pasta `wp-content/plugins/formcraft3/` com **listagem de diretório**, mas o shortcode não é interpretado → tipicamente **plugin desativado**, arquivos incompletos, ou FormCraft removido do `active_plugins` mantendo resíduos no disco.

**Conclusão:** o popup de UI funciona; o **conteúdo do formulário morreu**.

---

### 2.2 Botões “SOLICITAR ORÇAMENTO” → `https://orcamento.retaetiquetas.com.br/`

**Evidência DNS**

```
Host orcamento.retaetiquetas.com.br not found: 3(NXDOMAIN)
```

Não há registro `A`, `AAAA` nem `CNAME`. O navegador falha antes de qualquer HTTP (“Server Not Found”).

**Evidência no conteúdo (ex.: `/etiquetas-adesivas/`)**

```html
<a href="https://orcamento.retaetiquetas.com.br/" target="_blank"
   class="ts-button ts-button-3 medium fa fa fa-whatsapp">
  SOLICITAR ORÇAMENTO
</a>
```

Observação importante de engenharia de produto: a classe CSS sugere **WhatsApp** (`fa-whatsapp`), mas o `href` aponta para um **subdomínio morto**. Em outras seções do site, links WhatsApp válidos já existem, por exemplo:

`https://api.whatsapp.com/send?phone=5534991807742&text=...`

**Conclusão:** URLs hardcoded em blocos WPBakery “Raw HTML” apontam para infraestrutura que **nunca foi criada ou foi removida do DNS (AWS Route 53)**.

---

## 3. Varredura completa da infraestrutura e stack

### 3.1 Domínio e DNS

| Item | Valor encontrado |
|------|------------------|
| Domínio | `retaetiquetas.com.br` (Registro.br) |
| Status | `active` |
| Registro | 2019-08-07 |
| Expiração | 2028-08-07 |
| Nameservers | **Amazon Route 53** (`ns-148.awsdns-18.com`, `ns-522.awsdns-01.net`, `ns-1412.awsdns-48.org`, `ns-2037.awsdns-62.co.uk`) |
| A (apex) | `186.209.113.137` |
| AAAA | inexistente |
| `www` | **NXDOMAIN** |
| `orcamento` | **NXDOMAIN** |
| MX | **nenhum** |
| TXT (SPF etc.) | **nenhum** |

### 3.2 Hospedagem e servidor

| Item | Valor |
|------|--------|
| IP | `186.209.113.137` |
| Hostname reverso | `br53-cp.valueserver.com.br` |
| Provedor / ASN | **ValueServer** / **EVEO S.A.** (`AS53107`), São Paulo |
| Servidor HTTP | **LiteSpeed** (HTTP/2 + QUIC/HTTP3 anunciado) |
| Runtime | **PHP/8.4.22** (`X-Powered-By`) |
| SSL | **Let's Encrypt** — válido ~04/jul/2026 a 02/out/2026 — SAN apenas `retaetiquetas.com.br` (sem `www`) |

Interpretação: hospedagem compartilhada/cloud brasileira com painel típico (cPanel/similar no ecossistema ValueServer), PHP moderno, LiteSpeed. DNS gerenciado à parte na AWS (desacoplamento comum e saudável, desde que os registros estejam completos).

### 3.3 Backend, CMS e linguagens

| Camada | Tecnologia |
|--------|------------|
| CMS | **WordPress 6.8.6** |
| E-commerce | **WooCommerce 10.3.7** |
| Linguagem servidor | **PHP 8.4** |
| API REST | `/wp-json/` (WP, WC, Contact Form 7, Jetpack, MC4WP, Slider Revolution) |
| Page builder | **WPBakery Page Builder** (`js_composer`) |
| Tema | **Gon** + **gon-child** + plugin **ThemeSky** |
| Slider | **Slider Revolution 6.7.38** |
| Formulários | **Contact Form 7** (presente); **FormCraft 3** (resíduo/pasta, shortcode morto) |
| Outros | **Jetpack**, **Mailchimp for WP (mc4wp)** |
| Frontend | HTML, CSS do tema, **jQuery** (padrão WP) |
| Créditos no rodapé | Desenvolvido por **RLiima** (© 2019) |

### 3.4 Banco de dados (inferência profissional)

Não há exposição pública do banco (correto). Pelo stack WordPress + WooCommerce em hospedagem LiteSpeed/ValueServer, o padrão de mercado e o contrato de dados esperado é:

| Componente | Expectativa técnica |
|------------|---------------------|
| SGBD | **MySQL 8** ou **MariaDB 10.x** |
| Charset | `utf8mb4` / collation `utf8mb4_unicode_ci` |
| Schema | tabelas `wp_*` (posts, postmeta, options, users) + tabelas WooCommerce (`wp_woocommerce_*`, pedidos, produtos) |
| Persistência de formulários | CF7: e-mail + eventual plugin de storage; FormCraft: tabelas próprias `wp_formcraft_*` (se existir histórico) |
| Sessões/carrinho | transients + cookies WooCommerce |

**Recomendação de engenharia de dados:** tratar leads de orçamento como **entidade de primeira classe** (não só e-mail solto), com modelo relacional claro — ver seção 5.

### 3.5 Mapa de superfície do site (sitemap)

33 páginas indexadas (loja, carrinho, checkout, contato, sobre-nós, categorias de etiquetas/ribbons etc.) + produtos WooCommerce. Rotas `/orcamento/` e `/solicitar-orcamento/` retornam **404** — não há página canônica de orçamento no WordPress.

### 3.6 Achados adicionais de higiene técnica

1. **Headers de segurança ausentes:** sem `Strict-Transport-Security`, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, `Content-Security-Policy`.
2. **Cache:** `cache-control: public, max-age=0` — página dinâmica sem cache edge efetivo.
3. **Timezone WP:** `gmt_offset: 0` via REST — inconsistente com operação em Uberlândia (`America/Sao_Paulo`).
4. **Directory listing** em plugin FormCraft — vazamento de estrutura de arquivos.
5. Duplicidade de rotas PT/EN do WooCommerce (`/carrinho/` e `/cart/`, etc.) — comum, mas exige canonicalização SEO.

> Nota: ferramentas públicas de DNS às vezes associam hostnames `*.cdn.hstgr.net` (Hostinger) a pesquisas de `www`; na resolução atual do apex, o destino real é **ValueServer/EVEO**. Priorizar a evidência de `A` + rDNS + headers HTTP.

---

## 4. Como corrigir os links — sem mexer em layout/design

Princípio: **preservar classes CSS, markup do ThemeSky/WPBakery e aparência dos botões**. Alterar apenas `href`, shortcodes e infraestrutura.

### 4.1 Correção A — Popup FormCraft (prioridade máxima)

**Opção A1 — Restaurar FormCraft (mínimo desvio histórico)**

1. Backup completo (arquivos + DB).
2. Reativar/reinstalar **FormCraft 3** compatível com WP 6.8 + PHP 8.4.
3. Recriar formulário com **ID = 1** **ou** atualizar o shortcode para o novo ID (`[fc id='N']`).
4. Campos sugeridos (dados): nome, e-mail, telefone/WhatsApp, tipo de produto (etiqueta/rótulo/ribbon), quantidade, anexo (arte), mensagem, origem da página (`utm`/hidden).
5. Testar abertura do popup e submit (home + categorias).
6. Desabilitar autoindex do LiteSpeed/Apache para `/wp-content/`.

**Opção A2 — Substituir shortcode por Contact Form 7 (recomendado se FormCraft estiver abandonado)**

CF7 já está no ecossistema do site (`contact-form-7` + namespace REST).

1. Criar formulário CF7 “Orçamento”.
2. No WPBakery, **somente** trocar o conteúdo interno do `div#ts-button-popup-*` de:

   `[fc id='1'][/fc]`

   para:

   `[contact-form-7 id="XXXX" title="Orçamento"]`

3. Manter o mesmo `div`, mesmos IDs de popup e mesmos botões `ts-button-popup` → **zero mudança visual**.
4. Configurar mail (requer MX/SPF — seção 4.3) **ou** armazenamento em banco + notificação WhatsApp/CRM.

**Critério de aceite:** ao clicar “FAZER UM ORÇAMENTO”, o popup exibe formulário renderizado (não texto de shortcode) e a submissão gera lead rastreável.

---

### 4.2 Correção B — Botões “SOLICITAR ORÇAMENTO” (subdomínio morto)

Três estratégias válidas (escolher **uma** canônica):

#### B1 — Apontar para WhatsApp (alinha com o ícone já usado) — *rápido*

Substituir em todos os Raw HTML do WPBakery:

```html
href="https://orcamento.retaetiquetas.com.br/"
```

por URL WhatsApp já padronizada no site, com texto contextual por página, ex.:

```html
href="https://api.whatsapp.com/send?phone=5534991807742&text=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20um%20or%C3%A7amento."
```

Manter `class="ts-button ts-button-3 medium fa fa fa-whatsapp"` intacta.

#### B2 — Apontar para o popup da própria página — *melhor UX no site*

```html
href="#ts-button-popup-1"
```

(e garantir Correção A). Remover `target="_blank"`. Adicionar classe `ts-button-popup` se o ThemeSky exigir para o bind do modal — validar no front sem alterar CSS.

#### B3 — Recriar o subdomínio (só se houver produto/app separado)

Somente se a intenção de negócio for um **mini-app de orçamento** independente:

1. No Route 53: `orcamento` → `CNAME` ou `A` para o mesmo host (ou app).
2. No painel ValueServer: criar subdomínio + SSL (Let’s Encrypt cobre SAN ou certificado separado).
3. Publicar formulário WordPress (multisite/subpasta) **ou** app leve.
4. Só então manter os `href` atuais.

**Recomendação de engenharia:** **não** recriar subdomínio só para hospedar o mesmo formulário. Preferir **B2 + A2** (um funil canônico no domínio principal). Usar **B1** como fallback imediato de conversão enquanto o formulário é reparado.

**Inventário mínimo a varrer no admin WPBakery**

- Home (`#ts-button-popup-2`)
- Páginas de linha: etiquetas-adesivas, ribbons, rotulos-adesivos, e demais landing pages com Raw HTML
- Busca global no banco:  
  `SELECT ID, post_title FROM wp_posts WHERE post_content LIKE '%orcamento.retaetiquetas%';`

---

### 4.3 Correção C — DNS e e-mail (base para qualquer formulário)

No **Amazon Route 53** (zona `retaetiquetas.com.br`):

| Registro | Tipo | Valor sugerido | Motivo |
|----------|------|----------------|--------|
| `www` | `CNAME` ou `A` | apex / mesmo IP | eliminar NXDOMAIN |
| `orcamento` | remover ou criar só se B3 | — | evitar links fantasmas |
| `@` MX | conforme provedor de e-mail | Google/Microsoft/Zoho/hospedagem | receber leads |
| `@` TXT SPF | `v=spf1 ... ~all` | autenticação |
| DKIM | TXT do provedor | autenticação |
| DMARC | `_dmarc` TXT | política gradual `p=none` → `quarantine` |

Após criar `www`, emitir/renovar certificado com SAN `www.retaetiquetas.com.br` e redirecionar `www` → apex (301) **sem** mudar layout.

---

### 4.4 Correção D — Página `/contato/`

A rota existe (HTTP 200), porém a varredura não encontrou formulário CF7 renderizado (apenas search/login). **Sem alterar o design da página**, inserir o mesmo shortcode CF7 de orçamento na área de conteúdo já prevista — ou redirecionar CTAs de contato para o popup reparado.

---

## 5. Engenharia de software e de dados — solução estrutural (melhor prática)

Objetivo: leads de orçamento confiáveis, auditáveis e integráveis a vendas — **sem redesenhar o site**.

### 5.1 Modelo de dados proposto (domínio de Orçamento)

Entidade canônica `QuoteRequest` (pedido de orçamento):

```text
QuoteRequest
├── id (UUID ou BIGINT)
├── created_at (UTC) / created_at_local (America/Sao_Paulo)
├── source_channel   ENUM('popup','whatsapp','contato','produto')
├── source_url       VARCHAR  — página de origem
├── source_popup_id  VARCHAR  — ts-button-popup-1|2
├── customer_name
├── customer_email
├── customer_phone   E.164
├── product_line     ENUM('etiqueta','rotulo','ribbon','tecido','outro')
├── product_ref      VARCHAR  — SKU WooCommerce opcional
├── quantity         DECIMAL/NULL
├── message          TEXT
├── attachment_uri   VARCHAR/NULL  — S3 ou uploads WP
├── status           ENUM('new','in_progress','quoted','won','lost','spam')
├── assigned_to      VARCHAR/NULL
├── utm_source / utm_medium / utm_campaign
└── raw_payload      JSON  — snapshot do POST original
```

Índices: `(created_at)`, `(status, created_at)`, `(customer_email)`, `(customer_phone)`.

Implementação pragmática no WordPress atual:

1. **Curto prazo:** CF7 + plugin de armazenamento (Flamingo ou DB extension) mapeando campos → tabela custom `wp_reta_quote_requests` via `wpcf7_mail_sent`.
2. **Médio prazo:** CPT `quote_request` (capacidade `edit_quotes`) + REST privada para o time comercial.
3. **Integração:** webhook para CRM/Planilha/WhatsApp Business API — fila assíncrona (Action Scheduler já vem com WooCommerce).

### 5.2 Fluxo canônico de conversão (target architecture)

```text
[CTA visual existente]
        │
        ├─► Popup ThemeSky (mesmos IDs/classes)
        │         └─► Form handler (CF7/FormCraft)
        │                   ├─► Persistência QuoteRequest
        │                   ├─► E-mail operacional (MX ok)
        │                   └─► Notificação time (WhatsApp/CRM)
        │
        └─► WhatsApp deep-link (fallback / mobile)
                  └─► Mesmo template de mensagem + UTM em texto
```

Regra de produto: **um funil canônico**; WhatsApp e formulário alimentam a **mesma** entidade de dados.

### 5.3 Camada de aplicação (boas práticas)

- Validação server-side (telefone BR, e-mail, honeypot/Turnstile anti-spam).
- Idempotência: rejeitar double-submit (token/nonce WP).
- Observabilidade: log estruturado de falhas de mail (`wp_mail` / SMTP transactional — Resend, Amazon SES, ou SMTP da hospedagem).
- LGPD: base legal, política de privacidade, retenção e opt-out; não expor anexos publicamente.
- Separar **catálogo WooCommerce** (pedidos de pronta entrega) de **orçamentos sob encomenda** (QuoteRequest) — estruturas de dados distintas evitam misturar `shop_order` com lead comercial.

### 5.4 Infraestrutura recomendada (evolução sem redesign)

| Fase | Ação | Benefício |
|------|------|-----------|
| 0 | Hotfix links + formulário | Restaura conversão |
| 1 | DNS `www` + e-mail autenticado | Entrega de leads |
| 2 | SMTP transacional + tabela de leads | Confiabilidade |
| 3 | Backup automatizado DB/files + staging | Segurança operacional |
| 4 | Object cache Redis (se plano ValueServer permitir) + cache LiteSpeed page | Performance sem mudar UI |
| 5 | WAF/Imunify (já há vestígio `imunify-bot-check` no robots) + headers de segurança | Hardening |

---

## 6. Plano de execução sugerido (ordem)

### Fase 0 — Emergência (horas)

1. Inventariar todas as ocorrências de `orcamento.retaetiquetas.com.br` no DB.
2. Trocar CTAs “SOLICITAR ORÇAMENTO” para WhatsApp (B1) **ou** âncora do popup (B2).
3. Substituir `[fc id='1'][/fc]` por CF7 funcional (A2) **ou** reativar FormCraft (A1).
4. Testar home + 3 landings + mobile.

### Fase 1 — Fundação (1–2 dias)

1. Criar `www` + redirect 301.
2. Configurar MX/SPF/DKIM/DMARC.
3. SMTP autenticado para WP.
4. Fechar directory listing; remover resíduos FormCraft se migrar para CF7.
5. Ajustar timezone WP para `America/Sao_Paulo`.

### Fase 2 — Dados e operação (3–5 dias)

1. Tabela/CPT `QuoteRequest` + painel simples no admin.
2. Hook pós-envio → persistência + notificação.
3. Campos ocultos: `source_url`, linha de produto.
4. Relatório semanal de leads (status/funil).

### Fase 3 — Endurecimento

1. Headers de segurança via LiteSpeed/`.htaccess`/plugin (sem CSS).
2. Backup testado (restore drill).
3. Atualizações controladas (RevSlider/WPBakery são superfície de risco — manter patchados).
4. Monitoramento uptime do apex e do endpoint de formulário.

---

## 7. Matriz de testes de aceite

| # | Teste | Resultado esperado |
|---|-------|--------------------|
| 1 | Home → FAZER UM ORÇAMENTO | Popup com formulário HTML real |
| 2 | Submit formulário | Registro em DB + e-mail/CRM |
| 3 | Landing etiquetas → SOLICITAR ORÇAMENTO | HTTP 200 / WhatsApp / popup — **nunca** NXDOMAIN |
| 4 | `host orcamento.retaetiquetas.com.br` | Se não usado: sem links apontando; se usado: resolve + SSL |
| 5 | `www.retaetiquetas.com.br` | Resolve e redireciona ao apex |
| 6 | Visual regressão | Mesmas classes `ts-button*`, mesmos layouts WPBakery |
| 7 | Mobile Firefox/Chrome | Popup e CTAs operacionais |
| 8 | `/contato/` | Canal de lead funcional |

---

## 8. O que **não** fazer (alinhado ao pedido)

- Não redesenhar hero, cores, tipografia ou composição WPBakery.
- Não trocar tema Gon/ThemeSky só para “modernizar”.
- Não criar subdomínio novo sem necessidade de produto separado.
- Não depender só de `mailto:` sem MX.
- Não deixar shortcodes órfãos no conteúdo.

---

## 9. Conclusão

Os problemas do `teste.txt` são **falhas de integração e DNS**, não de interface. O site roda **WordPress 6.8.6 + WooCommerce 10.3.7 + PHP 8.4 + LiteSpeed** em **ValueServer/EVEO**, com DNS na **AWS Route 53**. O popup quebra porque o **FormCraft não processa o shortcode**; os botões de orçamento quebram porque **`orcamento.retaetiquetas.com.br` não existe (NXDOMAIN)**.

A correção profissional, sem tocar no design, é: **restaurar um formulário no mesmo container de popup**, **corrigir os `href` dos CTAs para um destino canônico (popup ou WhatsApp)** e **estruturar leads como entidade de dados (`QuoteRequest`)** com e-mail autenticado e rastreabilidade — padrão sólido de engenharia de software e dados para um funil comercial B2B/B2C sob encomenda.
