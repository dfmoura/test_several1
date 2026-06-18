# Verificação de Licitações — Uberlândia

Sistema local para coleta, integridade e consulta de licitações a partir de três fontes:

1. **Portal da Prefeitura** — weblicitacoes.uberlandia.mg.gov.br (Playwright)
2. **Dados Abertos PMU / Power BI** — CSVs oficiais (httpx)
3. **Compras.gov / PNCP** — API Dados Abertos (httpx)

## Executar com Docker

```bash
cd trigger/15
docker compose up --build -d
```

Acesse: **http://localhost:8095**

## Desenvolvimento local

No Ubuntu/Debian o Python do sistema é protegido (PEP 668). **Não use `pip install` global** — use o ambiente virtual:

```bash
cd trigger/15

# opção 1: script automático
chmod +x setup.sh && ./setup.sh

# opção 2: manual
python3 -m venv .venv          # se falhar: sudo apt install python3.12-venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium

# subir API
uvicorn app.main:app --reload --port 8095
```

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `APP_PORT` | `8095` | Porta HTTP |
| `HEADLESS` | `false` | Deve permanecer `false` — o portal Akamai bloqueia headless |
| `DETALHE_SCRAPE` | `false` | Buscar campos extras na página de detalhes |
| `COMPRAS_PNCP_PAGE_SIZE` | `500` | Tamanho de página na API PNCP |

## Dados

SQLite em `data/licitacoes.db`. Backups CSV do Power BI em `data/powerbi/`.

Campos manuais (`valor_estimado`, `observador_id`) são preservados em re-sincronizações.
