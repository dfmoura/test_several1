# B3 Carteira Previdenciária

Dashboard profissional para análise de carteira B3 a partir do **XLSX oficial** de movimentação da Área do Investidor.

## Stack

| Camada | Tecnologia |
|--------|------------|
| API | Python 3.12 + FastAPI |
| Banco | PostgreSQL 16 |
| Frontend | React 18 + TypeScript + Tailwind + Recharts |
| Infra | Docker Compose |
| Cotações | brapi.dev (gratuito) + fallback Yahoo Finance |
| Benchmarks | API SGS do Banco Central (poupança, Selic) |

## Arquitetura

```
presentation/   → React dashboard (cards + gráficos)
application/    → PortfolioService (importação, consolidação)
domain/         → Parser B3, classificador, PositionCalculator
infrastructure/ → PostgreSQL, QuoteProvider, BcbBenchmarkProvider, B3MovementParser
```

## Subir o sistema

```bash
cd trigger/19
docker compose up --build
```

Acesse: **x'**

## Importar movimentação

1. Baixe o XLSX em **Área do Investidor B3 → Movimentação**
2. Clique em **Importar XLSX** no dashboard
3. O sistema extrai tickers, deduplica movimentações e recalcula a carteira

## Mercado

Aba **Mercado** no header: informe um ticker B3 para carregar e persistir:

| Fonte | Dados |
|-------|--------|
| COTAHIST (B3 SerHist) | Preço histórico diário (mín/méd/máx/fech) |
| listedCompaniesProxy (B3) | Proventos em dinheiro por tipo de ação |
| brapi.dev / Yahoo Finance | Intraday do dia corrente |

A tabela exibe **Ticker | Preço atual | Proventos (12m) | Yield**. O preço indica variação (alta/baixa/lateral). Clique na linha para o dashboard com cards, gráfico histórico+intraday e evolução de proventos.

## API

| Endpoint | Descrição |
|----------|-----------|
| `POST /api/v1/imports` | Upload do XLSX |
| `GET /api/v1/dashboard` | Cards por ticker + KPIs |
| `GET /api/v1/tickers/{ticker}/timeline` | Gráficos de horizonte |
| `GET /api/v1/market/tickers` | Watchlist de mercado |
| `POST /api/v1/market/tickers` | Adiciona ticker (histórico + intraday) |
| `GET /api/v1/market/tickers/{ticker}` | Dashboard detalhado do ticker |
| `DELETE /api/v1/market/tickers/{ticker}` | Remove ticker da watchlist |

## Porta

- **4819** — frontend (nginx + proxy para API)
- API interna na rede Docker (porta 8000, não exposta)

## Escalabilidade

- Domínio isolado (regras testáveis sem banco)
- PostgreSQL para persistência e índices de deduplicação
- QuoteProvider com adapter plugável
- Pronto para evoluir com workers de sync B3, múltiplos portfólios e autenticação

## Teste local com arquivo de exemplo

```bash
curl -X POST http://localhost:4819/api/v1/imports \
  -F "file=@base13.xlsx"
```
