# Identidade TRIGGER × FLEXORC × empresa — padrão canônico

Norma de produto para o **FLEXORC** (fatia comercial SaaS da TRIGGER). Alinha o modelo **ecossistema × nó/produto** do site (`trigger/12`) ao app — não é landing da TRIGGER.

**Princípio:** a TRIGGER é **identificada de forma permanente e discreta** — nunca como herói do ambiente do cliente, nunca apagada.

**Instalação × EMP × stage:** [`MODELO_INSTALACAO_MULTI_EMPRESA.md`](MODELO_INSTALACAO_MULTI_EMPRESA.md) · fatia: [`ADR_FATIA_COMERCIAL_SAAS.md`](ADR_FATIA_COMERCIAL_SAAS.md).

---

## 1. Três camadas nesta instalação (não misturar)

O FLEXOERP licenciado tem quatro camadas (TRIGGER → produto → licenciado → EMP). **Esta instalação é SaaS da TRIGGER:** não há white-label de um único cliente. O herói da UI é o **produto**.

| Camada | Quem é (neste repo) | Onde aparece | Papel |
|--------|---------------------|--------------|--------|
| **Fornecedor / IP** | TRIGGER Data Intelligence | Atribuição fixa (login, rodapé do shell, PDF, ficha), favicon, título do browser | Marca da plataforma — sempre presente, nunca dominante |
| **Produto** | FLEXORC (`brand.product`) | Logo própria (login, sidebar, header), título de tela, `<title>` | Identidade operacional do dia a dia |
| **Empresa ativa** | EMP cadastrada (self-service) | Header (`X-Empresa-Id`) · nome na proposta ao cliente | Contexto multi-empresa — **não** é marca do app |

```
TRIGGER  →  produto (FLEXORC)  →  EMP-A / EMP-B / …
```

Teste do herói (adaptado de `trigger/12`): *se remover a logo TRIGGER, o primeiro viewport ainda é claramente do FLEXORC.* Se o primeiro viewport puder ser de qualquer fornecedor sem a atribuição, a TRIGGER está apagada demais.

Teste da EMP: *se trocar só a EMP ativa, a logo e o nome FLEXORC não mudam.* EMP não compete com branding.

Na **proposta pública** (`/p/{token}`), o nome da gráfica (EMP) é o herói comercial para o cliente final; a marca FLEXORC entra como selo do produto; a TRIGGER permanece no rodapé (“Powered by”).

---

## 2. Nomes canônicos

| Uso | Forma | Exemplo |
|-----|--------|---------|
| Marca curta (UI alt, PDF texto) | `TRIGGER` | alt da marca; “Powered by TRIGGER” |
| Marca completa (acessibilidade, docs) | `TRIGGER Data Intelligence` | `alt` preferencial da marca |
| Razão social (só jurídico/privacidade) | `TRIGGER DESENVOLVIMENTO PROFISSIONAL LTDA` | não na UI do produto |
| Site | `https://www.triggerti.com` | único destino dos links de atribuição |
| Produto (UI) | `FLEXORC` | título de tela, header, login, logo |
| Tagline do produto | `Orçamento comercial` | kicker do login / sidebar |
| Empresa operacional | código EMP / razão social | só no seletor / header de contexto / proposta ao cliente |

Cores da plataforma (CSS / `brand.ts`): navy `#1a3568` · verde `#7cb518`.  
A logo FLEXORC usa **exatamente** este par — nó do ecossistema, não uma paleta paralela.

---

## 3. Fórmula de atribuição por superfície

Uma superfície → uma fórmula. Não misturar no mesmo bloco.

| Superfície | Fórmula canônica | Componente / config |
|------------|------------------|---------------------|
| Nome do produto (sidebar + login) | `{produto}` + byline **por Trigger Data Intelligence** | `TriggerByline` |
| Login / cadastro (painel esquerdo) | **marca FLEXORC** (120px, padrão nó/Canal Zap) + wordmark Syne ExtraBold + rodapé **Desenvolvido por** + **TRIGGER Data Intelligence** | `ProductLogo` + wordmark + `TriggerAttribution` `variant="interactive"` |
| Shell | logo FLEXORC no topo da sidebar + BrandBar no rodapé | `ProductLogo` + `BrandBar` |
| Ficha impressa HTML | selo FLEXORC + **Powered by** + marca + **TRIGGER** | `ProductLogo` / `BRAND.licensee.logo` + `TriggerAttribution` `variant="print"` |
| Proposta pública | nome da EMP + selo FLEXORC; rodapé TRIGGER | `OrcamentoPropostaView` |
| Favicon / aba | marca TRIGGER (PNG 32 + SVG) | `index.html` |
| `<title>` | `{produto} · TRIGGER` | `FLEXORC · TRIGGER` |

