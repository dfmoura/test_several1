# Verificação de Licitações — Uberlândia

Sistema local para coleta, integridade e consulta de licitações a partir de três fontes:

1. **Portal da Prefeitura** — weblicitacoes.uberlandia.mg.gov.br (Playwright)
2. **Dados Abertos PMU / Power BI** — CSVs oficiais (httpx)
3. **Compras.gov / PNCP** — API Dados Abertos (httpx)

## Executar com Docker

```bash
# na pasta do projeto (trigger/15)
docker compose up --build -d
```

Acesse: **http://localhost:8095/** — na mesma Wi-Fi: `http://SEU_IP:8095/` (`hostname -I`)

## Servidor Windows (sem Docker)

Guia completo para usar um PC Windows como servidor (rede local + internet via Cloudflare):

**[SERVIDOR-WINDOWS-PASSO-A-PASSO.txt](./SERVIDOR-WINDOWS-PASSO-A-PASSO.txt)**

Resumo: `setup-windows.bat` → `iniciar-servidor.bat` → liberar firewall → (opcional) Cloudflare Tunnel.

## Desenvolvimento local

No Ubuntu/Debian o Python do sistema é protegido (PEP 668). **Não use `pip install` global** — use o ambiente virtual:

```bash
# na pasta do projeto (trigger/15)

# opção 1: script automático
chmod +x setup.sh && ./setup.sh

# opção 2: manual
python3 -m venv .venv          # se falhar: sudo apt install python3.12-venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium

# subir app de licitações (localhost + Wi-Fi local)
./run.sh
```

Se a porta 8095 já estiver em uso (ex.: Docker), `./run.sh` só mostra os endereços — não tenta subir de novo.

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `APP_PORT` | `8095` | Porta HTTP |
| `HEADLESS` | `false` | Deve permanecer `false` — o portal Akamai bloqueia headless |
| `DETALHE_SCRAPE` | `false` | Buscar campos extras na página de detalhes |
| `COMPRAS_PNCP_PAGE_SIZE` | `500` | Tamanho de página na API PNCP |
| `COMPRAS_GOV_BASE_URL` | `https://dadosabertos.compras.gov.br` | Base da API federal |
| `COMPRAS_IBGE_MUNICIPIO` | `3170206` | Filtro IBGE (Uberlândia) |
| `COMPRAS_UF_FILTRO` | `MG` | UF padrão na coleta UASG |
| `COMPRAS_ENRICH_FORNECEDOR` | `true` | Enriquecer fornecedores (mód. 10) |
| `COMPRAS_ENRICH_CATALOGO` | `true` | Cache CATMAT/CATSER on-demand |
| `COMPRAS_COLETAR_PGC` | `false` | Coleta PGC em massa (opt-in) |
| `COMPRAS_COLETAR_PRECO` | `false` | Coleta pesquisa de preço em massa |

## Compras.gov — fases de coleta

| Endpoint | Fases | Descrição |
|----------|-------|-----------|
| `POST /api/compras/coletar` | 07 + itens + **resultados** | Coleta padrão (contratações PNCP) |
| `POST /api/compras/coletar-completo` | `07,07-resultados,05,10,01,02` (+ `04`,`03` opc.) | Orquestrador completo |

Query/body `fases`: `07`, `07-resultados`, `05` (UASG/órgão), `10` (fornecedor), `04` (PGC), `03` (preço), `01`/`02` (catálogo).

**Limitação:** a API federal expõe apenas resultados classificados/homologados — não a lista completa de proponentes.

## Dados

SQLite em `data/licitacoes.db`. Backups CSV do Power BI em `data/powerbi/`.

Campos manuais (`valor_estimado`, `observador_id`) são preservados em re-sincronizações.
