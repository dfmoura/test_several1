# triggerti.com: site TRIGGER DATA INTELLIGENCE

Site estático para **triggerti.com**, hospedado no **Cloudflare Pages**.

## Páginas

| URL | Arquivo |
|-----|---------|
| `/` | Home ecossistema: gerar / intermediar / operar sistemas |
| `/consultoria/` | Consultoria ERP sob demanda (customização, integrações, relatórios) |
| `/estoque-sankhya/` | Landing do app Estoque ERP Sankhya Lite (Google Play) |
| `/canal-zap/` | Canal Zap: WhatsApp com memória e backend no ecossistema |
| `/gestao-condominial/` | Landing do produto Gestão Condominial |
| `/privacidade.html` | Política de privacidade do site triggerti.com |
| `/privacidade-estoque-sankhya.html` | Política de privacidade do Estoque Sankhya (Play Store) |
| `/privacidade-gestao-condominial.html` | Política de privacidade do Gestão Condominial (Android) |

## Estrutura

```
trigger/12/
├── site/                  # ← só esta pasta vai para o Cloudflare Pages
│   ├── index.html         # home de produção (ecossistema)
│   ├── index.ecosystem.html   # fonte (não publicado — .assetsignore)
│   ├── index.portfolio.html   # rollback (não publicado — .assetsignore)
│   ├── consultoria/index.html
│   ├── estoque-sankhya/index.html
│   ├── gestao-condominial/index.html
│   ├── privacidade*.html
│   ├── _headers, robots.txt, sitemap.xml
│   └── assets/
├── scripts/
│   ├── switch-home.sh     # ecosystem | portfolio
│   └── build-favicons.py
└── serve-local.sh
```

**Deploy:** publique apenas o conteúdo de `site/`. Scripts e `serve-local.sh` ficam fora da raiz publicável. Homes alternativas não entram no publish (`.assetsignore`).

## Modelo: ecossistema + nós

**Trigger** é o ecossistema onde nasce um sistema novo ou a ponte com um que já existe. Apps, consultoria e canais são **nós** (provas), não a identidade da home.

| Camada | URL | Identidade | Função |
|--------|-----|------------|--------|
| **Ecossistema** | `/` | Navy + verde · logo Trigger | Gerar · intermediar · operar |
| **Nós** | `/#ecossistema` | Lista na home | Índice (não vende o produto) |
| **Produto** | `/gestao-condominial/`, `/estoque-sankhya/` | Tema próprio | Venda / implantação |
| **Consultoria** | `/consultoria/` | Navy | Ponte ERP sob demanda |

- A home **não** é vitrine de product cards no hero.
- Cada landing de produto **não** usa o logo corporativo no topo; link discreto “Trigger TI”.
- URLs e privacidade separadas por produto.

Nós ativos: `estoque-sankhya/`, `gestao-condominial/`, `canal-zap/`, consultoria. Para adicionar outro:

1. Criar pasta `site/meu-produto/index.html`.
2. Em `index.ecosystem.html` (e depois `./scripts/switch-home.sh ecosystem`), seção `#ecossistema`, duplicar um bloco `eco-node`.
3. Privacidade dedicada se for app.
4. Atualizar footer e links cruzados.

### Rollback da home (local)

```bash
./scripts/switch-home.sh portfolio   # home anterior
./scripts/switch-home.sh ecosystem   # produção
```

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
npx wrangler deploy
```

Na primeira execução, faça login com `npx wrangler login`.

### Cloudflare Workers Builds (Git) — trigger-site

| Campo | Valor |
|-------|--------|
| Root directory | `trigger/12/site` |
| Build command | *(vazio)* |
| Deploy command | `npx wrangler deploy` |

**Importante:** não coloque `package.json` dentro de `site/`. O Cloudflare instala
dependências na mesma pasta e o Wrangler tentaria publicar `node_modules/` como
assets (limite 25 MiB por arquivo → build falha).

Se o build falhar com erro de API/account, em **Settings → Build → Variables** adicione:

| Variável | Valor |
|----------|--------|
| `CLOUDFLARE_ACCOUNT_ID` | ID da conta (Workers & Pages → Overview → Account details) |

### Domínio customizado www.triggerti.com

1. No projeto Pages → **Custom domains** → **Set up a custom domain**.
2. Adicione `www.triggerti.com` como domínio **primário** e `triggerti.com` (apex) como secundário.
3. O Cloudflare redireciona o apex para o primário quando `www.triggerti.com` é domínio **primário** em **Domains** (não use `_redirects` com URLs absolutas — Workers só aceita paths relativos).
4. Se o domínio já está na mesma conta Cloudflare, os registros DNS são criados automaticamente.
5. Aguarde a propagação (geralmente alguns minutos).

**URLs canônicas:** todas as páginas usam `https://www.triggerti.com/...`. Links antigos sem `www` continuam funcionando via redirect.

### Verificação local

```bash
cd trigger/12
chmod +x serve-local.sh   # uma vez
./serve-local.sh
```

Porta padrão **8081**. Para outra porta:

```bash
PORT=8082 ./serve-local.sh
```

Abrir:

- Home: http://localhost:8081/
- Consultoria: http://localhost:8081/consultoria/
- Estoque Sankhya: http://localhost:8081/estoque-sankhya/
- Gestão Condominial: http://localhost:8081/gestao-condominial/

### Favicons (desenvolvimento)

```bash
python3 trigger/12/scripts/build-favicons.py
```

## Contato

- **E-mail:** diogo.moura@triggerti.com
- **Empresa:** TRIGGER DESENVOLVIMENTO PROFISSIONAL LTDA
- **CNPJ:** 53.369.941/0001-63
