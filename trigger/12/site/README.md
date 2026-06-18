# triggerti.com: site TRIGGER DATA INTELLIGENCE

Site estático para **triggerti.com**, hospedado no **Cloudflare Pages**.

## Páginas

| URL | Arquivo |
|-----|---------|
| `/` | Empresa Trigger: consultoria, portfólio de produtos, contato |
| `/consultoria/` | Consultoria ERP sob demanda (customização, integrações, relatórios) |
| `/estoque-sankhya/` | Landing do app Estoque ERP Sankhya Lite (Google Play) |
| `/gestao-condominial/` | Landing do produto Gestão Condominial |
| `/privacidade.html` | Política de privacidade do site triggerti.com |
| `/privacidade-estoque-sankhya.html` | Política de privacidade do Estoque Sankhya (Play Store) |
| `/privacidade-gestao-condominial.html` | Política de privacidade do Gestão Condominial (Android) |

## Estrutura

```
trigger/12/
├── site/                  # ← só esta pasta vai para o Cloudflare Pages
│   ├── index.html
│   ├── consultoria/index.html
│   ├── estoque-sankhya/index.html
│   ├── gestao-condominial/index.html
│   ├── privacidade*.html
│   ├── _headers, _redirects, robots.txt, sitemap.xml
│   └── assets/
├── scripts/               # ferramentas de build (não publicadas)
│   └── build-favicons.py
└── serve-local.sh         # preview local (não publicado)
```

**Deploy:** publique apenas o conteúdo de `site/`. Scripts e `serve-local.sh` ficam fora da raiz publicável.

## Modelo: empresa + portfólio de produtos

**Faz sentido isolar?** Sim. O produto é da Trigger (mesmo CNPJ, mesmo contato), mas o **público e a mensagem** são diferentes: gestor ERP na home, síndico na landing do app. Por isso:

| Camada | URL | Identidade | Função |
|--------|-----|------------|--------|
| **Empresa** | `/` | Navy + verde · logo Trigger | Consultoria ERP, IA, contato B2B |
| **Portfólio** | `/#produtos` | Card na home | Índice (não vende o produto) |
| **Produto** | `/gestao-condominial/` | Dark + laranja · ícone do app | Venda e implantação do app |

- A home **não** repete textos de condomínio no hero; só no card do portfólio.
- A landing do produto **não** usa o logo corporativo no topo; link discreto “Trigger TI” no menu e rodapé.
- URLs e privacidade separadas (`privacidade.html` vs `privacidade-gestao-condominial.html`).

Produtos ativos: `estoque-sankhya/` (Play Store) e `gestao-condominial/` (B2B). Para adicionar outro:

1. Criar pasta `site/meu-produto/index.html` (copiar estrutura de `gestao-condominial/` ou tema próprio).
2. Em `index.html`, seção `#produtos`, duplicar um bloco `<article class="product-card">`.
3. Se o produto tiver app, criar `privacidade-meu-produto.html` se necessário.
4. Atualizar footer e links cruzados.

Cada produto **não** compete com a home: a home lista; a landing vende.

## Deploy no Cloudflare Pages

### Opção A: conectar ao GitHub (recomendado)

1. Faça commit da pasta `site/` no repositório (ex.: `test_several1`).
2. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Selecione o repositório e configure:
   - **Production branch:** `main`
   - **Framework preset:** None
   - **Build command:** *(deixe vazio)*
   - **Build output directory:** `trigger/12/site` *(ajuste conforme o caminho no repo)*
4. Clique em **Save and Deploy**.

### Opção B: upload direto (Wrangler CLI)

```bash
cd trigger/12/site
npm install
npx wrangler deploy
```

Na primeira execução, faça login com `npx wrangler login`.

### Cloudflare Workers Builds (Git) — trigger-site

| Campo | Valor |
|-------|--------|
| Root directory | `trigger/12/site` |
| Build command | *(vazio)* |
| Deploy command | `npm install && npm run deploy` |

Se o build falhar com erro de API/account, em **Settings → Build → Variables** adicione:

| Variável | Valor |
|----------|--------|
| `CLOUDFLARE_ACCOUNT_ID` | ID da conta (Workers & Pages → Overview → Account details) |

O token de build (`Workers Builds`) é criado automaticamente pelo Cloudflare.

### Domínio customizado www.triggerti.com

1. No projeto Pages → **Custom domains** → **Set up a custom domain**.
2. Adicione `www.triggerti.com` como domínio **primário** e `triggerti.com` (apex) como secundário.
3. O Cloudflare redireciona o apex para o primário; o arquivo `_redirects` reforça o 301 para `www`.
4. Se o domínio já está na mesma conta Cloudflare, os registros DNS são criados automaticamente.
5. Aguarde a propagação (geralmente alguns minutos).

**URLs canônicas:** todas as páginas usam `https://www.triggerti.com/...`. Links antigos sem `www` continuam funcionando via redirect.

### Verificação local

```bash
cd trigger/12
chmod +x serve-local.sh   # uma vez
./serve-local.sh
```

Porta padrão **8081** (evita conflito com outros serviços em 8080). Para outra porta:

```bash
PORT=8082 ./serve-local.sh
```

Ou, na pasta `site/`:

```bash
cd trigger/12/site
python3 -m http.server 8081 --bind 127.0.0.1
```

Abrir:

- Empresa: http://localhost:8081/
- Consultoria: http://localhost:8081/consultoria/
- Estoque Sankhya: http://localhost:8081/estoque-sankhya/
- Gestão Condominial: http://localhost:8081/gestao-condominial/

### Favicons (desenvolvimento)

```bash
python3 trigger/12/scripts/build-favicons.py
```

## Próximos passos (futuro)

- Portal B2B para clientes solicitarem demandas
- Configurar WhatsApp comercial no app (`commercial_whatsapp_phone` em `strings.xml`)
- Link da Play Store quando o app for publicado

## Contato

- **E-mail:** diogo.moura@triggerti.com
- **Empresa:** TRIGGER DESENVOLVIMENTO PROFISSIONAL LTDA
- **CNPJ:** 53.369.941/0001-63
