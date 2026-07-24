# Observatório de Licitações — Compras.gov + Power BI

Sistema local para coleta, integridade e consulta de licitações a partir de **duas fontes oficiais de dados abertos**:

1. **Compras.gov / PNCP** — API Dados Abertos (Lei 14.133), via `httpx`
2. **Dados Abertos PMU / Power BI** — CSVs oficiais do painel municipal, via `httpx`

> O antigo scraper do Portal da Prefeitura (Playwright) foi removido. O sistema
> não depende mais de navegador, Xvfb ou imagens Playwright.

## Arquitetura (Free Tier)

Stack enxuta de propósito: API, health check, coleta orquestrada, SQLite e agendador — adequada ao Free Tier da AWS (pouca RAM, um nó). RabbitMQ, MinIO, Traefik e métricas entram quando carga, orçamento ou requisito justificar, de preferência gerenciados na AWS.

Desenvolvimento: [Trigger](https://www.triggerti.com)

## Executar com Docker

```bash
# na pasta do projeto (trigger/23)
docker compose up --build -d
```

Acesse: **http://localhost:8096/** — na mesma Wi-Fi: `http://SEU_IP:8096/` (`hostname -I`)

### Produção com HTTPS (domínio)

Na VM (DNS do domínio já apontando para o IP; security group com **80** e **443**):

```bash
# liberar a porta 80 se o app estava publicado nela; depois:
export DOMAIN=licitacoes.osbrasiluberlandia.org
docker compose --profile https up -d --build
```

URL oficial: **https://licitacoes.osbrasiluberlandia.org/**  
O Caddy obtém o certificado Let's Encrypt e faz proxy para o app. Detalhes em `detalhes/05-deploy-aws-free.md`.

## Desenvolvimento local

No Ubuntu/Debian o Python do sistema é protegido (PEP 668). **Não use `pip install` global** — use o ambiente virtual:

```bash
# na pasta do projeto (trigger/23)

# opção 1: script automático
chmod +x setup.sh && ./setup.sh

# opção 2: manual
python3 -m venv .venv          # se falhar: sudo apt install python3.12-venv
source .venv/bin/activate
pip install -r requirements.txt

# subir o app (localhost + Wi-Fi local)
./run.sh
```

Se a porta 8096 já estiver em uso (ex.: Docker), `./run.sh` só mostra os endereços — não tenta subir de novo.

## Operação (disciplina / Free Tier)

```bash
# testes + health (se o app estiver no ar)
./scripts/verify.sh

# backup do SQLite (+ CSVs / chave IA) → data/backups/
./scripts/backup_data.sh cron 7

# instalar cron diário 03:15 (retenção 7) na VM
./scripts/install_backup_cron.sh

# restore (faz cópia pre-restore antes)
./scripts/restore_data.sh data/backups/LABEL-STAMP
```

Na API (admin): `POST /api/sistema/backup?manter=7`.  
Health: `GET /api/health` — inclui `checks.database` (503 se o banco falhar). O Compose usa esse endpoint no healthcheck.

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `APP_PORT` | `8096` | Porta HTTP |
| `AUTH_MAX_ADMIN` | `1` | Teto de contas `admin` |
| `AUTH_MAX_CONSULTA` | `3` | Teto de contas `consulta` |
| `AUTH_BOOTSTRAP_USERNAME` / `AUTH_BOOTSTRAP_PASSWORD` | — | Seed do 1º admin (se a base estiver vazia) |
| `AUTH_SESSION_DIAS` | `7` | Validade da sessão (cookie) |
| `AUTH_COOKIE_SECURE` | `auto` | `auto` = Secure só em HTTPS; `1` / `0` força |
| `AUTH_DISABLED` | `false` | Desliga autenticação (apenas testes/emergência) |
| `DOMAIN` | `licitacoes.osbrasiluberlandia.org` | Host do Caddy (profile `https`) |
| `COMPRAS_PNCP_PAGE_SIZE` | `500` | Tamanho de página na API PNCP |
| `COMPRAS_GOV_BASE_URL` | `https://dadosabertos.compras.gov.br` | Base da API federal |
| `COMPRAS_IBGE_MUNICIPIO` | `3170206` | Filtro IBGE (Uberlândia) |
| `COMPRAS_UF_FILTRO` | `MG` | UF padrão na coleta UASG |
| `COMPRAS_ENRICH_FORNECEDOR` | `true` | Enriquecer fornecedores (mód. 10) |
| `COMPRAS_ENRICH_FORNECEDOR_MAX` | `150` | Teto de fornecedores por execução |
| `COMPRAS_ENRICH_CATALOGO` | `true` | Cache CATMAT/CATSER on-demand |
| `COMPRAS_ENRICH_CATALOGO_MAX` | `150` | Teto de itens de catálogo por execução |
| `COMPRAS_PNCP_MAX_RETRIES` | `5` | Retries em timeout / 429 / 502–504 |
| `COMPRAS_COLETAR_PGC` | `false` | Coleta PGC em massa (opt-in) |
| `COMPRAS_COLETAR_PRECO` | `false` | Coleta pesquisa de preço em massa |
| `IA_TOKEN_SECRET` | (auto) | Segredo Fernet para criptografar API keys no Setup; se vazio, gera `data/.ia_fernet_key` |
| `IA_HTTP_TIMEOUT_SEC` | `45` | Timeout das chamadas aos provedores de IA |
| `IA_FALLBACK_API_KEY` | — | Fallback opcional se nenhum provedor estiver cadastrado |

## Coleta

### Coleta unificada (hub)

| Endpoint | Descrição |
|----------|-----------|
| `POST /api/coleta` | Executa `compras` e/ou `powerbi` numa única orquestração |
| `GET /api/coleta/status` | Status/log em tempo real do job unificado |
| `GET /api/health` | Health check |

Corpo de exemplo:

```json
{
  "fontes": ["compras", "powerbi"],
  "ano": 2024,
  "unidades": ["926922"],
  "fases": ["07", "07-resultados", "05", "10"],
  "datasets": ["licitacoes", "contratos", "gestores"]
}
```

### Endpoints por fonte (mantidos)

| Endpoint | Fases | Descrição |
|----------|-------|-----------|
| `POST /api/compras/coletar` | 07 + itens + **resultados** | Coleta padrão (contratações PNCP) |
| `POST /api/compras/coletar-completo` | `07,07-resultados,05,10,01,02` (+ `04`,`03` opc.) | Orquestrador completo |
| `POST /api/powerbi/coletar` | — | Coleta CSVs do painel Power BI/PMU |

Query/body `fases`: `07`, `07-resultados`, `05` (UASG/órgão), `10` (fornecedor), `04` (PGC), `03` (preço), `01`/`02` (catálogo).

**Limitação:** a API federal expõe apenas resultados classificados/homologados — não a lista completa de proponentes.

## Dados

SQLite em `data/licitacoes.db`. Backups CSV do Power BI em `data/powerbi/`.

Campos manuais (`observador_id`) são preservados em re-sincronizações.

## Agendamento (Setup)

No **Setup → Agendamento** (somente admin) é possível:

- ligar/desligar a execução diária (horário + fuso `America/Sao_Paulo`)
- escolher a cadeia: coleta unificada e/ou CNPJs pendentes após sucesso da coleta
  e/ou, ao final, busca de **preços de mercado** (IA) item a item — só **Material**
  em Propostas abertas (mesma rotina do botão do detalhamento; tokens do Setup)
- ver a última execução (início, fim, ok/erro, resumo e log)
- disparar manualmente com **Rodar agora (cadeia)**

O agendador roda **dentro do app** (thread daemon). Reinício do container reagenda conforme a config salva no SQLite. Sobreposição é recusada (lock da cadeia / coleta / job de CNPJs / mercado IA).

## Órgão raiz e UASGs (Setup)

No **Setup → Órgão raiz** (somente admin):

- cadastrar **uma vez** o CNPJ do órgão no topo da ramificação (preenchimento via APIs públicas de CNPJ)
- a localidade de origem (`codigo_municipio_ibge` + UF) passa a orientar filtros Compras.gov
- **Sincronizar UASGs do município** materializa o catálogo municipal
- a adesão ao Observatório continua em **UASGs — Compras.gov** (somente ativas entram na coleta)

Sem raiz cadastrada, o sistema mantém o comportamento anterior via env (`COMPRAS_ORGAOS_CNPJ`, `COMPRAS_IBGE_MUNICIPIO`, `COMPRAS_UF_FILTRO`).

## Provedores de IA (Setup)

No **Setup → Provedores de IA** (somente admin):

- cadastrar um ou mais tokens (OpenAI, DeepSeek, Gemini, Anthropic, Groq, Mistral, xAI, OpenRouter, Together, Perplexity ou OpenAI-compatible)
- prioridade, modelo, base URL opcional, ativo/inativo
- a API key é **criptografada em repouso** e só aparece mascarada na UI
- botão **Testar conexão** por provedor
- em runtime, `IAClient.chat` escolhe o primeiro ativo e **rota automaticamente** se falhar (cota, 401, timeout)

Features de IA (ex.: análise de preço) consomem apenas essa interface — nunca hardcodam keys.

### Alternativa operacional (backup na VM)

Na VM AWS ainda pode existir um cron de contingência chamando um endpoint autenticado; a **fonte da verdade** da configuração continua sendo a tela Setup. O cron não substitui o agendador interno.
