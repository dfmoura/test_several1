# triggerti.com: site TRIGGER DATA INTELLIGENCE

Site estático para **triggerti.com**, hospedado no **Cloudflare Pages**.

## Páginas

| URL | Arquivo |
|-----|---------|
| `/` | Empresa Trigger: consultoria, portfólio de produtos, contato |
| `/estoque-sankhya/` | Landing do app Estoque ERP Sankhya Lite (Google Play) |
| `/gestao-condominial/` | Landing do produto Gestão Condominial |
| `/privacidade.html` | Política de privacidade do site triggerti.com |
| `/privacidade-estoque-sankhya.html` | Política de privacidade do Estoque Sankhya (Play Store) |
| `/privacidade-gestao-condominial.html` | Política de privacidade do Gestão Condominial (Android) |

## Estrutura

```
site/
├── index.html
├── estoque-sankhya/index.html
├── gestao-condominial/index.html
├── privacidade.html
├── privacidade-estoque-sankhya.html
├── privacidade-gestao-condominial.html
└── assets/
    ├── css/styles.css
    └── img/          # logos da pasta logos_trigger
```

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
npx wrangler pages deploy . --project-name=triggerti
```

Na primeira execução, faça login com `npx wrangler login`.

### Domínio customizado triggerti.com

1. No projeto Pages → **Custom domains** → **Set up a custom domain**.
2. Digite `triggerti.com` e `www.triggerti.com`.
3. Se o domínio já está na mesma conta Cloudflare, os registros DNS são criados automaticamente.
4. Aguarde a propagação (geralmente alguns minutos).

### Verificação local

```bash
cd trigger/12/site
chmod +x serve-local.sh   # uma vez
./serve-local.sh
```

Porta padrão **8081** (evita conflito com outros serviços em 8080). Para outra porta:

```bash
PORT=8082 ./serve-local.sh
```

Ou, na mesma pasta:

```bash
python3 -m http.server 8081 --bind 127.0.0.1
```

Abrir:

- Empresa: http://localhost:8081/
- Estoque Sankhya: http://localhost:8081/estoque-sankhya/
- Gestão Condominial: http://localhost:8081/gestao-condominial/

## Próximos passos (futuro)

- Portal B2B para clientes solicitarem demandas
- Configurar WhatsApp comercial no app (`commercial_whatsapp_phone` em `strings.xml`)
- Link da Play Store quando o app for publicado

## Contato

- **E-mail:** diogo.moura@triggerti.com
- **Empresa:** TRIGGER DESENVOLVIMENTO PROFISSIONAL LTDA
- **CNPJ:** 53.369.941/0001-63
