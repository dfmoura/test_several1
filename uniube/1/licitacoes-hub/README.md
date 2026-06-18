# Licitações Hub — Uberlândia

Aplicação **simples e única** para coletar licitações do portal da prefeitura e consultar depois.

## O que faz

1. **Coletar** — abre o portal municipal, escolhe órgão + ano, extrai a tabela e salva em SQLite
2. **Consultar** — busca os dados salvos; edite **valor estimado** e **observador** por processo
3. **Observadores** — cadastro de pessoas que acompanham licitações
4. **Compras.gov (PNCP)** — coleta via [API Dados Abertos](https://dadosabertos.compras.gov.br/swagger-ui/index.html), contratações Lei 14.133

Na re-sincronização, os campos do portal são atualizados e **valor estimado / observador são preservados** (municipal). No Compras.gov, o **observador é preservado**.

## Estrutura (1 serviço só)

```
licitacoes-hub/
├── app/
│   ├── main.py          # API + interface
│   ├── scraper.py       # Playwright — Web Licitações
│   ├── compras_pncp.py  # HTTP — API PNCP Dados Abertos
│   ├── database.py      # SQLite
│   └── static/          # Tela web
├── data/                # Banco SQLite (volume Docker)
├── Dockerfile
└── docker-compose.yml
```

## Uso

```bash
cd licitacoes-hub
docker compose up --build -d
```

Abra: **http://localhost:8080**

### Sem Docker (local)

```bash
pip install -r requirements.txt
playwright install chromium   # só para o módulo municipal
uvicorn app.main:app --reload --port 8080
```

## Portal municipal

https://weblicitacoes.uberlandia.mg.gov.br/weblicitacoes/f/n/licitacoescon?evento=y&descricaoEmpresaLicitacao=2&modoJanelaPlc=popup

## Compras.gov — API PNCP (Dados Abertos)

Endpoint: `GET /modulo-contratacoes/1_consultarContratacoes_PNCP_14133`

| Parâmetro | Descrição |
|-----------|-----------|
| `unidadeOrgaoCodigoUnidade` | Código da unidade (ver tabela) |
| `dataPublicacaoPncpInicial` / `Final` | Período de publicação (máx. 365 dias por janela) |
| `codigoModalidade` | 1 a 12 (pregão, concorrência, dispensa, etc.) |
| `pagina` | Número da página |
| `tamanhoPagina` | 10 a 500 (padrão do hub: 500) |

### Unidades configuradas

| Código | Unidade |
|--------|---------|
| 926922 | PREFEITURA DE UBERLANDIA |
| 926287 | DMAE |
| 926038 | FUTEL |

### Fluxo de coleta

1. Aba **Compras — Coletar**
2. Informe o **ano** (ou intervalo de datas) e marque unidades/modalidades
3. **Iniciar coleta** — o hub consulta a API, pagina automaticamente e grava todos os campos PNCP

Sem navegador, sem hCaptcha, sem Chrome CDP.