### Por que duas fórmulas (não uma só)?

- **Desenvolvido por** — UI interativa em PT-BR; leitura natural; link comercial.
- **Powered by TRIGGER** — documentos/PDF: padrão internacional de rodapé, curto, texto estável mesmo sem imagem.

Proibido:

- Colocar logo TRIGGER como herói do login ou do shell (competir com o FLEXORC).
- Remover a atribuição dessas superfícies “para limpar a tela”.
- Inventar variantes (“Feito por”, “by Trigger TI”, “Trigger Technology”) fora desta tabela.
- Usar logo FLEXORC ou da EMP no favicon (IP da plataforma).
- Tratar EMP ativa como marca ou substituir o herói FLEXORC ao trocar de EMP.
- Recolorar a logo FLEXORC fora de navy/verde da plataforma.

---

## 4. Assets

```
branding/
  flexorc/
    logo-flexorc.svg            ← lockup (marca + wordmark Syne) — asset combinado
    logo-flexorc-mark.svg       ← marca isolada — login, sidebar, header, ficha, proposta
  trigger/
    logo-trigger-mark.svg       ← atribuição UI/ficha (play mark navy)
    favicon-32-light.png        ← fonte; espelhado em apps/web/public/
apps/web/public/
  favicon-32-light.png
  favicon.svg                   ← marca TRIGGER navy
  branding/flexorc/*            ← cópia servida pelo Vite
  branding/trigger/*            ← cópia servida pelo Vite
```

Fonte única no front: `apps/web/src/lib/brand.ts`.  
Fonte única no back (PDF/strings): `config/erp.php` → chave `brand`.

A marca FLEXORC é um **nó do ecossistema**: squircle 128×128 rx=28 navy + cartão verde da proposta (`#7cb518`, rx=12 como o Canal Zap) cujos itens constroem um **F**. Sem traço, sem terceira cor, sem recortar o navy/verde da plataforma. Wordmark em Syne ExtraBold — a display face já do shell. Login/cadastro: marca grande + wordmark em tipo vivo (mesmo padrão dos nós em `trigger/12`); o SVG de lockup permanece o asset combinado.

---

## 5. Troca de cliente / produto

Esta instalação **é** o produto FLEXORC. Outro contrato FLEXOERP continua sendo outra instalação (`trigger/39`), com herói do licenciado.

Não:

1. Substituir a logo FLEXORC pela logo de uma EMP.
2. Remover nem alterar a camada TRIGGER (`brand.vendor` / `erp.brand`).
3. Publicar o FLEXORC com a marca TRIGGER no lugar do herói (apagaria o produto).

---

## 6. Checklist de aceite (identidade)

- [ ] Login: herói FLEXORC (marca grande + wordmark Syne) + rodapé “Desenvolvido por” TRIGGER clicável
- [ ] Cadastro: mesma hierarquia
- [ ] Shell: marca FLEXORC no topo da sidebar + nome do produto + BrandBar no rodapé
- [ ] Header: marca FLEXORC + nome do produto, distintos da EMP ativa
- [ ] Ficha: selo FLEXORC + rodapé “Powered by” TRIGGER
- [ ] Proposta pública: nome da EMP em evidência; selo FLEXORC; rodapé TRIGGER
- [ ] Favicon = marca TRIGGER (navy), não Vite/roxo, não FLEXORC
- [ ] Título da aba contém `TRIGGER` sem deslocar o nome `FLEXORC`
- [ ] Trocar EMP no header **não** troca logo/nome FLEXORC nem atribuição TRIGGER

Referência de ecossistema (site): `../12/site/README.md` (modelo ecossistema × nós).  
Referência de deploy: `LIGHTSAIL_E_FUTURO.md` § Identidade.  
Referência de IP / repositório público: [`ADR_LICENCIAMENTO_E_IP.md`](ADR_LICENCIAMENTO_E_IP.md) · [`../LICENSE`](../LICENSE).
